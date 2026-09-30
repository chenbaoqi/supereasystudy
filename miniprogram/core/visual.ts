// 题目可视化契约（B-7 闭环：让一道题能声明「我要画什么」）。
//
// 为什么要有这一层：可视化组件做出来了，但题目和组件之间没有契约 ——
// 题目只是文本，渲染层不知道该画数轴还是分数条。这一层就是那根线。
//
// 设计取舍：
//   - 用「类型 + 属性包」而不是强类型联合：题库是 JSON（云数据/CSV），
//     弱结构是现实；由 visualOf() 在入口处收口校验，不把脏数据放进去。
//   - **不认识的类型一律返回 null，页面不渲染也不报错**。宁可这道题没有图，
//     也不能因为一个拼错的类型名让整页崩掉（教学场景里「题能答」优先于「题有图」）。
export type VisualType =
  | 'number-line'
  | 'fraction'
  | 'coordinate-plane'
  | 'geometry'
  // 2026-09-21：英语示意图（不靠 AI 配图，用画布画，风格与数学组件一致）
  | 'tense'
  | 'preposition'
  | 'word-family'
  // 2026-09-30：物理光路图（反射/折射/凸透镜成像，WXML/CSS 画）
  | 'optics';

export const VISUAL_TYPES: readonly VisualType[] = [
  'number-line',
  'fraction',
  'coordinate-plane',
  'geometry',
  'tense',
  'preposition',
  'word-family',
  'optics',
];

// 每种可视化必须带的属性。缺了画出来是错的（数轴没有端点、分数没有分母），
// 所以宁可不画 —— 组件内部虽有兜底，但那是对脏数据的最后一道防线，不该成为常规路径。
const REQUIRED_PROPS: Readonly<Record<VisualType, readonly string[]>> = {
  'number-line': ['min', 'max'],
  fraction: ['numerator', 'denominator'],
  'coordinate-plane': [], // 全部有默认值（-5..5）
  // 割补法（平行四边形→长方形）：没有底和高画出来是错的（offset 可缺省 = 0）
  geometry: ['base', 'height'],
  // 英语示意图：各自只认一个必填项，其余都有默认值
  tense: ['tense'],
  preposition: ['position'],
  'word-family': ['root'],
  // 物理光路图：只认一个必填项 kind（reflection/refraction/lens）
  optics: ['kind'],
};

export interface QuestionVisual {
  readonly type: VisualType;
  // 直接下发给组件的 properties（键名 = 组件的驼峰属性名）
  readonly props: Readonly<Record<string, unknown>>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function visualOf(raw: unknown): QuestionVisual | null {
  if (!isPlainObject(raw)) return null;
  const type = raw.type;
  if (typeof type !== 'string' || !VISUAL_TYPES.includes(type as VisualType)) return null;

  const props = raw.props;
  if (props === undefined) {
    // 只有坐标平面允许完全不写属性（全用默认值）
    return REQUIRED_PROPS[type as VisualType].length === 0
      ? { type: type as VisualType, props: {} }
      : null;
  }
  if (!isPlainObject(props)) return null;

  const missing = REQUIRED_PROPS[type as VisualType].filter(
    (key) => props[key] === undefined || props[key] === null || props[key] === '',
  );
  if (missing.length > 0) return null;

  return { type: type as VisualType, props };
}

// 渲染层要的两个字段（WXML 不能展开对象，只能按类型分支后逐个绑属性）
export interface VisualView {
  readonly visualType: VisualType | '';
  readonly visualProps: Readonly<Record<string, unknown>>;
}

export function visualViewOf(raw: unknown): VisualView {
  const visual = visualOf(raw);
  return visual
    ? { visualType: visual.type, visualProps: visual.props }
    : { visualType: '', visualProps: {} };
}
