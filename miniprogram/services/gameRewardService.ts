// 游戏结算 → 全站钱包入账的统一门面（L1「玩哪个游戏都在长大」）。
//
// 为什么单独抽一层：消消乐 / 极速选择 / 听音找词 / 小蜜蜂 / 语法闯关 的结算本质都是
// 「一局里答对了几题」，换算规则完全一样——写在 5 个 service 里就会出现 5 份会漂移的副本。
// 冒险岛**不走这里**：它有 7 关的关卡奖励档，星币由 core/mathIsland 自己算，
// 只在结算时直接调 gameProfileService.reward()（见 math-island-run.ts）。
//
// ⚠️ 入账失败一律吞掉并返回 null：钱包是「锦上添花」，绝不能因为它读不到云
//    就让结算页崩掉或转圈（教训见 utils/withTimeout）。
import type { BadgeDef } from '../core/growth';
import { rewardOfRun } from '../core/growth';
import {
  REWARD_COIN_PER_CORRECT,
  REWARD_RATE_BONUS,
  REWARD_STAR_PER_CORRECT,
} from '../config/growth';
import type { BadgePatch, GameProfileService } from './gameProfileService';
import { gameProfileService } from './gameProfileService';
import type { AttemptSyncer } from './gameResultSyncService';
import { gameResultSync } from './gameResultSyncService';
import { withTimeout } from '../utils/withTimeout';

// 结算入账最多等这么久（profile.load 自己还有 6s 兜底，这里卡的是**结算页**的等待时间）
const REWARD_WAIT_MS = 2000;

export interface RunRewardInput {
  readonly userId: string;
  readonly gameId: string; // 钱包里的 key（与 config/games.ts 的 id 一致）
  readonly correct: number; // 本局答对题数
  readonly total: number; // 本局总题数（算答对率）
  readonly badge?: BadgePatch; // 本游戏域内的事实，交给钱包判徽章
  /**
   * L3 回流：本局逐题的对错（都是 knowledgeId）。
   * 不传 = 不回流（情景闯关按 Owner 拍板暂不进错题本；冒险岛的题目没有知识点可挂）。
   */
  readonly attempts?: RunAttempts;
}

export interface RunAttempts {
  readonly correctIds: readonly string[];
  readonly wrongIds: readonly string[]; // 答错 + 超时（与各游戏 finishGame 同口径）
}

export interface RunRewardResult {
  readonly stars: number;
  readonly coins: number;
  readonly newBadges: readonly BadgeDef[];
  readonly gainText: string; // 例「⭐+12 + 全角空格 + 🪙+22」；一题没对时为空串（页面据此隐藏）
  readonly badgeText: string; // 例「🎉 解锁徽章 🌱初次出发」
}

// 各游戏 service 只依赖这个窄接口（注入替身即可单测，不必碰 wx）
export interface RunRewarder {
  reward(input: RunRewardInput): Promise<RunRewardResult | null>;
}

export interface GameRewardServiceDeps {
  profile: GameProfileService;
  /** L3 回流器（缺省 = 真实服务；单测注入替身即可断言「有没有被喂进来」） */
  syncer?: AttemptSyncer;
  waitMs?: number; // 单测里调小以覆盖「等不及」这条路径
}

// 结算文案的分隔符必须是**全角空格**：小程序文本节点会折叠连续普通空格，
// 「⭐+12 🪙+22」会粘成一块。写成转义是为了躲开 eslint 的 no-irregular-whitespace
// （该规则对模板字符串里的非常规空白报错，普通字符串才跳过）。
export const GAIN_SEP = '\u3000';

// 冒险岛与其它游戏共用同一套文案口径（用全角空格拼接非空片段）
export const gainTextOf = (parts: readonly string[]): string =>
  parts.filter((p) => p !== '').join(GAIN_SEP);

const badgeTextOf = (badges: readonly BadgeDef[]): string =>
  badges.length > 0 ? `🎉 解锁徽章 ${badges.map((b) => `${b.icon}${b.name}`).join('、')}` : '';

const gainOf = (stars: number, coins: number): string =>
  stars + coins > 0 ? gainTextOf([`⭐+${stars}`, `🪙+${coins}`]) : '';

export function createGameRewardService(deps: GameRewardServiceDeps): RunRewarder {
  return {
    async reward(input) {
      const { stars, coins } = rewardOfRun(
        { correct: input.correct, total: input.total },
        {
          starPerCorrect: REWARD_STAR_PER_CORRECT,
          coinPerCorrect: REWARD_COIN_PER_CORRECT,
          tiers: REWARD_RATE_BONUS,
        },
      );
      // ⚠️ 只等 REWARD_WAIT_MS：结算页不能因为云慢就卡在转圈上。
      // withTimeout 不取消底层 Promise——超时的那条链会在后台把档写完，
      // 这里只是**不再等它**，照常把本局所得交给页面（孩子该看到的正反馈不该被基础设施吃掉）。
      const done = await withTimeout(
        (async () => {
          const loaded = await deps.profile.load(input.userId);
          return deps.profile.reward({
            userId: input.userId,
            profile: loaded.profile,
            stars,
            coins,
            correct: input.correct,
            gameId: input.gameId,
            badge: input.badge,
          });
        })(),
        deps.waitMs ?? REWARD_WAIT_MS,
        '游戏结算入账',
      );
      // L3 回流：把本局对错写进掌握度与错题本。
      // ⚠️ 完全不参与上面的等待——结算页的正反馈一秒都不能晚，
      // 回流慢了最多是「错题晚几秒出现」，慢不起的是孩子眼前这一屏。
      if (input.attempts) {
        void Promise.resolve(
          (deps.syncer ?? gameResultSync).sync({
            userId: input.userId,
            source: input.gameId,
            correctIds: input.attempts.correctIds,
            wrongIds: input.attempts.wrongIds,
          }),
        ).catch((error: unknown) => console.error('结果回流失败', error));
      }
      return {
        stars,
        coins,
        newBadges: done?.newBadges ?? [],
        gainText: gainOf(stars, coins),
        badgeText: badgeTextOf(done?.newBadges ?? []),
      };
    },
  };
}

export const gameRewardService: RunRewarder = createGameRewardService({
  profile: gameProfileService,
  syncer: gameResultSync,
});

// 结果页要的最小视图（与 gameResultStore.GameResultWallet 同构）。
// 抽出来是因为 5 个游戏都要写这段「没收获就不显示」的判断，各写一份必漂移。
export interface WalletGainView {
  readonly gain: string;
  readonly badges: string;
}

export const walletViewOf = (res: RunRewardResult | null): WalletGainView | undefined =>
  res && (res.gainText || res.badgeText)
    ? { gain: res.gainText, badges: res.badgeText }
    : undefined;
