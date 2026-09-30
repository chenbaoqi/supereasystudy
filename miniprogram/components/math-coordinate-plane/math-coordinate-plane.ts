// 平面直角坐标系组件（B-7 之三，math-subject-requirements-assessment.md §3.C 的 4 个第一批可视化组件）。
//
// 用 canvas 2d：网格 + 轴 + 刻度 + 描点 + 一次函数图像。
// **所有像素坐标都在 utils/coordinatePlane.ts 算好并单测**，本文件只负责「照着描」——
// canvas 的绘制代码没法单测，逻辑越薄越安全。
//
// 用法：
//   <math-coordinate-plane points="{{[{x:1,y:2},{x:3,y:-1}]}}" line-k="2" line-b="1" />
//
// 两个实现约束（都是踩过的）：
//   1. 绘制函数全部放在**模块作用域**，不写成 Component 的 methods ——
//      微信 typings 里 methods 在实例上是「可能 undefined」，
//      this.xxx() 会被 TS 判为「不能调用可能未定义的对象」（TS2722）。
//   2. 不自己记 mounted 标志：canvas 节点没渲染时 selectorQuery 查不到，
//      查不到就什么都不画（画出来尺寸是错的）。ready 与 observers 都调同一入口即可。
import { CANVAS_THEME } from '../../config/canvasTheme';
import {
  computePlane,
  lineEndsOf,
  plotPoints,
  type PlaneLine,
  type PlaneView,
} from '../../utils/coordinatePlane';

// 只声明用到的那部分 canvas 能力（微信 canvas 2d 与 DOM 的 CanvasRenderingContext2D 基本兼容）
interface Ctx2D {
  scale(x: number, y: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  stroke(): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
}

interface CanvasNode {
  width: number;
  height: number;
  getContext(type: '2d'): Ctx2D | null;
}

interface CanvasMeasure {
  readonly node?: CanvasNode | null;
  readonly width: number;
  readonly height: number;
}

interface PlanePointInput {
  readonly x: unknown;
  readonly y: unknown;
}

interface PlaneData {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly step: unknown;
  readonly points: readonly PlanePointInput[];
  readonly lineK: unknown;
  readonly lineB: number;
}

// 绘图区留白（px）：给刻度数字留位置，不然边界上的数字会被切掉
const PADDING = 26;
const POINT_RADIUS = 4;

function stroke(ctx: Ctx2D, line: PlaneLine): void {
  ctx.beginPath();
  ctx.moveTo(line.x1, line.y1);
  ctx.lineTo(line.x2, line.y2);
  ctx.stroke();
}

// 函数线可能跑出绘图区，必须裁剪，否则会盖到刻度数字上
function clipPlot(ctx: Ctx2D, view: PlaneView): void {
  ctx.beginPath();
  ctx.rect(
    view.plot.left,
    view.plot.top,
    view.plot.right - view.plot.left,
    view.plot.bottom - view.plot.top,
  );
  ctx.clip();
}

function paintGrid(ctx: Ctx2D, view: PlaneView): void {
  ctx.strokeStyle = CANVAS_THEME.grid;
  ctx.lineWidth = 1;
  for (const line of view.grid) stroke(ctx, line);
}

function paintAxes(ctx: Ctx2D, view: PlaneView): void {
  ctx.strokeStyle = CANVAS_THEME.axis;
  ctx.lineWidth = 1;
  stroke(ctx, { x1: view.plot.left, y1: view.xAxisY, x2: view.plot.right, y2: view.xAxisY });
  stroke(ctx, { x1: view.yAxisX, y1: view.plot.top, x2: view.yAxisX, y2: view.plot.bottom });
}

function paintTicks(ctx: Ctx2D, view: PlaneView): void {
  ctx.fillStyle = CANVAS_THEME.label;
  ctx.font = '10px sans-serif';
  // 0 不写数字：原点处横纵两个 0 会叠在一起
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const tick of view.xTicks) {
    if (tick.value === 0) continue;
    ctx.fillText(tick.label, tick.px, tick.py + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const tick of view.yTicks) {
    if (tick.value === 0) continue;
    ctx.fillText(tick.label, tick.px - 4, tick.py);
  }
}

function paintLine(ctx: Ctx2D, view: PlaneView, data: PlaneData): void {
  const line = lineEndsOf(view, data.lineK, data.lineB);
  if (!line) return;
  ctx.save();
  clipPlot(ctx, view);
  ctx.strokeStyle = CANVAS_THEME.line;
  ctx.lineWidth = 2;
  stroke(ctx, line);
  ctx.restore();
}

function paintPoints(ctx: Ctx2D, view: PlaneView, data: PlaneData): void {
  const points = plotPoints(view, data.points);
  if (points.length === 0) return;
  ctx.save();
  clipPlot(ctx, view);
  ctx.fillStyle = CANVAS_THEME.point;
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.px, point.py, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paint(data: PlaneData, item: CanvasMeasure): void {
  const canvas = item.node;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = item.width;
  const height = item.height;
  if (width <= 0 || height <= 0) return;

  // 按设备像素比放大再缩放：否则高分屏上线条发虚
  const dpr = wx.getSystemInfoSync().pixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.scale(dpr, dpr);
  // 属性变了就整块清掉重描，不做增量擦除
  ctx.clearRect(0, 0, width, height);

  const view = computePlane({
    xMin: data.xMin,
    xMax: data.xMax,
    yMin: data.yMin,
    yMax: data.yMax,
    step: data.step,
    width,
    height,
    padding: PADDING,
  });
  if (!view.valid) return;

  paintGrid(ctx, view);
  paintAxes(ctx, view);
  paintTicks(ctx, view);
  paintLine(ctx, view, data);
  paintPoints(ctx, view, data);
}

function draw(host: WechatMiniprogram.Component.TrivialInstance): void {
  const data = host.data as PlaneData;
  wx.createSelectorQuery()
    .in(host)
    .select('#plane')
    .fields({ node: true, size: true })
    .exec((res: unknown) => {
      const list = Array.isArray(res) ? (res as CanvasMeasure[]) : [];
      const item = list[0];
      if (!item?.node) return;
      paint(data, item);
    });
}

Component({
  properties: {
    xMin: { type: Number, value: -5 },
    xMax: { type: Number, value: 5 },
    yMin: { type: Number, value: -5 },
    yMax: { type: Number, value: 5 },
    // 不传则按范围自动定（1 / 2 / 5 × 10^n）
    step: { type: null, value: null },
    // 画布高度（px），宽度撑满容器
    height: { type: Number, value: 240 },
    // 描点：[{x, y}, ...]
    points: { type: Array, value: [] as PlanePointInput[] },
    // 一次函数 y = kx + b：k 不传则不画线
    lineK: { type: null, value: null },
    lineB: { type: Number, value: 0 },
  },

  lifetimes: {
    ready() {
      draw(this);
    },
  },

  observers: {
    'xMin, xMax, yMin, yMax, step, height, points, lineK, lineB': function () {
      draw(this);
    },
  },
});
