// 错题与补弱模型（需求第三十六章 错题系统 / 第三十七章 错题补弱）。
//
// 需求第三十七章原文：「错题本不是收藏夹。」
// 因此本模型的核心不是「把错题存起来」，而是「把错题推进到修复」——
// 用 RemediationStage 状态机强制走完补弱流程，而不是让用户反复刷同一道错题。
import type { ErrorType } from './question';

// 补弱流程阶段（需求第三十七章）：
// 错题 → 判断错因 → 轻提示 → 重做 → 仍错 → 分步讲解 → 前置知识检查
//      → 简单同类题 → 同难度变式 → 延迟重测 → 修复
export type RemediationStage =
  | 'new' // 刚错，未诊断
  | 'diagnosed' // 已判定错因
  | 'hint_shown' // 已给轻提示
  | 'redo' // 重做中
  | 'explained' // 已分步讲解（重做仍错后）
  | 'prereq_check' // 正在检查前置知识
  | 'similar_easy' // 简单同类题
  | 'variant' // 同难度变式
  | 'scheduled' // 已排期延迟重测
  | 'fixed'; // 已修复（终态）

export const REMEDIATION_STAGE_LABEL: Record<RemediationStage, string> = {
  new: '待诊断',
  diagnosed: '已诊断',
  hint_shown: '已提示',
  redo: '重做中',
  explained: '已讲解',
  prereq_check: '查前置',
  similar_easy: '同类题',
  variant: '变式题',
  scheduled: '待重测',
  fixed: '已修复',
};

// 延迟重测间隔（天）：按已尝试次数递增，上限 7 天。
// 需求未规定具体间隔，此处取间隔重复的常见做法，后续可按实测调整。
export const RETEST_INTERVAL_DAYS: readonly number[] = [1, 2, 4, 7];

// 从库里读出来的错题（带 _id）。
// 为什么单独一个类型而不是让 WrongQuestion 继承 BaseEntity：WrongQuestion 是「要存什么」的契约，
// 纯逻辑层（services/wrongQuestionService.ts）与单测都按它构造对象，硬塞必填的 _id/createdAt
// 会把这些调用点全改一遍。只有**读出来**的那一侧才需要 _id，所以在这里补上即可。
export type WrongQuestionDoc = WrongQuestion & { readonly _id: string };

// 错题记录（需求第三十六章要求保存的字段）
export interface WrongQuestion {
  readonly id?: string;
  readonly userId: string;
  readonly questionId: string;
  readonly knowledgePointIds: readonly string[];
  readonly studentAnswer: string; // 学生答案
  readonly correctAnswerText: string; // 正确答案
  readonly wrongStepIndex?: number; // 错误步骤（步骤题，来自判题器）
  readonly errorTypes: readonly ErrorType[]; // 错因（按可能性排序）
  readonly wrongCount: number; // 错误次数
  readonly hintUsedCount: number; // 提示使用次数
  readonly firstWrongAt?: number; // 首次错误时间（毫秒时间戳）
  readonly lastWrongAt?: number; // 最近错误时间
  readonly stage: RemediationStage; // 当前补弱阶段
  readonly fixed: boolean; // 是否修复
  readonly fixedAt?: number; // 修复时间
  readonly nextRetestAt?: number; // 下次重测时间
  readonly prereqGap?: boolean; // 是否发现前置知识缺口
}

// 推进补弱流程所需的输入
export interface RemediationInput {
  readonly stage: RemediationStage;
  // 本次作答是否正确（redo / similar_easy / variant / scheduled 阶段需要）
  readonly attemptCorrect?: boolean;
  // 前置知识是否达标（prereq_check 阶段需要）
  readonly prereqMastered?: boolean;
}

// 错因诊断输入
export interface DiagnosisInput {
  readonly questionType: string;
  readonly declaredErrorTypes?: readonly ErrorType[];
  readonly studentAnswer?: string;
  readonly correctAnswerText?: string;
  readonly studentNumber?: number;
  readonly correctNumber?: number;
  readonly wrongStepIndex?: number;
}
