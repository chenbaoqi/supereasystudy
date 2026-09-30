// 英语示意图组件（2026-09-26 重写：canvas → WXML/CSS）。
//
// 为什么换掉 canvas：为了「画」这三张图，先后修了画布高度、绘制时机（attached→ready），
// 工具里能看到、真机上仍然空白——canvas 的节点查询/绘制时机在真机上有太多不可控。
// 而这三张图本质上是**简单图形**：一条线加三个点、一个盒子加一个球、几个圆角块。
// 用 view + CSS 画：没有节点查询、没有时机问题、rpx 自适配、色值走 tokens，工具真机一致。
//
// 逻辑仍全在 utils/englishDiagram.ts（可单测）；本组件只做「参数 → 视图状态」。
// 割补图（math-geometry）保留 canvas：它需要拖拽交互，那才是 canvas 的合理场景。
import { computeDiagram, type DiagramView, type TensePoint } from '../../utils/englishDiagram';

interface TenseTick {
  readonly label: string;
  readonly active: boolean;
  /** 进行时/完成时的横条（相对整条轴的百分比定位） */
  readonly bar: boolean;
  readonly barLeft: number;
  readonly barWidth: number;
}

interface TenseState {
  readonly kind: 'tense';
  readonly ticks: readonly TenseTick[];
  readonly caption: string;
}

interface PrepState {
  readonly kind: 'preposition';
  readonly position: string;
  readonly ballLeft: number;
  readonly ballTop: number;
  readonly behindBox: boolean;
  readonly twinBoxes: boolean;
}

interface FamilyState {
  readonly kind: 'word-family';
  readonly root: string;
  readonly members: readonly string[];
}

type ViewState = TenseState | PrepState | FamilyState;

// 把时态锚点映射到轴上的三档（0=过去 1=现在 2=将来）
function anchorIndex(tense: TensePoint): number {
  return tense === 'past' ? 0 : tense === 'future' ? 2 : 1;
}

function toState(view: DiagramView): ViewState {
  if (view.kind === 'tense') {
    // 三档刻度坐标：0% / 50% / 100%（与 wxml 里 space-between 的三列对齐）
    const xOf = (i: number): number => i * 50;
    const anchor = anchorIndex(view.tense);
    const ticks: readonly TenseTick[] = (['过去', '现在', '将来'] as const).map((label, i) => {
      // 默认无横条；进行时/完成时才补
      let bar = false;
      let barLeft = 0;
      let barWidth = 0;
      if (view.aspect === 'continuous' && i === anchor) {
        // 进行时：锚点左右各延伸一段（约轴长的 18%）
        bar = true;
        barLeft = Math.max(0, xOf(i) - 18);
        barWidth = 36;
      } else if (view.aspect === 'perfect' && i === anchor) {
        // 完成时：从「过去」一直延伸到锚点
        bar = true;
        barLeft = xOf(0);
        barWidth = xOf(i) - xOf(0);
      }
      return { label, active: i === anchor, bar, barLeft, barWidth };
    });

    // 例句文案：帮助理解「这个时态长什么样」
    const caption =
      view.aspect === 'continuous'
        ? '动作在那段时间里持续进行'
        : view.aspect === 'perfect'
          ? '动作发生在过去，但结果留到了那个时间点'
          : '动作发生在一个时间点上';
    return { kind: 'tense', ticks, caption };
  }

  if (view.kind === 'preposition') {
    // utils 给的就是**场景百分比**（一套基准到底），直接透传，不再换算
    return {
      kind: 'preposition',
      position: view.position,
      ballLeft: view.ballX,
      ballTop: view.ballY,
      behindBox: view.behindBox,
      twinBoxes: view.twinBoxes,
    };
  }

  return { kind: 'word-family', root: view.root, members: view.members };
}

Component({
  properties: {
    // 'tense' | 'preposition' | 'word-family'
    kind: { type: String, value: 'tense' },
    /** 传「一般过去时」这类中文语法点名也行，utils 里会解析 */
    tense: { type: String, value: 'present' },
    aspect: { type: String, value: 'simple' },
    position: { type: String, value: 'on' },
    root: { type: String, value: '' },
    /** 逗号分隔的派生词 */
    members: { type: String, value: '' },
  },

  data: {
    view: null as ViewState | null,
  },

  observers: {
    'kind, tense, aspect, position, root, members': function () {
      this.setData({ view: toState(this.computeView()) });
    },
  },

  lifetimes: {
    attached() {
      // WXML 版没有「节点查询」的时机问题，attached 即可（不再是 canvas 那套）
      this.setData({ view: toState(this.computeView()) });
    },
  },

  methods: {
    computeView(): DiagramView {
      const d = this.data;
      return computeDiagram({
        kind:
          d.kind === 'preposition'
            ? 'preposition'
            : d.kind === 'word-family'
              ? 'word-family'
              : 'tense',
        tense: d.tense,
        aspect: d.aspect,
        position: d.position,
        root: d.root,
        members: d.members
          ? d.members
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      });
    },
  },
});
