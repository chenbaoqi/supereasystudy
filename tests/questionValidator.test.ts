// 题目校验器单测（B-3，需求第三十九章：AI 生成的题必须程序二次验证）。
import { describe, expect, it } from 'vitest';
import type { Question } from '../miniprogram/core/question';
import { validateQuestion } from '../miniprogram/services/questionValidator';

const base: Question = {
  questionId: 'q1',
  knowledgePointIds: ['k1'],
  stage: 'junior',
  grade: 7,
  difficulty: 3,
  questionType: 'single_choice',
  stem: '下列哪个是一元一次方程？',
  options: ['x+1', 'x^2', '1/x', 'x+y'],
  correctAnswer: { index: 0 },
  status: 'draft',
};

const q = (over: Partial<Question> = {}): Question => ({ ...base, ...over });
const fields = (r: { issues: readonly { field: string }[] }) => r.issues.map((i) => i.field);

describe('validateQuestion · 合法题目', () => {
  it('标准单选题通过校验', () => {
    const r = validateQuestion(q());
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
});

describe('validateQuestion · 基础字段', () => {
  it('题干为空、无知识点、ID 缺失都会被拦下', () => {
    expect(fields(validateQuestion(q({ stem: '  ' })))).toContain('stem');
    expect(fields(validateQuestion(q({ knowledgePointIds: [] })))).toContain('knowledgePointIds');
    expect(fields(validateQuestion(q({ questionId: '' })))).toContain('questionId');
  });

  it('年级越界被拦下', () => {
    expect(fields(validateQuestion(q({ grade: 0 })))).toContain('grade');
    expect(fields(validateQuestion(q({ grade: 13 })))).toContain('grade');
  });

  it('学段与年级不匹配被拦下（七年级标成小学）', () => {
    const r = validateQuestion(q({ grade: 7, stage: 'primary' }));
    expect(fields(r)).toContain('stage');
  });

  it('难度越界被拦下', () => {
    expect(fields(validateQuestion(q({ difficulty: 0 as 1 })))).toContain('difficulty');
    expect(fields(validateQuestion(q({ difficulty: 6 as 5 })))).toContain('difficulty');
  });
});

describe('validateQuestion · 选择题', () => {
  it('正确选项下标越界被拦下', () => {
    const r = validateQuestion(q({ correctAnswer: { index: 9 } }));
    expect(fields(r)).toContain('correctAnswer.index');
  });

  it('选项重复或为空被拦下', () => {
    expect(fields(validateQuestion(q({ options: ['a', 'a', 'b'] })))).toContain('options');
    expect(fields(validateQuestion(q({ options: ['a', ''] })))).toContain('options');
  });

  it('多选题下标越界 / 重复被拦下', () => {
    const mq = (indexes: number[]) =>
      q({ questionType: 'multiple_choice', correctAnswer: { indexes } });
    expect(fields(validateQuestion(mq([0, 9])))).toContain('correctAnswer.indexes');
    expect(fields(validateQuestion(mq([1, 1])))).toContain('correctAnswer.indexes');
    expect(fields(validateQuestion(mq([])))).toContain('correctAnswer.indexes');
  });

  it('判断题答案只能是 0 或 1', () => {
    const tf = (index: number) => q({ questionType: 'true_false', correctAnswer: { index } });
    expect(validateQuestion(tf(1)).ok).toBe(true);
    expect(fields(validateQuestion(tf(5)))).toContain('correctAnswer.index');
  });
});

describe('validateQuestion · 程序二次验证（需求第三十九章）', () => {
  it('公式题的参考答案必须可求值，否则拦下', () => {
    const bad = q({
      questionType: 'formula_input',
      correctAnswer: { texts: ['2x+'] },
    });
    expect(fields(bad ? validateQuestion(bad) : { issues: [] })).toContain('correctAnswer.texts');

    const good = q({
      questionType: 'formula_input',
      correctAnswer: { texts: ['2x+2', '2(x+1)'] },
    });
    expect(validateQuestion(good).ok).toBe(true);
  });

  it('数字题答案非有限值被拦下', () => {
    const r = validateQuestion(
      q({ questionType: 'number_input', correctAnswer: { number: Number.NaN } }),
    );
    expect(fields(r)).toContain('correctAnswer.number');
  });

  it('步骤题缺步骤或有空步骤被拦下', () => {
    expect(
      fields(validateQuestion(q({ questionType: 'equation_steps', correctAnswer: { steps: [] } }))),
    ).toContain('correctAnswer.steps');
    expect(
      fields(
        validateQuestion(
          q({ questionType: 'equation_steps', correctAnswer: { steps: ['2x=6', '  '] } }),
        ),
      ),
    ).toContain('correctAnswer.steps');
  });
});

describe('validateQuestion · 入库红线', () => {
  it('无法程序判题的题型不得标为 published', () => {
    const r = validateQuestion(q({ questionType: 'proof_steps', status: 'published' }));
    expect(r.ok).toBe(false);
    expect(fields(r)).toContain('status');
  });

  it('同一题型停留在 draft 则允许（待人工校对）', () => {
    const r = validateQuestion(q({ questionType: 'proof_steps', status: 'draft' }));
    expect(fields(r)).not.toContain('status');
  });
});
