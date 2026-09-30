// 平面直角坐标系的纯计算层（B-7 之三，math-subject-requirements-assessment.md §3.C 的 4 个第一批可视化组件）。
//
// 为什么逻辑单独放这里：canvas 的绘制代码没法单测，所以**所有像素坐标都在这里算好**，
// 组件只做「照着描线」。坐标算错一格，函数图像就是错的，靠肉眼看截图抓不出来。
//
// 与 utils/numberLine.ts 的关系：刻度序列与标签格式直接复用 `ticksOf` / `formatTick`，
// 不另写一套（两套刻度算法迟早会长歪）。
import { formatTick, ticksOf } from './numberLine';

export interface PlaneDomain {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export interface PlaneTick {
  readonly value: number;
  readonly label: string;
  readonly px: number;
  readonly py: number;
}

export interface PlaneLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface PlaneRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface PlaneView {
  readonly valid: boolean;
  readonly domain: PlaneDomain;
  readonly plot: PlaneRect;
  // 每 1 个单位对应多少像素（y 轴向下为正，故取负号换算）
  readonly scaleX: number;
  readonly scaleY: number;
  // (0, 0) 的像素位置。0 不在范围内时会落在绘图区外，这是对的——别把它夹回来
  readonly origin: { readonly px: number; readonly py: number };
  // 两条轴实际画在哪：0 在范围内就画在 0 处，否则贴着绘图区边框（否则图上看不见轴）
  readonly xAxisY: number;
  readonly yAxisX: number;
  readonly xTicks: PlaneTick[];
  readonly yTicks: PlaneTick[];
  readonly grid: PlaneLine[];
}

export interface PlaneInput {
  readonly xMin: unknown;
  readonly xMax: unknown;
  readonly yMin: unknown;
  readonly yMax: unknown;
  readonly step: unknown;
  readonly width: unknown;
  readonly height: unknown;
  readonly padding: unknown;
}

// 刻度太密会把画面糊成一片（也是性能问题）
const MAX_TICKS = 40;
const DEFAULT_PADDING = 24;

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// 取「好看」的步长：1 / 2 / 5 × 10^n，不小于 raw
function niceStep(raw: number): number {
  const positive = raw > 0 ? raw : 1;
  const base = 10 ** Math.floor(Math.log10(positive));
  for (const multiple of [1, 2, 5]) {
    if (multiple * base >= positive) return multiple * base;
  }
  return 10 * base;
}

// 没给 step 就自动定；给了但太密就自动放大（画 200 条网格线不如不画）
function stepOf(range: number, step: number): number {
  let s = step > 0 ? step : niceStep(range / 10);
  if (!(s > 0)) s = 1;
  while (range / s > MAX_TICKS) s *= 2;
  return s;
}

export function computePlane(input: PlaneInput): PlaneView {
  const domain: PlaneDomain = {
    xMin: num(input.xMin, -5),
    xMax: num(input.xMax, 5),
    yMin: num(input.yMin, -5),
    yMax: num(input.yMax, 5),
  };
  const width = num(input.width, 0);
  const height = num(input.height, 0);
  const padding = Math.max(0, num(input.padding, DEFAULT_PADDING));

  const invalid: PlaneView = {
    valid: false,
    domain,
    plot: { left: 0, top: 0, right: 0, bottom: 0 },
    scaleX: 0,
    scaleY: 0,
    origin: { px: 0, py: 0 },
    xAxisY: 0,
    yAxisX: 0,
    xTicks: [],
    yTicks: [],
    grid: [],
  };

  // 画布还没量到尺寸 / 区间写反：返回 invalid，组件什么都不画（画出来是错的）
  if (width <= 0 || height <= 0) return invalid;
  if (domain.xMax <= domain.xMin || domain.yMax <= domain.yMin) return invalid;
  if (padding * 2 >= width || padding * 2 >= height) return invalid;

  const plot: PlaneRect = {
    left: padding,
    top: padding,
    right: width - padding,
    bottom: height - padding,
  };
  const scaleX = (plot.right - plot.left) / (domain.xMax - domain.xMin);
  const scaleY = (plot.bottom - plot.top) / (domain.yMax - domain.yMin);
  const origin = {
    px: plot.left + (0 - domain.xMin) * scaleX,
    py: plot.bottom - (0 - domain.yMin) * scaleY,
  };

  // 0 不在范围内时把轴贴到边框：y 轴贴左、x 轴贴下（否则整张图没有轴，学生不知道在哪读数）
  const xAxisY =
    domain.yMin <= 0 && 0 <= domain.yMax ? origin.py : 0 < domain.yMin ? plot.bottom : plot.top;
  const yAxisX =
    domain.xMin <= 0 && 0 <= domain.xMax ? origin.px : 0 < domain.xMin ? plot.left : plot.right;

  const stepX = stepOf(domain.xMax - domain.xMin, num(input.step, 0));
  const stepY = stepOf(domain.yMax - domain.yMin, num(input.step, 0));

  const xTicks = ticksOf(domain.xMin, domain.xMax, stepX).map((value) => ({
    value,
    label: formatTick(value, stepX),
    px: plot.left + (value - domain.xMin) * scaleX,
    py: xAxisY,
  }));
  const yTicks = ticksOf(domain.yMin, domain.yMax, stepY).map((value) => ({
    value,
    label: formatTick(value, stepY),
    px: yAxisX,
    py: plot.bottom - (value - domain.yMin) * scaleY,
  }));

  const grid: PlaneLine[] = [
    ...xTicks.map((tick) => ({ x1: tick.px, y1: plot.top, x2: tick.px, y2: plot.bottom })),
    ...yTicks.map((tick) => ({ x1: plot.left, y1: tick.py, x2: plot.right, y2: tick.py })),
  ];

  return {
    valid: true,
    domain,
    plot,
    scaleX,
    scaleY,
    origin,
    xAxisY,
    yAxisX,
    xTicks,
    yTicks,
    grid,
  };
}

// 数学坐标 → 画布像素。view 无效时返回 null（调用方据此跳过绘制）
export function toPixel(
  view: PlaneView,
  x: number,
  y: number,
): { readonly px: number; readonly py: number } | null {
  if (!view.valid) return null;
  return { px: view.origin.px + x * view.scaleX, py: view.origin.py - y * view.scaleY };
}

export interface PlanePoint {
  readonly x: number;
  readonly y: number;
  readonly px: number;
  readonly py: number;
}

// 描点：非法点（NaN / 字符串）直接丢掉，不画在原点上——那样会凭空多出一个 (0,0) 的点
export function plotPoints(
  view: PlaneView,
  points: readonly { readonly x: unknown; readonly y: unknown }[],
): PlanePoint[] {
  if (!view.valid) return [];
  const out: PlanePoint[] = [];
  for (const raw of points ?? []) {
    const x = num(raw?.x, Number.NaN);
    const y = num(raw?.y, Number.NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const pixel = toPixel(view, x, y);
    if (pixel) out.push({ x, y, px: pixel.px, py: pixel.py });
  }
  return out;
}

// null / undefined / 空串 → NaN。不能直接用 Number()：Number(null) === 0、
// Number('') === 0，会把「没传 k」当成「k = 0」，凭空画出一条水平线。
function numberOrNaN(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

// 一次函数 y = kx + b 的两个端点（取定义域两端）。k 没传 → 不画线。
// 端点可能落在绘图区外，由组件裁剪，不做截断——截断算出来的斜率会悄悄变掉。
export function lineEndsOf(view: PlaneView, k: unknown, b: unknown): PlaneLine | null {
  if (!view.valid) return null;
  const slope = numberOrNaN(k);
  if (!Number.isFinite(slope)) return null;
  const intercept = num(b, 0);
  const from = toPixel(view, view.domain.xMin, slope * view.domain.xMin + intercept);
  const to = toPixel(view, view.domain.xMax, slope * view.domain.xMax + intercept);
  if (!from || !to) return null;
  return { x1: from.px, y1: from.py, x2: to.px, y2: to.py };
}
