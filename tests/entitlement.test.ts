// 权益门禁单测（ADR-015）。
// 这几条是「收钱」的逻辑：判错一边是白送，判错另一边是把付费/已解锁的用户挡在门外。
// 用户侧的感受差异极大，所以每种分支都锁死。
import { describe, expect, it } from 'vitest';
import type { UserEntitlement } from '../miniprogram/core/entitlement';
import { dayKey, expireAtOf, featureOf, unlockKeyOf } from '../miniprogram/config/entitlements';
import {
  createEntitlementService,
  decide,
  isVip,
} from '../miniprogram/services/entitlementService';
import { resolveGate } from '../miniprogram/utils/entitlementGate';
import type { EntitlementRepository } from '../miniprogram/repositories/entitlementRepository';

// 用本地时间构造，避免 TZ 影响 dayKey（dayKey 本身也按本地日期算）
const NOW = new Date(2026, 8, 14, 12, 0, 0).getTime();
const YESTERDAY = new Date(2026, 8, 13, 12, 0, 0).getTime();
const iso = (ms: number): string => new Date(ms).toISOString();

function ent(membership: UserEntitlement['membership'], unlocks?: Record<string, string>) {
  const base = {
    _id: 'e1',
    userId: 'u1',
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
  };
  return { ...base, membership, unlocks } as UserEntitlement;
}

describe('unlockKeyOf / dayKey（解锁键）', () => {
  it('键里带功能、业务标识与日期', () => {
    expect(unlockKeyOf('test-result', 'ch1:123', NOW)).toBe('test-result:ch1:123:2026-09-14');
  });

  it('同一天同业务 = 同一个键（当天不用重复解锁）', () => {
    const morning = new Date(2026, 8, 14, 8, 0, 0).getTime();
    const night = new Date(2026, 8, 14, 23, 0, 0).getTime();
    expect(unlockKeyOf('ai-tutor', 'chat', morning)).toBe(unlockKeyOf('ai-tutor', 'chat', night));
  });

  it('跨天 = 不同的键（TTL 靠换 key 实现，不用清数据）', () => {
    expect(unlockKeyOf('ai-tutor', 'chat', NOW)).not.toBe(
      unlockKeyOf('ai-tutor', 'chat', YESTERDAY),
    );
  });

  it('不同业务互不干扰（解锁本章不会顺带打开别章）', () => {
    expect(unlockKeyOf('test-result', 'ch1:1', NOW)).not.toBe(
      unlockKeyOf('test-result', 'ch2:1', NOW),
    );
  });

  it('dayKey 补零（9 月不能写成 2026-9-14）', () => {
    expect(dayKey(new Date(2026, 8, 5, 1, 0, 0).getTime())).toBe('2026-09-05');
  });
});

describe('featureOf（wxml 传来的字符串）', () => {
  it('认得清单里的名字', () => {
    expect(featureOf('ai-tutor')).toBe('ai-tutor');
    expect(featureOf('test-result')).toBe('test-result');
  });

  it('拼错 / 空值返回 null（宁可门禁失效也不锁人）', () => {
    expect(featureOf('ai_tutor')).toBeNull();
    expect(featureOf('')).toBeNull();
    expect(featureOf(undefined)).toBeNull();
  });
});

describe('isVip（会员判定）', () => {
  it('没有权益记录 = 非会员', () => {
    expect(isVip(null, NOW)).toBe(false);
  });

  it('free 档 = 非会员', () => {
    expect(isVip(ent({ tier: 'free', expireAt: null }), NOW)).toBe(false);
  });

  it('没写 membership 字段 = 非会员（老数据）', () => {
    expect(isVip(ent(undefined), NOW)).toBe(false);
  });

  it('expireAt 为 null = 永久会员', () => {
    expect(isVip(ent({ tier: 'vip', expireAt: null }), NOW)).toBe(true);
  });

  it('未到期 = 会员', () => {
    expect(isVip(ent({ tier: 'vip', expireAt: iso(NOW + 86400000) }), NOW)).toBe(true);
  });

  it('已过期 = 非会员', () => {
    expect(isVip(ent({ tier: 'vip', expireAt: iso(NOW - 1000) }), NOW)).toBe(false);
  });

  it('expireAt 是脏字符串：按非会员处理（不放行）', () => {
    expect(isVip(ent({ tier: 'vip', expireAt: 'not-a-date' }), NOW)).toBe(false);
  });
});

describe('decide（门禁判定）', () => {
  const base = { feature: 'test-result' as const, scope: 'ch1:1', now: NOW };

  it('权益服务不可用 → 放行（宁可少收广告，不能卡住用户）', () => {
    const r = decide({ ...base, entitlement: null, available: false });
    expect(r).toEqual({ allowed: true, reason: 'unavailable', canUnlock: false });
  });

  it('会员 → 放行且不给解锁按钮', () => {
    const e = ent({ tier: 'vip', expireAt: iso(NOW + 86400000) });
    const r = decide({ ...base, entitlement: e, available: true });
    expect(r).toEqual({ allowed: true, reason: 'vip', canUnlock: false });
  });

  it('非会员但有当天有效解锁 → 放行', () => {
    const e = ent(undefined, { [unlockKeyOf('test-result', 'ch1:1', NOW)]: iso(NOW + 3600000) });
    const r = decide({ ...base, entitlement: e, available: true });
    expect(r).toEqual({ allowed: true, reason: 'unlocked', canUnlock: false });
  });

  it('解锁记录是昨天的 → 拦住（跨天要重新解锁）', () => {
    const e = ent(undefined, { [unlockKeyOf('test-result', 'ch1:1', YESTERDAY)]: iso(NOW + 1e9) });
    const r = decide({ ...base, entitlement: e, available: true });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('gated');
  });

  it('解锁记录已过期 → 拦住', () => {
    const e = ent(undefined, { [unlockKeyOf('test-result', 'ch1:1', NOW)]: iso(NOW - 1000) });
    expect(decide({ ...base, entitlement: e, available: true }).allowed).toBe(false);
  });

  it('解锁到期时间解析不出来 → 拦住（不凭脏数据白送）', () => {
    const e = ent(undefined, { [unlockKeyOf('test-result', 'ch1:1', NOW)]: 'garbage' });
    expect(decide({ ...base, entitlement: e, available: true }).allowed).toBe(false);
  });

  it('非会员且无解锁 → 拦住，且可以给广告', () => {
    const r = decide({ ...base, entitlement: ent(undefined), available: true });
    expect(r).toEqual({ allowed: false, reason: 'gated', canUnlock: true });
  });

  it('解锁了 A 业务不影响 B 业务（按次解锁的核心）', () => {
    const e = ent(undefined, { [unlockKeyOf('ai-tutor', 'chat', NOW)]: iso(NOW + 3600000) });
    expect(decide({ ...base, entitlement: e, available: true }).allowed).toBe(false);
    expect(
      decide({ ...base, feature: 'ai-tutor', scope: 'chat', entitlement: e, available: true })
        .allowed,
    ).toBe(true);
  });
});

describe('resolveGate（判定结果 → 界面状态）', () => {
  const gated = { allowed: false, reason: 'gated', canUnlock: true } as const;

  it('查询中不渲染任何东西（避免门框闪一下）', () => {
    expect(
      resolveGate({ checking: true, decision: null, feature: 'ai-tutor', adAvailable: true }),
    ).toMatchObject({ state: 'checking' });
  });

  it('放行 → open', () => {
    expect(
      resolveGate({
        checking: false,
        decision: { allowed: true, reason: 'vip', canUnlock: false },
        feature: 'ai-tutor',
        adAvailable: true,
      }).state,
    ).toBe('open');
  });

  it('判定拿不到 → open（未登录等一律放行）', () => {
    expect(
      resolveGate({ checking: false, decision: null, feature: 'ai-tutor', adAvailable: true })
        .state,
    ).toBe('open');
  });

  it('拦住且广告可用 → gated，文案取自功能清单', () => {
    const view = resolveGate({
      checking: false,
      decision: gated,
      feature: 'test-result',
      adAvailable: true,
    });
    expect(view.state).toBe('gated');
    expect(view.title).toBe('本次测试分析');
    expect(view.buttonText).toContain('观看视频');
  });

  it('★ 拦住但广告不可用 → 放行（无广告位时不许把人卡在门外）', () => {
    expect(
      resolveGate({ checking: false, decision: gated, feature: 'test-result', adAvailable: false })
        .state,
    ).toBe('open');
  });

  it('feature 名不认识 → 放行', () => {
    expect(
      resolveGate({ checking: false, decision: gated, feature: null, adAvailable: true }).state,
    ).toBe('open');
  });

  it('文案里不出现「广告」二字（全站措辞统一为「观看视频」）', () => {
    for (const feature of ['ai-tutor', 'test-result'] as const) {
      const view = resolveGate({
        checking: false,
        decision: gated,
        feature,
        adAvailable: true,
      });
      expect(view.desc).not.toContain('广告');
      expect(view.buttonText).not.toContain('广告');
    }
  });
});

describe('entitlementService（带仓库的版本）', () => {
  function repoOf(state: { entitlement: UserEntitlement | null; throwOnGet?: boolean }) {
    const writes: { key: string; expireAt: string }[] = [];
    const repository: EntitlementRepository = {
      async get() {
        if (state.throwOnGet) throw new Error('集合未建');
        return state.entitlement;
      },
      async putUnlock(_userId, key, expireAt) {
        writes.push({ key, expireAt });
      },
    };
    return { repository, writes };
  }

  it('仓库抛错 → 放行（reason = unavailable）', async () => {
    const { repository } = repoOf({ entitlement: null, throwOnGet: true });
    const service = createEntitlementService({ repository, now: () => NOW });
    const r = await service.check('u1', 'ai-tutor', 'chat');
    expect(r).toEqual({ allowed: true, reason: 'unavailable', canUnlock: false });
  });

  it('grantUnlock 写入的 key 与 check 读的 key 必须一致', async () => {
    const { repository, writes } = repoOf({ entitlement: null });
    const service = createEntitlementService({ repository, now: () => NOW });
    expect(await service.grantUnlock('u1', 'test-result', 'ch1:9')).toBe(true);
    expect(writes[0]?.key).toBe('test-result:ch1:9:2026-09-14');
    // 到期时间 = 现在 + 1 天
    expect(Date.parse(writes[0]?.expireAt ?? '')).toBe(NOW + 24 * 60 * 60 * 1000);
  });

  it('grantUnlock 写入失败返回 false，但不抛（页面已按放行走）', async () => {
    const repository: EntitlementRepository = {
      async get() {
        return null;
      },
      async putUnlock() {
        throw new Error('写权限没配');
      },
    };
    const service = createEntitlementService({ repository, now: () => NOW });
    await expect(service.grantUnlock('u1', 'ai-tutor', 'chat')).resolves.toBe(false);
  });

  it('expireAtOf 的到期时间就是 now + ttl', () => {
    expect(Date.parse(expireAtOf(NOW, 60000))).toBe(NOW + 60000);
  });
});
