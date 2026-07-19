// 复习记录状态（Chapter 05 §5 显式定义，禁止增删）。
// 与 learningState（学习记录状态机）是两个独立枚举：
// 本枚举挂在 review_records 上，描述「用户×知识点」的复习进度。
export type ReviewStatus = 'REVIEW_DUE' | 'REVIEWING' | 'MASTERED';
