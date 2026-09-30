// 单元测试卷构成（Chapter 13 Q1 确认；阶段化配比，配置优先）。
// 阶段演进：一期 听力2+单词8 → 当前 听力2+单词6+语法2（阅读位仍由单词填充）
// 阅读上线后定稿：听力2+单词4+语法2+阅读1篇（2题）= 10
//
// 2026-09-13：听力 Section 只对支持语音的学科（语言类）生成；
// 数学等非语言学科不出生听力题，原听力题量补给普通题，总题量不变（total 恒为 10）。
export interface TestPaperConfig {
  readonly listening: number; // 听力题数（TTS 读单词 → 选释义）
  readonly word: number; // 单词/普通题数（阅读上线后降为 4）
  readonly grammar: number; // 语法题数（来源 knowledge.quiz，2026-07-30 已接入）
  readonly reading: number; // 阅读题数（待 reading_passages 数据就绪后启用，值 2）
  readonly total: number; // 试卷固定题量
}

const BASELINE: TestPaperConfig = {
  listening: 2,
  word: 6,
  grammar: 2,
  reading: 0,
  total: 10,
};

export function getTestPaperConfig(supportsSpeech: boolean): TestPaperConfig {
  if (supportsSpeech) return BASELINE;
  // 不支持语音 → 无听力 Section，题量全部归入普通题，保证章节知识点少时也能成卷
  return {
    listening: 0,
    word: BASELINE.word + BASELINE.listening,
    grammar: BASELINE.grammar,
    reading: BASELINE.reading,
    total: BASELINE.total,
  };
}

// 默认配置（语言类学科），兼容既有用法
export const TEST_PAPER_CONFIG: TestPaperConfig = getTestPaperConfig(true);
