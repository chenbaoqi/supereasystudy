// 面积推导可视化组件（B-7 之四）：让孩子**动手**看出面积公式，而不是背下来。
//
// 两种形态（几何上不是一回事，别混）：
//   - `parallelogram`：割补。沿高剪开，三角形平移 → 拼成一个长方形。
//   - `triangle` / `trapezoid`：拼接。两个全等图形凑到一起 → 拼成平行四边形。
//
// 用法（题侧 visual）：
//   <math-geometry shape="parallelogram" base="10" height="4" offset="3" />
//   <math-geometry shape="triangle" base="10" height="6" />
//   <math-geometry shape="trapezoid" base="10" height="4" top="6" offset="2" />
//
// 两条与项目一致的约束：
//   1. **逻辑全在 utils/**（geometryCut / spliceGeometry，可单测）；组件文件导入时就执行
//      Component({...})，把计算塞进来会导致 Node 侧无法单测。
//   2. **canvas 2d 拿不到 wxss 变量**，用色一律取 config/canvasTheme.ts（tokens 的镜像）。
import { CANVAS_THEME } from '../../config/canvasTheme';
import { computeCutView, progressOfDrag, type CutView, type Point } from '../../utils/geometryCut';
import {
  computeSpliceView,
  spliceProgressOfDrag,
  type SpliceView,
} from '../../utils/spliceGeometry';

type AnyView = CutView | SpliceView;

// canvas 的绘制代码没法单测，逻辑越薄越安全 —— 只做「顶点 → 路径」这一件事
interface Ctx2D {
  canvas: { width: number; height: number };
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  setFillStyle(color: string): void;
  setStrokeStyle(color: string): void;
  setLineWidth(width: number): void;
  setLineDash(pattern: number[], offset?: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

const PADDING = 12;

const HINT = {
  parallelogram: {
    start: '按住三角形，把它拖到右边',
    near: '继续拖，把它拼满',
    done: '拼成长方形了！面积 = 底 × 高',
  },
  triangle: {
    start: '把另一块三角形推过来',
    near: '继续推，让它们贴紧',
    done: '拼成平行四边形了！所以三角形面积 = 底 × 高 ÷ 2',
  },
  trapezoid: {
    start: '把另一块梯形推过来',
    near: '继续推，让它们贴紧',
    done: '拼成平行四边形了！梯形面积 = （上底+下底）× 高 ÷ 2',
  },
} as const;

Component({
  properties: {
    shape: { type: String, value: 'parallelogram' },
    base: { type: Number, value: 10 },
    height: { type: Number, value: 4 },
    offset: { type: Number, value: 3 },
    /** 梯形的上底长（三角形不用） */
    top: { type: Number, value: 0 },
    /** 外部可控进度（题侧一般不给，交给孩子拖） */
    progress: { type: Number, value: 0 },
    /** 画布高度（px）：canvas 必须有确定高度，百分比拿不到 */
    canvasHeight: { type: Number, value: 220 },
  },

  data: {
    view: null as AnyView | null,
    hint: '按住三角形，把它拖到右边',
    // 下面四个是内部状态（不是渲染数据，但组件实例字段 TS 认不到，只能放 data）
    startX: 0,
    startProgress: 0,
    canvasWidth: 0,
  },

  observers: {
    'shape, base, height, offset, top, progress': function () {
      this.setData({ view: this.computeView() });
      this.draw();
    },
  },

  lifetimes: {
    ready() {
      this.setData({ view: this.computeView() });
      this.draw();
    },
  },

  methods: {
    computeView(): AnyView {
      const d = this.data;
      if (d.shape === 'parallelogram') {
        return computeCutView({
          base: d.base,
          height: d.height,
          offset: d.offset,
          progress: d.progress,
        });
      }
      return computeSpliceView({
        shape: d.shape === 'trapezoid' ? 'trapezoid' : 'triangle',
        base: d.base,
        height: d.height,
        offset: d.offset,
        top: d.top,
        progress: d.progress,
      });
    },

    hintText(progress: number): string {
      const key =
        this.data.shape === 'trapezoid'
          ? 'trapezoid'
          : this.data.shape === 'triangle'
            ? 'triangle'
            : 'parallelogram';
      const pack = HINT[key];
      if (progress >= 0.99) return pack.done;
      return progress > 0 ? pack.near : pack.start;
    },

    draw() {
      const view = this.data.view;
      if (!view) return;
      const query = this.createSelectorQuery();
      query
        .select('#geo')
        .fields({ node: true, size: true })
        .exec(
          (item: {
            node?: { getContext(t: '2d'): Ctx2D | null; width: number; height: number };
            width?: number;
            height?: number;
          }) => {
            const canvas = item.node;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const W = item.width ?? 300;
            // ⚠️ 双保险：canvas-height 被传成 undefined（props 里没这个字段）时，
            //    属性会覆盖默认值 → 画布塌成一条细线（2026-09-21 与英语组件同一处坑）
            const H = item.height || this.data.canvasHeight || 220;
            const dpr = wx.getSystemInfoSync?.().pixelRatio ?? 2;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.paint(ctx, view, W, H);
            this.setData({ canvasWidth: W });
          },
        );
    },

    paint(ctx: Ctx2D, view: AnyView, W: number, H: number) {
      ctx.clearRect(0, 0, W, H);
      // 割补有 rest 字段、拼接没有 —— 用它区分两种形态
      if ('rest' in view) this.paintCut(ctx, view, W, H);
      else this.paintSplice(ctx, view, W, H);
    },

    // 几何单位 → 像素（两种形态共用）
    toPxOf(view: AnyView, W: number, H: number): (p: Point) => { x: number; y: number } {
      const scale = Math.min((W - PADDING * 2) / view.width, (H - PADDING * 2) / view.height);
      const ox = (W - view.width * scale) / 2;
      const oy = (H - view.height * scale) / 2;
      return (p: Point): { x: number; y: number } => ({
        x: ox + p.x * scale,
        y: oy + p.y * scale,
      });
    },

    path(ctx: Ctx2D, points: readonly Point[], toPx: (p: Point) => { x: number; y: number }): void {
      ctx.beginPath();
      points.forEach((p, index) => {
        const q = toPx(p);
        if (index === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.closePath();
    },

    // ---------- 割补：平行四边形 → 长方形 ----------
    paintCut(ctx: Ctx2D, view: CutView, W: number, H: number) {
      const toPx = this.toPxOf(view, W, H);

      // 1) 目标长方形（淡虚线：先告诉孩子目标长这样）
      ctx.setLineDash([5, 4]);
      ctx.setStrokeStyle(CANVAS_THEME.axis);
      ctx.setLineWidth(1);
      this.path(ctx, view.target, toPx);
      ctx.stroke();

      // 2) 剩余的那块（不动）
      ctx.setLineDash([]);
      ctx.setFillStyle(CANVAS_THEME.fill);
      ctx.setStrokeStyle(CANVAS_THEME.line);
      ctx.setLineWidth(2);
      this.path(ctx, view.rest, toPx);
      ctx.fill();
      ctx.stroke();

      // 3) 剪下来的三角形（可拖）
      ctx.setFillStyle(CANVAS_THEME.fillPiece);
      ctx.setStrokeStyle(CANVAS_THEME.point);
      ctx.setLineWidth(2);
      this.path(ctx, view.piece, toPx);
      ctx.fill();
      ctx.stroke();

      // 4) 沿高剪开的那条线
      ctx.setLineDash([4, 3]);
      ctx.setStrokeStyle(CANVAS_THEME.point);
      ctx.setLineWidth(1.5);
      ctx.beginPath();
      const from = toPx(view.cutLine.from);
      const to = toPx(view.cutLine.to);
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    // ---------- 拼接：两个全等图形 → 平行四边形 ----------
    paintSplice(ctx: Ctx2D, view: SpliceView, W: number, H: number) {
      const toPx = this.toPxOf(view, W, H);

      // 1) 目标平行四边形（淡虚线）
      ctx.setLineDash([5, 4]);
      ctx.setStrokeStyle(CANVAS_THEME.axis);
      ctx.setLineWidth(1);
      this.path(ctx, view.target, toPx);
      ctx.stroke();

      // 2) 固定的那一块
      ctx.setLineDash([]);
      ctx.setFillStyle(CANVAS_THEME.fill);
      ctx.setStrokeStyle(CANVAS_THEME.line);
      ctx.setLineWidth(2);
      this.path(ctx, view.left, toPx);
      ctx.fill();
      ctx.stroke();

      // 3) 被推过来的那一块（另一个颜色，提示它是「另一半」）
      ctx.setFillStyle(CANVAS_THEME.fillPiece);
      ctx.setStrokeStyle(CANVAS_THEME.point);
      ctx.setLineWidth(2);
      this.path(ctx, view.right, toPx);
      ctx.fill();
      ctx.stroke();
    },

    onTouchStart(event: WechatMiniprogram.TouchEvent) {
      this.setData({
        startX: event.touches[0]?.clientX ?? 0,
        startProgress: Number(this.data.progress ?? 0),
      });
    },

    onTouchMove(event: WechatMiniprogram.TouchEvent) {
      const x = event.touches[0]?.clientX ?? this.data.startX;
      // 割补是「往右拖」，拼接是「往左推」，方向相反
      const dx = this.data.shape === 'parallelogram' ? x - this.data.startX : this.data.startX - x;
      const view = this.data.view;
      const W = this.data.canvasWidth || 300;
      const unit = view && view.width > 0 ? (W - PADDING * 2) / view.width : 10;
      const base = Number(this.data.base ?? 10);
      const next =
        this.data.shape === 'parallelogram'
          ? progressOfDrag(this.data.startProgress, dx / unit, base)
          : spliceProgressOfDrag(this.data.startProgress, dx / unit, base);
      this.setData({ progress: next, hint: this.hintText(next) });
    },

    onTouchEnd() {
      const p = Number(this.data.progress ?? 0);
      // 过半就自动吸附到位（别让孩子卡在 90% 的尴尬位置）
      const settled = p > 0.5 ? 1 : 0;
      this.setData({ progress: settled, hint: this.hintText(settled) });
    },
  },
});
