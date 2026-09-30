// 权益服务（ADR-015）：判断某个功能当前能不能用，以及看完视频后记一次解锁。
//
// 三条硬规则（勿改）：
//   1. **服务不可用 = 放行**。集合没建、网络失败、权限没配 —— 一律按「可用」处理。
//      宁可少收一次广告，也不能把用户卡在门槛外（可用性 > 转化率）。
//   2. **只有会员能免广告**：解锁是「按次 + 按天」的，不是把整类功能永久打开。
//   3. 学习主链路不设门禁（见 config/entitlements.ts 的红线注释）。
import type { EntitlementDecision, UserEntitlement } from '../core/entitlement';
import type { EntitlementFeature } from '../config/entitlements';
import { expireAtOf, unlockKeyOf } from '../config/entitlements';
import { entitlementRepository } from '../repositories/entitlementRepository';
import type { EntitlementRepository } from '../repositories/entitlementRepository';

export interface DecideInput {
  readonly entitlement: UserEntitlement | null;
  readonly feature: EntitlementFeature;
  // 业务标识（如章节 id、测试时间戳），决定「这次」是哪个 key
  readonly scope: string;
  readonly now: number;
  // 权益仓库是否可用（读抛错 → false）。false 时一律放行
  readonly available: boolean;
}

export function isVip(entitlement: UserEntitlement | null, now: number): boolean {
  const membership = entitlement?.membership;
  if (!membership || membership.tier !== 'vip') return false;
  if (!membership.expireAt) return true; // 永久
  const expire = Date.parse(membership.expireAt);
  if (Number.isNaN(expire)) return false; // 脏数据按非会员处理，不放行
  return expire > now;
}

export function decide(input: DecideInput): EntitlementDecision {
  if (!input.available) {
    return { allowed: true, reason: 'unavailable', canUnlock: false };
  }
  if (isVip(input.entitlement, input.now)) {
    return { allowed: true, reason: 'vip', canUnlock: false };
  }
  const key = unlockKeyOf(input.feature, input.scope, input.now);
  const expireAt = input.entitlement?.unlocks?.[key];
  if (expireAt) {
    const expire = Date.parse(expireAt);
    // 解析失败按「未解锁」处理：宁可让用户再看一次视频，也不能凭脏数据放行
    if (!Number.isNaN(expire) && expire > input.now) {
      return { allowed: true, reason: 'unlocked', canUnlock: false };
    }
  }
  return { allowed: false, reason: 'gated', canUnlock: true };
}

export interface EntitlementService {
  check(userId: string, feature: EntitlementFeature, scope: string): Promise<EntitlementDecision>;
  // 看完视频后记一次解锁。返回是否写入成功（失败不影响使用——页面已按「放行」处理）
  grantUnlock(userId: string, feature: EntitlementFeature, scope: string): Promise<boolean>;
}

export function createEntitlementService(deps: {
  repository: EntitlementRepository;
  now?: () => number;
}): EntitlementService {
  const now = deps.now ?? (() => Date.now());

  return {
    async check(userId, feature, scope) {
      let entitlement: UserEntitlement | null = null;
      let available = true;
      try {
        entitlement = await deps.repository.get(userId);
      } catch (error) {
        // 集合未建 / 权限未配 / 网络问题：按「不可用 → 放行」
        console.warn('权益读取失败，按可用处理', error);
        available = false;
      }
      return decide({ entitlement, feature, scope, now: now(), available });
    },

    async grantUnlock(userId, feature, scope) {
      const current = now();
      try {
        await deps.repository.putUnlock(
          userId,
          unlockKeyOf(feature, scope, current),
          expireAtOf(current, 24 * 60 * 60 * 1000),
        );
        return true;
      } catch (error) {
        console.error('解锁记录写入失败（本次仍放行）', error);
        return false;
      }
    },
  };
}

export const entitlementService: EntitlementService = createEntitlementService({
  repository: entitlementRepository,
});
