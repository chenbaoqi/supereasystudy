// 语音能力策略（2026-09-13：数学等非语言学科取消语音）。
// 为什么单点收敛：发音按钮、听力题、游戏入口分散在多个页面，
// 每个页面各写一遍「这个学科能不能朗读」迟早会走散。
//
// 判定优先级：
//   1) 学科能力开关（config/subjects.ts 的 supportsSpeech）——权威判据
//   2) 学科未知（册次缺失/解析失败）时，按知识点类型兜底：概念/公式不朗读
//   3) 语法点不朗读（Owner 2026-07-30 确认：朗读与拼写游戏只针对记单词）
import type { Knowledge } from '../core/knowledge';

// 学科解析失败时用 null 表示「未知」，交由类型兜底，避免误判成「支持」而给数学念英文
export function allowSpeech(
  subjectSupportsSpeech: boolean | null,
  item: Knowledge | null,
): boolean {
  if (!item) return false;
  if (item.type === 'grammar') return false;
  if (subjectSupportsSpeech !== null) return subjectSupportsSpeech;
  return item.type !== 'concept' && item.type !== 'formula';
}
