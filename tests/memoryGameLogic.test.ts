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

  it('游戏只针对记单词（Owner 2026-07-30）：语法点被过滤出游戏池', () => {
    const withGrammar = [
      ...list.slice(0, 3),
      { ...list[3]!, type: 'grammar' as const },
      { ...list[4]!, type: 'grammar' as const },
    ];
    const { pool, eligible } = selectPool(withGrammar, seededRandom([0.5]));
    expect(pool.every((item) => item.type !== 'grammar')).toBe(true);
    expect(pool).toHaveLength(3); // 5 个知识点只剩 3 个单词
    expect(eligible).toBe(false); // 单词 <4 → 不可开局
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

// L4：错过的知识点要在下一局游戏里优先再出现一次（同章优先，不跨章）
describe('selectPool 错题优先', () => {
  // 12 个 > GAME_POOL_SIZE(10)，会走「挑选」分支
  it('错题排在最前面', () => {
    const { pool } = selectPool(list, () => 0, ['k7', 'k12']);
    expect(pool.length).toBe(GAME_POOL_SIZE);
    const ids = pool.map((item) => item._id);
    expect(ids.slice(0, 2).sort()).toEqual(['k12', 'k7']);
  });

  it('不传错题 → 与老行为一致（仍然抽满且不重复）', () => {
    const { pool } = selectPool(list, () => 0.5);
    expect(pool.length).toBe(GAME_POOL_SIZE);
    expect(new Set(pool.map((item) => item._id)).size).toBe(GAME_POOL_SIZE);
  });

  it('跨章的错题不会被硬塞进来（池子里没有就当没有）', () => {
    const { pool } = selectPool(list, () => 0, ['别章的错题']);
    expect(pool.map((item) => item._id)).not.toContain('别章的错题');
    expect(pool.length).toBe(GAME_POOL_SIZE);
  });

  it('池子装得下时全上（错题自然都在里面，不需要挑）', () => {
    const small = list.slice(0, GAME_POOL_SIZE - 2);
    const { pool } = selectPool(small, () => 0.9, ['k1']);
    expect(pool.length).toBe(small.length);
  });
});
