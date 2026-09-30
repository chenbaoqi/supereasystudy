// canvas 绘图用色（B-7 之三：坐标系组件）。
//
// ⚠️ 为什么这里有一份色值：canvas 2d 是在 JS 里取色，**拿不到 wxss 的 CSS 自定义属性**，
// 所以 `var(--brand-600)` 这类令牌在 canvas 里用不了。这里是 `styles/tokens.wxss` 的镜像，
// 两边必须同步——改令牌时记得改这里（色值仍不出新色，只是同一批令牌的第二份拷贝）。
export const CANVAS_THEME = {
  /** --line：网格线 */
  grid: '#eaeff6',
  /** --ink-3：轴线与刻度数字 */
  axis: '#9aa3b4',
  label: '#9aa3b4',
  /** --brand-600：描点（要被读出来，用深一档） */
  point: '#3f6bc4',
  /** --brand-500：函数图像 */
  line: '#5a85e0',
  /** --bg-card：画布底色 */
  background: '#ffffff',
  /** 割补法：剩余那块的填充（--brand-50） */
  fill: '#eef3fc',
  /** 割补法：剪下来那块的填充（--warning-bg，与剩余块区分开） */
  fillPiece: '#fdf1e0',
} as const;
