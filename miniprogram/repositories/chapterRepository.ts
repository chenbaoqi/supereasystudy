// chapters 集合访问（Chapter 04 §9）。
import type { Chapter } from '../core/chapter';

export interface ChapterRepository {
  listBySemester(semesterId: string): Promise<Chapter[]>;
  // 按 id 批量取（首页「最近学习」用：learning_records 仅存 chapterId，标题需 join）
  listByIds(ids: string[]): Promise<Chapter[]>;
}

export const chapterRepository: ChapterRepository = {
  async listBySemester(semesterId) {
    const res = await wx.cloud
      .database()
      .collection('chapters')
      .where({ semesterId })
      .orderBy('order', 'asc')
      .limit(100)
      .get();
    return res.data as Chapter[];
  },

  async listByIds(ids) {
    if (ids.length === 0) return [];
    const db = wx.cloud.database();
    const res = await db
      .collection('chapters')
      .where({ _id: db.command.in(ids) })
      .limit(100)
      .get();
    return res.data as Chapter[];
  },
};
