// 拼接法（两个全等图形 → 平行四边形）纯计算单测。
//
// 核心不变量：拼好之后两块必须严丝合缝成一个平行四边形；
// 另外「另一块」必须是这一块的中心对称（旋转 180°），否则拼不上。
import { describe, expect, it } from 'vitest';
import { computeSpliceView, spliceProgressOfDrag } from '../miniprogram/utils/spliceGeometry';

const B = 10;
const H = 4;

describe('computeSpliceView（三角形）', () => {
  it('三角形是三条边', () => {
    const v = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 0 });
    expect(v.left.length).toBe(3);
  });

  it('⚠️ 另一块是这一块的中心对称（旋转 180°，绕拼合点）', () => {
    const v = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 1 });
    // 拼好时 gap=0，right 应等于 left 绕 (b, h/2) 的中心对称
    const cx = B;
    const cy = H / 2;
    const expected = v.left.map((p) => ({ x: 2 * cx - p.x, y: 2 * cy - p.y }));
    expect(v.right).toEqual(expected);
  });

  it('progress=1 时两块贴在一起（没有缝）', () => {
    const v = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 1 });
    // 固定块的右端点 (b,h) 应与另一块的对应点重合
    const rightMostOfLeft = Math.max(...v.left.map((p) => p.x));
    const leftMostOfRight = Math.min(...v.right.map((p) => p.x));
    expect(leftMostOfRight).toBeLessThanOrEqual(rightMostOfLeft + 1e-9);
  });

  it('progress=0 时另一块退开一段（看得出来是两块）', () => {
    const v0 = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 0 });
    const v1 = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 1 });
    expect(Math.min(...v0.right.map((p) => p.x))).toBeGreaterThan(
      Math.min(...v1.right.map((p) => p.x)),
    );
  });

  it('固定块全程不动', () => {
    const a = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 0 });
    const b = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 1 });
    expect(b.left).toEqual(a.left);
  });
});

describe('computeSpliceView（梯形）', () => {
  it('梯形是四条边', () => {
    const v = computeSpliceView({
      shape: 'trapezoid',
      base: B,
      height: H,
      top: 6,
      offset: 2,
      progress: 0,
    });
    expect(v.left.length).toBe(4);
  });

  it('同样满足中心对称', () => {
    const v = computeSpliceView({
      shape: 'trapezoid',
      base: B,
      height: H,
      top: 6,
      offset: 2,
      progress: 1,
    });
    const cx = B;
    const cy = H / 2;
    const expected = v.left.map((p) => ({ x: 2 * cx - p.x, y: 2 * cy - p.y }));
    expect(v.right).toEqual(expected);
  });
});

describe('通用兜底', () => {
  it('progress 越界会被夹住', () => {
    expect(computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 9 }).progress).toBe(
      1,
    );
    expect(
      computeSpliceView({ shape: 'triangle', base: B, height: H, progress: -9 }).progress,
    ).toBe(0);
  });

  it('脏数据（0 / 负数 / NaN）不崩', () => {
    expect(() =>
      computeSpliceView({ shape: 'triangle', base: 0, height: 0, progress: 0 }),
    ).not.toThrow();
    expect(() =>
      computeSpliceView({ shape: 'trapezoid', base: NaN, height: -1, progress: NaN }),
    ).not.toThrow();
  });

  it('画布宽度要装得下分开时的两块', () => {
    const v = computeSpliceView({ shape: 'triangle', base: B, height: H, progress: 0 });
    const rightMost = Math.max(...v.right.map((p) => p.x));
    expect(v.width).toBeGreaterThanOrEqual(rightMost);
  });
});

describe('spliceProgressOfDrag', () => {
  it('拖多少像素前进多少「底」的比例', () => {
    expect(spliceProgressOfDrag(0, 5, 10)).toBe(0.5);
    expect(spliceProgressOfDrag(0.5, -5, 10)).toBe(0);
  });

  it('拖过头会被夹住，底为 0 不产生 NaN', () => {
    expect(spliceProgressOfDrag(0, 999, 10)).toBe(1);
    expect(Number.isFinite(spliceProgressOfDrag(0, 5, 0))).toBe(true);
  });
});
