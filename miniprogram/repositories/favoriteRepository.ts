// favorites 集合访问（ADR-005：收藏独立于 learning_records）。
import type { Favorite } from '../core/favorite';

export interface FavoriteRepository {
  listByUser(userId: string): Promise<Favorite[]>;
  add(userId: string, knowledgeId: string): Promise<Favorite>;
  remove(userId: string, knowledgeId: string): Promise<void>;
}

const COLLECTION = 'favorites';

export const favoriteRepository: FavoriteRepository = {
  async listByUser(userId) {
    const res = await wx.cloud.database().collection(COLLECTION).where({ userId }).limit(100).get();
    return res.data as Favorite[];
  },

  async add(userId, knowledgeId) {
    const db = wx.cloud.database();
    // 防重：先查后插（同一用户重复收藏同一知识点只保留一条）
    const existing = await db.collection(COLLECTION).where({ userId, knowledgeId }).limit(1).get();
    if (existing.data.length > 0) return existing.data[0] as Favorite;
    const res = await db.collection(COLLECTION).add({
      data: { userId, knowledgeId, createdAt: db.serverDate(), updatedAt: db.serverDate() },
    });
    // add 返回的 _id 类型为 DocumentId（string|number），云数据库实际恒为 string
    return {
      _id: res._id as string,
      userId,
      knowledgeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  async remove(userId, knowledgeId) {
    const db = wx.cloud.database();
    // 客户端 SDK 类型未声明 where().remove()：先查后按 id 删（等效且类型安全）
    const existing = await db.collection(COLLECTION).where({ userId, knowledgeId }).limit(1).get();
    if (existing.data.length === 0) return;
    const doc = existing.data[0] as Favorite;
    await db.collection(COLLECTION).doc(doc._id).remove();
  },
};
