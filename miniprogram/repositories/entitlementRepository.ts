// user_entitlements 集合访问（ADR-015：会员态 + 按次解锁记录）。
//
// 为什么单独一个集合而不是挂在 users 上：users 走云函数（身份不可伪造，见 userRepository 注释），
// 而解锁是高频、纯本机触发的行为（看完视频立刻写一条），再绕云函数会把「广告不可用要放行」
// 这条降级链路拖长。这里与 favorites / review_records 一样客户端直写，
// 依赖云数据库权限「仅创建者可读写」——用户只能改自己的权益。
//
// 会员（涉及钱）在 P1 接支付时会改为云函数写入；本集合结构不变，只是写入方换人。
import type { UnlockMap, UserEntitlement } from '../core/entitlement';

export interface EntitlementRepository {
  get(userId: string): Promise<UserEntitlement | null>;
  // 写入一条解锁（同 key 覆盖：跨天 key 不同，不会互相污染）
  putUnlock(userId: string, key: string, expireAt: string): Promise<void>;
}

const COLLECTION = 'user_entitlements';

export const entitlementRepository: EntitlementRepository = {
  async get(userId) {
    const res = await wx.cloud.database().collection(COLLECTION).where({ userId }).limit(1).get();
    return (res.data[0] as UserEntitlement | undefined) ?? null;
  },

  async putUnlock(userId, key, expireAt) {
    const db = wx.cloud.database();
    const existing = await db.collection(COLLECTION).where({ userId }).limit(1).get();
    const now = db.serverDate();

    if (existing.data.length === 0) {
      await db.collection(COLLECTION).add({
        data: { userId, unlocks: { [key]: expireAt }, createdAt: now, updatedAt: now },
      });
      return;
    }

    const doc = existing.data[0] as UserEntitlement;
    // 用 db.command 做字段级更新，避免整条覆盖把会员字段写没
    await db
      .collection(COLLECTION)
      .doc(doc._id)
      .update({
        data: {
          [`unlocks.${key}`]: expireAt,
          updatedAt: now,
        },
      });
  },
};

// 供单测/降级用的空实现：读不到任何权益（服务按「不可用 → 放行」处理）
export const unavailableEntitlementRepository: EntitlementRepository = {
  async get() {
    throw new Error('user_entitlements 不可用');
  },
  async putUnlock() {
    throw new Error('user_entitlements 不可用');
  },
};

export type { UnlockMap };
