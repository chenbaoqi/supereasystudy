// knowledge 集合访问（Chapter 04 §9）。
// V1 约束：单章节知识点 ≤100 条（客户端单次 get 上限），超出需改云函数聚合（后续 Phase）。
import type { Knowledge } from '../core/knowledge';

export interface KnowledgeRepository {
  listByChapter(chapterId: string): Promise<Knowledge[]>;
  // 按 id 批量取（复习页用：review_records 仅存 knowledgeId，卡片内容需 join）
  listByIds(ids: string[]): Promise<Knowledge[]>;
}

export const knowledgeRepository: KnowledgeRepository = {
  async listByChapter(chapterId) {
    const res = await wx.cloud
      .database()
      .collection('knowledge')
      .where({ chapterId })
      .orderBy('order', 'asc')
      .limit(100)
      .get();
    return res.data as Knowledge[];
  },

  async listByIds(ids) {
    if (ids.length === 0) return [];
    const db = wx.cloud.database();
    const res = await db
      .collection('knowledge')
      .where({ _id: db.command.in(ids) })
      .limit(100)
      .get();
    return res.data as Knowledge[];
  },
};
