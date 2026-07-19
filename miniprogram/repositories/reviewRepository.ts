// review_records 集合访问（Chapter 05 §8）。
// 注意：Repository 不写业务（§11）——排期算法全部在 ReviewService。
import type { ReviewRecord } from '../core/reviewRecord';
import type { ReviewStatus } from '../core/reviewStatus';

export interface ReviewRecordCreate {
  readonly userId: string;
  readonly knowledgeId: string;
  readonly chapterId: string;
  readonly reviewCount: number;
  readonly masteryLevel: number;
  readonly nextReviewTime: Date;
  readonly status: ReviewStatus;
}

export interface ReviewRecordUpdate {
  readonly reviewCount?: number;
  readonly masteryLevel?: number;
  readonly lastReviewTime?: Date;
  readonly nextReviewTime?: Date;
  readonly status?: ReviewStatus;
}

export interface ReviewRepository {
  // 到期记录：status≠MASTERED 且 nextReviewTime≤deadline（含过期，Q4）
  listDueByUser(userId: string, deadline: Date): Promise<ReviewRecord[]>;
  listByUserAndChapter(userId: string, chapterId: string): Promise<ReviewRecord[]>;
  findByUserAndKnowledge(userId: string, knowledgeId: string): Promise<ReviewRecord | null>;
  // 今日已完成数：lastReviewTime≥since 的记录数
  countReviewedSince(userId: string, since: Date): Promise<number>;
  // 用户全部复习记录（连续天数实时计算用，Specification §13.3 方案 A）
  listByUser(userId: string): Promise<ReviewRecord[]>;
  createMany(inputs: ReviewRecordCreate[]): Promise<void>;
  update(id: string, fields: ReviewRecordUpdate): Promise<void>;
  // REVIEWING → REVIEW_DUE 归位（复习中断兜底，Q6）
  resetReviewingByUser(userId: string): Promise<void>;
}

const COLLECTION = 'review_records';

export const reviewRepository: ReviewRepository = {
  async listDueByUser(userId, deadline) {
    const db = wx.cloud.database();
    const res = await db
      .collection(COLLECTION)
      .where({
        userId,
        status: db.command.neq('MASTERED'),
        nextReviewTime: db.command.lte(deadline),
      })
      .orderBy('nextReviewTime', 'asc')
      .limit(100)
      .get();
    return res.data as ReviewRecord[];
  },

  async listByUserAndChapter(userId, chapterId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ userId, chapterId })
      .limit(100)
      .get();
    return res.data as ReviewRecord[];
  },

  async findByUserAndKnowledge(userId, knowledgeId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ userId, knowledgeId })
      .limit(1)
      .get();
    return res.data.length > 0 ? (res.data[0] as ReviewRecord) : null;
  },

  async countReviewedSince(userId, since) {
    const db = wx.cloud.database();
    const res = await db
      .collection(COLLECTION)
      .where({ userId, lastReviewTime: db.command.gte(since) })
      .count();
    return res.total;
  },

  async listByUser(userId) {
    const res = await wx.cloud.database().collection(COLLECTION).where({ userId }).limit(100).get();
    return res.data as ReviewRecord[];
  },

  async createMany(inputs) {
    const db = wx.cloud.database();
    // V1：客户端 SDK 无批量写，逐条 add（单章节 ≤100 条可接受；后续挪云函数批量）
    for (const input of inputs) {
      await db.collection(COLLECTION).add({
        data: { ...input, createdAt: db.serverDate(), updatedAt: db.serverDate() },
      });
    }
  },

  async update(id, fields) {
    const db = wx.cloud.database();
    await db
      .collection(COLLECTION)
      .doc(id)
      .update({ data: { ...fields, updatedAt: db.serverDate() } });
  },

  async resetReviewingByUser(userId) {
    const db = wx.cloud.database();
    // 客户端 SDK 不支持按条件批量 update：先查后逐条改（中断残留量小，可接受）
    const res = await db
      .collection(COLLECTION)
      .where({ userId, status: 'REVIEWING' })
      .limit(100)
      .get();
    const items = res.data as ReviewRecord[];
    for (const item of items) {
      await this.update(item._id, { status: 'REVIEW_DUE' });
    }
  },
};
