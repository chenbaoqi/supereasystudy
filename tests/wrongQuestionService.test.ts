// 错题补弱服务单测（B-5，需求第三十六章 / 第三十七章）。
import { describe, expect, it } from 'vitest';
import type { RemediationStage, WrongQuestion } from '../miniprogram/core/wrongQuestion';
import {
  bumpWrong,
  diagnoseError,
  isGraduated,
  nextRemediationStage,
  nextRetestTime,
  retestDelayDays,
  shouldRetest,
} from '../miniprogram/services/wrongQuestionService';

describe('diagnoseError（错因诊断）', () => {
  it('步骤题错在某一步 → 主因为步骤错误', () => {
    const r = diagnoseError({ questionType: 'equation_steps', wrongStepIndex: 1 });
    expect(r[0]).toBe('step');
  });

  it('答案与正确答案互为相反数 → 符号错误', () => {
    const r = diagnoseError({
      questionType: 'number_input',
      studentNumber: -3,
      correctNumber: 3,
    });
    expect(r[0]).toBe('sign');
  });

  it('相差 10^n 倍 → 单位错误（如米/厘米、千克/克）', () => {
    expect(
      diagnoseError({ questionType: 'number_input', studentNumber: 100, correctNumber: 1 })[0],
    ).toBe('unit');
    expect(
      diagnoseError({ questionType: 'number_input', studentNumber: 0.01, correctNumber: 1 })[0],
    ).toBe('unit');
  });

  it('普通数值偏差 → 计算错误', () => {
    const r = diagnoseError({
      questionType: 'number_input',
      studentNumber: 7,
      correctNumber: 6,
    });
    expect(r[0]).toBe('calculation');
  });

  it('按题型给默认错因', () => {
    expect(diagnoseError({ questionType: 'formula_input' })[0]).toBe('formula');
    expect(diagnoseError({ questionType: 'fill_blank' })[0]).toBe('concept');
  });

  it('题目声明的常见错因会作为候选追加，且不重复', () => {
    const r = diagnoseError({
      questionType: 'single_choice',
      declaredErrorTypes: ['misread', 'concept'],
    });
    expect(r).toContain('misread');
    expect(new Set(r).size).toBe(r.length);
  });

  it('结果永远非空，保底给出概念错误', () => {
    expect(diagnoseError({ questionType: 'unknown_type' }).length).toBeGreaterThan(0);
  });
});

describe('nextRemediationStage（补弱状态机）', () => {
  it('顺风顺水：诊断→提示→重做对→排期→重测过→修复', () => {
    let s: RemediationStage = 'new';
    s = nextRemediationStage({ stage: s });
    expect(s).toBe('diagnosed');
    s = nextRemediationStage({ stage: s });
    expect(s).toBe('hint_shown');
    s = nextRemediationStage({ stage: s });
    expect(s).toBe('redo');
    s = nextRemediationStage({ stage: s, attemptCorrect: true });
    expect(s).toBe('scheduled');
    s = nextRemediationStage({ stage: s, attemptCorrect: true });
    expect(s).toBe('fixed');
  });

  it('重做仍错 → 进入分步讲解，而不是原地重刷', () => {
    expect(nextRemediationStage({ stage: 'redo', attemptCorrect: false })).toBe('explained');
  });

  it('讲解后查前置；前置达标才做同类题', () => {
    expect(nextRemediationStage({ stage: 'explained' })).toBe('prereq_check');
    expect(nextRemediationStage({ stage: 'prereq_check', prereqMastered: true })).toBe(
      'similar_easy',
    );
  });

  it('前置未达标则停在 prereq_check（做同类题没意义）', () => {
    expect(nextRemediationStage({ stage: 'prereq_check', prereqMastered: false })).toBe(
      'prereq_check',
    );
  });

  it('同类题做对升变式，做错退回查前置', () => {
    expect(nextRemediationStage({ stage: 'similar_easy', attemptCorrect: true })).toBe('variant');
    expect(nextRemediationStage({ stage: 'similar_easy', attemptCorrect: false })).toBe(
      'prereq_check',
    );
  });

  it('变式做对排期重测，做错退回讲解', () => {
    expect(nextRemediationStage({ stage: 'variant', attemptCorrect: true })).toBe('scheduled');
    expect(nextRemediationStage({ stage: 'variant', attemptCorrect: false })).toBe('explained');
  });

  it('重测未过不算修复，打回讲解', () => {
    expect(nextRemediationStage({ stage: 'scheduled', attemptCorrect: false })).toBe('explained');
  });

  it('fixed 是终态，不再变化', () => {
    expect(nextRemediationStage({ stage: 'fixed', attemptCorrect: false })).toBe('fixed');
    expect(nextRemediationStage({ stage: 'fixed', attemptCorrect: true })).toBe('fixed');
  });

  it('不会卡死：任何阶段重复推进最终都能到达 fixed（假设全部答对）', () => {
    let s: RemediationStage = 'new';
    for (let i = 0; i < 20 && s !== 'fixed'; i += 1) {
      s = nextRemediationStage({ stage: s, attemptCorrect: true, prereqMastered: true });
    }
    expect(s).toBe('fixed');
  });
});

describe('重测排期', () => {
  it('间隔按 1/2/4/7 天递增，超出取 7', () => {
    expect(retestDelayDays(0)).toBe(1);
    expect(retestDelayDays(1)).toBe(2);
    expect(retestDelayDays(2)).toBe(4);
    expect(retestDelayDays(3)).toBe(7);
    expect(retestDelayDays(99)).toBe(7);
    expect(retestDelayDays(-5)).toBe(1); // 非法输入夹紧到首个间隔
  });

  it('nextRetestTime 按天偏移', () => {
    const now = 1_000_000;
    expect(nextRetestTime(now, 0) - now).toBe(24 * 60 * 60 * 1000);
  });

  it('shouldRetest：仅已排期且到点且未修复时为 true', () => {
    const base: WrongQuestion = {
      userId: 'u',
      questionId: 'q',
      knowledgePointIds: ['k'],
      studentAnswer: '1',
      correctAnswerText: '2',
      errorTypes: ['calculation'],
      wrongCount: 1,
      hintUsedCount: 0,
      stage: 'scheduled',
      fixed: false,
      nextRetestAt: 1000,
    };
    expect(shouldRetest(base, 999)).toBe(false);
    expect(shouldRetest(base, 1000)).toBe(true);
    expect(shouldRetest({ ...base, fixed: true }, 2000)).toBe(false);
    expect(shouldRetest({ ...base, stage: 'redo' }, 2000)).toBe(false);
    expect(shouldRetest({ ...base, nextRetestAt: undefined }, 2000)).toBe(false);
  });
});

describe('isGraduated（错题本不是收藏夹）', () => {
  it('只有真正修复才算毕业', () => {
    const r: WrongQuestion = {
      userId: 'u',
      questionId: 'q',
      knowledgePointIds: ['k'],
      studentAnswer: '1',
      correctAnswerText: '2',
      errorTypes: ['calculation'],
      wrongCount: 1,
      hintUsedCount: 0,
      stage: 'fixed',
      fixed: true,
    };
    expect(isGraduated(r)).toBe(true);
    expect(isGraduated({ ...r, fixed: false })).toBe(false);
    expect(isGraduated({ ...r, stage: 'scheduled' })).toBe(false);
  });
});

describe('bumpWrong', () => {
  const base: WrongQuestion = {
    userId: 'u',
    questionId: 'q',
    knowledgePointIds: ['k'],
    studentAnswer: '1',
    correctAnswerText: '2',
    errorTypes: ['calculation'],
    wrongCount: 1,
    hintUsedCount: 0,
    stage: 'redo',
    fixed: false,
    firstWrongAt: 100,
  };

  it('累加次数并更新最近错误时间，首次时间不变', () => {
    const r = bumpWrong(base, 500);
    expect(r.wrongCount).toBe(2);
    expect(r.lastWrongAt).toBe(500);
    expect(r.firstWrongAt).toBe(100);
  });

  it('首次错误时间为空时补上', () => {
    const r = bumpWrong({ ...base, firstWrongAt: undefined }, 300);
    expect(r.firstWrongAt).toBe(300);
  });

  it('已修复后又错 → 清除修复标记并打回讲解', () => {
    const fixed: WrongQuestion = { ...base, stage: 'fixed', fixed: true, fixedAt: 200 };
    const r = bumpWrong(fixed, 900);
    expect(r.fixed).toBe(false);
    expect(r.fixedAt).toBeUndefined();
    expect(r.stage).toBe('explained');
  });

  it('未修复时保持原阶段', () => {
    expect(bumpWrong({ ...base, stage: 'similar_easy' }, 800).stage).toBe('similar_easy');
  });
});
