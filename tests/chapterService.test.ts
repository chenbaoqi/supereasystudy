// ChapterService 单元测试（Chapter 14 §4：章节列表装配——状态映射与入口显隐）。
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../miniprogram/core/chapter';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import { createChapterService, statusTextOf } from '../miniprogram/services/chapterService';

const makeChapter = (id: string, title: string): Chapter => ({
  _id: id,
  semesterId: 's1',
  title,
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeKnowledge = (
  id: string,
  chapterId: string,
  type?: 'word' | 'grammar',
  quizCount = 0,
): Knowledge => ({
  _id: id,
  chapterId,
  word: id,
  meaning: 'm',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...(type ? { type } : {}),
  ...(quizCount > 0
    ? {
        quiz: Array.from({ length: quizCount }, (_, i) => ({
          stem: `q${i}`,
          options: ['a', 'b'],
          answerIndex: 0,
        })),
      }
    : {}),
});

const makeRecord = (chapterId: string, state: LearningRecord['state']): LearningRecord => ({
  _id: `lr-${chapterId}`,
  userId: 'u1',
  chapterId,
  progress: 0,
  state,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function createFakes(
  chapters: Chapter[],
  knowledgeByChapter: Map<string, Knowledge[]>,
  records: LearningRecord[],
) {
  return {
    chapterRepository: {
      async listBySemester() {
        return chapters;
      },
      async listByIds() {
        return [];
      },
    },
    knowledgeRepository: {
      async listByChapter(chapterId: string) {
        return knowledgeByChapter.get(chapterId) ?? [];
      },
      async listByIds() {
        return [];
      },
    },
    learningRecordRepository: {
      async findByUserAndChapter() {
        return null;
      },
      async listByUserAndChapters(_userId: string, chapterIds: string[]) {
        return records.filter((record) => chapterIds.includes(record.chapterId));
      },
      async listByUser() {
        return records;
      },
      async upsert(input: LearningRecord) {
        return input;
      },
      async updateState() {},
    },
  };
}

describe('statusTextOf（三态映射）', () => {
  it('无记录/NOT_STARTED → Not Started；LEARNING → Learning；其余 → Completed', () => {
    expect(statusTextOf(undefined)).toBe('Not Started');
    expect(statusTextOf('NOT_STARTED')).toBe('Not Started');
    expect(statusTextOf('LEARNING')).toBe('Learning');
    expect(statusTextOf('COMPLETED')).toBe('Completed');
    expect(statusTextOf('REVIEW_DUE')).toBe('Completed');
    expect(statusTextOf('MASTERED')).toBe('Completed');
  });
});

describe('ChapterService.buildChapterItems', () => {
  it('装配：标题/状态/游戏测试入口按知识点构成显隐', async () => {
    const chapters = [makeChapter('c1', 'Unit 1'), makeChapter('c2', '时态专题')];
    const knowledgeByChapter = new Map<string, Knowledge[]>([
      ['c1', ['k1', 'k2', 'k3', 'k4', 'k5'].map((id) => makeKnowledge(id, 'c1'))],
      ['c2', [makeKnowledge('g1', 'c2', 'grammar', 2), makeKnowledge('g2', 'c2', 'grammar', 1)]],
    ]);
    const records = [makeRecord('c1', 'LEARNING')];
    const service = createChapterService(createFakes(chapters, knowledgeByChapter, records));
    const items = await service.buildChapterItems('u1', 's1');

    expect(items).toHaveLength(2);
    // 单词章节：5 词 → 游戏/测试双入口
    expect(items[0]?.statusText).toBe('Learning');
    expect(items[0]?.showGame).toBe(true);
    expect(items[0]?.showTest).toBe(true);
    // 语法章节：0 单词但有 quiz → 游戏隐藏、测试显示
    expect(items[1]?.showGame).toBe(false);
    expect(items[1]?.showTest).toBe(true);
  });

  it('单词 <4 时游戏入口隐藏', async () => {
    const chapters = [makeChapter('c1', 'Unit 1')];
    const knowledgeByChapter = new Map<string, Knowledge[]>([
      ['c1', ['k1', 'k2'].map((id) => makeKnowledge(id, 'c1'))],
    ]);
    const service = createChapterService(createFakes(chapters, knowledgeByChapter, []));
    const items = await service.buildChapterItems('u1', 's1');
    expect(items[0]?.showGame).toBe(false);
    expect(items[0]?.showTest).toBe(true); // 有单词即可测
  });
});
