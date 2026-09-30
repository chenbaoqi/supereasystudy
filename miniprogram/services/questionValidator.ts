// 题目合法性校验（需求第三十九章：AI 正确性约束）。
//
// 需求原文：「AI 生成数学题：尽可能程序二次验证。无法可靠验证的 AI 题：不得直接进入正式考试题库。」
// 本文件就是那道闸门：批量导入 / AI 生成 / 教师录入的题目，入库前必须过 validateQuestion。
// 校验不通过的题目只能停留在 draft，不得标为 published。

import type { Question } from '../core/question';
import { isJudgeable } from '../core/question';
import { stageOfGrade } from '../utils/stage';
import { evalExpression } from './questionJudge';

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

function choiceTypes(q: Question): boolean {
  return q.questionType === 'single_choice' || q.questionType === 'multiple_choice';
}

export function validateQuestion(q: Question): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (field: string, message: string) => issues.push({ field, message });

  if (!q.questionId) push('questionId', '缺少题目 ID');
  if (!q.stem.trim()) push('stem', '题干为空');
  if (q.knowledgePointIds.length === 0) push('knowledgePointIds', '未关联任何知识点');

  if (!Number.isInteger(q.grade) || q.grade < 1 || q.grade > 12) {
    push('grade', `年级必须在 1-12，当前为 ${q.grade}`);
  } else if (stageOfGrade(q.grade) !== q.stage) {
    push('stage', `学段与年级不匹配：${q.grade} 年级应为 ${stageOfGrade(q.grade)}`);
  }

  if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5) {
    push('difficulty', `难度必须在 1-5，当前为 ${q.difficulty}`);
  }

  // 选择题：选项数量、去重、答案下标越界
  if (choiceTypes(q)) {
    const options = q.options ?? [];
    if (options.length < 2) {
      push('options', '选择题至少需要 2 个选项');
    }
    const normalized = options.map((o) => o.trim());
    if (new Set(normalized).size !== normalized.length) {
      push('options', '选项存在重复内容');
    }
    if (normalized.some((o) => o === '')) {
      push('options', '选项存在空内容');
    }

    if (q.questionType === 'single_choice') {
      const idx = q.correctAnswer.index;
      if (idx === undefined) push('correctAnswer.index', '单选题缺少正确选项下标');
      else if (idx < 0 || idx >= options.length) {
        push('correctAnswer.index', `正确选项下标 ${idx} 越界（共 ${options.length} 项）`);
      }
    } else {
      const idxs = q.correctAnswer.indexes ?? [];
      if (idxs.length < 1) push('correctAnswer.indexes', '多选题缺少正确选项');
      if (new Set(idxs).size !== idxs.length) push('correctAnswer.indexes', '正确选项重复');
      for (const i of idxs) {
        if (i < 0 || i >= options.length) {
          push('correctAnswer.indexes', `正确选项下标 ${i} 越界（共 ${options.length} 项）`);
        }
      }
    }
  }

  if (q.questionType === 'true_false') {
    const idx = q.correctAnswer.index;
    if (idx !== 0 && idx !== 1) push('correctAnswer.index', '判断题答案必须是 0(错) 或 1(对)');
  }

  if (q.questionType === 'fill_blank') {
    const texts = q.correctAnswer.texts ?? [];
    if (texts.length === 0 || texts.every((t) => !t.trim())) {
      push('correctAnswer.texts', '填空题缺少参考答案');
    }
  }

  if (q.questionType === 'number_input') {
    const n = q.correctAnswer.number;
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      push('correctAnswer.number', '数字题答案为无效数值');
    }
    const tol = q.correctAnswer.tolerance;
    if (tol !== undefined && (tol < 0 || !Number.isFinite(tol))) {
      push('correctAnswer.tolerance', '容差必须为非负数值');
    }
  }

  if (q.questionType === 'formula_input') {
    const texts = q.correctAnswer.texts ?? [];
    if (texts.length === 0) {
      push('correctAnswer.texts', '公式题缺少参考答案');
    } else {
      // 程序二次验证：期望答案必须是可被求值的合法表达式
      for (const t of texts) {
        if (evalExpression(t, 1) === null) {
          push('correctAnswer.texts', `参考答案「${t}」不是可求值的合法表达式，无法自动判题`);
        }
      }
    }
  }

  if (q.questionType === 'equation_steps') {
    const steps = q.correctAnswer.steps ?? [];
    if (steps.length === 0) push('correctAnswer.steps', '步骤题缺少期望步骤');
    if (steps.some((s) => !s.trim())) push('correctAnswer.steps', '步骤存在空内容');
  }

  // 需求第三十九章红线：无法可靠验证的题不得进正式题库
  if (q.status === 'published' && !isJudgeable(q.questionType)) {
    push('status', `题型 ${q.questionType} 无法程序判题，不得标为 published`);
  }

  return { ok: issues.length === 0, issues };
}
