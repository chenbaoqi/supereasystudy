// 首页聚合服务（Specification §12.5 Dashboard：Banner / 统计条 / 最近学习 / 学科入口）。
// 页面只调本服务一次拿全数据（页面薄原则）；学科列表由页面复用列表页模式另行加载。
import type { Banner } from '../core/banner';
import { bannerRepository, type BannerRepository } from '../repositories/bannerRepository';
import { chapterRepository, type ChapterRepository } from '../repositories/chapterRepository';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';
import { statisticsService } from './statisticsService';

export interface RecentLearningItem {
  readonly chapterId: string;
  readonly semesterId: string;
  readonly title: string;
  readonly showGame: boolean; // 🎮 入口（仅单词 ≥4 显示，语法章节隐藏，Owner 2026-07-30）
}

export interface HomeDashboard {
  readonly banners: Banner[];
  readonly todayReviewedKnowledge: number; // 统计条：今日复习知识点（§12.5 口径）
  readonly streakDays: number; // 统计条：连续学习天数
  readonly recentLearning: RecentLearningItem[]; // 最近学习前 3（updatedAt 倒序）
}

export interface HomeServiceDeps {
  bannerRepository: BannerRepository;
  learningRecordRepository: LearningRecordRepository;
  chapterRepository: ChapterRepository;
  knowledgeRepository: KnowledgeRepository;
}

export function createHomeService(deps: HomeServiceDeps) {
  return {
    async getDashboard(userId: string): Promise<HomeDashboard> {
      const [banners, stats, records] = await Promise.all([
        deps.bannerRepository.listOpen(),
        statisticsService.getStatistics(userId),
        deps.learningRecordRepository.listByUser(userId),
      ]);
      const recentRecords = [...records]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 3);
      const chapters = await deps.chapterRepository.listByIds(
        recentRecords.map((item) => item.chapterId),
      );
      const map = new Map(chapters.map((item) => [item._id, item]));
      // 逐章取知识点判断游戏准入（🎮 仅单词 ≥4 显示，与章节页/游戏开局门槛一致）
      const knowledgeLists = await Promise.all(
        recentRecords.map((record) => deps.knowledgeRepository.listByChapter(record.chapterId)),
      );
      const recentLearning = recentRecords.flatMap((record, index) => {
        const chapter = map.get(record.chapterId);
        // 章节被删的孤儿记录跳过（数据一致性兜底）
        if (!chapter) return [];
        const wordCount = (knowledgeLists[index] ?? []).filter(
          (knowledge) => (knowledge.type ?? 'word') === 'word',
        ).length;
        return [
          {
            chapterId: chapter._id,
            semesterId: chapter.semesterId,
            title: chapter.title,
            showGame: wordCount >= 4,
          },
        ];
      });
      return {
        banners,
        todayReviewedKnowledge: stats.todayReviewedKnowledge,
        streakDays: stats.streakDays,
        recentLearning,
      };
    },
  };
}

export const homeService = createHomeService({
  bannerRepository,
  learningRecordRepository,
  chapterRepository,
  knowledgeRepository,
});
