// StatisticsService 单元测试（Specification §13.3 口径：今日/累计/连续天数）。
import { describe, expect, it } from 'vitest';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import type { ReviewRecord } from '../miniprogram/core/reviewRecord';
import { createStatisticsService } from '../miniprogram/services/statisticsService';
import { addDays, countStreakDays } from '../miniprogram/utils/date';

const USER = 'user-1';
const NOW = new Date('2026-07-19T12:00:00');

const makeLearningRecord = (
  chapterId: string,
  progress: number,
  updatedAt: Date,
): LearningRecord => ({
  _id: `lr-${chapterId}`,
  userId: USER,
  chapterId,
  progress,
  state: 'LEARNING',
  createdAt: new Date(),
  updatedAt,
});

const makeReviewRecord = (knowledgeId: string, lastReviewTime?: Date): ReviewRecord => ({
  _id: `rr-${knowledgeId}`,
  userId: USER,
  knowledgeId,
  chapterId: 'chapter-1',
  reviewCount: 1,
  masteryLevel: 0,
  lastReviewTime,
  nextReviewTime: addDays(NOW, 1),
  status: 'REVIEW_DUE',
  createdAt: new Date(),
  updatedAt: new Date(),
});

function createService(
  learningRecords: LearningRecord[],
  reviewRecords: ReviewRecord[],
  todayReviewed: number,
) {
  return createStatisticsService({
    learningRecordRepository: {
      async findByUserAndChapter() {
        return null;
      },
      async listByUserAndChapters() {
        return [];
      },
      async listByUser() {
        return learningRecords;
      },
      async upsert(input) {
        return { _id: 'new', ...input, createdAt: new Date(), updatedAt: new Date() };
      },
      async updateState() {},
    },
    reviewRepository: {
      async listDueByUser() {
        return [];
      },
      async listByUserAndChapter() {
        return [];
      },
      async findByUserAndKnowledge() {
        return null;
      },
      async countReviewedSince() {
        return todayReviewed;
      },
      async listByUser() {
        return reviewRecords;
      },
      async createMany() {},
      async update() {},
      async resetReviewingByUser() {},
    },
    now: () => NOW,
  });
}

describe('countStreakDays（§13.3 方案 A）', () => {
  it('连续 3 天（含今天）→ 3', () => {
    const dates = [NOW, addDays(NOW, -1), addDays(NOW, -2)];
    expect(countStreakDays(dates, NOW)).toBe(3);
  });

  it('今天无活动但昨天起连续 → 从今天前的连续段计数（不清零）', () => {
    const dates = [addDays(NOW, -1), addDays(NOW, -2)];
    expect(countStreakDays(dates, NOW)).toBe(2);
  });

  it('中间断档 → 只算最近连续段', () => {
    const dates = [NOW, addDays(NOW, -1), addDays(NOW, -3)];
    expect(countStreakDays(dates, NOW)).toBe(2);
  });

  it('无活动 → 0', () => {
    expect(countStreakDays([], NOW)).toBe(0);
  });
});

describe('StatisticsService.getStatistics', () => {
  it('按口径聚合：今日复习/今日学习章节/累计知识点/连续天数', async () => {
    const service = createService(
      [
        makeLearningRecord('c1', 10, NOW), // 今日学习
        makeLearningRecord('c2', 5, addDays(NOW, -1)), // 昨日学习
      ],
      [makeReviewRecord('k1', NOW)],
      3, // 今日复习 3 个
    );
    const stats = await service.getStatistics(USER);
    expect(stats.todayReviewedKnowledge).toBe(3);
    expect(stats.todayStudiedChapters).toBe(1); // 仅 c1 今日更新
    expect(stats.totalKnowledge).toBe(15);
    expect(stats.streakDays).toBe(2); // 今天+昨天连续
  });

  it('复习记录的 lastReviewTime 也计入连续天数活动日', async () => {
    const service = createService(
      [makeLearningRecord('c1', 10, addDays(NOW, -3))], // 最后一次学习在 3 天前
      [makeReviewRecord('k1', NOW)], // 但今天有复习
      1,
    );
    const stats = await service.getStatistics(USER);
    expect(stats.streakDays).toBe(1); // 今天（复习活动）
  });
});
