// 割补法（平行四边形 → 长方形）纯计算单测。
//
// 核心不变量：**拼好之后必须真的是一个 b×h 的长方形**——这是整个教学的落点，
// 如果算错，孩子拖完看到的不是长方形，这个组件就白做了。
import { describe, expect, it } from 'vitest';
import { computeCutView, progressOfDrag } from '../miniprogram/utils/geometryCut';

const BASE = 10;
const HEIGHT = 4;
const OFFSET = 3;

describe('computeCutView', () => {
  it('progress=0：三角形还在原位（没动）', () => {
    const v = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 0 });
    expect(v.shift).toBe(0);
    expect(v.piece[0]?.x).toBe(OFFSET);
  });

  it('⚠️ progress=1：三角形右移了整整一个底长', () => {
    const v = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 1 });
    expect(v.shift).toBe(BASE);
  });

  it('⚠️ 拼好后：目标长方形正好是 底×高（这才是要教的东西）', () => {
    const v = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 1 });
    const [a, b, c, d] = v.target;
    expect(b!.x - a!.x).toBe(BASE); // 宽 = 底
    expect(d!.y - a!.y).toBe(HEIGHT); // 高 = 高
    // 长方形：上下等长、左右竖直
    expect(c!.x - d!.x).toBe(BASE);
    expect(b!.x).toBe(c!.x);
    expect(a!.x).toBe(d!.x);
  });

  it('⚠️ 拼好后：剪下的三角形正好落进缺口（右边界对齐长方形右边）', () => {
    const v = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 1 });
    const rightMost = Math.max(...v.piece.map((p) => p.x));
    expect(rightMost).toBe(OFFSET + BASE);
  });

  it('剩余那块全程不动（动的是被剪下来的三角形）', () => {
    const v0 = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 0 });
    const v1 = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 1 });
    expect(v1.rest).toEqual(v0.rest);
  });

  it('画布宽度要装得下倾斜后的图形', () => {
    const v = computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 0 });
    expect(v.width).toBe(BASE + OFFSET);
  });

  it('progress 超出 0~1 会被夹住（拖拽过猛不该画出屏幕外）', () => {
    expect(
      computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: 9 }).progress,
    ).toBe(1);
    expect(
      computeCutView({ base: BASE, height: HEIGHT, offset: OFFSET, progress: -9 }).progress,
    ).toBe(0);
  });

  it('脏数据（0 / 负数 / NaN）不崩，退化成最小尺寸', () => {
    expect(() => computeCutView({ base: 0, height: 0, offset: 0, progress: 0 })).not.toThrow();
    expect(() =>
      computeCutView({ base: NaN, height: -1, offset: NaN, progress: NaN }),
    ).not.toThrow();
  });

  it('offset=0（本来就是长方形）也能正常出图', () => {
    const v = computeCutView({ base: BASE, height: HEIGHT, offset: 0, progress: 0.5 });
    expect(v.width).toBe(BASE);
    expect(v.progress).toBe(0.5);
  });
});

describe('progressOfDrag', () => {
  it('拖多少像素就前进多少「底」的比例', () => {
    expect(progressOfDrag(0, 5, 10)).toBe(0.5);
    expect(progressOfDrag(0.5, -5, 10)).toBe(0);
  });

  it('拖过头 / 反向拖都会被夹住', () => {
    expect(progressOfDrag(0, 999, 10)).toBe(1);
    expect(progressOfDrag(0, -999, 10)).toBe(0);
  });

  it('底为 0 时不产生 NaN', () => {
    expect(Number.isFinite(progressOfDrag(0, 5, 0))).toBe(true);
  });
});
