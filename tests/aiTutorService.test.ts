// AiTutorService 单元测试（数学学科·AI 接口预留）。
// 覆盖：程序化兜底文案的分级与越界保护；AI 成功/未配置/调用抛错 三条返回路径；
// 功能开关关闭时直接降级（不消耗任何额度）。
import { describe, expect, it, vi } from 'vitest';
import { createAiTutorService, fallbackText } from '../miniprogram/services/aiTutorService';
import type {
  AiTutorRawResult,
  AiTutorRepository,
} from '../miniprogram/repositories/aiTutorRepository';

function mockRepo(responder: () => Promise<AiTutorRawResult>): AiTutorRepository {
  return {
    ask: responder,
    status: async () => ({ ok: true, configured: true, enabled: true }),
  };
}

const HINTS = ['先想想把未知数移到一边', '两边同时减去 3', '完整过程是 2x=6 所以 x=3'];

describe('fallbackText（程序化兜底）', () => {
  it('hint / simplify 取一级轻提示', () => {
    expect(fallbackText('hint', HINTS)).toBe(HINTS[0]);
    expect(fallbackText('simplify', HINTS)).toBe(HINTS[0]);
  });

  it('explain 取二级分步提示', () => {
    expect(fallbackText('explain', HINTS)).toBe(HINTS[1]);
  });

  it('example / why 取三级完整讲解', () => {
    expect(fallbackText('example', HINTS)).toBe(HINTS[2]);
    expect(fallbackText('why', HINTS)).toBe(HINTS[2]);
  });

  it('hints 不足时退到最接近的一级，不越界', () => {
    const one = ['只有一条提示'];
    expect(fallbackText('explain', one)).toBe('只有一条提示');
    expect(fallbackText('why', one)).toBe('只有一条提示');
  });

  it('无 hints 时给出通用引导，不返回空串', () => {
    expect(fallbackText('hint', undefined).length).toBeGreaterThan(0);
    expect(fallbackText('explain', []).length).toBeGreaterThan(0);
  });

  it('每个动作都有兜底文案，不出现空串', () => {
    const actions = [
      'explain',
      'simplify',
      'example',
      'hint',
      'why',
      'similar',
      'diagnose',
      'advise',
      'qa',
      'status',
    ] as const;
    for (const a of actions) {
      expect(fallbackText(a).length, `action=${a}`).toBeGreaterThan(0);
      expect(fallbackText(a, HINTS).length, `action=${a}`).toBeGreaterThan(0);
    }
  });
});

describe('createAiTutorService', () => {
  it('AI 可用时返回模型原文，source=ai', async () => {
    const svc = createAiTutorService(
      mockRepo(async () => ({ ok: true, text: '这里应该先移项', model: 'test-model' })),
    );
    const res = await svc.ask('explain', { knowledgeTitle: '一元一次方程' }, HINTS);
    expect(res.ok).toBe(true);
    expect(res.source).toBe('ai');
    expect(res.text).toBe('这里应该先移项');
  });

  it('AI 未配置时降级到程序化提示，并带上 AI_NOT_CONFIGURED', async () => {
    const svc = createAiTutorService(
      mockRepo(async () => ({ ok: false, code: 'AI_NOT_CONFIGURED', text: '' })),
    );
    const res = await svc.ask('explain', { knowledgeTitle: '一元一次方程' }, HINTS);
    expect(res.ok).toBe(false);
    expect(res.source).toBe('fallback');
    expect(res.code).toBe('AI_NOT_CONFIGURED');
    expect(res.text).toBe(HINTS[1]);
  });

  it('云函数调用抛错时降级，code=AI_CALL_FAILED', async () => {
    const svc = createAiTutorService(
      mockRepo(async () => {
        throw new Error('network down');
      }),
    );
    const res = await svc.ask('hint', {}, HINTS);
    expect(res.ok).toBe(false);
    expect(res.source).toBe('fallback');
    expect(res.code).toBe('AI_CALL_FAILED');
    expect(res.text).toBe(HINTS[0]);
  });

  it('AI 返回空文本时视为失败并降级', async () => {
    const svc = createAiTutorService(mockRepo(async () => ({ ok: true, text: '' })));
    const res = await svc.ask('why', {}, HINTS);
    expect(res.ok).toBe(false);
    expect(res.source).toBe('fallback');
  });

  it('status 透传云函数原始结果', async () => {
    const svc = createAiTutorService(
      mockRepo(async () => ({ ok: false, code: 'AI_NOT_CONFIGURED' })),
    );
    const s = await svc.status();
    expect(s.configured).toBe(true);
  });

  it('功能开关关闭时直接降级，不发起云函数调用', async () => {
    vi.resetModules();
    vi.doMock('../miniprogram/config/features', () => ({
      FEATURE_FLAGS: { adminEntry: false, rewardAd: false, aiTutor: false },
    }));
    const { createAiTutorService: create2 } =
      await import('../miniprogram/services/aiTutorService');
    let called = 0;
    const svc = create2(
      mockRepo(async () => {
        called += 1;
        return { ok: true, text: 'should not be used' };
      }),
    );
    const res = await svc.ask('explain', {}, HINTS);
    expect(called).toBe(0);
    expect(res.source).toBe('fallback');
    expect(res.code).toBe('AI_DISABLED');
    vi.doUnmock('../miniprogram/config/features');
  });
});
