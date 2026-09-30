// 数轴计算单测（B-7 组件 math-number-line 的纯逻辑层）。
// 数轴画错一格，学生会记错一个知识点——这些必须锁死，不能靠肉眼看截图。
import { describe, expect, it } from 'vitest';
import {
  clamp,
  computeView,
  formatTick,
  percentOf,
  ticksOf,
} from '../miniprogram/utils/numberLine';

describe('ticksOf（刻度序列）', () => {
  it('含两端端点', () => {
    expect(ticksOf(0, 5, 1)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('小数步进不产生浮点尾巴（0.1 累加会滚雪球，这里用乘法）', () => {
    expect(ticksOf(0, 0.5, 0.1)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('右端没被 step 整除时补上 max（数轴右端必须有刻度）', () => {
    expect(ticksOf(0, 10, 3)).toEqual([0, 3, 6, 9, 10]);
  });

  it('step <= 0 不死循环，退化为只画两端', () => {
    expect(ticksOf(0, 10, 0)).toEqual([0, 10]);
    expect(ticksOf(0, 10, -1)).toEqual([0, 10]);
  });

  it('min > max（区间写反）不崩', () => {
    expect(ticksOf(5, 0, 1)).toEqual([5]);
  });

  it('起点非 0 也能算（如 -3 ~ 3）', () => {
    expect(ticksOf(-3, 3, 3)).toEqual([-3, 0, 3]);
  });
});

describe('percentOf（位置换算）', () => {
  it('中点 = 50%', () => {
    expect(percentOf(5, 0, 10)).toBe(50);
  });

  it('负数区间：0 在 -10~10 的正中', () => {
    expect(percentOf(0, -10, 10)).toBe(50);
  });

  it('超出区间的值被夹住（不会画到轴外面）', () => {
    expect(percentOf(-5, 0, 10)).toBe(0);
    expect(percentOf(99, 0, 10)).toBe(100);
  });

  it('区间长度为 0 不做除法（不会出 Infinity/NaN）', () => {
    expect(percentOf(3, 3, 3)).toBe(0);
  });
});

describe('formatTick（刻度文字）', () => {
  it('整数刻度不带小数点', () => {
    expect(formatTick(3, 1)).toBe('3');
  });

  it('按 step 的小数位数显示', () => {
    expect(formatTick(0.5, 0.1)).toBe('0.5');
    expect(formatTick(1.25, 0.25)).toBe('1.25');
  });

  it('末尾的 0 抹掉（不显示 1.00 / 0.50）', () => {
    expect(formatTick(1, 0.01)).toBe('1');
    expect(formatTick(0.5, 0.01)).toBe('0.5');
  });

  it('0 显示成 0 而不是空串', () => {
    expect(formatTick(0, 0.5)).toBe('0');
  });
});

describe('computeView（组件视图数据）', () => {
  it('给了 value 才算标记点，不传则不画', () => {
    const withValue = computeView({
      min: 0,
      max: 10,
      step: 1,
      value: 5,
      rangeFrom: null,
      rangeTo: null,
    });
    expect(withValue.hasValue).toBe(true);
    expect(withValue.valueLeft).toBe(50);

    const noValue = computeView({
      min: 0,
      max: 10,
      step: 1,
      value: null,
      rangeFrom: null,
      rangeTo: null,
    });
    expect(noValue.hasValue).toBe(false);
  });

  it('区间只给一端时不画（半开区间无法定位）', () => {
    const half = computeView({
      min: 0,
      max: 10,
      step: 1,
      value: null,
      rangeFrom: 3,
      rangeTo: null,
    });
    expect(half.hasRange).toBe(false);
  });

  it('区间顺序写反也能画（from/to 交换）', () => {
    const v = computeView({ min: 0, max: 10, step: 1, value: null, rangeFrom: 8, rangeTo: 3 });
    expect(v.hasRange).toBe(true);
    expect(v.rangeLeft).toBe(30);
    expect(v.rangeWidth).toBe(50);
  });

  it('wxml 传进来的是字符串也能算（小程序属性默认字符串）', () => {
    const v = computeView({
      min: 0,
      max: 10,
      step: 1,
      value: '2.5',
      rangeFrom: null,
      rangeTo: null,
    });
    expect(v.hasValue).toBe(true);
    expect(v.valueLeft).toBe(25);
  });

  it('刻度带上文案与位置，供 wxml 直接渲染', () => {
    const v = computeView({
      min: 0,
      max: 1,
      step: 0.5,
      value: null,
      rangeFrom: null,
      rangeTo: null,
    });
    expect(v.ticks).toEqual([
      { value: 0, label: '0', left: 0 },
      { value: 0.5, label: '0.5', left: 50 },
      { value: 1, label: '1', left: 100 },
    ]);
  });
});

describe('clamp', () => {
  it('正常夹取', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('区间写反时不崩，返回 min', () => {
    expect(clamp(5, 10, 0)).toBe(10);
  });
});
