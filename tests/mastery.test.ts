// 掌握度引擎单测（B-4，需求第三十四章）。
// 覆盖：分档边界、样本不足护栏、遗忘衰减、非法输入兜底、满分/零分场景。
import { describe, expect, it } from 'vitest';
import { bandOf, computeMastery, MIN_SAMPLES, SMALL_SAMPLE_CAP } from '../miniprogram/core/mastery';
import type { MasteryInput } from '../miniprogram/core/mastery';

const base: MasteryInput = {
  practiceCount: 10,
  firstTryCorrectRate: 1,
  recentCorrectRate: 1,
  hintUsedRate: 0,
  wrongFixedRate: 1,
};

describe('computeMastery', () => {
  it('没练过 = 0 分，而不是默认 50 分', () => {
    expect(computeMastery({ ...base, practiceCount: 0 })).toBe(0);
  });

  it('全对且无提示且错题全修复 = 100 分', () => {
    expect(computeMastery(base)).toBe(100);
  });

  it('全错 = 0 分', () => {
    expect(
      computeMastery({
        practiceCount: 10,
        firstTryCorrectRate: 0,
        recentCorrectRate: 0,
        hintUsedRate: 1,
        wrongFixedRate: 0,
      }),
    ).toBe(0);
  });

  it('样本不足时封顶 60（3 次全对不足以判定已掌握）', () => {
    for (let n = 1; n < MIN_SAMPLES; n += 1) {
      expect(computeMastery({ ...base, practiceCount: n }), `count=${n}`).toBe(SMALL_SAMPLE_CAP);
    }
    // 达到阈值后不再封顶
    expect(computeMastery({ ...base, practiceCount: MIN_SAMPLES })).toBe(100);
  });

  it('长期未练会衰减，且不低于衰减下限', () => {
    const fresh = computeMastery(base);
    const stale = computeMastery({ ...base, daysSinceLastPractice: 120 });
    const ancient = computeMastery({ ...base, daysSinceLastPractice: 3650 });
    expect(stale).toBeLessThan(fresh);
    expect(ancient).toBeGreaterThanOrEqual(Math.round(fresh * 0.7));
    expect(ancient).toBeLessThanOrEqual(stale);
  });

  it('30 天内不衰减', () => {
    expect(computeMastery({ ...base, daysSinceLastPractice: 30 })).toBe(freshScore());
  });

  it('非法/越界输入被夹紧，不产生 NaN 或越界分数', () => {
    const bad = computeMastery({
      practiceCount: 5,
      firstTryCorrectRate: 5, // >1
      recentCorrectRate: -3, // <0
      hintUsedRate: Number.NaN,
      wrongFixedRate: 2,
    });
    expect(Number.isFinite(bad)).toBe(true);
    expect(bad).toBeGreaterThanOrEqual(0);
    expect(bad).toBeLessThanOrEqual(100);
  });

  it('分数始终落在 0-100', () => {
    for (let i = 0; i < 200; i += 1) {
      const s = computeMastery({
        practiceCount: i % 20,
        firstTryCorrectRate: (i % 11) / 10,
        recentCorrectRate: (i % 7) / 6,
        hintUsedRate: (i % 5) / 4,
        wrongFixedRate: (i % 3) / 2,
        daysSinceLastPractice: i * 3,
      });
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe('bandOf（需求第三十四章分档）', () => {
  it('边界值分档正确', () => {
    expect(bandOf(0)).toBe('unmastered');
    expect(bandOf(39)).toBe('unmastered');
    expect(bandOf(40)).toBe('weak');
    expect(bandOf(59)).toBe('weak');
    expect(bandOf(60)).toBe('learning');
    expect(bandOf(79)).toBe('learning');
    expect(bandOf(80)).toBe('mastered');
    expect(bandOf(94)).toBe('mastered');
    expect(bandOf(95)).toBe('fluent');
    expect(bandOf(100)).toBe('fluent');
  });
});

function freshScore(): number {
  return computeMastery(base);
}
