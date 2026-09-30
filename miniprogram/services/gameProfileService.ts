// 全站游戏成长账户（星星 / 金币 / 等级 / 徽章 / 每日打卡 / 宝箱）。
//
// 与 mathIslandService 的关系：
//   - 本服务管**跨游戏**的钱包与成长，所有游戏结算都往这里入账；
//   - mathIslandService 管冒险岛 7 关的关卡进度（哪些关通关了、桥板点亮几块）。
// 两者数据不重叠，但徽章判定需要两边的信息（如「通关 7 关」来自岛屿），
// 故 reward() 接受可选的 badgePatch，由调用方把「自己那部分」的事实传进来。
//
// ⚠️ 云读取必须带超时：微信云在环境不可用/登录态过期时可能长时间不返回也不报错，
//    裸 await 会把页面卡成空白（2026-09-13 事故，见 utils/withTimeout）。
import type {
  BadgeContext,
  CheckInResult,
  ChestPrizeDef,
  GameProfile,
  BadgeDef,
  GrowthChest,
  GrowthDaily,
  RankInfo,
} from '../core/growth';
import {
  addReward,
  badgeProgress,
  checkInOf,
  evaluateBadges,
  mergeIslandWallet,
  openChestOf,
  parseProfile,
  rankInfoOf,
} from '../core/growth';
import { DAILY_BASE_COINS, DAILY_STREAK_BONUS, BADGES, CHEST_POOL, RANKS } from '../config/growth';
import type { GameProfileRepository } from '../repositories/gameProfileRepository';
import { gameProfileRepository } from '../repositories/gameProfileRepository';
import { withTimeout } from '../utils/withTimeout';
import { dayKeyOf } from '../utils/date';

const MIRROR_PREFIX = 'gameProfile_v1_';
const LOAD_TIMEOUT_MS = 6000;

export interface GameBadgeView {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly owned: boolean;
  // 进度（2026-09-29 勋章进度条）：未获得的徽章展示「还差多少」
  readonly current: number;
  readonly goal: number;
  // 进度百分比（0-100，已封顶）；WXML 直接拿它当进度条宽度，别在模板里算除法
  readonly pct: number;
}

export interface GameGrowthView {
  readonly rank: RankInfo;
  readonly daily: GrowthDaily;
  readonly checkedToday: boolean;
  readonly chest: GrowthChest;
  readonly badges: GameBadgeView[];
  readonly badgeOwned: number;
  readonly badgeTotal: number;
  readonly stars: number;
  readonly coins: number;
}

// 冒险岛（及其他游戏）结算时补进来的「本域事实」，用于判定本域徽章
export interface BadgePatch {
  readonly clearedCount?: number;
  readonly cleared?: Readonly<Record<string, boolean>>;
  readonly castleBest?: number;
  readonly maxCombo?: number;
}

export type GameProfileSource = 'cloud' | 'mirror' | 'empty';

export interface GameProfileStoragePort {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  remove(key: string): void;
}

export interface GameProfileServiceDeps {
  gameProfileRepository: GameProfileRepository;
  storage?: GameProfileStoragePort;
}

export interface GameProfileService {
  load(userId: string): Promise<{ profile: GameProfile; source: GameProfileSource }>;
  save(userId: string, profile: GameProfile): GameProfile;
  growthView(profile: GameProfile): GameGrowthView;
  checkIn(input: { userId: string; profile: GameProfile }): {
    profile: GameProfile;
    result: CheckInResult;
    newBadges: BadgeDef[];
  };
  openChest(input: { userId: string; profile: GameProfile }): {
    profile: GameProfile;
    prize: ChestPrizeDef | null;
    reason: string;
    newBadges: BadgeDef[];
  };
  reward(input: {
    userId: string;
    profile: GameProfile;
    stars: number;
    coins: number;
    correct?: number;
    gameId?: string;
    keys?: number; // 通关新关卡发的宝箱钥匙
    badge?: BadgePatch;
  }): { profile: GameProfile; newBadges: BadgeDef[] };
  mergeIsland(input: {
    userId: string;
    profile: GameProfile;
    islandStars: number;
    islandCoins: number;
  }): GameProfile;
  /**
   * 学习行为入账（2026-09-20）：学知识点 / 复习 / 测试都给经验值。
   *
   * 为什么单独一个口子：走 `reward` 时要传 gameId，那会把学习也算成「玩了一局游戏」，
   * 游戏勋章的局数统计就失真了。学习奖励**不计入游戏局数**，只加经验（和答对题数）。
   *
   * @returns 这次新解锁的勋章（调用方可用来提示；发后不理也不会出错）
   */
  awardLearning(userId: string, input: { stars: number; correct?: number }): Promise<BadgeDef[]>;
}

function badgeCtxOf(profile: GameProfile, patch?: BadgePatch): BadgeContext {
  return {
    clearedCount: patch?.clearedCount ?? 0,
    cleared: patch?.cleared ?? {},
    castleBest: patch?.castleBest ?? 0,
    stars: profile.stars,
    totalQ: profile.totalCorrect,
    checkinDays: profile.daily.totalDays,
    chestOpened: profile.chest.opened,
    maxCombo: patch?.maxCombo,
    // 2026-09-20：profile.plays 早就记了「每个游戏玩了几局」（字段注释写着「跨游戏徽章用」），
    // 但从没被送进判定上下文——补上，游戏环节的徽章这才判定得了。
    plays: profile.plays,
  };
}

// 把「新获得的徽章」追加进账户（没有新徽章时返回原对象，避免无谓写档）
function withBadges(profile: GameProfile, patch?: BadgePatch): [GameProfile, BadgeDef[]] {
  const ids = evaluateBadges(profile.badges, badgeCtxOf(profile, patch), BADGES);
  if (ids.length === 0) return [profile, []];
  return [
    { ...profile, badges: [...profile.badges, ...ids] },
    BADGES.filter((b) => ids.includes(b.id)),
  ];
}

export function createGameProfileService(deps: GameProfileServiceDeps): GameProfileService {
  const storage: GameProfileStoragePort = deps.storage ?? {
    read(key) {
      try {
        return wx.getStorageSync(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        wx.setStorageSync(key, value);
      } catch {
        // 存不下就算了，云端仍在
      }
    },
    remove(key) {
      try {
        wx.removeStorageSync(key);
      } catch {
        // 同上
      }
    },
  };

  const mirrorKey = (userId: string): string => `${MIRROR_PREFIX}${userId}`;
  const readMirror = (userId: string): GameProfile | null => {
    const raw = storage.read(mirrorKey(userId));
    return raw === null || raw === undefined || raw === '' ? null : parseProfile(raw);
  };
  const pushCloud = (userId: string, profile: GameProfile): void => {
    const { v: _dropV, ...body } = profile;
    void _dropV;
    void deps.gameProfileRepository.upsert(userId, body).catch(() => undefined);
  };

  return {
    async load(userId) {
      const doc = await withTimeout(
        deps.gameProfileRepository.getByUser(userId),
        LOAD_TIMEOUT_MS,
        '读取成长账户',
      );
      const cloud = doc ? parseProfile(doc) : null;
      const mirror = readMirror(userId);
      // 与冒险岛同款：按 rev 取新的那份，而不是「云优先」
      if (cloud && (!mirror || cloud.rev >= mirror.rev)) {
        storage.write(mirrorKey(userId), cloud);
        return { profile: cloud, source: 'cloud' };
      }
      if (mirror) {
        if (cloud) pushCloud(userId, mirror);
        return { profile: mirror, source: 'mirror' };
      }
      return { profile: parseProfile(null), source: 'empty' };
    },

    save(userId, profile) {
      const next: GameProfile = { ...profile, rev: profile.rev + 1 };
      storage.write(mirrorKey(userId), next);
      pushCloud(userId, next);
      return next;
    },

    async awardLearning(userId, input) {
      const res = await this.load(userId);
      const { profile, newBadges } = this.reward({
        userId,
        profile: res.profile,
        stars: input.stars,
        coins: 0, // 学习不发金币（金币是游戏里的流通物，学习给经验就够）
        correct: input.correct ?? 0,
      });
      if (input.stars > 0) this.save(userId, profile);
      return newBadges;
    },

    growthView(profile) {
      const rank = rankInfoOf(profile.stars, RANKS);
      const ctx = badgeCtxOf(profile);
      const badges: GameBadgeView[] = BADGES.map((b) => {
        const progress = badgeProgress(b, ctx);
        const goal = progress.goal;
        const current = Math.min(progress.current, goal);
        return {
          id: b.id,
          icon: b.icon,
          name: b.name,
          desc: b.desc,
          owned: profile.badges.includes(b.id),
          current,
          goal,
          pct: goal > 0 ? Math.round((current / goal) * 100) : 0,
        };
      });
      const owned = badges.filter((b) => b.owned).length;
      return {
        rank,
        daily: profile.daily,
        checkedToday: profile.daily.lastDate === dayKeyOf(),
        chest: profile.chest,
        badges,
        badgeOwned: owned,
        badgeTotal: badges.length,
        stars: profile.stars,
        coins: profile.coins,
      };
    },

    checkIn(input) {
      const result = checkInOf(input.profile.daily, DAILY_BASE_COINS, DAILY_STREAK_BONUS);
      if (!result.checked) return { profile: input.profile, result, newBadges: [] };
      let next: GameProfile = {
        ...input.profile,
        coins: input.profile.coins + result.coins,
        daily: result.daily,
        chest: { ...input.profile.chest, keys: input.profile.chest.keys + result.keys },
      };
      const [withBadge, newBadges] = withBadges(next);
      next = withBadge;
      return { profile: this.save(input.userId, next), result, newBadges };
    },

    openChest(input) {
      const res = openChestOf(input.profile.chest, CHEST_POOL);
      if (!res.prize) {
        return { profile: input.profile, prize: null, reason: res.reason, newBadges: [] };
      }
      let next: GameProfile = {
        ...input.profile,
        chest: res.chest,
        stars: input.profile.stars + (res.prize.kind === 'stars' ? res.prize.value : 0),
        coins: input.profile.coins + (res.prize.kind === 'coins' ? res.prize.value : 0),
      };
      const [withBadge, newBadges] = withBadges(next);
      next = withBadge;
      return { profile: this.save(input.userId, next), prize: res.prize, reason: '', newBadges };
    },

    reward(input) {
      let next = addReward(input.profile, {
        stars: input.stars,
        coins: input.coins,
        correct: input.correct,
        gameId: input.gameId,
        keys: input.keys,
      });
      const [withBadge, newBadges] = withBadges(next, input.badge);
      next = withBadge;
      return { profile: this.save(input.userId, next), newBadges };
    },

    mergeIsland(input) {
      const merged = mergeIslandWallet(input.profile, {
        stars: input.islandStars,
        coins: input.islandCoins,
      });
      if (merged === input.profile) return input.profile; // 已并过，不重复写档
      return this.save(input.userId, merged);
    },
  };
}

export const gameProfileService = createGameProfileService({ gameProfileRepository });
