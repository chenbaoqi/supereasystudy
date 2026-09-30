// user_mastery 集合访问（ADR-008）：用户×知识点掌握度。
import type { UserMastery } from '../core/masteryRecord';

// 写入掌握度时由调用方提供的字段（_id / 时间戳 / 关联键由仓储层负责）
export type MasteryUpsertInput = Omit<
  UserMastery,
  '_id' | 'createdAt' | 'updatedAt' | 'userId' | 'knowledgeId'
>;

export interface UserMasteryRepository {
  listByUser(userId: string): Promise<UserMastery[]>;
  getByUserAndKnowledge(userId: string, knowledgeId: string): Promise<UserMastery | null>;
  // 有则更新、无则插入（掌握度是持续累积的，不做重复插入）
  upsert(userId: string, knowledgeId: string, data: MasteryUpsertInput): Promise<void>;
}

const COLLECTION = 'user_mastery';

export const userMasteryRepository: UserMasteryRepository = {
  async listByUser(userId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ userId })
      .limit(1000)
      .get();
    return res.data as UserMastery[];
  },

  async getByUserAndKnowledge(userId, knowledgeId) {
    const db = wx.cloud.database();
    const res = await db.collection(COLLECTION).where({ userId, knowledgeId }).limit(1).get();
    return (res.data[0] as UserMastery | undefined) ?? null;
  },

  async upsert(userId, knowledgeId, data) {
    const db = wx.cloud.database();
    const existing = await db.collection(COLLECTION).where({ userId, knowledgeId }).limit(1).get();
    const patch = { ...data, updatedAt: db.serverDate() };
    if (existing.data.length > 0) {
      const doc = existing.data[0] as UserMastery;
      await db.collection(COLLECTION).doc(doc._id).update({ data: patch });
      return;
    }
    await db.collection(COLLECTION).add({
      data: { userId, knowledgeId, ...patch, createdAt: db.serverDate() },
    });
  },
};
