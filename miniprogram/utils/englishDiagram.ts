// 英语示意图的纯计算（2026-09-21）。
//
// 与数学组件同一套规矩：组件文件导入时就执行 Component({...})，
// 逻辑塞进去会导致 Node 侧无法单测，所以全都放这里。
//
// 三类图都不需要 AI 配图：
//   tense       —— 时态轴（中小学英语最大的坎）
//   preposition —— 介词方位（in/on/under 混淆）
//   word-family —— 词族（一次记一串词）

export type DiagramKind = 'tense' | 'preposition' | 'word-family';
export type TensePoint = 'past' | 'present' | 'future';
export type TenseAspect = 'simple' | 'continuous' | 'perfect';

export interface DiagramInput {
  readonly kind: DiagramKind;
  readonly tense?: string;
  readonly aspect?: string;
  readonly position?: string;
  readonly root?: string;
  readonly members?: readonly string[];
}

interface TenseView {
  readonly kind: 'tense';
  readonly tense: TensePoint;
  readonly aspect: TenseAspect;
}

interface PrepositionView {
  readonly kind: 'preposition';
  readonly position: string;
  /** 球心在**场景容器**里的百分比位置（0~100） */
  readonly ballX: number;
  readonly ballY: number;
  /** behind：球要被盒子盖住一部分（渲染层据此调整层级） */
  readonly behindBox: boolean;
  /** between：渲染层画两个盒子，球在中间 */
  readonly twinBoxes: boolean;
}

interface FamilyView {
  readonly kind: 'word-family';
  readonly root: string;
  readonly members: readonly string[];
}

export type DiagramView = TenseView | PrepositionView | FamilyView;

// 球的位置：**以场景容器为基准的百分比**（0~100，x=50 即水平居中）。
//
// ⚠️ 2026-09-26 重写：原来存的是「相对盒子的 0~1 比例」，渲染时再换算到场景——
//    两套基准中间的换算是拍脑袋写的，结果 in 偏到右下、on 压在角上（Owner 截图批评）。
//    现在一套基准到底：这里给的就是最终渲染百分比，不再做任何换算。
//
// 场景里的盒子几何（与 wxss 对齐）：left 32%、top 38%、宽 36%、高 40%
//   ⇒ 盒子：x 32~68%、y 38~78%，中心 (50, 58)，顶边 y=38%
const BALL_AT: Readonly<
  Record<string, { readonly x: number; readonly y: number; readonly behindBox?: boolean }>
> = {
  in: { x: 50, y: 58 }, // 盒子正中
  on: { x: 50, y: 31 }, // 球心在盒顶上方一点：球底正好骑在盒顶上
  above: { x: 50, y: 16 }, // 悬在盒子上方（不接触）
  under: { x: 50, y: 90 }, // 盒子正下方
  behind: { x: 64, y: 55, behindBox: true }, // 藏在盒子后面：被盒子盖住一部分
  near: { x: 16, y: 86 }, // 离得远：左下角
  beside: { x: 14, y: 58 }, // 紧贴侧面
  'next to': { x: 14, y: 58 },
  between: { x: 50, y: 58 }, // 两个盒子中间（渲染层会画两个盒子）
};

/**
 * 从语法点名字里解析时态与体。
 * 「一般过去时」→ past + simple；「现在进行时」→ present + continuous；「现在完成时」→ present + perfect。
 * ⚠️ 解析不出就回落 present + simple——宁可画一个大概对的轴，也不要画不出来。
 */
export function parseTense(name: string): { tense: TensePoint; aspect: TenseAspect } {
  const s = String(name ?? '');
  const tense: TensePoint = s.includes('过去')
    ? 'past'
    : s.includes('将来') || s.includes('未来')
      ? 'future'
      : 'present';
  const aspect: TenseAspect = s.includes('进行')
    ? 'continuous'
    : s.includes('完成')
      ? 'perfect'
      : 'simple';
  return { tense, aspect };
}

function asTense(v: string | undefined): TensePoint {
  return v === 'past' || v === 'future' ? v : 'present';
}

function asAspect(v: string | undefined): TenseAspect {
  return v === 'continuous' || v === 'perfect' ? v : 'simple';
}

export function computeDiagram(input: DiagramInput): DiagramView {
  if (input.kind === 'tense') {
    // 传了规范值就用规范值；传的是中文语法点名（如「一般过去时」）也能解析
    const parsed =
      input.tense === 'past' || input.tense === 'present' || input.tense === 'future'
        ? { tense: asTense(input.tense), aspect: asAspect(input.aspect) }
        : parseTense(input.tense ?? '');
    return { kind: 'tense', ...parsed };
  }

  if (input.kind === 'preposition') {
    const key = String(input.position ?? 'on').toLowerCase();
    const at = BALL_AT[key] ?? BALL_AT.on!;
    return {
      kind: 'preposition',
      position: key,
      ballX: at.x,
      ballY: at.y,
      behindBox: at.behindBox === true,
      twinBoxes: key === 'between',
    };
  }

  return {
    kind: 'word-family',
    root: String(input.root ?? '').trim(),
    // ⚠️ 必须先 trim 再判空：只 `filter(Boolean)` 的话，纯空格的成员会留下来，
    //    画出一个空圆圈（2026-09-21 单测抓到）。
    //    另外最多摆 5 个，再多就挤成一团看不清了。
    members: (input.members ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5),
  };
}
