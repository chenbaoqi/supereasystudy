// Question Engine 判题器单测（B-3，需求第二十九章 / 第三十一章 / 第三十六章）。
import { describe, expect, it } from 'vitest';
import type { Question } from '../miniprogram/core/question';
import {
  evalExpression,
  formulasEquivalent,
  inferErrorType,
  judgeAnswer,
  normalizeText,
  parseNumericAnswer,
} from '../miniprogram/services/questionJudge';

const q = (over: Partial<Question> = {}): Question => ({
  questionId: 'q1',
  knowledgePointIds: ['k1'],
  stage: 'junior',
  grade: 7,
  difficulty: 2,
  questionType: 'single_choice',
  stem: '题干',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: { index: 1 },
  ...over,
});

describe('normalizeText', () => {
  it('全角转半角、数学符号统一、去空格、转小写', () => {
    expect(normalizeText('１／２')).toBe('1/2');
    expect(normalizeText('２ × ｘ')).toBe('2*x');
    expect(normalizeText('a − b')).toBe('a-b');
    expect(normalizeText('  AbC  ')).toBe('abc');
  });
});

describe('parseNumericAnswer', () => {
  it('整数 / 小数 / 省略前导零', () => {
    expect(parseNumericAnswer('42')).toBe(42);
    expect(parseNumericAnswer('0.5')).toBe(0.5);
    expect(parseNumericAnswer('.5')).toBe(0.5);
    expect(parseNumericAnswer('-3')).toBe(-3);
  });

  it('分数与百分数按数值解析', () => {
    expect(parseNumericAnswer('1/2')).toBe(0.5);
    expect(parseNumericAnswer('3/4')).toBe(0.75);
    expect(parseNumericAnswer('50%')).toBe(0.5);
  });

  it('带分数按「整数 + 真分数」解析（回归：曾被误读成 11/2=5.5）', () => {
    expect(parseNumericAnswer('1 1/2')).toBe(1.5);
    expect(parseNumericAnswer('2 3/4')).toBe(2.75);
    expect(parseNumericAnswer('-1 1/2')).toBe(-1.5);
  });

  it('解析不出返回 null，不猜', () => {
    expect(parseNumericAnswer('abc')).toBeNull();
    expect(parseNumericAnswer('1/0')).toBeNull();
    expect(parseNumericAnswer('')).toBeNull();
    expect(parseNumericAnswer('2 3')).toBeNull(); // 含空格但非带分数 → 不猜
  });
});

describe('evalExpression', () => {
  it('基础四则与隐式乘法', () => {
    expect(evalExpression('2x', 3)).toBe(6);
    expect(evalExpression('2(x+1)', 1)).toBe(4);
    expect(evalExpression('x/2', 8)).toBe(4);
    expect(evalExpression('1+2*3', 0)).toBe(7);
  });

  it('幂、负号、函数', () => {
    expect(evalExpression('x^2', 3)).toBe(9);
    expect(evalExpression('-x', 5)).toBe(-5);
    expect(evalExpression('sqrt(4)', 0)).toBe(2);
    expect(evalExpression('abs(-3)', 0)).toBe(3);
  });

  it('非法表达式返回 null，不抛错也不瞎算', () => {
    expect(evalExpression('foo(2)', 0)).toBeNull(); // 未知函数
    expect(evalExpression('1/0', 0)).toBeNull(); // 非有限值
    expect(evalExpression('2 +', 0)).toBeNull(); // 语法错误
    expect(evalExpression('y+1', 0)).toBeNull(); // 未知标识符
    expect(evalExpression('', 0)).toBeNull();
  });
});

describe('formulasEquivalent（数值采样等价）', () => {
  it('等价形式判为相同', () => {
    expect(formulasEquivalent('2x+2', '2(x+1)')).toBe(true);
    expect(formulasEquivalent('x*x', 'x^2')).toBe(true);
    expect(formulasEquivalent('1/2', '0.5')).toBe(true);
    expect(formulasEquivalent('(x+1)^2', 'x^2+2x+1')).toBe(true);
  });

  it('不同表达式判为不同', () => {
    expect(formulasEquivalent('x+1', 'x+2')).toBe(false);
    expect(formulasEquivalent('2x', '3x')).toBe(false);
  });

  it('无法解析或样本不足时返回 null，不硬判', () => {
    expect(formulasEquivalent('foo(x)', 'x')).toBeNull();
    expect(formulasEquivalent('y+1', 'x+1')).toBeNull();
  });
});

describe('judgeAnswer · 各题型', () => {
  it('单选：下标一致才对', () => {
    expect(judgeAnswer(q(), 1).correct).toBe(true);
    expect(judgeAnswer(q(), 2).correct).toBe(false);
    expect(judgeAnswer(q(), 2).errorType).toBe('concept');
  });

  it('多选：顺序无关，但集合必须完全一致', () => {
    const mq = q({ questionType: 'multiple_choice', correctAnswer: { indexes: [0, 2] } });
    expect(judgeAnswer(mq, [2, 0]).correct).toBe(true);
    expect(judgeAnswer(mq, [0, 1]).correct).toBe(false);
    expect(judgeAnswer(mq, [0]).correct).toBe(false);
  });

  it('判断：布尔 / 字符串 / 0-1 都能接受', () => {
    const tf = (index: number) => q({ questionType: 'true_false', correctAnswer: { index } });
    expect(judgeAnswer(tf(1), true).correct).toBe(true);
    expect(judgeAnswer(tf(0), false).correct).toBe(true);
    expect(judgeAnswer(tf(1), 1).correct).toBe(true);
    expect(judgeAnswer(tf(1), 'true').correct).toBe(true);
    expect(judgeAnswer(tf(1), false).correct).toBe(false);
  });

  it('填空：归一化后比对，全角/大小写/空格不影响', () => {
    const fq = q({ questionType: 'fill_blank', correctAnswer: { texts: ['三角形'] } });
    expect(judgeAnswer(fq, '三角形').correct).toBe(true);
    expect(judgeAnswer(fq, ' 三角形 ').correct).toBe(true);
    expect(judgeAnswer(fq, '四边形').correct).toBe(false);
  });

  it('数字：分数/小数/百分数等价，容差内算对', () => {
    const nq = q({ questionType: 'number_input', correctAnswer: { number: 0.5 } });
    expect(judgeAnswer(nq, '1/2').correct).toBe(true);
    expect(judgeAnswer(nq, '0.5').correct).toBe(true);
    expect(judgeAnswer(nq, '50%').correct).toBe(true);
    const tol = q({
      questionType: 'number_input',
      correctAnswer: { number: 3.14, tolerance: 0.01 },
    });
    expect(judgeAnswer(tol, '3.145').correct).toBe(true);
    expect(judgeAnswer(tol, '3.5').correct).toBe(false);
  });

  it('公式：等价写法算对，含隐式乘法与括号展开', () => {
    const fq = q({ questionType: 'formula_input', correctAnswer: { texts: ['2x+2'] } });
    expect(judgeAnswer(fq, '2x+2').correct).toBe(true);
    expect(judgeAnswer(fq, '2(x+1)').correct).toBe(true);
    expect(judgeAnswer(fq, '2*x+2').correct).toBe(true);
    expect(judgeAnswer(fq, '2x+3').correct).toBe(false);
    expect(judgeAnswer(fq, '2x+3').errorType).toBe('formula');
  });

  it('不支持的题型返回 null（不是判错）', () => {
    const pq = q({ questionType: 'proof_steps' });
    const r = judgeAnswer(pq, 'anything');
    expect(r.correct).toBeNull();
    expect(r.feedback).toContain('不支持');
  });
});

describe('judgeAnswer · 方程步骤（需求第三十一章）', () => {
  const steps = q({
    questionType: 'equation_steps',
    correctAnswer: { steps: ['2x+3=9', '2x=6', 'x=3'] },
  });

  it('全对时 wrongStepIndex = -1', () => {
    const r = judgeAnswer(steps, ['2x+3=9', '2x=6', 'x=3']);
    expect(r.correct).toBe(true);
    expect(r.wrongStepIndex).toBe(-1);
  });

  it('中间某步错时指出具体是第几行，而不是整题判错', () => {
    const r = judgeAnswer(steps, ['2x+3=9', '2x=5', 'x=3']);
    expect(r.correct).toBe(false);
    expect(r.wrongStepIndex).toBe(1);
    expect(r.feedback).toContain('第 2 步');
    expect(r.errorType).toBe('step');
  });

  it('第一步就错时指出第 1 行', () => {
    const r = judgeAnswer(steps, ['2x+3=8', '2x=6', 'x=3']);
    expect(r.wrongStepIndex).toBe(0);
    expect(r.feedback).toContain('第 1 步');
  });

  it('步骤数不足时也能定位到缺失的那一行', () => {
    const r = judgeAnswer(steps, ['2x+3=9']);
    expect(r.correct).toBe(false);
    expect(r.wrongStepIndex).toBe(1);
  });
});

describe('inferErrorType', () => {
  it('按题型给出最可能的错因', () => {
    expect(inferErrorType(q({ questionType: 'number_input' }))).toBe('calculation');
    expect(inferErrorType(q({ questionType: 'formula_input' }))).toBe('formula');
    expect(inferErrorType(q({ questionType: 'fill_blank' }))).toBe('concept');
  });

  it('选择题优先用题目声明的常见错因', () => {
    const declared = q({ errorTypes: ['misread', 'calculation'] });
    expect(inferErrorType(declared)).toBe('misread');
  });
});
