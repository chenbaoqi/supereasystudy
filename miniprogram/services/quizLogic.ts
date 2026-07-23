// 四选一题目生成器（DRY：从 testService 抽取，供测试与极速选择共用——Chapter 08 §10）。
// 题型（Owner 确认）：英译中四选一，干扰项取同章节其他知识点的释义。
import type { Knowledge } from '../core/knowledge';

export interface ChoiceQuestion {
  readonly knowledgeId: string;
  readonly word: string;
  readonly options: readonly string[]; // 中文释义选项（≤4）
  readonly correctIndex: number;
}

const shuffle = <T>(list: readonly T[], random: () => number): T[] =>
  [...list].sort(() => random() - 0.5);

export function buildChoiceQuestions(
  knowledgeList: readonly Knowledge[],
  random: () => number = Math.random,
): ChoiceQuestion[] {
  return knowledgeList.map((item) => {
    // 干扰项：同章节其他知识点的释义，随机取 ≤3 个
    const distractors = shuffle(
      knowledgeList.filter((other) => other._id !== item._id).map((other) => other.meaning),
      random,
    ).slice(0, 3);
    const options = shuffle([item.meaning, ...distractors], random);
    return {
      knowledgeId: item._id,
      word: item.word,
      options,
      correctIndex: options.indexOf(item.meaning),
    };
  });
}
