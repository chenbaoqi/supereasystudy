// Memory Challenge 逻辑模块单测（Chapter 07 §5 + Q2/Q3/Q6 确认方案）。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import {
  buildDeck,
  isMatch,
  scoreForCorrect,
  scoreForWrong,
  selectPool,
  timeBonus,
  GAME_MIN_POOL,
  GAME_POOL_SIZE,
} from '../miniprogram/services/memoryGameLogic';

const makeKnowledge = (id: string, order: number): Knowledge => ({
  _id: id,
  chapterId: 'chapter-1',
  word: `word-${id}`,
  meaning: `释义-${id}`,
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const list = Array.from({ length: 12 }, (_, index) => makeKnowledge(`k${index + 1}`, index + 1));

const seededRandom = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0.5;
};

describe('selectPool（2026-07-19 修订：全部章节知识，与 progress 脱钩）', () => {
  it('章节 ≤10 个知识点 → 全用', () => {
    expect(selectPool(list.slice(0, 5), seededRandom([0.5])).pool).toHaveLength(5);
    expect(selectPool(list.slice(0, GAME_POOL_SIZE), seededRandom([0.5])).pool).toHaveLength(
      GAME_POOL_SIZE,
    );
  });

  it('章节 >10 个 → 随机抽 10（均来自本章节）', () => {
    const { pool } = selectPool(list, seededRandom([0.1, 0.9]));
    expect(pool).toHaveLength(GAME_POOL_SIZE);
    for (const item of pool) expect(list).toContainEqual(item);
  });

  it('门槛：章节知识点 <4 → 不可开局（与是否学习无关）', () => {
    expect(selectPool(list.slice(0, 3), seededRandom([0.5])).eligible).toBe(false);
    expect(selectPool(list.slice(0, GAME_MIN_POOL), seededRandom([0.5])).eligible).toBe(true);
  });
});

describe('buildDeck', () => {
  it('每个知识点生成一对（单词卡+释义卡）', () => {
    const deck = buildDeck(list.slice(0, 4), seededRandom([0.1, 0.9]));
    expect(deck).toHaveLength(8);
    const words = deck.filter((card) => card.kind === 'word');
    const meanings = deck.filter((card) => card.kind === 'meaning');
    expect(words).toHaveLength(4);
    expect(meanings).toHaveLength(4);
    expect(new Set(deck.map((card) => card.knowledgeId)).size).toBe(4);
    expect(deck.every((card) => !card.eliminated)).toBe(true);
  });
});

describe('isMatch / 计分（Q2）', () => {
  const [word, meaning] = buildDeck(list.slice(0, 1), seededRandom([0.5]));
  const other = buildDeck(list.slice(1, 2), seededRandom([0.5]));

  it('同知识点一词一义 → 配对成功', () => {
    expect(word && meaning && isMatch(word, meaning)).toBe(true);
  });

  it('不同知识点 → 配对失败', () => {
    expect(word && other[0] && isMatch(word, other[0])).toBe(false);
  });

  it('答对：+10 基础分 + 连击加成（+2×新连击数）', () => {
    expect(scoreForCorrect(0)).toEqual({ delta: 12, newStreak: 1 }); // 10+2×1
    expect(scoreForCorrect(2)).toEqual({ delta: 16, newStreak: 3 }); // 10+2×3
  });

  it('答错：-2 且总分下限 0，连击清零（由调用方重置）', () => {
    expect(scoreForWrong(10)).toBe(8);
    expect(scoreForWrong(1)).toBe(0);
  });

  it('时间 Bonus：+1 分/剩余秒，负值兜底 0', () => {
    expect(timeBonus(15)).toBe(15);
    expect(timeBonus(-3)).toBe(0);
  });
});
