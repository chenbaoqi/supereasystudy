// semesters 集合访问（Chapter 04 §9）。
import type { Semester } from '../core/semester';

export interface SemesterRepository {
  listByTextbook(textbookId: string): Promise<Semester[]>;
  // 按 id 取单条（语法游戏：由游戏入口转发的「单词册次 id」反查册次名 → 推断学段）
  getById(id: string): Promise<Semester | null>;
}

export const semesterRepository: SemesterRepository = {
  async listByTextbook(textbookId) {
    const res = await wx.cloud
      .database()
      .collection('semesters')
      .where({ textbookId })
      .orderBy('order', 'asc')
      .limit(100)
      .get();
    return res.data as Semester[];
  },

  async getById(id) {
    const res = await wx.cloud.database().collection('semesters').where({ _id: id }).limit(1).get();
    const list = res.data as Semester[];
    return list[0] ?? null;
  },
};
