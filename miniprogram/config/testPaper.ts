// 单元测试卷构成（Chapter 13 Q1 确认；阶段化配比，配置优先）。
// 阶段演进：一期 听力2+单词8 → 当前 听力2+单词6+语法2（阅读位仍由单词填充）
// 阅读上线后定稿：听力2+单词4+语法2+阅读1篇（2题）= 10
export const TEST_PAPER_CONFIG = {
  listening: 2, // 听力题数（TTS 读单词 → 选释义）
  word: 6, // 单词题数（阅读上线后降为 4）
  grammar: 2, // 语法题数（来源 knowledge.quiz，2026-07-30 已接入）
  reading: 0, // 阅读题数（待 reading_passages 数据就绪后启用，值 2）
  total: 10, // 试卷固定题量
} as const;
