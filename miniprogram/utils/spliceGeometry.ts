// 拼接法推导面积（两个全等图形 → 一个平行四边形）的纯计算。
//
// 与割补（utils/geometryCut.ts）的区别，别搞混：
//   - 割补：一个图形**剪开**再平移 → 变成长方形（平行四边形用这个）
//   - 拼接：**两个全等**图形凑到一起 → 变平行四边形（三角形 / 梯形用这个）
// 交互上一个「往外拖再拼回来」讲不通，一个是「把另一半推过来」，所以是两套计算。
//
// 几何（画布坐标 y 向下）：
//   三角形：底边 (0,h)-(b,h)，顶点 (d,0)（d = 顶点水平位置，默认 b/2 即等腰）
//   梯形  ：下底 (0,h)-(b,h)，上底 (d,0)-(d+t,0)（t = 上底长）
//   另一半 = 这一半**关于拼合点中心对称**（等价于旋转 180°），随 progress 平移过来。
//   拼好之后：两块合成一个底 b、高 h 的平行四边形 ⇒ 面积 = 底 × 高 ÷ 2（三角形）。

export type SpliceShape = 'triangle' | 'trapezoid';

export interface SpliceInput {
  readonly shape: SpliceShape;
  readonly base: number; // 底 b
  readonly height: number; // 高 h
  /** 三角形顶点 / 梯形上底左边的水平位置；缺省取 b/2 */
  readonly offset?: number;
  /** 梯形的上底长；三角形不用 */
  readonly top?: number;
  /** 0 = 两块分开，1 = 完全拼合 */
  readonly progress: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SpliceView {
  readonly width: number;
  readonly height: number;
  /** 固定的那一块 */
  readonly left: readonly Point[];
  /** 被推过来的那一块（形状已中心对称，位置随 progress） */
  readonly right: readonly Point[];
  /** 拼好后的平行四边形轮廓（虚线提示） */
  readonly target: readonly Point[];
  readonly progress: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function safe(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// 中心对称（绕 (cx,cy) 转 180°）：(x,y) → (2cx-x, 2cy-y)
function rotate180(points: readonly Point[], cx: number, cy: number): Point[] {
  return points.map((p) => ({ x: 2 * cx - p.x, y: 2 * cy - p.y }));
}

export function computeSpliceView(input: SpliceInput): SpliceView {
  const b = safe(input.base, 1);
  const h = safe(input.height, 1);
  const p = clamp01(input.progress);
  const d = Number.isFinite(input.offset ?? NaN) ? Math.max(0, input.offset as number) : b / 2;
  const t = Number.isFinite(input.top ?? NaN) ? Math.max(0, input.top as number) : b / 2;

  // 固定的那一块（三角形三条边 / 梯形四条边）
  const left: Point[] =
    input.shape === 'triangle'
      ? [
          { x: 0, y: h },
          { x: b, y: h },
          { x: d, y: 0 },
        ]
      : [
          { x: 0, y: h },
          { x: b, y: h },
          { x: d + t, y: 0 },
          { x: d, y: 0 },
        ];

  // 拼合点：两块在「底边右端 ↔ 另一块底边左端」处对接，绕这个点中心对称
  const cx = b;
  const cy = h / 2;
  const mirrored = rotate180(left, cx, cy);
  // 分开时让另一块往右退开一段（gap），推到底时归零
  const gap = (1 - p) * b * 0.6;
  const right = mirrored.map((pt) => ({ x: pt.x + gap, y: pt.y }));

  // 拼好后的平行四边形：底 b、高 h
  const target: Point[] =
    input.shape === 'triangle'
      ? [
          { x: d, y: 0 },
          { x: d + b, y: 0 },
          { x: b, y: h },
          { x: 0, y: h },
        ]
      : [
          { x: d, y: 0 },
          { x: d + t + b, y: 0 },
          { x: b, y: h },
          { x: 0, y: h },
        ];

  return {
    width: b + Math.max(d + t, b) + b * 0.6,
    height: h,
    left,
    right,
    target,
    progress: p,
  };
}

// 由手指位移反推 progress（拖动 dx 像素，按底长换算比例）
export function spliceProgressOfDrag(from: number, dx: number, base: number): number {
  const b = safe(base, 1);
  return clamp01(from + dx / b);
}
