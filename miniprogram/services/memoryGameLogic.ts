// Memory Challenge 纯逻辑模块（Chapter 07 §5 规则 + Q2/Q3/Q6 确认方案）。
// 玩法（Owner 2026-07-19 定）：消消乐——卡片全部明面，点选「单词+释义」配对消除，全部消除获胜。
// 纯函数、零 wx 依赖：全部规则集中在可单测的纯模块，页面只负责渲染与计时。
import type { Knowledge } from '../core/knowledge';

export interface MemoryCard {
  readonly cardId: string; // `${knowledgeId}-word|meaning`
  readonly knowledgeId: string;
  readonly text: string;
  readonly kind: 'word' | 'meaning';
  readonly eliminated: boolean; // 消消乐：配对成功即消除
}

// 每局限时（§5：60 秒）
export const GAME_DURATION_SECONDS = 60;
// 每局默认知识点数（§5：默认 10 个）
export const GAME_POOL_SIZE = 10;
// 开局门槛（Q3：已学习 <4 个知识点提示先完成学习）
export const GAME_MIN_POOL = 4;
// 计分（Q2）：正确 +10；连击加成 +2×新连击数；错误 -2 且下限 0；时间 Bonus +1/剩余秒
export const SCORE_CORRECT = 10;
export const SCORE_COMBO_PER_STREAK = 2;
export const SCORE_WRONG = -2;
export const SCORE_TIME_BONUS_PER_SECOND = 1;

// 游戏池：当前章节全部知识点（2026-07-19 Owner 修订：不再要求「已学习」，
// 挑战可直接进行）；>10 个随机抽取（每局不同）；门槛 = 章节知识点 ≥ GAME_MIN_POOL
export function selectPool(
  knowledgeList: readonly Knowledge[],
  random: () => number,
): { pool: Knowledge[]; eligible: boolean } {
  const eligible = knowledgeList.length >= GAME_MIN_POOL;
  const pool =
    knowledgeList.length <= GAME_POOL_SIZE
      ? [...knowledgeList]
      : shuffle(knowledgeList, random).slice(0, GAME_POOL_SIZE);
  return { pool, eligible };
}

const shuffle = <T>(list: readonly T[], random: () => number): T[] =>
  [...list].sort(() => random() - 0.5);

// 组牌：每个知识点一对（单词卡 + 释义卡），洗牌
export function buildDeck(pool: readonly Knowledge[], random: () => number): MemoryCard[] {
  const cards = pool.flatMap((item): MemoryCard[] => [
    {
      cardId: `${item._id}-word`,
      knowledgeId: item._id,
      text: item.word,
      kind: 'word',
      eliminated: false,
    },
    {
      cardId: `${item._id}-meaning`,
      knowledgeId: item._id,
      text: item.meaning,
      kind: 'meaning',
      eliminated: false,
    },
  ]);
  return shuffle(cards, random);
}

// 配对判定：同知识点且一词一义
export function isMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.knowledgeId === b.knowledgeId && a.kind !== b.kind;
}

// 答对得分（Q2）：+10 基础分 + 连击加成（streakBefore=此前连击，新连击=streakBefore+1）
export function scoreForCorrect(streakBefore: number): { delta: number; newStreak: number } {
  const newStreak = streakBefore + 1;
  return { delta: SCORE_CORRECT + SCORE_COMBO_PER_STREAK * newStreak, newStreak };
}

// 答错得分（Q2）：-2 且总分下限 0，连击清零
export function scoreForWrong(currentScore: number): number {
  return Math.max(0, currentScore + SCORE_WRONG);
}

// 时间 Bonus（Q2）：全部配对提前完成 → +1 分/剩余秒
export function timeBonus(remainingSeconds: number): number {
  return Math.max(0, remainingSeconds) * SCORE_TIME_BONUS_PER_SECOND;
}
