// 物理光路图组件（2026-09-30）：反射 / 折射 / 凸透镜成像。
// 与 english-diagram 同思路：纯逻辑在 utils/opticsDiagram.ts（可单测），
// 组件只做「kind → 视图状态」，几何用 WXML/CSS 画（固定典型角度，斜线用 rotate）。
import { opticsViewOf, type OpticsView } from '../../utils/opticsDiagram';

Component({
  properties: {
    kind: { type: String, value: '' },
  },
  data: {
    view: null as OpticsView | null,
  },
  observers: {
    kind(kind: string) {
      this.setData({ view: opticsViewOf(kind) });
    },
  },
});
