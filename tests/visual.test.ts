// 题目可视化契约单测（B-7 闭环的关键一环）。
// 题库是 JSON（云数据 / CSV），可视化声明必然是弱结构；
// 这一层负责「收口」，任何脏数据都必须变成「不画图」而不是「画错图」或「页面崩」。
import { describe, expect, it } from 'vitest';
import { visualOf, visualViewOf, VISUAL_TYPES } from '../miniprogram/core/visual';

describe('visualOf（白名单）', () => {
  it('三种已支持的类型都能过', () => {
    expect(visualOf({ type: 'number-line', props: { min: 0, max: 1 } })?.type).toBe('number-line');
    expect(visualOf({ type: 'fraction', props: { numerator: 3, denominator: 4 } })?.type).toBe(
      'fraction',
    );
    expect(visualOf({ type: 'coordinate-plane', props: {} })?.type).toBe('coordinate-plane');
  });

  it('★ 类型名拼错 → null（不画图，也不报错）', () => {
    expect(visualOf({ type: 'number_line', props: { min: 0, max: 1 } })).toBeNull();
    expect(visualOf({ type: 'NumberLine', props: { min: 0, max: 1 } })).toBeNull();
    expect(visualOf({ type: 'pie-chart', props: {} })).toBeNull();
  });

  it('★ 拼错的类型不会被当成坐标平面放行（坐标平面允许不写 props，是唯一例外）', () => {
    expect(visualOf({ type: 'whatever' })).toBeNull();
  });

  it('非对象 / null / 数组 → null', () => {
    expect(visualOf(null)).toBeNull();
    expect(visualOf(undefined)).toBeNull();
    expect(visualOf('number-line')).toBeNull();
    expect(visualOf([])).toBeNull();
    expect(visualOf({ type: ['number-line'] })).toBeNull();
  });

  it('props 是数组或字符串 → null', () => {
    expect(visualOf({ type: 'fraction', props: [1, 4] })).toBeNull();
    expect(visualOf({ type: 'fraction', props: '3/4' })).toBeNull();
  });
});

describe('visualOf（必需属性）', () => {
  it('★ 数轴缺 min/max → null（没端点画出来是错的，宁可不画）', () => {
    expect(visualOf({ type: 'number-line', props: { value: 2 } })).toBeNull();
    expect(visualOf({ type: 'number-line', props: { min: 0 } })).toBeNull();
  });

  it('★ 分数缺分母 → null', () => {
    expect(visualOf({ type: 'fraction', props: { numerator: 3 } })).toBeNull();
  });

  it('空字符串也算缺失（CSV 里空列是常态）', () => {
    expect(visualOf({ type: 'fraction', props: { numerator: 3, denominator: '' } })).toBeNull();
  });

  it('★ 0 是合法值，不能被当成缺失（0~1 的数轴很常见）', () => {
    expect(visualOf({ type: 'number-line', props: { min: 0, max: 1 } })).not.toBeNull();
    expect(visualOf({ type: 'fraction', props: { numerator: 0, denominator: 5 } })).not.toBeNull();
  });

  it('坐标平面允许完全不写 props（全部有默认值）', () => {
    expect(visualOf({ type: 'coordinate-plane' })?.props).toEqual({});
  });

  it('多余的属性原样保留（组件不认识的会被忽略）', () => {
    const visual = visualOf({ type: 'number-line', props: { min: 0, max: 10, junk: 1 } });
    expect(visual?.props.junk).toBe(1);
  });
});

describe('visualViewOf（给 wxml 的两个字段）', () => {
  it('合法 → 类型 + 属性包', () => {
    const view = visualViewOf({ type: 'fraction', props: { numerator: 3, denominator: 4 } });
    expect(view.visualType).toBe('fraction');
    expect(view.visualProps).toEqual({ numerator: 3, denominator: 4 });
  });

  it('★ 不合法 → 空类型（wxml 的 wx:if 直接不渲染）', () => {
    const view = visualViewOf({ type: 'unknown' });
    expect(view.visualType).toBe('');
    expect(view.visualProps).toEqual({});
  });
});

describe('VISUAL_TYPES', () => {
  it('与实际实现的组件一一对应', () => {
    expect([...VISUAL_TYPES].sort()).toEqual([
      'coordinate-plane',
      'fraction',
      'geometry',
      'number-line',
      'optics',
      'preposition',
      'tense',
      'word-family',
    ]);
  });
});
