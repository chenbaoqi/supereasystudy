// user_wrong_questions 集合访问（ADR-008 / 需求第三十六章）：错题与补弱进度。
import type { WrongQuestion, WrongQuestionDoc } from '../core/wrongQuestion';

export interface WrongQuestionRepository {
  listByUser(userId: string): Promise<WrongQuestionDoc[]>;
  // 未修复的错题（错题本主视图）
  listUnfixed(userId: string): Promise<WrongQuestionDoc[]>;
  getByUserAndQuestion(userId: string, questionId: string): Promise<WrongQuestionDoc | null>;
  add(record: Omit<WrongQuestion, '_id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  update(id: string, patch: Partial<WrongQuestion>): Promise<void>;
}

const COLLECTION = 'user_wrong_questions';

export const wrongQuestionRepository: WrongQuestionRepository = {
  async listByUser(userId) {
    const res = await wx.cloud.database().collection(COLLECTION).where({ userId }).limit(200).get();
    return res.data as WrongQuestionDoc[];
  },

  async listUnfixed(userId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ userId, fixed: false })
      .limit(200)
      .get();
    return res.data as WrongQuestionDoc[];
  },

  async getByUserAndQuestion(userId, questionId) {
    const db = wx.cloud.database();
    const res = await db.collection(COLLECTION).where({ userId, questionId }).limit(1).get();
    return (res.data[0] as WrongQuestionDoc | undefined) ?? null;
  },

  async add(record) {
    const db = wx.cloud.database();
    await db.collection(COLLECTION).add({
      data: { ...record, createdAt: db.serverDate(), updatedAt: db.serverDate() },
    });
  },

  async update(id, patch) {
    const db = wx.cloud.database();
    await db
      .collection(COLLECTION)
      .doc(id)
      .update({ data: { ...patch, updatedAt: db.serverDate() } });
  },
};
