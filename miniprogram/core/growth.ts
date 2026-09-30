// 口算冒险岛 · 成长系统（等级 / 徽章 / 每日打卡 / 宝箱）——**纯函数**，不依赖 wx。
//
// 与 core/mathIsland.ts 的分工：那边是「一局怎么打」，这边是「打完之后怎么长」。
// 数值与条件定义全在 config/growth.ts，本文件只做计算与判定。
//
// 设计取舍：
//   1. 等级由**累计星星**推导，不另设经验值——孩子看得懂的只有星星，多一个数字就多一份困惑。
//   2. 打卡按「日键」YYYY-MM-DD 判定（utils/date.dayKeyOf），跨时区/跨月都一致，
//      且**幂等**：同一天重复调用不会重复发奖。
//   3. 徽章判定是「快照式」：给当前进度算一遍，返回**新获得**的 id 列表，
//      由调用方负责追加。不记录获得时间——孩子不需要，多存一个字段多一份脏数据风险。
//   4. 开箱是加权随机（weight 为相对份数），random 由外部注入以便单测。

import { dayKeyOf, shiftDayKey } from '../utils/date';

// ---------------------------------------------------------------- 数据结构

export interface GrowthDaily {
  readonly lastDate: string; // 最近一次打卡的日键 '' = 从未打卡
  readonly streak: number; // 当前连续天数（断了归 1）
  readonly totalDays: number; // 累计打卡天数
}

export interface GrowthChest {
  readonly keys: number; // 钥匙
  readonly opened: number; // 累计开箱次数
}

export const emptyDaily = (): GrowthDaily => ({ lastDate: '', streak: 0, totalDays: 0 });
export const emptyChest = (): GrowthChest => ({ keys: 0, opened: 0 });

// ---------------------------------------------------------------- 全站成长账户
//
// ⚠️ 这是**跨游戏**的钱包（星星/金币/等级/徽章/打卡/宝箱），
// 与 `math_island_progress`（冒险岛 7 关的关卡进度）是两个集合、两份存档：
//   钱包回答「你在整个游戏中心长到哪了」，关卡进度回答「冒险岛这 7 关走到哪了」。
// 合在一起会让「换设备后只恢复了一半」这类问题说不清，所以刻意分开。
export interface GameProfile {
  readonly v: number;
  // 同 IslandProgress.rev：每次写档 +1，镜像与云端写同一份值，读档时取大的那份。
  readonly rev: number;
  readonly stars: number;
  readonly coins: number;
  readonly daily: GrowthDaily;
  readonly badges: readonly string[];
  readonly chest: GrowthChest;
  readonly plays: Readonly<Record<string, number>>; // gameId → 游玩局数（跨游戏徽章用）
  readonly totalCorrect: number; // 累计答对（跨游戏；徽章「百题斩」用）
  // 一次性标记：把「冒险岛旧存档里的星星/金币」并入本账户（幂等，只做一次）。
  // 不删旧字段、不写迁移脚本——旧存档继续存在，只是不再作为钱包使用。
  readonly mergedIsland: boolean;
}

export const GAME_PROFILE_V = 1;

export function initialProfile(): GameProfile {
  return {
    v: GAME_PROFILE_V,
    rev: 0,
    stars: 0,
    coins: 0,
    daily: emptyDaily(),
    badges: [],
    chest: emptyChest(),
    plays: {},
    totalCorrect: 0,
    mergedIsland: false,
  };
}

export function parseProfile(raw: unknown): GameProfile {
  const base = initialProfile();
  if (typeof raw !== 'object' || raw === null) return base;
  const d = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  let daily = emptyDaily();
  if (typeof d.daily === 'object' && d.daily !== null) {
    const s = d.daily as Record<string, unknown>;
    daily = {
      lastDate: typeof s.lastDate === 'string' ? s.lastDate : '',
      streak: num(s.streak),
      totalDays: num(s.totalDays),
    };
  }
  let chest = emptyChest();
  if (typeof d.chest === 'object' && d.chest !== null) {
    const s = d.chest as Record<string, unknown>;
    chest = { keys: num(s.keys), opened: num(s.opened) };
  }
  const badges = Array.isArray(d.badges)
    ? ((d.badges as unknown[]).filter((b): b is string => typeof b === 'string') as string[])
    : [];
  const plays: Record<string, number> = {};
  if (typeof d.plays === 'object' && d.plays !== null) {
    for (const [k, v] of Object.entries(d.plays as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) plays[k] = v;
    }
  }
  return {
    v: GAME_PROFILE_V,
    rev: num(d.rev),
    stars: num(d.stars),
    coins: num(d.coins),
    daily,
    badges,
    chest,
    plays,
    totalCorrect: num(d.totalCorrect),
    mergedIsland: d.mergedIsland === true,
  };
}

// 结算入账：只做加法，不做减法（星星/金币一旦给出就不该被系统扣回去）
export function addReward(
  profile: GameProfile,
  gain: { stars: number; coins: number; correct?: number; gameId?: string; keys?: number },
): GameProfile {
  const plays = { ...profile.plays };
  if (gain.gameId) plays[gain.gameId] = (plays[gain.gameId] ?? 0) + 1;
  return {
    ...profile,
    stars: profile.stars + Math.max(0, gain.stars),
    coins: profile.coins + Math.max(0, gain.coins),
    chest: { ...profile.chest, keys: profile.chest.keys + Math.max(0, gain.keys ?? 0) },
    totalCorrect: profile.totalCorrect + Math.max(0, gain.correct ?? 0),
    plays,
  };
}

// ---------------------------------------------------------------- 单局结算换算
//
// 冒险岛有 7 关的关卡奖励档，星币由它自己算；其余游戏（答对 N / 共 M 题）走这里，
// 好处是「玩哪个游戏都在长大」这条规则只有一处实现（数值在 config/growth.ts）。
export interface RewardTier {
  readonly rate: number; // 答对率门槛（含）；表按 rate 降序，最后一档须为 0
  readonly stars: number; // 额外奖励星
  readonly coins: number; // 额外奖励币
}

export function rewardOfRun(
  run: { readonly correct: number; readonly total: number },
  cfg: {
    readonly starPerCorrect: number;
    readonly coinPerCorrect: number;
    readonly tiers: readonly RewardTier[];
  },
): { stars: number; coins: number } {
  const correct = Math.max(0, Math.floor(run.correct) || 0);
  const total = Math.max(0, Math.floor(run.total) || 0);
  // total 为 0（题目没生成出来）时率记 0，只可能命中 rate:0 那档兜底
  const rate = total > 0 ? correct / total : 0;
  const hit = cfg.tiers.find((t) => rate >= t.rate);
  return {
    stars: correct * cfg.starPerCorrect + (hit?.stars ?? 0),
    coins: correct * cfg.coinPerCorrect + (hit?.coins ?? 0),
  };
}

// 一次性把冒险岛旧存档里的星星/金币并入全站账户（幂等：由 mergedIsland 标记把守）。
// 为什么需要：冒险岛早于全站钱包上线，那批星星存在 math_island_progress 里；
// 钱包上线后如果不并进去，老玩家会看到「星星清零」。
export function mergeIslandWallet(
  profile: GameProfile,
  island: { stars: number; coins: number },
): GameProfile {
  if (profile.mergedIsland) return profile;
  return {
    ...profile,
    stars: profile.stars + Math.max(0, island.stars),
    coins: profile.coins + Math.max(0, island.coins),
    mergedIsland: true,
  };
}

// ---------------------------------------------------------------- 等级

export interface RankDef {
  readonly min: number; // 进入该等级的累计星星门槛
  readonly icon: string;
  readonly title: string;
}

export interface RankInfo {
  readonly level: number; // 1 起
  readonly icon: string;
  readonly title: string;
  readonly min: number; // 本级门槛
  readonly next: number | null; // 下一级门槛（满级 = null）
  readonly toNext: number; // 还差多少星升级（满级 = 0）
  readonly percent: number; // 本级内进度 0~100（满级 = 100）
}

// 表为空时给一个兜底等级，绝不返回 undefined 让页面炸掉
export function rankInfoOf(stars: number, ranks: readonly RankDef[]): RankInfo {
  const safe = Number.isFinite(stars) && stars > 0 ? Math.floor(stars) : 0;
  if (ranks.length === 0) {
    return { level: 1, icon: '🌱', title: '口算新手', min: 0, next: null, toNext: 0, percent: 100 };
  }
  let idx = 0;
  for (let i = 0; i < ranks.length; i += 1) if (safe >= (ranks[i]?.min ?? 0)) idx = i;
  const cur = ranks[idx] ?? { min: 0, icon: '🌱', title: '口算新手' };
  const nxt = ranks[idx + 1];
  if (!nxt) {
    return {
      level: idx + 1,
      icon: cur.icon,
      title: cur.title,
      min: cur.min,
      next: null,
      toNext: 0,
      percent: 100,
    };
  }
  const span = Math.max(1, nxt.min - cur.min);
  const got = Math.max(0, safe - cur.min);
  return {
    level: idx + 1,
    icon: cur.icon,
    title: cur.title,
    min: cur.min,
    next: nxt.min,
    toNext: Math.max(0, nxt.min - safe),
    percent: Math.min(100, Math.round((got / span) * 100)),
  };
}

// ---------------------------------------------------------------- 每日打卡

export interface StreakBonusDef {
  readonly days: number;
  readonly coins: number;
  readonly keys: number;
}

export interface CheckInResult {
  readonly daily: GrowthDaily;
  readonly checked: boolean; // true = 本次真的打卡了；false = 今天已打过
  readonly coins: number;
  readonly keys: number;
  readonly note: string; // 给孩子的文案
}

export function checkInOf(
  prev: GrowthDaily,
  baseCoins: number,
  bonuses: readonly StreakBonusDef[],
  today: string = dayKeyOf(),
): CheckInResult {
  // 幂等：同一天重复调用直接返回「已打过」，绝不重复发奖
  if (prev.lastDate === today) {
    return {
      daily: prev,
      checked: false,
      coins: 0,
      keys: 0,
      note: prev.streak > 1 ? `已连续打卡 ${prev.streak} 天` : '今天已经打过卡啦',
    };
  }
  // 昨天打过 → 连续 +1；否则（隔天/首次）重新从 1 开始
  const streak = prev.lastDate === shiftDayKey(today, -1) ? prev.streak + 1 : 1;
  const daily: GrowthDaily = { lastDate: today, streak, totalDays: prev.totalDays + 1 };
  // 取命中的最高一档（表按 days 降序，命中第一个即可）
  const hit = bonuses.find((b) => streak >= b.days);
  const coins = baseCoins + (hit?.coins ?? 0);
  const keys = hit?.keys ?? 0;
  const note = streak > 1 ? `连续打卡 ${streak} 天！+${coins}🪙` : `打卡成功！+${coins}🪙`;
  return { daily, checked: true, coins, keys, note };
}

// ---------------------------------------------------------------- 徽章

export type BadgeKind =
  | 'clearedCount'
  | 'clearedLevel'
  | 'castleThree'
  | 'stars'
  | 'totalQ'
  | 'combo'
  | 'checkinDays'
  | 'chestOpened'
  // 2026-09-20：游戏环节徽章（原来 12 枚里 9 枚都是冒险岛的，其余 6 款游戏一枚没有）。
  //   plays     = 某个游戏玩了几局（param = gameId，见 config/games.ts）
  //   gameKinds = 玩过几种不同的游戏
  | 'plays'
  | 'gameKinds';

export interface BadgeDef {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly kind: BadgeKind;
  readonly param?: string; // clearedLevel 用：关卡 id
  readonly value: number;
}

export interface BadgeContext {
  readonly clearedCount: number; // 已通关关卡数
  readonly cleared: Readonly<Record<string, boolean>>; // 关卡 id → 是否通关
  readonly castleBest: number; // 宝藏城堡最好评级
  readonly stars: number;
  readonly totalQ: number;
  readonly checkinDays: number;
  readonly chestOpened: number;
  readonly maxCombo?: number; // 单局最大连对（不给 = 不参与 combo 判定）
  /**
   * gameId → 游玩局数（2026-09-20 接上）。
   * ⚠️ 可选：老调用方（含单测）构造 BadgeContext 时不带它也能过。
   *    不带的话，plays / gameKinds 两类徽章判定为「未达成」，不会乱发。
   */
  readonly plays?: Readonly<Record<string, number>>;
}

// 徽章进度：把「达成了没」的布尔判定，升级成「还差多少」。
// 勋章墙用 current/goal 画进度条；badgeReached 复用本函数判达成（一处算、两处用，别漂移）。
export interface BadgeProgress {
  readonly current: number;
  readonly goal: number;
}

export function badgeProgress(def: BadgeDef, ctx: BadgeContext): BadgeProgress {
  switch (def.kind) {
    case 'clearedCount':
      return { current: ctx.clearedCount, goal: def.value };
    // 通关指定关卡是「通没通」的二元：current 只取 0/1，goal 恒 1
    case 'clearedLevel':
      return { current: def.param && ctx.cleared[def.param] === true ? 1 : 0, goal: 1 };
    case 'castleThree':
      return { current: ctx.castleBest, goal: def.value };
    case 'stars':
      return { current: ctx.stars, goal: def.value };
    case 'totalQ':
      return { current: ctx.totalQ, goal: def.value };
    case 'combo':
      return { current: ctx.maxCombo ?? 0, goal: def.value };
    case 'checkinDays':
      return { current: ctx.checkinDays, goal: def.value };
    case 'chestOpened':
      return { current: ctx.chestOpened, goal: def.value };
    // 单个游戏玩够几局（param = gameId）
    case 'plays':
      return { current: def.param ? (ctx.plays?.[def.param] ?? 0) : 0, goal: def.value };
    // 玩过几种不同的游戏
    case 'gameKinds':
      return { current: Object.keys(ctx.plays ?? {}).length, goal: def.value };
    default:
      return { current: 0, goal: def.value };
  }
}

function badgeReached(def: BadgeDef, ctx: BadgeContext): boolean {
  // clearedLevel / plays 缺 param 是数据错误，宁可不发（守住历史语义，见单测）
  if ((def.kind === 'clearedLevel' || def.kind === 'plays') && !def.param) return false;
  const progress = badgeProgress(def, ctx);
  return progress.current >= progress.goal;
}

// 返回**新获得**的徽章 id（已拥有的不重复返回）
export function evaluateBadges(
  owned: readonly string[],
  ctx: BadgeContext,
  defs: readonly BadgeDef[],
): string[] {
  const have = new Set(owned);
  return defs.filter((d) => !have.has(d.id) && badgeReached(d, ctx)).map((d) => d.id);
}

/**
 * 测试给多少学分（2026-09-20：学习行为也要给经验值，不能只有游戏给）。
 * 按正确率分档——满分才给满额，鼓励认真做而不是刷次数。
 * ⚠️ 做完了就有 1 分（哪怕全错）：测试的勇气本身也值得奖励。
 */
export function starsForTest(correct: number, total: number): number {
  if (total <= 0) return 0;
  const rate = correct / total;
  if (rate >= 1) return 10;
  if (rate >= 0.8) return 5;
  if (rate >= 0.6) return 2;
  return 1;
}

// ---------------------------------------------------------------- 宝箱

export type ChestPrizeKind = 'stars' | 'coins' | 'key';

export interface ChestPrizeDef {
  readonly kind: ChestPrizeKind;
  readonly value: number;
  readonly weight: number; // 相对份数（>0）
  readonly text: string; // 展示文案
}

export interface OpenChestResult {
  readonly chest: GrowthChest;
  readonly prize: ChestPrizeDef | null; // 没钥匙 = null
  readonly reason: string; // 没钥匙时的提示（孩子能看懂）
}

export function openChestOf(
  chest: GrowthChest,
  pool: readonly ChestPrizeDef[],
  random: () => number = Math.random,
): OpenChestResult {
  if (chest.keys <= 0) {
    return {
      chest,
      prize: null,
      reason: '还没有钥匙 🔑，通关新关卡或连续打卡 7 天能得到',
    };
  }
  const usable = pool.filter((p) => p.weight > 0);
  // 奖池为空（配置写错）也不能吞掉钥匙：退还并给个兜底奖励
  if (usable.length === 0) {
    return { chest: { ...chest, opened: chest.opened + 1 }, prize: null, reason: '' };
  }
  const total = usable.reduce((s, p) => s + p.weight, 0);
  let roll = random() * total;
  let picked = usable[usable.length - 1]!;
  for (const p of usable) {
    roll -= p.weight;
    if (roll <= 0) {
      picked = p;
      break;
    }
  }
  return {
    chest: {
      keys: chest.keys - 1 + (picked.kind === 'key' ? picked.value : 0),
      opened: chest.opened + 1,
    },
    prize: picked,
    reason: '',
  };
}
