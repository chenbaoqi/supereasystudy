// 数轴可视化组件（B-7 之一 —— math-subject-requirements-assessment.md §3.C 定的
// 4 个第一批可视化组件的第一个）。
//
// 纯展示组件：不访问 Service/Repository，数据全部由页面经 properties 下发（分层规范）。
// 计算逻辑全在 utils/numberLine.ts（可单测）——本文件只做「算好的值 → setData」，
// 因为组件文件导入时就会执行 Component({...})，把逻辑塞进来会导致 Node 侧无法单测。
//
// 用法示例（分数在数轴上的位置）：
//   <math-number-line min="0" max="1" step="0.25" value="0.5" />
// 区间（不等式 x ≥ 3）：
//   <math-number-line min="0" max="10" step="1" range-from="3" range-to="10" />
import { computeView } from '../../utils/numberLine';

Component({
  properties: {
    min: { type: Number, value: 0 },
    max: { type: Number, value: 10 },
    step: { type: Number, value: 1 },
    // 标记点 / 区间：不传为 null，故用 type: null 接收「数字或空」
    value: { type: null, value: null },
    rangeFrom: { type: null, value: null },
    rangeTo: { type: null, value: null },
    showLabels: { type: Boolean, value: true },
  },

  data: {
    ticks: [] as { value: number; label: string; left: number }[],
    hasValue: false,
    valueLeft: 0,
    hasRange: false,
    rangeLeft: 0,
    rangeWidth: 0,
  },

  observers: {
    'min, max, step, value, rangeFrom, rangeTo': function () {
      this.setData(computeView(this.data));
    },
  },

  lifetimes: {
    attached() {
      this.setData(computeView(this.data));
    },
  },
});
