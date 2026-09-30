// 错题补弱服务（需求第三十六章 错题系统 / 第三十七章 错题补弱）。
//
// 需求第三十七章原文：「错题本不是收藏夹。」
// 本文件把补弱流程做成显式状态机：错题必须被推进（诊断→提示→重做→讲解→查前置
// →同类题→变式→延迟重测→修复），而不是存起来反复刷。
//
// 纯函数，无 IO，便于完整单测。持久化（user_wrong_questions 集合）待确认后再接。

import type { ErrorType } from '../core/question';
import type {
  DiagnosisInput,
  RemediationInput,
  RemediationStage,
  WrongQuestion,
} from '../core/wrongQuestion';
import { RETEST_INTERVAL_DAYS } from '../core/wrongQuestion';
import type { WrongQuestionRepository } from '../repositories/wrongQuestionRepository';
import { wrongQuestionRepository } from '../repositories/wrongQuestionRepository';
import { withTimeout } from '../utils/withTimeout';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- 错因诊断 ----------

// 判断两个数值是否相差整十/整百/整千倍（典型单位换算失误：米/厘米、千克/克）
function isPowerOfTenRatio(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return false;
  const r = Math.abs(a / b);
  const candidates = [10, 100, 1000, 0.1, 0.01, 0.001];
  return candidates.some((k) => Math.abs(r - k) < 1e-9);
}

// 按题型给出默认错因
function defaultErrorType(input: DiagnosisInput): ErrorType {
  switch (input.questionType) {
    case 'number_input':
      return 'calculation';
    case 'formula_input':
      return 'formula';
    case 'fill_blank':
      return 'concept';
    case 'equation_steps':
      return 'step';
    case 'true_false':
      return 'concept';
    default:
      return 'concept';
  }
}

// 错因诊断：返回按可能性排序的错因列表（第一个为主因）。
// 策略（可解释、可验证，不做黑箱打分）：
//   1) 步骤题错在某一步 → step（需求第三十一章）
//   2) 数值答案与正确答案互为相反数 → sign
//   3) 数值相差 10^n 倍 → unit（单位换算）
//   4) 否则按题型默认
//   5) 末尾追加题目声明的常见错因作为候选
export function diagnoseError(input: DiagnosisInput): ErrorType[] {
  const list: ErrorType[] = [];
  const push = (t: ErrorType) => {
    if (!list.includes(t)) list.push(t);
  };

  if (input.wrongStepIndex !== undefined && input.wrongStepIndex >= 0) {
    push('step');
  }

  const s = input.studentNumber;
  const c = input.correctNumber;
  if (typeof s === 'number' && typeof c === 'number' && Number.isFinite(s) && Number.isFinite(c)) {
    if (s !== c) {
      if (Math.abs(s + c) < 1e-9) push('sign');
      else if (isPowerOfTenRatio(s, c)) push('unit');
      else push('calculation');
    }
  }

  push(defaultErrorType(input));
  for (const t of input.declaredErrorTypes ?? []) push(t);

  // 「概念错误」作为保底候选，保证列表非空
  push('concept');
  return list;
}

// ---------- 补弱状态机 ----------

// 推进到下一阶段。返回新阶段；终态 fixed 保持不动。
//
// 注意 prereq_check：若前置知识未达标则**停在原地**（不推进）。
// 这是有意为之——前置不会时做同类题没有意义，应先补前置知识点（由上层引导去学）。
export function nextRemediationStage(input: RemediationInput): RemediationStage {
  const { stage, attemptCorrect, prereqMastered } = input;
  if (stage === 'fixed') return 'fixed';

  switch (stage) {
    case 'new':
      return 'diagnosed';
    case 'diagnosed':
      return 'hint_shown';
    case 'hint_shown':
      return 'redo';
    case 'redo':
      // 重做对了 → 排期延迟重测；仍错 → 进入分步讲解
      return attemptCorrect ? 'scheduled' : 'explained';
    case 'explained':
      return 'prereq_check';
    case 'prereq_check':
      return prereqMastered === false ? 'prereq_check' : 'similar_easy';
    case 'similar_easy':
      // 简单同类题做对 → 升级到同难度变式；仍错 → 退回查前置
      return attemptCorrect ? 'variant' : 'prereq_check';
    case 'variant':
      return attemptCorrect ? 'scheduled' : 'explained';
    case 'scheduled':
      // 延迟重测通过才算修复；否则打回讲解
      return attemptCorrect ? 'fixed' : 'explained';
    default:
      return 'new';
  }
}

// ---------- 重测排期 ----------

// 第 n 次（0 起）重测的间隔天数：1 / 2 / 4 / 7 天，超出取 7
export function retestDelayDays(attemptIndex: number): number {
  const i = Math.min(Math.max(0, Math.floor(attemptIndex)), RETEST_INTERVAL_DAYS.length - 1);
  return RETEST_INTERVAL_DAYS[i] ?? 7;
}

export function nextRetestTime(now: number, attemptIndex: number): number {
  return now + retestDelayDays(attemptIndex) * DAY_MS;
}

// 是否到了该重测的时间
export function shouldRetest(record: WrongQuestion, now: number): boolean {
  if (record.fixed) return false;
  if (record.stage !== 'scheduled') return false;
  if (record.nextRetestAt === undefined) return false;
  return now >= record.nextRetestAt;
}

// 是否已「毕业」（修复完成，可从错题本移除）——错题本不是收藏夹
export function isGraduated(record: WrongQuestion): boolean {
  return record.fixed && record.stage === 'fixed';
}

// ---------- L4：错题 → 选题池 ----------
//
// 取「还没修复」的错题所对应的知识点 id，供游戏 startGame 优先选题用。
// ⚠️ 读不到一律返回空数组：错题只是**让选题更准**，读不到就退回纯随机，
//    绝不能因为这一下云慢就开不了局（与「结算不陪云转圈」同一条规矩）。
const WRONG_LOAD_WAIT_MS = 2000;

export async function loadUnfixedKnowledgeIds(
  userId: string,
  repo: WrongQuestionRepository = wrongQuestionRepository,
): Promise<readonly string[]> {
  try {
    const list = await withTimeout(repo.listUnfixed(userId), WRONG_LOAD_WAIT_MS, '错题读取');
    return (list ?? []).flatMap((item) => item.knowledgePointIds[0] ?? []);
  } catch (error) {
    // 注意：repo.listUnfixed 是**同步**抛错（wx 不存在、云环境没起），
    // 这时 withTimeout 根本没机会介入，必须自己兜住——否则开不了局。
    console.error('错题读取失败（按「没有错题」继续开局）', error);
    return [];
  }
}

// 记录一次答错：累加次数、更新时间。
// 已修复后又错 → 打回 explained（说明没真正掌握，需重新讲解），并清除修复标记。
export function bumpWrong(record: WrongQuestion, now: number): WrongQuestion {
  return {
    ...record,
    wrongCount: record.wrongCount + 1,
    lastWrongAt: now,
    firstWrongAt: record.firstWrongAt ?? now,
    fixed: false,
    fixedAt: undefined,
    stage: record.stage === 'fixed' ? 'explained' : record.stage,
  };
}
