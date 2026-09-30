// AI 辅导服务（Service 层：业务编排 + 降级）。
//
// 需求依据：
// - 第三十八章：AI 负责换方式解释/降低难度/举例/只提示一步/为什么/类似题/错因/建议/问答。
// - 第三十九章：标准答案由题库与程序决定；AI 主要负责解释。
//
// 关键设计：AI 未配置、被关闭、超时或报错时，**不把错误抛给用户**，
// 而是回落到题目自带的程序化提示（hints），保证「按钮永远有反应」。
import type { AiTutorAction, AiTutorContext, AiTutorResult } from '../core/ai';
import { AI_DISABLED, AI_NOT_CONFIGURED } from '../core/ai';
import { AI_CONFIG } from '../config/ai';
import { FEATURE_FLAGS } from '../config/features';
import { aiTutorRepository } from '../repositories/aiTutorRepository';
import type { AiTutorRawResult, AiTutorRepository } from '../repositories/aiTutorRepository';

const GENERIC_FALLBACK = '暂时无法获取 AI 讲解，建议先把这个知识点的定义再读一遍。';
const NO_HINT = '这道题暂时没有更多提示，建议回到知识点重新学习一遍。';

// 越界保护：hints 数量不足时退到最接近的一级
function pickHint(hints: readonly string[] | undefined, index: number): string {
  if (!hints || hints.length === 0) return NO_HINT;
  const i = Math.min(Math.max(index, 0), hints.length - 1);
  return hints[i] ?? NO_HINT;
}

// 按动作选择兜底内容（1 级=轻提示，2 级=分步，3 级=完整讲解）
export function fallbackText(action: AiTutorAction, hints?: readonly string[]): string {
  const hasHints = !!hints && hints.length > 0;
  switch (action) {
    case 'hint':
      return hasHints ? pickHint(hints, 0) : NO_HINT;
    case 'simplify':
      return hasHints ? pickHint(hints, 0) : NO_HINT;
    case 'explain':
      return hasHints ? pickHint(hints, 1) : GENERIC_FALLBACK;
    case 'example':
      return hasHints ? pickHint(hints, 2) : GENERIC_FALLBACK;
    case 'why':
      return hasHints ? pickHint(hints, 2) : GENERIC_FALLBACK;
    case 'diagnose':
      return '对照正确答案，找出你第一次出现分歧的那一步——错因通常就在那里。';
    case 'similar':
      return 'AI 未配置时无法自动生成同类题，建议重做错题本里的同类题。';
    case 'advise':
      return '建议优先复习掌握度最低的知识点，再往前补它的前置知识。';
    case 'status':
      return 'AI 未配置。';
    case 'qa':
    default:
      return GENERIC_FALLBACK;
  }
}

export interface AiTutorService {
  // hints：题目自带的程序化提示（AI 不可用时的兜底来源），按 轻→分步→完整 排列
  ask(
    action: AiTutorAction,
    context: AiTutorContext,
    hints?: readonly string[],
  ): Promise<AiTutorResult>;
  // 配置自检（不消耗额度），返回云函数原始结果
  status(): Promise<AiTutorRawResult>;
}

export function createAiTutorService(repo: AiTutorRepository): AiTutorService {
  return {
    async ask(action, context, hints) {
      const fallback = fallbackText(action, hints);

      if (!FEATURE_FLAGS.aiTutor) {
        return { ok: false, source: 'fallback', code: AI_DISABLED, text: fallback };
      }

      let raw: AiTutorRawResult;
      try {
        raw = await repo.ask(action, context);
      } catch {
        return AI_CONFIG.fallbackToHints
          ? { ok: false, source: 'fallback', code: 'AI_CALL_FAILED', text: fallback }
          : { ok: false, source: 'error', code: 'AI_CALL_FAILED', text: '' };
      }

      if (raw.ok && raw.text) {
        return { ok: true, source: 'ai', text: raw.text };
      }

      const code = raw.code ?? AI_NOT_CONFIGURED;
      return AI_CONFIG.fallbackToHints
        ? { ok: false, source: 'fallback', code, text: fallback }
        : { ok: false, source: 'error', code, text: '' };
    },

    async status() {
      return repo.status();
    },
  };
}

export const aiTutorService: AiTutorService = createAiTutorService(aiTutorRepository);
