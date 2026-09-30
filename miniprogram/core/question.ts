// 统一题目模型（需求第二十九章 Question Engine / 第三十六章 错因）。
//
// 本文件只定义契约与常量，判题逻辑见 services/questionJudge.ts。
import type { SemesterStage } from '../utils/stage';

// 需求第二十九章列出的 15 种题型。
// 但「能定义」不等于「能判」——V1 判题器只支持前 6 种（程序可 100% 判定），
// 其余在 questionJudge.ts 中显式返回 unsupported，而不是假装判对判错。
export type QuestionType =
  | 'single_choice' // 单选（V1 可判）
  | 'multiple_choice' // 多选（V1 可判）
  | 'true_false' // 判断（V1 可判）
  | 'fill_blank' // 填空（V1 可判，文本归一化比对）
  | 'number_input' // 数字（V1 可判，支持分数/小数/百分数）
  | 'formula_input' // 公式（V1 可判，表达式数值采样等价）
  | 'equation_steps' // 方程步骤（V1 可判，逐行比对并指出错在第几行）
  | 'text_input' // 简答（需人工/AI 评阅）
  | 'drag_drop' // 拖拽（需交互组件）
  | 'sort' // 排序（需交互组件）
  | 'match' // 连线（需交互组件）
  | 'interactive_canvas' // 交互画布（需可视化组件）
  | 'geometry_interaction' // 几何交互（需几何引擎）
  | 'proof_steps' // 证明步骤（需定理库）
  | 'graph_interaction'; // 图像交互（需函数图组件）

// V1 程序可判定的题型（判题器支持的白名单）
export const JUDGEABLE_TYPES: readonly QuestionType[] = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'number_input',
  'formula_input',
  'equation_steps',
];

export function isJudgeable(type: QuestionType): boolean {
  return JUDGEABLE_TYPES.includes(type);
}

// 难度 1-5
export type Difficulty = 1 | 2 | 3 | 4 | 5;

// 错因（需求第三十六章）
export const ERROR_TYPES = [
  'calculation', // 计算错误
  'concept', // 概念错误
  'formula', // 公式错误
  'misread', // 审题错误
  'unit', // 单位错误
  'sign', // 符号错误
  'step', // 步骤错误
  'theorem', // 定理使用错误
  'graph', // 图像理解错误
  'confusion', // 知识点混淆
  'method', // 方法不会
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

export const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  calculation: '计算错误',
  concept: '概念错误',
  formula: '公式错误',
  misread: '审题错误',
  unit: '单位错误',
  sign: '符号错误',
  step: '步骤错误',
  theorem: '定理使用错误',
  graph: '图像理解错误',
  confusion: '知识点混淆',
  method: '方法不会',
};

// 题目状态：draft=AI/批量生成待校验；reviewed=已校对；published=可进正式题库。
// 需求第三十九章：无法可靠验证的 AI 题不得直接进入正式考试题库 → 必须走 draft→reviewed→published。
export type QuestionStatus = 'draft' | 'reviewed' | 'published';

// 答案载体：不同题型取不同字段，均为可选，由判题器按题型取值。
export interface QuestionAnswer {
  // 单选：正确选项下标；判断：true/false
  readonly index?: number;
  // 多选：正确选项下标集合
  readonly indexes?: readonly number[];
  // 填空 / 公式：文本答案（可多个等价写法）
  readonly texts?: readonly string[];
  // 数字：数值 + 容差
  readonly number?: number;
  readonly tolerance?: number;
  // 方程步骤：期望的每一步
  readonly steps?: readonly string[];
}

export interface Question {
  readonly questionId: string;
  readonly knowledgePointIds: readonly string[];
  readonly stage: SemesterStage;
  readonly grade: number;
  readonly difficulty: Difficulty;
  readonly questionType: QuestionType;
  readonly stem: string;
  // 选择题选项；非选择题不填
  readonly options?: readonly string[];
  readonly correctAnswer: QuestionAnswer;
  readonly solution?: string; // 解析
  readonly hints?: readonly string[]; // 分级提示（轻→分步→完整），AI 降级时的兜底来源
  readonly errorTypes?: readonly ErrorType[]; // 本题常见错因
  readonly estimatedSeconds?: number;
  readonly source?: string; // 题源（自研/授权/AI生成）
  readonly status?: QuestionStatus;
}

// 判题结果
export interface JudgeResult {
  // true=正确；false=错误；null=本版本不支持该题型，无法判定（不是判错！）
  readonly correct: boolean | null;
  readonly expected?: string; // 期望答案（展示用）
  readonly normalized?: string; // 归一化后的学生答案（调试/展示用）
  // 判错时推断的错因（需求第三十六章）；判对或无法判定时为 undefined
  readonly errorType?: ErrorType;
  readonly feedback?: string; // 给学生的反馈
  // 步骤题专用：第一个出错的步骤下标（-1 表示步骤全对）
  readonly wrongStepIndex?: number;
}
