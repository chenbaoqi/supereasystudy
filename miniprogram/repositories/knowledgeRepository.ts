// knowledge 集合访问（Chapter 04 §9）。
// V1 约束：单章节知识点 ≤100 条（客户端单次 get 上限），超出需改云函数聚合（后续 Phase）。
import type { Knowledge } from '../core/knowledge';

export interface KnowledgeRepository {
  listByChapter(chapterId: string): Promise<Knowledge[]>;
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
};
