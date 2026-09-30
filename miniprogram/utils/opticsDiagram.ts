// 物理光路图纯逻辑（2026-09-30）：把「光路图类型」校验 + 说明文案收敛到这里，可单测。
// 几何图形本身由组件用 WXML/CSS 画（固定典型角度），不在这里算——与 english-diagram 同思路。
export type OpticsKind = 'reflection' | 'refraction' | 'lens';

export interface OpticsView {
  readonly kind: OpticsKind;
  readonly caption: string; // 图下方的说明文字
}

const CAPTIONS: Readonly<Record<OpticsKind, string>> = {
  reflection: '反射角等于入射角',
  refraction: '光从空气斜射入水，折射角小于入射角',
  lens: '凸透镜使平行光会聚到焦点',
};

// 不认识 / 非法的 kind 一律返回 null，组件不渲染也不报错（与 visualOf 的收口一致）
export function opticsViewOf(kind: unknown): OpticsView | null {
  if (kind !== 'reflection' && kind !== 'refraction' && kind !== 'lens') return null;
  return { kind, caption: CAPTIONS[kind] };
}
