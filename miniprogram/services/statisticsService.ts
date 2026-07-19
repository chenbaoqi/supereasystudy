// 学习统计服务（Specification §12.5/§13.3，已定稿）。
// 口径：今日复习知识点=review_records.lastReviewTime 为今日；今日学习章节=learning_records
// updatedAt 为今日；累计知识点=Σ learning_records.progress；连续天数=两表日期去重连续计数。
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';
import { reviewRepository, type ReviewRepository } from '../repositories/reviewRepository';
import { countStreakDays, startOfToday } from '../utils/date';

export interface LearningStatistics {
  readonly todayReviewedKnowledge: number; // 今日复习知识点
  readonly todayStudiedChapters: number; // 今日学习章节
  readonly totalKnowledge: number; // 累计知识点
  readonly streakDays: number; // 连续学习天数
}

export interface StatisticsServiceDeps {
  learningRecordRepository: LearningRecordRepository;
  reviewRepository: ReviewRepository;
  now?: () => Date; // 时间注入：测试可固定时钟
}

export function createStatisticsService(deps: StatisticsServiceDeps) {
  const now = deps.now ?? (() => new Date());

  return {
    async getStatistics(userId: string): Promise<LearningStatistics> {
      const [learningRecords, reviewRecords, todayReviewedKnowledge] = await Promise.all([
        deps.learningRecordRepository.listByUser(userId),
        deps.reviewRepository.listByUser(userId),
        deps.reviewRepository.countReviewedSince(userId, startOfToday(now())),
      ]);
      const todayStart = startOfToday(now());
      // 连续天数：学习记录与复习记录的活动日期合并（§13.3 方案 A）
      const activeDates = [
        ...learningRecords.map((item) => item.updatedAt),
        ...reviewRecords.flatMap((item) => (item.lastReviewTime ? [item.lastReviewTime] : [])),
      ];
      return {
        todayReviewedKnowledge,
        todayStudiedChapters: learningRecords.filter((item) => item.updatedAt >= todayStart).length,
        totalKnowledge: learningRecords.reduce((sum, item) => sum + item.progress, 0),
        streakDays: countStreakDays(activeDates, now()),
      };
    },
  };
}

export const statisticsService = createStatisticsService({
  learningRecordRepository,
  reviewRepository,
});
