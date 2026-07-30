// 章节列表装配服务（Chapter 14 §4：章节页与学习 tab 共用，DRY 抽取自 chapter 页）。
// 组装：章节 + 用户学习记录（状态）+ 知识点构成（游戏/测试入口显隐）。
import type { LearningState } from '../core/learningState';
import { chapterRepository, type ChapterRepository } from '../repositories/chapterRepository';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';

export interface ChapterItem {
  readonly id: string;
  readonly title: string;
  readonly statusText: string;
  readonly showGame: boolean; // 🎮 挑战入口（单词 ≥ 4，与游戏开局门槛一致）
  readonly showTest: boolean; // 📝 测试入口（有单词或有语法题）
}

// 三态显示与 §6 五态机的映射：NOT_STARTED→Not Started；LEARNING→Learning；
// COMPLETED/TESTED/MASTERED→Completed
export function statusTextOf(state?: LearningState): string {
  if (!state || state === 'NOT_STARTED') return 'Not Started';
  if (state === 'LEARNING') return 'Learning';
  return 'Completed';
}

export interface ChapterServiceDeps {
  chapterRepository: ChapterRepository;
  knowledgeRepository: KnowledgeRepository;
  learningRecordRepository: LearningRecordRepository;
}

export function createChapterService(deps: ChapterServiceDeps) {
  return {
    async buildChapterItems(userId: string, semesterId: string): Promise<ChapterItem[]> {
      const chapters = await deps.chapterRepository.listBySemester(semesterId);
      // 逐章取知识点构成（入口显隐依据；并行查询，册内章节数 ≤14 可接受）
      const [records, ...knowledgeLists] = await Promise.all([
        deps.learningRecordRepository.listByUserAndChapters(
          userId,
          chapters.map((item) => item._id),
        ),
        ...chapters.map((item) => deps.knowledgeRepository.listByChapter(item._id)),
      ]);
      const recordMap = new Map(records.map((item) => [item.chapterId, item]));
      return chapters.map((item, index) => {
        const knowledge = knowledgeLists[index] ?? [];
        const wordCount = knowledge.filter((k) => (k.type ?? 'word') === 'word').length;
        const quizCount = knowledge.reduce((sum, k) => sum + (k.quiz?.length ?? 0), 0);
        return {
          id: item._id,
          title: item.title,
          statusText: statusTextOf(recordMap.get(item._id)?.state),
          showGame: wordCount >= 4,
          showTest: wordCount >= 1 || quizCount >= 1,
        };
      });
    },
  };
}

export const chapterService = createChapterService({
  chapterRepository,
  knowledgeRepository,
  learningRecordRepository,
});
