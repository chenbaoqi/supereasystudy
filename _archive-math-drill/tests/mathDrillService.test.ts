// MathDrillService 单元测试（二期·数学速算）。
// 覆盖：generateProblem 生成的题面与答案自洽（含除法整除、减法非负、乘法在学段范围内）；
// startGame 产出指定题量；finishGame 记录携带 gameType='drill' 并登记结果通道。
import { describe, expect, it } from 'vitest';
import { createMathDrillService, generateProblem } from '../miniprogram/services/mathDrillService';
import type { MemoryGameRecordCreate } from '../miniprogram/repositories/memoryGameRepository';

// 可复现随机源（mulberry32），便于断言稳定
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const recompute = (op: string, a: number, b: number): number => {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return a / b;
    default:
      throw new Error(`unknown op ${op}`);
  }
};

describe('generateProblem', () => {
  for (const stage of ['primary', 'junior'] as const) {
    it(`[${stage}] 题面与答案自洽，且为非负整数`, () => {
      const random = seeded(stage === 'primary' ? 1 : 2);
      for (let i = 0; i < 300; i += 1) {
        const p = generateProblem(stage, random);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(recompute(p.op, p.operands[0], p.operands[1])).toBe(p.answer);
        // 除法必须整除（无余数）
        if (p.op === '÷') {
          expect(p.operands[0] % p.operands[1]).toBe(0);
        }
        // 减法非负
        if (p.op === '-') {
          expect(p.operands[0]).toBeGreaterThanOrEqual(p.operands[1]);
        }
      }
    });
  }

  it('小学乘法因子在 2..9，初中乘法因子更大', () => {
    const random = seeded(7);
    let primaryMaxFactor = 0;
    let juniorMaxFactor = 0;
    for (let i = 0; i < 500; i += 1) {
      const pp = generateProblem('primary', random);
      if (pp.op === '×')
        primaryMaxFactor = Math.max(primaryMaxFactor, pp.operands[0], pp.operands[1]);
      const pj = generateProblem('junior', random);
      if (pj.op === '×')
        juniorMaxFactor = Math.max(juniorMaxFactor, pj.operands[0], pj.operands[1]);
    }
    expect(primaryMaxFactor).toBeLessThanOrEqual(9);
    expect(juniorMaxFactor).toBeGreaterThan(9);
  });

  it('相同随机源产出可复现', () => {
    const a = generateProblem('primary', seeded(42));
    const b = generateProblem('primary', seeded(42));
    expect(a).toEqual(b);
  });
});

describe('MathDrillService', () => {
  it('startGame 产出指定题量', () => {
    const service = createMathDrillService({ memoryGameRepository: {} as never });
    const start = service.startGame('primary', 20, seeded(3));
    expect(start.problems).toHaveLength(20);
  });

  it('finishGame 记录 gameType=drill 并登记结果通道', async () => {
    const saved: MemoryGameRecordCreate[] = [];
    const service = createMathDrillService({
      memoryGameRepository: {
        async save(input) {
          saved.push(input);
          return { _id: 'r1', ...input, createdAt: new Date(), updatedAt: new Date() };
        },
        async listByUser() {
          return [];
        },
      },
    });
    const start = service.startGame('primary', 5, seeded(5));
    const detail = await service.finishGame({
      userId: 'u1',
      chapterId: 'ch-1',
      score: 88,
      correctCount: 4,
      wrongCount: 1,
      responseTimes: [900, 1100, 800, 1300, 1000],
    });
    expect(saved[0]?.gameType).toBe('drill');
    expect(saved[0]?.knowledgeIds).toEqual([]);
    expect(saved[0]?.avgResponseMs).toBe(1020);
    expect(detail.gameType).toBe('drill');
    expect(detail.replayUrl).toBe('/pages/math-drill/math-drill');
    expect(start.problems).toHaveLength(5);
  });
});
