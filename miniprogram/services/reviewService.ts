// 复习服务（Chapter 05 §9：getTodayReviews / startReview / submitReview / finishReview；
// §3「Study Complete → Create Review Task」对应 createReviewTasksForChapter，由
// LearningService.finishLearning 内部调用（Q1），页面不直接调）。
// 排期算法（§6：1/3/7/15/30 天，认识进阶、不认识明天再来）集中在本文件，Repository 无业务。
import { REVIEW_STAGES_DAYS, REVIEW_STAGE_COUNT, stageDays } from '../config/reviewPlan';
import type { Knowledge } from '../core/knowledge';
import type { ReviewRecord } from '../core/reviewRecord';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';
import { reviewRepository, type ReviewRepository } from '../repositories/reviewRepository';
import { addDays, endOfToday, startOfToday } from '../utils/date';

export interface ReviewItem {
  readonly record: ReviewRecord;
  readonly knowledge: Knowledge;
}

export interface TodayReviews {
  readonly dueItems: ReviewItem[];
  readonly dueCount: number; // 今日待复习（含过期，Q4）
  readonly doneCount: number; // 今日已完成
  readonly completionRate: number; // 0-100（Q4 口径）
}

export interface ReviewService {
  getTodayReviews(userId: string): Promise<TodayReviews>;
  startReview(userId: string): Promise<ReviewItem[]>;
  submitReview(userId: string, knowledgeId: string, known: boolean): Promise<void>;
  finishReview(userId: string): Promise<TodayReviews>;
  // 复习任务创建（§3），幂等：已存在的知识点跳过
  createReviewTasksForChapter(userId: string, chapterId: string): Promise<number>;
  // 游戏结果集成（Chapter 07 §12）：错误知识点生成/更新复习任务（明天到期），
  // 正确知识点 masteryLevel+1（复用 submitReview 的排期与 MASTERED 联动，单一写入口）
  applyGameResults(
    userId: string,
    chapterId: string,
    wrongIds: string[],
    correctIds: string[],
  ): Promise<void>;
}

export interface ReviewServiceDeps {
  reviewRepository: ReviewRepository;
  knowledgeRepository: KnowledgeRepository;
  learningRecordRepository: LearningRecordRepository;
  now?: () => Date; // 时间注入：测试可固定时钟
}

export function createReviewService(deps: ReviewServiceDeps): ReviewService {
  const now = deps.now ?? (() => new Date());

  const joinKnowledge = (records: ReviewRecord[], knowledgeList: Knowledge[]): ReviewItem[] => {
    const map = new Map(knowledgeList.map((item) => [item._id, item]));
    return records.flatMap((record) => {
      const knowledge = map.get(record.knowledgeId);
      // 知识点被删的孤儿记录跳过（数据一致性兜底，不影响主流程）
      return knowledge ? [{ record, knowledge }] : [];
    });
  };

  const service: ReviewService = {
    async createReviewTasksForChapter(userId, chapterId) {
      const knowledgeList = await deps.knowledgeRepository.listByChapter(chapterId);
      const existing = await deps.reviewRepository.listByUserAndChapter(userId, chapterId);
      const existingIds = new Set(existing.map((item) => item.knowledgeId));
      const firstDue = addDays(now(), REVIEW_STAGES_DAYS[0]);
      const toCreate = knowledgeList
        .filter((item) => !existingIds.has(item._id))
        .map((item) => ({
          userId,
          knowledgeId: item._id,
          chapterId,
          reviewCount: 0,
          masteryLevel: 0,
          nextReviewTime: firstDue,
          status: 'REVIEW_DUE' as const,
        }));
      await deps.reviewRepository.createMany(toCreate);
      return toCreate.length;
    },

    async getTodayReviews(userId) {
      const dueRecords = await deps.reviewRepository.listDueByUser(userId, endOfToday(now()));
      const knowledgeList = await deps.knowledgeRepository.listByIds(
        dueRecords.map((item) => item.knowledgeId),
      );
      const dueItems = joinKnowledge(dueRecords, knowledgeList);
      const doneCount = await deps.reviewRepository.countReviewedSince(userId, startOfToday(now()));
      const total = dueItems.length + doneCount;
      return {
        dueItems,
        dueCount: dueItems.length,
        doneCount,
        completionRate: total === 0 ? 0 : Math.round((doneCount / total) * 100),
      };
    },

    async startReview(userId) {
      const today = await service.getTodayReviews(userId);
      // Q6：本次复习的记录置 REVIEWING（中断后由 finishReview/reset 归位）
      for (const item of today.dueItems) {
        await deps.reviewRepository.update(item.record._id, { status: 'REVIEWING' });
      }
      return today.dueItems;
    },

    async submitReview(userId, knowledgeId, known) {
      const record = await deps.reviewRepository.findByUserAndKnowledge(userId, knowledgeId);
      if (!record) return;
      let masteryLevel = record.masteryLevel;
      let status: ReviewRecord['status'];
      let nextReviewTime = record.nextReviewTime;
      if (known) {
        if (masteryLevel >= REVIEW_STAGE_COUNT - 1) {
          status = 'MASTERED'; // 走完 5 阶段（Q2）
        } else {
          masteryLevel += 1;
          status = 'REVIEW_DUE';
          nextReviewTime = addDays(now(), stageDays(masteryLevel));
        }
      } else {
        // 不认识：阶段不变，明天再来（§6 字面规则，Q3）
        status = 'REVIEW_DUE';
        nextReviewTime = addDays(now(), REVIEW_STAGES_DAYS[0]);
      }
      await deps.reviewRepository.update(record._id, {
        reviewCount: record.reviewCount + 1,
        masteryLevel,
        lastReviewTime: now(),
        nextReviewTime,
        status,
      });
      if (status === 'MASTERED') {
        // Q2：章节内全部知识点 MASTERED → 学习记录 MASTERED
        const chapterRecords = await deps.reviewRepository.listByUserAndChapter(
          userId,
          record.chapterId,
        );
        const allMastered = chapterRecords.every(
          (item) => item._id === record._id || item.status === 'MASTERED',
        );
        if (allMastered) {
          await deps.learningRecordRepository.updateState(userId, record.chapterId, 'MASTERED');
        }
      }
    },

    async finishReview(userId) {
      // Q6：中断残留的 REVIEWING 归位为 REVIEW_DUE，再返回最新统计
      await deps.reviewRepository.resetReviewingByUser(userId);
      return service.getTodayReviews(userId);
    },

    async applyGameResults(userId, chapterId, wrongIds, correctIds) {
      // 错误知识点（去重）：有任务则按「不认识」处理（阶段不变、明天再来、次数+1）；
      // 无任务则新建（§12「生成 review_records」）
      for (const knowledgeId of [...new Set(wrongIds)]) {
        const record = await deps.reviewRepository.findByUserAndKnowledge(userId, knowledgeId);
        if (record) {
          await deps.reviewRepository.update(record._id, {
            reviewCount: record.reviewCount + 1,
            lastReviewTime: now(),
            nextReviewTime: addDays(now(), stageDays(0)),
            status: 'REVIEW_DUE',
          });
        } else {
          await deps.reviewRepository.createMany([
            {
              userId,
              knowledgeId,
              chapterId,
              reviewCount: 0,
              masteryLevel: 0,
              nextReviewTime: addDays(now(), stageDays(0)),
              status: 'REVIEW_DUE',
            },
          ]);
        }
      }
      // 正确知识点（去重）：复用 submitReview 的「认识」语义（masteryLevel+1/MASTERED 联动）
      for (const knowledgeId of [...new Set(correctIds)]) {
        await service.submitReview(userId, knowledgeId, true);
      }
    },
  };

  return service;
}

export const reviewService = createReviewService({
  reviewRepository,
  knowledgeRepository,
  learningRecordRepository,
});
