// chapters 集合访问（Chapter 04 §9）。
import type { Chapter } from '../core/chapter';

export interface ChapterRepository {
  listBySemester(semesterId: string): Promise<Chapter[]>;
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
};
