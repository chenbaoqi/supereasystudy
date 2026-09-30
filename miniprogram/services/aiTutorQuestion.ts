// 「一道题 → AI 辅导上下文」的构造（纯函数，可单测）。
//
// 为什么单独一个文件：
//   测试页的题目结构是 ChoiceQuestion（quizLogic），它**没有 hints 字段**——
//   分级提示只存在于 core/question.ts 的 Question 上，而那是题库结构，测试页用不到。
//   但 aiTutorService 的降级兜底恰恰是吃 hints 的（AI 不可用时回落到程序化提示）。
//   所以这里负责从「题目 + 知识点数据」反推三级提示，把两套结构接起来。
//
// 三级提示的约定（与 aiTutorService.fallbackText 的取用下标一一对应）：
//   [0] 轻提示  → hint / simplify
//   [1] 分步    → explain
//   [2] 完整讲解 → example / why
import type { AiTutorContext } from '../core/ai';
import type { AiTutorHandoff } from './aiTutorHandoff';
import { stageOfGrade } from '../utils/stage';

// 结构最小化：只取本题真正需要的字段，任何四选一题目（单词/听力/语法）都能传进来，
// 不必依赖 testService.QuizQuestion，避免页面 ⇄ 服务之间产生多余的引用。
export interface QuestionForAi {
  readonly prompt: string; // 题干文本（听力题题干是音频，这里给出被朗读的词）
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly kind?: string; // 'word' | 'listening' | 'grammar'
  readonly audioWord?: string;
  readonly word?: string; // 知识点名（quizLogic 里等于 Knowledge.word）
}

// 生成提示所需的知识点字段（Knowledge 的子集）
export interface KnowledgeForAi {
  readonly word?: string;
  readonly meaning?: string;
  readonly ipa?: string;
  readonly partOfSpeech?: string;
  readonly example?: string;
  readonly translation?: string;
  readonly explanation?: string;
  readonly type?: string; // 'word' | 'grammar'
}

export interface AiQuestionInput {
  readonly question: QuestionForAi;
  readonly knowledge?: KnowledgeForAi | null;
  readonly subjectName?: string;
  readonly grade?: number | null;
  // 学生选中的下标；-1 = 还没选（从「问 AI」以外的入口进来时可能是 -1）
  readonly selectedIndex: number;
}

const NO_ANSWER = -1;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

export function optionText(options: readonly string[], index: number): string {
  if (index < 0 || index >= options.length) return '';
  return options[index] ?? '';
}

// 题干：听力题的题干是音频，AI 看不到音频，只能把被朗读的词写进去
export function stemOf(question: QuestionForAi): string {
  if (question.kind === 'listening') {
    const word = question.audioWord || question.word || question.prompt;
    return `听音选词：${word}`;
  }
  return question.prompt;
}

// 三级提示。拿不到知识点时也必须给出可用文字——「按钮永远有反应」是硬要求。
export function hintsFor(input: AiQuestionInput): string[] {
  const { question, knowledge } = input;
  const correctText = optionText(question.options, question.correctIndex);
  const isGrammar = question.kind === 'grammar' || knowledge?.type === 'grammar';

  if (!knowledge) {
    // 答错后正确选项已经在屏幕上标绿了，学生早就看见答案——
    // 这时候提示再藏着掖着是装糊涂，第 2 级直接点明，第 1 级仍保留「只提示一步」的梯度。
    return [
      '再读一遍四个选项，先把明显不对的排除掉。',
      correctText
        ? `正确答案是「${correctText}」。对照它想一想，你选的那一项差在哪？`
        : '回到知识点，把定义再读一遍。',
      correctText
        ? `本题正确答案是「${correctText}」。建议先回到知识点重新学一遍，再回来做这道题。`
        : '建议先回到知识点重新学一遍，再回来做这道题。',
    ];
  }

  if (isGrammar) {
    // 点名必须带上：只说「表示经常发生的动作」，学生不知道在讲哪个语法点
    const name = knowledge.word || question.word || '';
    const brief = knowledge.meaning
      ? name
        ? `回想「${name}」这个语法点：${knowledge.meaning}`
        : `回想这个语法点：${knowledge.meaning}`
      : name
        ? `回想「${name}」的结构公式。`
        : '回想这个语法点的结构公式。';
    const step = knowledge.explanation || brief;
    const full = knowledge.explanation
      ? `${knowledge.explanation}${correctText ? `\n所以本题选「${correctText}」。` : ''}`
      : `本题选「${correctText}」。建议把这个语法点的结构公式抄写一遍。`;
    return [brief, step, full];
  }

  // 单词题：释义 → 例句 → 讲解/正确答案
  const ipa = knowledge.ipa ? `（${knowledge.ipa}）` : '';
  const pos = knowledge.partOfSpeech ? `${knowledge.partOfSpeech} ` : '';
  const brief = knowledge.meaning
    ? `${pos}「${knowledge.word || question.word || question.prompt}」的意思是：${knowledge.meaning}${ipa}`
    : '先看这个词的词性和它出现的句子。';
  const example =
    knowledge.example && knowledge.translation
      ? `例句：${knowledge.example}（${knowledge.translation}）`
      : knowledge.example
        ? `例句：${knowledge.example}`
        : knowledge.translation
          ? `中文：${knowledge.translation}`
          : `这个词的正确释义是「${knowledge.meaning || correctText}」。`;
  const full = knowledge.explanation
    ? `${knowledge.explanation}${correctText ? `\n所以本题选「${correctText}」。` : ''}`
    : `「${knowledge.word || question.prompt}」= ${knowledge.meaning || correctText}。${example}`;
  return [brief, example, full];
}

export function buildQuestionHandoff(input: AiQuestionInput): AiTutorHandoff {
  const { question, knowledge, subjectName, grade } = input;
  const context: AiTutorContext = {
    subjectName: subjectName || undefined,
    grade: grade ?? undefined,
    stage: grade ? stageOfGrade(grade) : undefined,
    // 语法题的「知识点名」是语法点名称，单词题就是单词本身
    knowledgeTitle: knowledge?.word || question.word || undefined,
    stem: stemOf(question),
    options: [...question.options],
    studentAnswer: optionText(question.options, input.selectedIndex) || undefined,
    correctAnswer: optionText(question.options, question.correctIndex) || undefined,
  };
  return { context, hints: hintsFor(input) };
}

// 给「问 AI」按钮做前置判断：没题目就没法带上下文
export function canAskAi(question: QuestionForAi | null | undefined): boolean {
  return !!question && question.options.length > 0;
}

// 合并上下文：只让「有值」的字段覆盖。
// 背景：交接对象为了结构完整会把缺失字段写成 undefined，直接展开会把 URL 传进来的同名字段抹成空。
export function mergeContext(base: AiTutorContext, extra?: AiTutorContext | null): AiTutorContext {
  if (!extra) return base;
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(extra) as (keyof AiTutorContext)[]) {
    const value = extra[key];
    if (value !== undefined) merged[key] = value;
  }
  return merged as AiTutorContext;
}

// 上下文条里要让用户看见「AI 到底看到了什么」——尤其是答错时，
// 学生最常怀疑的就是「它知不知道我选了哪个」。
export function contextMetaLines(context: AiTutorContext): string[] {
  const lines: string[] = [];
  const options = context.options ?? [];
  if (options.length > 0) {
    lines.push(`选项：${options.map((text, i) => `${optionLetter(i)}. ${text}`).join('　')}`);
  }
  if (context.studentAnswer) lines.push(`你选了：${context.studentAnswer}`);
  if (context.correctAnswer) lines.push(`正确答案：${context.correctAnswer}`);
  return lines;
}

export { NO_ANSWER };
