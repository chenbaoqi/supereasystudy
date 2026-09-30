// 割补法推导面积（平行四边形 → 长方形）的纯计算。
//
// 为什么要单独一个文件：`components/math-geometry` 导入时就会执行 `Component({...})`，
// 逻辑塞进组件里会导致 Node 侧无法单测（项目一贯做法，见 utils/numberLine.ts 的说明）。
// 这里只做「输入 → 顶点坐标」，组件负责把顶点画出来。
//
// 几何（画布坐标 y 向下，画布宽 = 底 + 斜边偏移）：
//   平行四边形四顶点：左下(0,h)、右下(b,h)、右上(b+d,0)、左上(d,0)
//   沿「左上顶点向底边作的高」剪开（垂足 (d,h)）得到两块：
//     左三角 T : (d,0) (d,h) (0,h)
//     剩余梯形 R: (d,0) (b+d,0) (b,h) (d,h)
//   把 T 向右平移 b，正好补上 R 的缺口 ⇒ 长方形 (d,0)-(b+d,0)-(b+d,h)-(d,h)，宽 b 高 h。
//   于是「面积 = 底 × 高」不是背下来的，是孩子自己拖出来的。

export interface CutInput {
  readonly base: number; // 底 b
  readonly height: number; // 高 h
  /** 斜边水平偏移 d（上底相对下底向右偏多少）；0 = 本身就是长方形 */
  readonly offset: number;
  /** 0 = 原平行四边形，1 = 完全拼成长方形 */
  readonly progress: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CutView {
  readonly width: number; // 画布宽（b + d，够放下倾斜后的图形）
  readonly height: number;
  /** 剩余的那块（梯形，全程不动） */
  readonly rest: readonly Point[];
  /** 剪下来的三角形（随 progress 右移） */
  readonly piece: readonly Point[];
  /** 三角形相对原位的水平位移 */
  readonly shift: number;
  /** 剪开的那条高（虚线）：从左上顶点到垂足 */
  readonly cutLine: { readonly from: Point; readonly to: Point };
  /** 拼好之后的目标长方形轮廓（用来画虚线框提示"看，变成了长方形"） */
  readonly target: readonly Point[];
  readonly progress: number; // 归一化后的值（0~1）
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// 数值兜底：脏数据（0 / 负数 / NaN）不该画出一个诡异图形，宁可退化成一条线也不崩
function safe(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function computeCutView(input: CutInput): CutView {
  const b = safe(input.base, 1);
  const h = safe(input.height, 1);
  const d = Number.isFinite(input.offset) ? Math.max(0, input.offset) : 0;
  const p = clamp01(input.progress);

  const shift = p * b;
  return {
    width: b + d,
    height: h,
    // 剩余的一块：全程不动
    rest: [
      { x: d, y: 0 },
      { x: d + b, y: 0 },
      { x: b, y: h },
      { x: d, y: h },
    ],
    // 剪下的三角形：整体右移 shift
    piece: [
      { x: d + shift, y: 0 },
      { x: d + shift, y: h },
      { x: shift, y: h },
    ],
    shift,
    cutLine: { from: { x: d, y: 0 }, to: { x: d, y: h } },
    // 拼好后的长方形：左边界 d，宽 b
    target: [
      { x: d, y: 0 },
      { x: d + b, y: 0 },
      { x: d + b, y: h },
      { x: d, y: h },
    ],
    progress: p,
  };
}

// 由手指位移反推 progress：拖动 dx 像素 = 前进 dx/base（画布单位与底同尺度）
export function progressOfDrag(from: number, dx: number, base: number): number {
  const b = safe(base, 1);
  return clamp01(from + dx / b);
}
