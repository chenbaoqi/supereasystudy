// 学习状态机（Chapter 04 §6 显式定义，禁止增删状态）。
// 转移规则由 LearningService 实现：开始学习→LEARNING，学完→COMPLETED，
// 完成测试→TESTED；MASTERED 属复习体系（Specification 第 8 章，后续 Phase）。
export type LearningState = 'NOT_STARTED' | 'LEARNING' | 'COMPLETED' | 'TESTED' | 'MASTERED';
