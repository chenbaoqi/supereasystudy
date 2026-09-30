// 选题池（L4 错题优先）单测。
// 核心不变量：错题排在最前、只认池子里的错题、数量不足要补足、超量要截断。
import { describe, expect, it } from 'vitest';
import { pickQuizPool, shuffle } from '../miniprogram/core/quizPool';

interface Item {
  readonly id: string;
}

const item = (id: string): Item => ({ id });
// 固定序列的伪随机：让「洗牌」可复现
const seqRandom = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('pickQuizPool（错题优先）', () => {
  it('错题排在最前面', () => {
    const pool = [item('k1'), item('k2'), item('k3'), item('k4')];
    // random() 恒为 0 → Fisher-Yates 会保持顺序（j=0 交换首位）
    const picked = pickQuizPool({
      pool,
      wrongIds: ['k3'],
      size: 4,
      idOf: (x) => x.id,
      random: () => 0,
    });
    expect(picked.map((x) => x.id)[0]).toBe('k3');
  });

  it('只认池子里存在的错题（跨章错题不混进来）', () => {
    const pool = [item('k1'), item('k2')];
    const picked = pickQuizPool({
      pool,
      wrongIds: ['k9'], // 别的章的错题
      size: 2,
      idOf: (x) => x.id,
      random: () => 0,
    });
    // 不影响结果：仍然只有本章两个，且不凭空出现 k9
    expect(picked.map((x) => x.id).sort()).toEqual(['k1', 'k2']);
  });

  it('错题不够时用其它知识点补足', () => {
    const pool = [item('k1'), item('k2'), item('k3'), item('k4'), item('k5')];
    const picked = pickQuizPool({
      pool,
      wrongIds: ['k1'],
      size: 3,
      idOf: (x) => x.id,
      random: () => 0,
    });
    expect(picked.length).toBe(3);
    expect(picked[0]?.id).toBe('k1');
    expect(new Set(picked.map((x) => x.id)).size).toBe(3); // 不重复
  });

  it('池子比要的少 → 有多少给多少，不报错', () => {
    const pool = [item('k1'), item('k2')];
    const picked = pickQuizPool({
      pool,
      wrongIds: [],
      size: 10,
      idOf: (x) => x.id,
      random: () => 0.5,
    });
    expect(picked.length).toBe(2);
  });

  it('size 为 0 或池子为空 → 空数组', () => {
    const one: Item[] = [item('k1')];
    const none: Item[] = [];
    expect(
      pickQuizPool({ pool: one, wrongIds: [], size: 0, idOf: (x) => x.id, random: () => 0 }),
    ).toEqual([]);
    expect(
      pickQuizPool({ pool: none, wrongIds: ['k1'], size: 5, idOf: (x) => x.id, random: () => 0 }),
    ).toEqual([]);
  });

  it('全部都是错题时也不重复', () => {
    const pool = [item('k1'), item('k2'), item('k3')];
    const picked = pickQuizPool({
      pool,
      wrongIds: ['k1', 'k2', 'k3'],
      size: 3,
      idOf: (x) => x.id,
      random: seqRandom(0.9, 0.1, 0.5),
    });
    expect(new Set(picked.map((x) => x.id)).size).toBe(3);
  });
});

describe('shuffle', () => {
  it('不增不减、不重复', () => {
    const out = shuffle([1, 2, 3, 4, 5], seqRandom(0.9, 0.2, 0.7, 0.1));
    expect(out.length).toBe(5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('不修改原数组', () => {
    const src = [1, 2, 3];
    shuffle(src, () => 0);
    expect(src).toEqual([1, 2, 3]);
  });
});
