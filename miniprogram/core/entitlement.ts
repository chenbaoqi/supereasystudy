// 权益（会员 / 按次解锁）—— ADR-015。
//
// 设计要点：
//   1. **会员态与解锁记录分开**：会员是「一段时间内的全功能」，解锁是「某一个具体东西的这一次」。
//      混在一起会导致会员过期后历史解锁也被抹掉（或反过来：解锁一条就把整类开了）。
//   2. unlocks 的 key **必须带业务标识**（见 config/entitlements.ts 的 unlockKeyOf）——
//      Owner 要的是「本次结果」，全局开关会让一次解锁顺带打开别章的结果。
//   3. 时间一律存 ISO 字符串：云数据库里 Date 会被序列化，字符串最不容易出歧义。
import type { BaseEntity } from './base';

export type MembershipTier = 'free' | 'vip';

export interface Membership {
  readonly tier: MembershipTier;
  // null = 永久（赠送/内部账号）；否则为到期时间
  readonly expireAt: string | null;
  readonly source?: 'purchase' | 'gift';
}

// unlockKey → 到期时间（ISO）
export type UnlockMap = Readonly<Record<string, string>>;

export interface UserEntitlement extends BaseEntity {
  readonly userId: string;
  readonly membership?: Membership;
  readonly unlocks?: UnlockMap;
}

// 门禁判定结果
export type EntitlementReason =
  | 'vip' // 会员：直接放行
  | 'unlocked' // 之前已解锁且在有效期内
  | 'gated' // 需要观看视频解锁
  | 'unavailable'; // 权益服务不可用（集合没建/读失败）→ 必须放行，不能卡住用户

export interface EntitlementDecision {
  readonly allowed: boolean;
  readonly reason: EntitlementReason;
  // 可以给广告（gated 且广告可用）时才展示「观看视频」按钮
  readonly canUnlock: boolean;
}
