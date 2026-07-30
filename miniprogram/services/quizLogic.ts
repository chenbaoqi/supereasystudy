// 四选一题目生成器（DRY：从 testService 抽取，供测试与极速选择共用——Chapter 08 §10）。
// 题型（Owner 确认）：英译中四选一，干扰项取同章节其他知识点的释义。
import type { Knowledge } from '../core/knowledge';

export interface ChoiceQuestion {
  readonly knowledgeId: string;
  readonly word: string; // 英文单词（音频题干/答案判定等用途）
  readonly prompt: string; // 展示题干文本（单词题=word；语法题=quiz stem，Chapter 13）
  readonly options: readonly string[]; // 选项文本（释义或单词，≤4）
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
      prompt: item.word, // 单词题：题干为英文单词
      options,
      correctIndex: options.indexOf(item.meaning),
    };
  });
}

// 单词四选一（Chapter 09 §10：听音找词——题干是发音，选项是英文单词本身）
export function buildWordChoiceQuestions(
  knowledgeList: readonly Knowledge[],
  random: () => number = Math.random,
): ChoiceQuestion[] {
  return knowledgeList.map((item) => {
    // 干扰项：同章节其他知识点的单词，随机取 ≤3 个
    const distractors = shuffle(
      knowledgeList.filter((other) => other._id !== item._id).map((other) => other.word),
      random,
    ).slice(0, 3);
    const options = shuffle([item.word, ...distractors], random);
    return {
      knowledgeId: item._id,
      word: item.word,
      prompt: item.word, // 听音选词：prompt 与 word 一致（题干为音频）
      options,
      correctIndex: options.indexOf(item.word),
    };
  });
}
