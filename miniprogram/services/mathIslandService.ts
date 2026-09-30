// 口算冒险岛服务（数学学科·小学）：账号级存档 + 单局结算 + 成绩上云。
//
// 存档**按账号**：权威副本在云端 math_island_progress（每用户一条），
// 本机只留一份按 userId 分开的镜像，用于云不可用 / 离线时的兜底。
//   - 换设备：跟着账号走（读云）
//   - 同设备换账号：镜像 key 带 userId，不会串
//   - 云不可用：读镜像继续玩；写云失败也不打断，下次进页面再同步上去
//
// ⚠️ 云读取必须带超时：微信云在「环境不可用 / 登录态过期」时可能长时间不返回也不报错，
//    裸 await 会把页面卡成空白（2026-09-13 事故教训，见 utils/withTimeout）。
import type {
  IslandLevelDef,
  IslandLevelState,
  IslandProgress,
  IslandRunState,
} from '../core/mathIsland';
import {
  accuracyOf,
  castleBestOf,
  clearedCountOf,
  emptyLevelState,
  isLevelCleared,
  mergeProgress,
  parseProgress,
  rewardOf,
} from '../core/mathIsland';
import { ISLAND_LEVELS } from '../config/mathIsland';
import type { MathIslandRepository } from '../repositories/mathIslandRepository';
import { mathIslandRepository } from '../repositories/mathIslandRepository';
import type { MemoryGameRepository } from '../repositories/memoryGameRepository';
import { memoryGameRepository } from '../repositories/memoryGameRepository';
import { withTimeout } from '../utils/withTimeout';

// 本机镜像 key 前缀（后面拼 userId，同设备换账号不串）
const MIRROR_PREFIX = 'mathIsland_v1_';
// 云读取超时：超过这个时间就当云端不可用，改用本机镜像
const LOAD_TIMEOUT_MS = 6000;

export interface IslandLevelView {
  // WXML 的 wx:key 不支持 "def.id" 这种属性路径，故把 id 提到顶层
  readonly id: string;
  readonly def: IslandLevelDef;
  readonly state: IslandLevelState;
  readonly unlocked: boolean;
  readonly current: boolean;
  readonly progressText: string;
  readonly hint: string;
}

// 存储端口（注入以便单测；默认走 wx 本地存储）
export interface IslandStoragePort {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  remove(key: string): void;
}

export interface MathIslandServiceDeps {
  mathIslandRepository: MathIslandRepository;
  memoryGameRepository: MemoryGameRepository;
  storage?: IslandStoragePort;
}

export interface IslandRunSummary {
  readonly levelId: string;
  readonly levelName: string;
  readonly cleared: boolean;
  readonly success: boolean;
  readonly reason: string;
  readonly stars: number;
  readonly coins: number;
  readonly castleStars: number;
  readonly correct: number;
  readonly wrong: number;
  readonly accuracy: number;
  readonly maxCombo: number;
  readonly unlockedName: string; // 通关后解锁的下一关（'' = 无）
  readonly gainedKeys: number; // 通关**新**关卡才 +1（钥匙最终由全站钱包入账）
}

// 进度来源：页面可以据此提示「当前是离线进度」
export type IslandProgressSource = 'cloud' | 'mirror' | 'empty';

export interface IslandLoadResult {
  readonly progress: IslandProgress;
  readonly source: IslandProgressSource;
}

export interface MathIslandService {
  load(userId: string): Promise<IslandLoadResult>;
  // 返回 rev 已递增的副本：调用方要把它当「最新存档」继续用（连玩多关时尤其重要）
  save(userId: string, progress: IslandProgress): IslandProgress;
  levelViews(progress: IslandProgress): IslandLevelView[];
  currentLevelId(progress: IslandProgress): string | null;
  commitRun(input: {
    userId: string;
    chapterId: string;
    progress: IslandProgress;
    level: IslandLevelDef;
    run: IslandRunState;
    durationMs: number;
  }): { progress: IslandProgress; summary: IslandRunSummary };
}

// 冒险岛这部分的「本域事实」，交给全站钱包做徽章判定。
// 为什么要传出去而不是在自己这里判：徽章只有一份（在 user_game_profile 里），
// 两个地方各判一次就会出现「同一个徽章发两遍」或「漏发」。
export function islandBadgePatchOf(
  progress: IslandProgress,
  maxCombo?: number,
): {
  clearedCount: number;
  cleared: Record<string, boolean>;
  castleBest: number;
  maxCombo?: number;
} {
  const cleared: Record<string, boolean> = {};
  for (const [id, s] of Object.entries(progress.levels)) cleared[id] = s.done;
  return {
    clearedCount: clearedCountOf(progress),
    cleared,
    castleBest: castleBestOf(progress),
    maxCombo,
  };
}

// 当前关卡 = 第一个未通关的；全部通关则返回 null（页面展示「全部通关」）
function currentLevelIdOf(progress: IslandProgress): string | null {
  for (const l of ISLAND_LEVELS) if (!progress.levels[l.id]?.done) return l.id;
  return null;
}

function progressTextOf(
  def: IslandLevelDef,
  state: IslandLevelState,
): { text: string; hint: string } {
  if (state.done) {
    return { text: '已通关', hint: '可以再来一次，练得更快！' };
  }
  if (def.mode === 'forest') {
    const left = Math.max(1, def.target - state.steps);
    return { text: `${state.steps}/${def.target}`, hint: `再答对 ${left} 题就通关啦！` };
  }
  if (def.mode === 'bridge') {
    const left = Math.max(1, def.target - state.planks);
    return { text: `${state.planks}/${def.target} 块桥板`, hint: `再答对 ${left} 题就能过桥！` };
  }
  return { text: '未完成', hint: def.tip };
}

export function createMathIslandService(deps: MathIslandServiceDeps): MathIslandService {
  const storage: IslandStoragePort = deps.storage ?? {
    read(key) {
      try {
        return wx.getStorageSync(key);
      } catch {
        return null; // 存储不可用：按空处理
      }
    },
    write(key, value) {
      try {
        wx.setStorageSync(key, value);
      } catch {
        // 存储空间不足等：镜像丢了还有云端，不打断游戏
      }
    },
    remove(key) {
      try {
        wx.removeStorageSync(key);
      } catch {
        // 清不掉也不影响，下次进页面会以云为准覆盖
      }
    },
  };

  const mirrorKey = (userId: string): string => `${MIRROR_PREFIX}${userId}`;
  const readMirror = (userId: string): IslandProgress | null => {
    const raw = storage.read(mirrorKey(userId));
    return raw === null || raw === undefined || raw === '' ? null : parseProgress(raw);
  };

  // 写云（异步、不 await）：失败一律吞掉，云挂了也要能接着玩
  const pushCloud = (userId: string, progress: IslandProgress): void => {
    const { v: _dropV, ...body } = progress;
    void _dropV;
    void deps.mathIslandRepository.upsert(userId, body).catch(() => undefined);
  };

  return {
    async load(userId) {
      const doc = await withTimeout(
        deps.mathIslandRepository.getByUser(userId),
        LOAD_TIMEOUT_MS,
        '读取冒险岛存档',
      );
      const cloud = doc ? parseProgress(doc) : null;
      const mirror = readMirror(userId);

      // 按 rev 取新的一份。判据不是「云优先」而是「谁更新」：
      // 写云不 await，玩家一打完就回地图页时云端常还停在旧值，
      // 只看云会让刚通关的关卡暗回去、星星变少（家长第一反应就是「没保存」）。
      if (cloud && (!mirror || cloud.rev >= mirror.rev)) {
        storage.write(mirrorKey(userId), cloud);
        return { progress: cloud, source: 'cloud' };
      }
      if (mirror) {
        // 镜像更新 = 云还没落库或上次写云失败 → 补推一次，下次就好了
        if (cloud) pushCloud(userId, mirror);
        return { progress: mirror, source: 'mirror' };
      }
      return { progress: parseProgress(null), source: 'empty' };
    },

    save(userId, progress) {
      // rev 只在这里递增，镜像与云端写同一份值，读档时才能比较两个副本的新旧
      const next: IslandProgress = { ...progress, rev: progress.rev + 1 };
      storage.write(mirrorKey(userId), next); // 先落本机：同步、一定成功
      pushCloud(userId, next);
      return next;
    },

    levelViews(progress) {
      const currentId = currentLevelIdOf(progress);
      return ISLAND_LEVELS.map((def, i) => {
        const state = progress.levels[def.id] ?? emptyLevelState();
        const { text, hint } = progressTextOf(def, state);
        return {
          id: def.id,
          def,
          state,
          unlocked: i === 0 || progress.levels[ISLAND_LEVELS[i - 1]!.id]?.done === true,
          current: def.id === currentId,
          progressText: text,
          hint,
        };
      });
    },

    currentLevelId: currentLevelIdOf,

    commitRun(input) {
      const { level, run, userId } = input;
      const cleared = isLevelCleared(level, run);
      const reward = rewardOf(level, run, cleared);
      const prev = input.progress.levels[level.id] ?? emptyLevelState();

      // 森林步数 / 桥板数即使没通关也保留，下次接着走（不让孩子白走）
      const nextState: IslandLevelState = {
        done: prev.done || cleared,
        steps: Math.max(prev.steps, run.steps),
        planks: Math.max(prev.planks, run.planks),
        castleStars: cleared && level.mode === 'castle' ? reward.castleStars : prev.castleStars,
      };

      const idx = ISLAND_LEVELS.findIndex((l) => l.id === level.id);
      const nextLevel = idx >= 0 ? ISLAND_LEVELS[idx + 1] : undefined;
      const justUnlocked =
        cleared && !prev.done && nextLevel ? `${nextLevel.icon} ${nextLevel.name}` : '';

      // ⚠️ 星星/金币**不再写进岛屿存档**：全站钱包（user_game_profile）是唯一的钱袋子，
      // 这里只保留关卡进度与答题统计。reward 仍算出来，交给调用方入账到钱包。
      const merged = mergeProgress(input.progress, level.id, nextState, {
        stars: 0,
        coins: 0,
        totalQ: run.correct + run.wrong,
        totalC: run.correct,
      });

      // 通关**新**关卡发 1 把钥匙（重玩不再发，否则钥匙会泛滥）——由钱包入账
      const gainedKeys = cleared && !prev.done ? 1 : 0;
      const progress = this.save(userId, merged);

      const summary: IslandRunSummary = {
        levelId: level.id,
        levelName: level.name,
        cleared,
        success: run.success,
        reason: run.reason,
        stars: reward.stars,
        coins: reward.coins,
        castleStars: reward.castleStars,
        correct: run.correct,
        wrong: run.wrong,
        accuracy: accuracyOf(run),
        maxCombo: run.maxCombo,
        unlockedName: justUnlocked,
        gainedKeys,
      };

      // 成绩上云（不 await：存档已落地，云记录失败不该卡住结算页）
      void deps.memoryGameRepository
        .save({
          userId,
          chapterId: input.chapterId,
          knowledgeIds: [],
          score: reward.stars,
          correctCount: run.correct,
          wrongCount: run.wrong,
          duration: Math.max(1, Math.round(input.durationMs / 1000)),
          gameType: 'island',
        })
        .catch(() => undefined);

      return { progress, summary };
    },
  };
}

// 默认实例（页面使用）
export const mathIslandService = createMathIslandService({
  mathIslandRepository,
  memoryGameRepository,
});
