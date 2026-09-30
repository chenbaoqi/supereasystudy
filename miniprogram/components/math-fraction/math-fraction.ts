// 分数模型组件（B-7 之二，math-subject-requirements-assessment.md §3.C 的 4 个第一批可视化组件）。
//
// 纯展示组件：不访问 Service/Repository，数据全部由页面经 properties 下发（分层规范）。
// 计算逻辑全在 utils/fraction.ts（可单测）——本文件只做「算好的值 → setData」。
//
// 用法：
//   <math-fraction numerator="3" denominator="4" />
//   带分数与比大小：<math-fraction numerator="2" denominator="3" compare="3/4" />
//
// 教学口径：假分数会画成带分数（5/4 → 1 又 1/4 的两个整体），
// 不是在一条 4 等分的条上涂 5 段 —— 后者学生数不清。
import { computeCompareView, type FractionView } from '../../utils/fraction';

Component({
  properties: {
    // 不传为 null，故用 type: null 接收「数字或空」
    numerator: { type: null, value: null },
    denominator: { type: null, value: null },
    // 带分数的整数部分
    whole: { type: Number, value: 0 },
    showLabel: { type: Boolean, value: true },
    // 另一个分数（"3/4" / "1 1/2" / "0.75"）：传了就画第二条并给出大小关系
    compare: { type: String, value: '' },
  },

  data: {
    a: {
      valid: false,
      segmented: false,
      segments: [],
      fillPercent: 0,
      label: '',
    } as FractionView,
    b: null as FractionView | null,
    relation: '' as '' | '<' | '>' | '=',
  },

  observers: {
    'numerator, denominator, whole, compare': function () {
      this.setData(computeCompareView(this.data));
    },
  },

  lifetimes: {
    attached() {
      this.setData(computeCompareView(this.data));
    },
  },
});
