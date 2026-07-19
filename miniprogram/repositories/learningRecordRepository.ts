// learning_records 集合访问（Chapter 04 §7/§9）。
// 每「用户×章节」一条；upsert 用 serverDate 写时间，返回值用本地时间近似（以云端为准）。
import type { LearningRecord } from '../core/learningRecord';
import type { LearningState } from '../core/learningState';

export interface LearningRecordUpsert {
  readonly userId: string;
  readonly chapterId: string;
  readonly currentKnowledgeId?: string;
  readonly progress: number;
  readonly state: LearningState;
}

export interface LearningRecordRepository {
  findByUserAndChapter(userId: string, chapterId: string): Promise<LearningRecord | null>;
  listByUserAndChapters(userId: string, chapterIds: string[]): Promise<LearningRecord[]>;
  upsert(input: LearningRecordUpsert): Promise<LearningRecord>;
  updateState(userId: string, chapterId: string, state: LearningState): Promise<void>;
}

const COLLECTION = 'learning_records';

export const learningRecordRepository: LearningRecordRepository = {
  async findByUserAndChapter(userId, chapterId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ userId, chapterId })
      .limit(1)
      .get();
    return res.data.length > 0 ? (res.data[0] as LearningRecord) : null;
  },

  async listByUserAndChapters(userId, chapterIds) {
    if (chapterIds.length === 0) return [];
    const db = wx.cloud.database();
    const res = await db
      .collection(COLLECTION)
      .where({ userId, chapterId: db.command.in(chapterIds) })
      .limit(100)
      .get();
    return res.data as LearningRecord[];
  },

  async upsert(input) {
    const db = wx.cloud.database();
    const { userId, chapterId, ...fields } = input;
    const existing = await this.findByUserAndChapter(userId, chapterId);
    if (existing) {
      await db
        .collection(COLLECTION)
        .doc(existing._id)
        .update({ data: { ...fields, updatedAt: db.serverDate() } });
      return { ...existing, ...fields, updatedAt: new Date() };
    }
    const res = await db.collection(COLLECTION).add({
      data: {
        userId,
        chapterId,
        ...fields,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
    // add 返回的 _id 类型为 DocumentId（string|number），云数据库实际恒为 string
    return {
      _id: res._id as string,
      userId,
      chapterId,
      ...fields,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  async updateState(userId, chapterId, state) {
    const db = wx.cloud.database();
    const existing = await this.findByUserAndChapter(userId, chapterId);
    if (!existing) return;
    await db
      .collection(COLLECTION)
      .doc(existing._id)
      .update({ data: { state, updatedAt: db.serverDate() } });
  },
};
