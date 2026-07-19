// 学习状态机（Chapter 04 §6 定义；Chapter 05 §6 追加 REVIEW_DUE，向后兼容的纯增量）。
// 转移规则：开始学习→LEARNING，学完→COMPLETED，完成测试→TESTED→REVIEW_DUE（Q2 推荐），
// 复习计划全部完成→MASTERED（Chapter 05）。
export type LearningState =
  'NOT_STARTED' | 'LEARNING' | 'COMPLETED' | 'TESTED' | 'REVIEW_DUE' | 'MASTERED';
