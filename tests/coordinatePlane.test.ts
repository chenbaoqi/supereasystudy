// 坐标系单测（B-7 组件 math-coordinate-plane 的纯逻辑层）。
// canvas 的绘制代码没法单测，所以坐标换算必须在这里锁死：
// 轴画错位置、y 轴方向反了、点画到原点上——这些都是学生一眼看不出但会被教错的错。
import { describe, expect, it } from 'vitest';
import {
  computePlane,
  lineEndsOf,
  plotPoints,
  toPixel,
  type PlaneInput,
} from '../miniprogram/utils/coordinatePlane';

// 300×240、留白 26 → 绘图区 26,26 ~ 274,214；定义域 -5..5
const BASE: PlaneInput = {
  xMin: -5,
  xMax: 5,
  yMin: -5,
  yMax: 5,
  step: 1,
  width: 300,
  height: 240,
  padding: 26,
};

const plane = (over: Partial<PlaneInput> = {}) => computePlane({ ...BASE, ...over });

describe('computePlane（画布几何）', () => {
  it('合法输入 → valid，绘图区按 padding 内缩', () => {
    const v = plane();
    expect(v.valid).toBe(true);
    expect(v.plot).toEqual({ left: 26, top: 26, right: 274, bottom: 214 });
  });

  it('每单位像素：x 248/10，y 188/10', () => {
    const v = plane();
    expect(v.scaleX).toBeCloseTo(24.8, 6);
    expect(v.scaleY).toBeCloseTo(18.8, 6);
  });

  it('★ 原点落在绘图区正中（0 在范围内）', () => {
    const v = plane();
    expect(v.origin.px).toBeCloseTo(150, 6);
    expect(v.origin.py).toBeCloseTo(120, 6);
    expect(v.xAxisY).toBeCloseTo(120, 6);
    expect(v.yAxisX).toBeCloseTo(150, 6);
  });

  it('刻度：step=1 时 -5..5 共 11 个，首在左边界、末在右边界', () => {
    const v = plane();
    expect(v.xTicks).toHaveLength(11);
    expect(v.xTicks[0]?.px).toBeCloseTo(26, 6);
    expect(v.xTicks[10]?.px).toBeCloseTo(274, 6);
    expect(v.yTicks).toHaveLength(11);
  });

  it('★ y 轴向上为负（数学方向，不是屏幕方向）', () => {
    const v = plane();
    const top = toPixel(v, 0, 5);
    const bottom = toPixel(v, 0, -5);
    expect(top?.py).toBeCloseTo(26, 6);
    expect(bottom?.py).toBeCloseTo(214, 6);
    expect(top?.py).toBeLessThan(bottom?.py ?? 0);
  });

  it('网格线条数 = 横刻度 + 纵刻度', () => {
    expect(plane().grid).toHaveLength(22);
  });
});

describe('computePlane（轴贴边）', () => {
  it('★ 0 不在 y 范围内且都 > 0 → 横轴贴下边框（否则图上没有轴，学生读不了数）', () => {
    const v = plane({ yMin: 1, yMax: 5 });
    expect(v.xAxisY).toBeCloseTo(214, 6);
    // 原点仍在数学上正确的位置（在绘图区下方外面），不能夹回来
    expect(v.origin.py).toBeGreaterThan(214);
  });

  it('y 全为负 → 横轴贴上边框', () => {
    const v = plane({ yMin: -5, yMax: -1 });
    expect(v.xAxisY).toBeCloseTo(26, 6);
  });

  it('0 不在 x 范围内且都 > 0 → 纵轴贴左边框', () => {
    const v = plane({ xMin: 1, xMax: 5 });
    expect(v.yAxisX).toBeCloseTo(26, 6);
  });

  it('x 全为负 → 纵轴贴右边框', () => {
    const v = plane({ xMin: -5, xMax: -1 });
    expect(v.yAxisX).toBeCloseTo(274, 6);
  });
});

describe('computePlane（无效输入不画）', () => {
  it('画布宽度为 0（还没量到尺寸）', () => {
    expect(plane({ width: 0 }).valid).toBe(false);
  });

  it('★ 区间写反', () => {
    expect(plane({ xMin: 5, xMax: -5 }).valid).toBe(false);
    expect(plane({ yMin: 5, yMax: -5 }).valid).toBe(false);
  });

  it('区间退化成一点', () => {
    expect(plane({ xMin: 2, xMax: 2 }).valid).toBe(false);
  });

  it('★ padding 把绘图区吃没了', () => {
    expect(plane({ width: 40, height: 40 }).valid).toBe(false);
  });

  it('脏入参（字符串 / undefined）按默认值处理，不产生 NaN', () => {
    const v = computePlane({
      xMin: '-5',
      xMax: '5',
      yMin: '-5',
      yMax: '5',
      step: '1',
      width: '300',
      height: '240',
      padding: '26',
    });
    expect(v.valid).toBe(true);
    expect(v.origin.px).toBeCloseTo(150, 6);
  });
});

describe('computePlane（步长）', () => {
  it('不传 step → 自动取「好看」的步长（范围 100 → 10）', () => {
    const v = plane({ xMin: -50, xMax: 50, yMin: -50, yMax: 50, step: null });
    expect(v.xTicks).toHaveLength(11); // -50,-40,...,50
    expect(v.xTicks[1]?.value).toBe(-40);
  });

  it('★ 步长过密会自动放大（画 200 条网格线不如不画）', () => {
    const v = plane({ xMin: -50, xMax: 50, yMin: -50, yMax: 50, step: 0.01 });
    expect(v.xTicks.length).toBeLessThanOrEqual(41);
  });

  it('step <= 0 视为没给，走自动步长', () => {
    const v = plane({ step: 0 });
    expect(v.xTicks.length).toBeGreaterThan(1);
  });

  it('小数步长不产生浮点尾巴', () => {
    const v = plane({ xMin: 0, xMax: 1, yMin: 0, yMax: 1, step: 0.25 });
    expect(v.xTicks.map((t) => t.value)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(v.xTicks.map((t) => t.label)).toEqual(['0', '0.25', '0.5', '0.75', '1']);
  });
});

describe('toPixel', () => {
  it('(0,0) → 原点', () => {
    const v = plane();
    const p = toPixel(v, 0, 0);
    expect(p?.px).toBeCloseTo(150, 6);
    expect(p?.py).toBeCloseTo(120, 6);
  });

  it('(xMax, yMax) → 右上角', () => {
    const p = toPixel(plane(), 5, 5);
    expect(p?.px).toBeCloseTo(274, 6);
    expect(p?.py).toBeCloseTo(26, 6);
  });

  it('view 无效 → null（调用方据此跳过绘制）', () => {
    expect(toPixel(plane({ width: 0 }), 1, 1)).toBeNull();
  });

  it('★ 范围外的点照样算（由组件裁剪，不在这里截断——截断会悄悄改变斜率）', () => {
    const p = toPixel(plane(), 10, 10);
    expect(p?.px).toBeCloseTo(150 + 10 * 24.8, 6);
    expect(p?.py).toBeCloseTo(120 - 10 * 18.8, 6);
  });
});

describe('plotPoints（描点）', () => {
  it('正常描点', () => {
    const pts = plotPoints(plane(), [
      { x: 1, y: 2 },
      { x: -3, y: 0 },
    ]);
    expect(pts).toHaveLength(2);
    expect(pts[0]?.px).toBeCloseTo(150 + 24.8, 6);
    expect(pts[0]?.py).toBeCloseTo(120 - 2 * 18.8, 6);
  });

  it('★ 非法点直接丢掉，不画到原点上（那样会凭空多出一个 (0,0)）', () => {
    const pts = plotPoints(plane(), [
      { x: Number.NaN, y: 1 },
      { x: 1, y: 'abc' },
      {} as { x: unknown; y: unknown }, // 脏数据：字段都没有
      { x: 2, y: 3 },
    ]);
    expect(pts).toHaveLength(1);
    expect(pts[0]?.x).toBe(2);
  });

  it('没传点 / 空数组 → 空', () => {
    expect(plotPoints(plane(), [])).toEqual([]);
  });

  it('view 无效 → 空', () => {
    expect(plotPoints(plane({ height: 0 }), [{ x: 1, y: 1 }])).toEqual([]);
  });

  it('点也能是字符串（wxml 传过来可能是字符串）', () => {
    const pts = plotPoints(plane(), [{ x: '1', y: '2' }]);
    expect(pts).toHaveLength(1);
    expect(pts[0]?.x).toBe(1);
  });
});

describe('lineEndsOf（一次函数 y = kx + b）', () => {
  it('y = 2x + 1：两端点按定义域取，斜率不被改动', () => {
    const line = lineEndsOf(plane(), 2, 1);
    expect(line).not.toBeNull();
    expect(line?.x1).toBeCloseTo(26, 6);
    expect(line?.y1).toBeCloseTo(120 + 9 * 18.8, 6); // x=-5 → y=-9
    expect(line?.x2).toBeCloseTo(274, 6);
    expect(line?.y2).toBeCloseTo(120 - 11 * 18.8, 6); // x=5  → y=11
  });

  it('斜率正确（两点算出来的 k 必须是 2）', () => {
    const v = plane();
    const line = lineEndsOf(v, 2, 1);
    if (!line) throw new Error('应返回线段');
    // 画布 y 向下为正，故取负号
    const k = -(line.y2 - line.y1) / v.scaleY / ((line.x2 - line.x1) / v.scaleX);
    expect(k).toBeCloseTo(2, 6);
  });

  it('k 没传 → 不画线', () => {
    expect(lineEndsOf(plane(), null, 1)).toBeNull();
  });

  it('k 传了非数字 → 不画线', () => {
    expect(lineEndsOf(plane(), 'abc', 1)).toBeNull();
  });

  it('b 没传按 0（正比例函数 y = kx）', () => {
    const line = lineEndsOf(plane(), 1, undefined);
    expect(line?.y1).toBeCloseTo(120 + 5 * 18.8, 6); // x=-5 → y=-5
  });

  it('k = 0 → 水平线，两端 y 相同', () => {
    const line = lineEndsOf(plane(), 0, 3);
    expect(line?.y1).toBeCloseTo(line?.y2 ?? 0, 6);
  });

  it('view 无效 → null', () => {
    expect(lineEndsOf(plane({ width: 10 }), 1, 0)).toBeNull();
  });
});
