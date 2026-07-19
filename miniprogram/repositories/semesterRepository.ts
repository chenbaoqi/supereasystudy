// semesters 集合访问（Chapter 04 §9）。
import type { Semester } from '../core/semester';

export interface SemesterRepository {
  listByTextbook(textbookId: string): Promise<Semester[]>;
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
};
