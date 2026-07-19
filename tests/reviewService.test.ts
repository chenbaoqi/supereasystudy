// ReviewService 单元测试（Chapter 05 §3/§5/§6 + Q1-Q6 确认方案）。
// 固定时钟注入：排期断言不依赖真实时间。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import type { ReviewRecord } from '../miniprogram/core/reviewRecord';
import type { ReviewStatus } from '../miniprogram/core/reviewStatus';
import type {
  ReviewRecordCreate,
  ReviewRecordUpdate,
} from '../miniprogram/repositories/reviewRepository';
import type { LearningRecordUpsert } from '../miniprogram/repositories/learningRecordRepository';
import { createReviewService } from '../miniprogram/services/reviewService';
import { addDays } from '../miniprogram/utils/date';

const USER = 'user-1';
const CHAPTER = 'chapter-1';
const NOW = new Date('2026-07-19T12:00:00');

const makeKnowledge = (id: string, order: number): Knowledge => ({
  _id: id,
  chapterId: CHAPTER,
  word: `word-${id}`,
  meaning: `释义-${id}`,
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const knowledgeList = [makeKnowledge('k1', 1), makeKnowledge('k2', 2)];

function createFakes() {
  const reviewStore = new Map<string, ReviewRecord>();
  let sequence = 0;
  const learningStore = new Map<string, LearningRecord>();

  const reviewRepository = {
    async listDueByUser(userId: string, deadline: Date) {
      return [...reviewStore.values()].filter(
        (item) =>
          item.userId === userId && item.status !== 'MASTERED' && item.nextReviewTime <= deadline,
      );
    },
    async listByUserAndChapter(userId: string, chapterId: string) {
      return [...reviewStore.values()].filter(
        (item) => item.userId === userId && item.chapterId === chapterId,
      );
    },
    async findByUserAndKnowledge(userId: string, knowledgeId: string) {
      return (
        [...reviewStore.values()].find(
          (item) => item.userId === userId && item.knowledgeId === knowledgeId,
        ) ?? null
      );
    },
    async countReviewedSince(userId: string, since: Date) {
      return [...reviewStore.values()].filter(
        (item) => item.userId === userId && item.lastReviewTime && item.lastReviewTime >= since,
      ).length;
    },
    async listByUser(userId: string) {
      return [...reviewStore.values()].filter((item) => item.userId === userId);
    },
    async createMany(inputs: ReviewRecordCreate[]) {
      for (const input of inputs) {
        sequence += 1;
        reviewStore.set(`r-${sequence}`, {
          _id: `r-${sequence}`,
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    },
    async update(id: string, fields: ReviewRecordUpdate) {
      const existing = reviewStore.get(id);
      if (existing) reviewStore.set(id, { ...existing, ...fields, updatedAt: new Date() });
    },
    async resetReviewingByUser(userId: string) {
      for (const [id, item] of reviewStore) {
        if (item.userId === userId && item.status === 'REVIEWING') {
          reviewStore.set(id, { ...item, status: 'REVIEW_DUE' });
        }
      }
    },
  };

  const knowledgeRepository = {
    async listByChapter() {
      return knowledgeList;
    },
    async listByIds(ids: string[]) {
      return knowledgeList.filter((item) => ids.includes(item._id));
    },
  };

  const learningRecordRepository = {
    async findByUserAndChapter(userId: string, chapterId: string) {
      return learningStore.get(`${userId}:${chapterId}`) ?? null;
    },
    async listByUserAndChapters(userId: string, chapterIds: string[]) {
      return [...learningStore.values()].filter(
        (item) => item.userId === userId && chapterIds.includes(item.chapterId),
      );
    },
    async listByUser(userId: string) {
      return [...learningStore.values()].filter((item) => item.userId === userId);
    },
    async upsert(input: LearningRecordUpsert) {
      const record: LearningRecord = {
        _id: 'lr-1',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      learningStore.set(`${input.userId}:${input.chapterId}`, record);
      return record;
    },
    async updateState(userId: string, chapterId: string, state: LearningRecord['state']) {
      const existing = learningStore.get(`${userId}:${chapterId}`);
      if (existing) learningStore.set(`${userId}:${chapterId}`, { ...existing, state });
    },
  };

  const service = createReviewService({
    reviewRepository,
    knowledgeRepository,
    learningRecordRepository,
    now: () => NOW,
  });

  return { service, reviewStore, learningStore };
}

describe('ReviewService.createReviewTasksForChapter（§3，Q1）', () => {
  it('按章节知识点批量创建任务：首次排期 +1 天，状态 REVIEW_DUE', async () => {
    const { service, reviewStore } = createFakes();
    const created = await service.createReviewTasksForChapter(USER, CHAPTER);
    expect(created).toBe(2);
    const records = [...reviewStore.values()];
    expect(records).toHaveLength(2);
    expect(records[0]?.status).toBe('REVIEW_DUE');
    expect(records[0]?.masteryLevel).toBe(0);
    expect(records[0]?.reviewCount).toBe(0);
    expect(records[0]?.nextReviewTime).toEqual(addDays(NOW, 1));
  });

  it('幂等：已存在的知识点不重复创建', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    const created = await service.createReviewTasksForChapter(USER, CHAPTER);
    expect(created).toBe(0);
    expect(reviewStore.size).toBe(2);
  });
});

describe('ReviewService.getTodayReviews（Q4 统计口径）', () => {
  it('待复习含过期、排除 MASTERED；完成率=已完成/(待+已)', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    // k1 改到昨日（过期，应计入待复习）；k2 保持明天到期（>今日24:00，不计入）但记为今日已复习
    const records = [...reviewStore.values()];
    const k1 = records.find((item) => item.knowledgeId === 'k1');
    if (k1) reviewStore.set(k1._id, { ...k1, nextReviewTime: addDays(NOW, -1) });
    const k2 = records.find((item) => item.knowledgeId === 'k2');
    if (k2) {
      reviewStore.set(k2._id, {
        ...k2,
        nextReviewTime: addDays(NOW, 1),
        lastReviewTime: NOW, // 今日已复习过
        reviewCount: 1,
      });
    }
    const stats = await service.getTodayReviews(USER);
    expect(stats.dueCount).toBe(1); // 仅 k1 到期
    expect(stats.doneCount).toBe(1); // k2 今日已复习
    expect(stats.completionRate).toBe(50);
    expect(stats.dueItems[0]?.knowledge._id).toBe('k1');
  });
});

describe('ReviewService.submitReview（§6 + Q3）', () => {
  it('认识：阶段 +1，按新阶段排期，reviewCount +1', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    await service.submitReview(USER, 'k1', true);
    const record = [...reviewStore.values()].find((item) => item.knowledgeId === 'k1');
    expect(record?.masteryLevel).toBe(1);
    expect(record?.nextReviewTime).toEqual(addDays(NOW, 3)); // 阶段 1 = 3 天
    expect(record?.reviewCount).toBe(1);
    expect(record?.lastReviewTime).toEqual(NOW);
    expect(record?.status).toBe('REVIEW_DUE');
  });

  it('不认识：阶段不变，明天再来，reviewCount 仍 +1', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    await service.submitReview(USER, 'k1', true); // 升到阶段 1
    await service.submitReview(USER, 'k1', false);
    const record = [...reviewStore.values()].find((item) => item.knowledgeId === 'k1');
    expect(record?.masteryLevel).toBe(1); // 不变
    expect(record?.nextReviewTime).toEqual(addDays(NOW, 1));
    expect(record?.reviewCount).toBe(2);
  });

  it('走完 5 阶段 → MASTERED；全章节 MASTERED → 学习记录 MASTERED（Q2）', async () => {
    const { service, reviewStore, learningStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    // k1 连续认识 5 次 → MASTERED（0→1→2→3→4→完成）
    for (let index = 0; index < 5; index += 1) await service.submitReview(USER, 'k1', true);
    const k1 = [...reviewStore.values()].find((item) => item.knowledgeId === 'k1');
    expect(k1?.status).toBe('MASTERED');
    expect(k1?.masteryLevel).toBe(4);
    // 章节未全部 MASTERED（k2 还在）→ 学习记录不应变 MASTERED
    expect(learningStore.get(`${USER}:${CHAPTER}`)?.state).not.toBe('MASTERED');
    // 预置一条学习记录（模拟已完成测试，状态 REVIEW_DUE）
    learningStore.set(`${USER}:${CHAPTER}`, {
      _id: 'lr-1',
      userId: USER,
      chapterId: CHAPTER,
      progress: 2,
      state: 'REVIEW_DUE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // k2 也走完 → 全章节 MASTERED → 学习记录 MASTERED
    for (let index = 0; index < 5; index += 1) await service.submitReview(USER, 'k2', true);
    expect(learningStore.get(`${USER}:${CHAPTER}`)?.state).toBe('MASTERED');
  });
});

describe('ReviewService.applyGameResults（Chapter 07 §12）', () => {
  it('错误知识点：无任务则新建（明天到期）；有任务则按「不认识」处理', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER); // k1/k2 已有任务
    await service.applyGameResults(USER, CHAPTER, ['k1', 'k3'], []); // k3 无任务
    const k1 = [...reviewStore.values()].find((item) => item.knowledgeId === 'k1');
    expect(k1?.reviewCount).toBe(1); // 已有任务：次数 +1
    expect(k1?.masteryLevel).toBe(0); // 阶段不变
    expect(k1?.nextReviewTime).toEqual(addDays(NOW, 1));
    const k3 = [...reviewStore.values()].find((item) => item.knowledgeId === 'k3');
    expect(k3).toBeDefined(); // 无任务：新建
    expect(k3?.status).toBe('REVIEW_DUE');
    expect(k3?.nextReviewTime).toEqual(addDays(NOW, 1));
  });

  it('正确知识点：masteryLevel+1（复用「认识」排期）', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    await service.applyGameResults(USER, CHAPTER, [], ['k1']);
    const k1 = [...reviewStore.values()].find((item) => item.knowledgeId === 'k1');
    expect(k1?.masteryLevel).toBe(1);
    expect(k1?.nextReviewTime).toEqual(addDays(NOW, 3)); // 阶段 1 = 3 天
  });

  it('去重：同一知识点重复出现只处理一次', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    await service.applyGameResults(USER, CHAPTER, ['k1', 'k1'], []);
    const k1 = [...reviewStore.values()].find((item) => item.knowledgeId === 'k1');
    expect(k1?.reviewCount).toBe(1); // 只 +1 次
  });
});

describe('ReviewService.startReview / finishReview（Q6）', () => {
  // 任务默认排期 +1 天，未到期不会出现在今日待复习：先把记录改为今日到期
  const makeDueToday = (store: Map<string, ReviewRecord>) => {
    for (const [id, item] of store) store.set(id, { ...item, nextReviewTime: NOW });
  };

  it('startReview 将本次记录置 REVIEWING 并返回复习项', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    makeDueToday(reviewStore);
    const items = await service.startReview(USER);
    expect(items).toHaveLength(2);
    const statuses = [...reviewStore.values()].map((item) => item.status);
    expect(statuses.every((status: ReviewStatus) => status === 'REVIEWING')).toBe(true);
  });

  it('finishReview 将残留 REVIEWING 归位为 REVIEW_DUE', async () => {
    const { service, reviewStore } = createFakes();
    await service.createReviewTasksForChapter(USER, CHAPTER);
    makeDueToday(reviewStore);
    await service.startReview(USER);
    await service.finishReview(USER);
    const statuses = [...reviewStore.values()].map((item) => item.status);
    expect(statuses.every((status: ReviewStatus) => status === 'REVIEW_DUE')).toBe(true);
  });
});
