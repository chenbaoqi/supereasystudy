// 章节列表装配服务（Chapter 14 §4：章节页与学习 tab 共用，DRY 抽取自 chapter 页）。
// 组装：章节 + 用户学习记录（状态）+ 知识点构成（游戏/测试入口显隐）。
import type { LearningState } from '../core/learningState';
import { chapterRepository, type ChapterRepository } from '../repositories/chapterRepository';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';
import { withinGrade } from './gradeScope';

export interface ChapterItem {
  readonly id: string;
  readonly title: string;
  readonly statusText: string;
  // 状态配色类（UI v1）：未开始灰 / 学习中蓝 / 已完成绿，
  // 放在这里而不是页面里判断，避免每个页面各写一套 if。
  readonly statusClass: string;
  readonly showGame: boolean; // 🎮 挑战入口（单词 ≥ 4，与游戏开局门槛一致）
  readonly showTest: boolean; // 📝 测试入口（有单词或有语法题）
}

// 三态显示与 §6 五态机的映射：NOT_STARTED→未开始；LEARNING→学习中；
// COMPLETED/TESTED/MASTERED→已完成。
// 2026-09-13 UI v1：原先是英文 Not Started/Learning/Completed，中文界面里很跳，
// 统一改为中文；状态颜色由 statusClass 承载（色值仍只在 tokens.wxss 里定义）。
export function statusTextOf(state?: LearningState): string {
  if (!state || state === 'NOT_STARTED') return '未开始';
  if (state === 'LEARNING') return '学习中';
  return '已完成';
}

export function statusClassOf(state?: LearningState): string {
  if (!state || state === 'NOT_STARTED') return 'u-chip-muted';
  if (state === 'LEARNING') return 'u-chip-brand';
  return 'u-chip-success';
}

export interface ChapterServiceDeps {
  chapterRepository: ChapterRepository;
  knowledgeRepository: KnowledgeRepository;
  learningRecordRepository: LearningRecordRepository;
}

export function createChapterService(deps: ChapterServiceDeps) {
  return {
    // grade=null 表示不限年级（旧行为）；传入年级则只保留该年级及以前学过的知识点，
    // 被过滤空的章节直接不返回 —— 学习页因此只显示当前教材该有的分类（ADR-012）。
    async buildChapterItems(
      userId: string,
      semesterId: string,
      grade: number | null = null,
    ): Promise<ChapterItem[]> {
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
      const items: ChapterItem[] = [];
      chapters.forEach((item, index) => {
        const raw = knowledgeLists[index] ?? [];
        const knowledge = withinGrade(raw, grade);
        // 年级过滤后一条不剩 → 整章隐藏（一年级不该看到「图形与几何」）。
        // 注意：章节**本来**就是空的（数据缺失）时保持旧行为照常显示，
        // 否则会把「数据没录全」伪装成「这个年级不该有」，反而更难发现。
        if (knowledge.length === 0 && raw.length > 0) return;
        const wordCount = knowledge.filter((k) => (k.type ?? 'word') === 'word').length;
        const quizCount = knowledge.reduce((sum, k) => sum + (k.quiz?.length ?? 0), 0);
        items.push({
          id: item._id,
          title: item.title,
          statusText: statusTextOf(recordMap.get(item._id)?.state),
          statusClass: statusClassOf(recordMap.get(item._id)?.state),
          showGame: wordCount >= 4,
          showTest: wordCount >= 1 || quizCount >= 1,
        });
      });
      return items;
    },
  };
}

export const chapterService = createChapterService({
  chapterRepository,
  knowledgeRepository,
  learningRecordRepository,
});
