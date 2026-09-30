// 分数模型单测（B-7 组件 math-fraction 的纯逻辑层）。
// 分数图最容易错的就是「份数」：分母画错、假分数不拆、约分错，
// 学生看到的就是一个错的数。这些必须锁死。
import { describe, expect, it } from 'vitest';
import {
  compareFraction,
  computeCompareView,
  computeView,
  fractionOfInput,
  gcd,
  labelOf,
  normalize,
  parseFraction,
  valueOf,
} from '../miniprogram/utils/fraction';

const view = (numerator: unknown, denominator: unknown, whole = 0) =>
  computeView({ numerator, denominator, whole });

function fractionOf(text: string) {
  const parsed = parseFraction(text);
  if (!parsed) throw new Error(`解析失败: ${text}`);
  return parsed;
}

describe('normalize（化成带分数）', () => {
  it('真分数原样', () => {
    expect(normalize(3, 4)).toEqual({ whole: 0, numerator: 3, denominator: 4 });
  });

  it('假分数拆成带分数：5/4 → 1 又 1/4', () => {
    expect(normalize(5, 4)).toEqual({ whole: 1, numerator: 1, denominator: 4 });
  });

  it('刚好整除：5/5 → 1（分子归零，不留 0/5）', () => {
    expect(normalize(5, 5)).toEqual({ whole: 1, numerator: 0, denominator: 5 });
  });

  it('7/3 → 2 又 1/3', () => {
    expect(normalize(7, 3)).toEqual({ whole: 2, numerator: 1, denominator: 3 });
  });

  it('分母为 0 → 分母记 0（调用方据此判无效）', () => {
    expect(normalize(3, 0).denominator).toBe(0);
  });

  it('负分子按 0 处理（小学不出现负分数，不报错）', () => {
    expect(normalize(-1, 2)).toEqual({ whole: 0, numerator: 0, denominator: 2 });
  });

  it('字符串入参也能算（wxml 传过来可能是字符串）', () => {
    expect(normalize('5', '4')).toEqual({ whole: 1, numerator: 1, denominator: 4 });
  });

  it('非数字入参按 0 处理，不产生 NaN', () => {
    expect(normalize('abc', 4)).toEqual({ whole: 0, numerator: 0, denominator: 4 });
  });
});

describe('gcd', () => {
  it('常规', () => {
    expect(gcd(75, 100)).toBe(25);
  });
  it('互质', () => {
    expect(gcd(3, 4)).toBe(1);
  });
  it('含 0', () => {
    expect(gcd(0, 5)).toBe(5);
  });
});

describe('labelOf（显示的分数文字）', () => {
  it('0 显示「0」而不是「0/4」', () => {
    expect(labelOf({ whole: 0, numerator: 0, denominator: 4 })).toBe('0');
  });
  it('真分数', () => {
    expect(labelOf({ whole: 0, numerator: 3, denominator: 4 })).toBe('3/4');
  });
  it('带分数', () => {
    expect(labelOf({ whole: 1, numerator: 3, denominator: 4 })).toBe('1 3/4');
  });
  it('整数只显示整数，不显示「1 0/4」', () => {
    expect(labelOf({ whole: 1, numerator: 0, denominator: 4 })).toBe('1');
  });
});

describe('computeView（画图数据）', () => {
  it('3/4：4 份涂 3 份', () => {
    const v = view(3, 4);
    expect(v.valid).toBe(true);
    expect(v.segmented).toBe(true);
    expect(v.segments).toHaveLength(4);
    expect(v.segments.filter((s) => s.filled)).toHaveLength(3);
    expect(v.label).toBe('3/4');
    expect(v.fillPercent).toBe(75);
  });

  it('假分数 5/4 画成两个整体：8 份涂 5 份', () => {
    const v = view(5, 4);
    expect(v.segments).toHaveLength(8);
    expect(v.segments.filter((s) => s.filled)).toHaveLength(5);
    expect(v.label).toBe('1 1/4');
  });

  it('带分数 1 又 3/4（whole=1, 3/4）：8 份涂 7 份', () => {
    const v = view(3, 4, 1);
    expect(v.segments).toHaveLength(8);
    expect(v.segments.filter((s) => s.filled)).toHaveLength(7);
    expect(v.label).toBe('1 3/4');
  });

  it('groupStart 标出每个整体的第一份（画分隔用）', () => {
    const v = view(5, 4);
    expect(v.segments.map((s) => s.groupStart)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('0/4 不涂任何份', () => {
    const v = view(0, 4);
    expect(v.segments.filter((s) => s.filled)).toHaveLength(0);
    expect(v.fillPercent).toBe(0);
  });

  it('★ 分母为 0 → invalid（不画出错的图）', () => {
    expect(view(3, 0).valid).toBe(false);
  });

  it('分母没传 → invalid', () => {
    expect(view(3, null).valid).toBe(false);
    expect(view(null, null).valid).toBe(false);
  });

  it('★ 分母过大（100）改画连续条，不逐份画', () => {
    const v = view(37, 100);
    expect(v.segmented).toBe(false);
    expect(v.segments).toHaveLength(0);
    expect(v.fillPercent).toBe(37);
  });

  it('分母 24 仍在逐份范围内', () => {
    expect(view(1, 24).segmented).toBe(true);
  });

  it('分母 25 超出逐份范围', () => {
    expect(view(1, 25).segmented).toBe(false);
  });

  it('份数不会失控（whole 很大时也不炸）', () => {
    const v = view(1, 12, 10);
    expect(v.segmented).toBe(false); // (10+1)*12 = 132 > 48
    expect(v.segments).toHaveLength(0);
  });
});

describe('valueOf / compareFraction', () => {
  it('带分数转小数', () => {
    expect(valueOf({ whole: 1, numerator: 3, denominator: 4 })).toBe(1.75);
  });

  it('2/3 < 3/4（分母不同不能直接比分子）', () => {
    expect(compareFraction({ whole: 0, numerator: 2, denominator: 3 }, fractionOf('3/4'))).toBe(-1);
  });

  it('★ 1/2 = 2/4（约分后相等，浮点尾差不能判成不等）', () => {
    expect(compareFraction(fractionOf('1/2'), fractionOf('2/4'))).toBe(0);
  });

  it('1/3 = 3/9（无限小数也要判等）', () => {
    expect(compareFraction(fractionOf('1/3'), fractionOf('3/9'))).toBe(0);
  });

  it('3/4 > 2/3', () => {
    expect(compareFraction(fractionOf('3/4'), fractionOf('2/3'))).toBe(1);
  });
});

describe('parseFraction（字符串 → 分数）', () => {
  it('真分数 3/4', () => {
    expect(parseFraction('3/4')).toEqual({ whole: 0, numerator: 3, denominator: 4 });
  });

  it('带分数 1 3/4', () => {
    expect(parseFraction('1 3/4')).toEqual({ whole: 1, numerator: 3, denominator: 4 });
  });

  it('假分数 5/4 自动化带分数', () => {
    expect(parseFraction('5/4')).toEqual({ whole: 1, numerator: 1, denominator: 4 });
  });

  it('整数 5', () => {
    expect(parseFraction('5')).toEqual({ whole: 5, numerator: 0, denominator: 1 });
  });

  it('小数 0.75 约分成 3/4', () => {
    expect(parseFraction('0.75')).toEqual({ whole: 0, numerator: 3, denominator: 4 });
  });

  it('小数 1.5 → 1 1/2', () => {
    expect(parseFraction('1.5')).toEqual({ whole: 1, numerator: 1, denominator: 2 });
  });

  it('分母为 0 → 解析失败', () => {
    expect(parseFraction('3/0')).toBeNull();
  });

  it('空串 / 乱输入 → 解析失败', () => {
    expect(parseFraction('')).toBeNull();
    expect(parseFraction('abc')).toBeNull();
    expect(parseFraction('1/2/3')).toBeNull();
  });
});

describe('computeCompareView（比大小）', () => {
  it('没传 compare → 只有第一条，无大小关系', () => {
    const v = computeCompareView({ numerator: 3, denominator: 4, whole: 0, compare: '' });
    expect(v.b).toBeNull();
    expect(v.relation).toBe('');
  });

  it('2/3 vs 3/4 → 2/3 < 3/4', () => {
    const v = computeCompareView({ numerator: 2, denominator: 3, whole: 0, compare: '3/4' });
    expect(v.relation).toBe('<');
    expect(v.b?.label).toBe('3/4');
  });

  it('3/4 vs 2/3 → 3/4 > 2/3', () => {
    const v = computeCompareView({ numerator: 3, denominator: 4, whole: 0, compare: '2/3' });
    expect(v.relation).toBe('>');
  });

  it('1/2 vs 2/4 → 相等', () => {
    const v = computeCompareView({ numerator: 1, denominator: 2, whole: 0, compare: '2/4' });
    expect(v.relation).toBe('=');
  });

  it('compare 解析不出来 → 退回只画第一条（不画半个比较）', () => {
    const v = computeCompareView({ numerator: 1, denominator: 2, whole: 0, compare: 'x/y' });
    expect(v.b).toBeNull();
    expect(v.relation).toBe('');
  });

  it('比较用的是化带分数后的值（5/4 vs 1 1/4 相等）', () => {
    const v = computeCompareView({ numerator: 5, denominator: 4, whole: 0, compare: '1 1/4' });
    expect(v.relation).toBe('=');
  });
});

describe('fractionOfInput（入参收口）', () => {
  it('whole 为脏值时按 0 处理', () => {
    expect(fractionOfInput({ whole: 'x', numerator: 1, denominator: 2 })).toEqual({
      whole: 0,
      numerator: 1,
      denominator: 2,
    });
  });

  it('whole + 假分数合并：whole=1, 5/4 → 2 又 1/4', () => {
    expect(fractionOfInput({ whole: 1, numerator: 5, denominator: 4 })).toEqual({
      whole: 2,
      numerator: 1,
      denominator: 4,
    });
  });
});
