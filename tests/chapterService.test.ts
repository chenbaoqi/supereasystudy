// ChapterService 单元测试（Chapter 14 §4：章节列表装配——状态映射与入口显隐）。
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../miniprogram/core/chapter';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import {
  createChapterService,
  statusClassOf,
  statusTextOf,
} from '../miniprogram/services/chapterService';

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
  grade?: number,
): Knowledge => ({
  _id: id,
  chapterId,
  word: id,
  meaning: 'm',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...(type ? { type } : {}),
  ...(grade === undefined ? {} : { grade }),
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
  it('无记录/NOT_STARTED → 未开始；LEARNING → 学习中；其余 → 已完成', () => {
    expect(statusTextOf(undefined)).toBe('未开始');
    expect(statusTextOf('NOT_STARTED')).toBe('未开始');
    expect(statusTextOf('LEARNING')).toBe('学习中');
    expect(statusTextOf('COMPLETED')).toBe('已完成');
    expect(statusTextOf('REVIEW_DUE')).toBe('已完成');
    expect(statusTextOf('MASTERED')).toBe('已完成');
  });

  // UI v1（2026-09-13）：状态颜色随状态变化，不再是一水儿的 #999
  it('statusClassOf 给出三态配色类', () => {
    expect(statusClassOf(undefined)).toBe('u-chip-muted');
    expect(statusClassOf('NOT_STARTED')).toBe('u-chip-muted');
    expect(statusClassOf('LEARNING')).toBe('u-chip-brand');
    expect(statusClassOf('COMPLETED')).toBe('u-chip-success');
    expect(statusClassOf('MASTERED')).toBe('u-chip-success');
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
    expect(items[0]?.statusText).toBe('学习中');
    expect(items[0]?.statusClass).toBe('u-chip-brand');
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

// ADR-012：跨年级专题包（数学公式 / 英语语法）是整学段词典，必须按当前年级过滤，
// 否则一年级学生也会看到「图形与几何」「统计与概率」这些他还没学的分类。
describe('ChapterService.buildChapterItems（年级过滤）', () => {
  const chapters = [
    makeChapter('c1', '数与运算'),
    makeChapter('c2', '图形与几何'),
    makeChapter('c3', '统计与概率'),
  ];
  // 数与运算：3 年级 2 条 + 5 年级 1 条；图形与几何：全 5 年级；统计与概率：全 6 年级
  const knowledgeByChapter = new Map<string, Knowledge[]>([
    ['c1', [makeKnowledge('k1', 'c1', 'word', 0, 3), makeKnowledge('k2', 'c1', 'word', 0, 5)]],
    ['c2', [makeKnowledge('k3', 'c2', 'word', 0, 5)]],
    ['c3', [makeKnowledge('k4', 'c3', 'word', 0, 6)]],
  ]);

  it('不传 grade = 不限年级（旧行为，全部章节照常返回）', async () => {
    const service = createChapterService(createFakes(chapters, knowledgeByChapter, []));
    expect(await service.buildChapterItems('u1', 's1')).toHaveLength(3);
  });

  it('一年级：只剩「数与运算」里 1 条也不够 → 空分类整章隐藏', async () => {
    const service = createChapterService(createFakes(chapters, knowledgeByChapter, []));
    const items = await service.buildChapterItems('u1', 's1', 1);
    expect(items).toEqual([]); // 三条公式分别属于 3/5/6 年级，一年级一个都不该看到
  });

  it('三年级：只保留数与运算（其中 5 年级那条被过滤掉）', async () => {
    const service = createChapterService(createFakes(chapters, knowledgeByChapter, []));
    const items = await service.buildChapterItems('u1', 's1', 3);
    expect(items.map((item) => item.title)).toEqual(['数与运算']);
  });

  it('五年级保留数与运算 + 图形与几何；六年级三个分类都在', async () => {
    const service = createChapterService(createFakes(chapters, knowledgeByChapter, []));
    expect((await service.buildChapterItems('u1', 's1', 5)).map((i) => i.title)).toEqual([
      '数与运算',
      '图形与几何',
    ]);
    expect((await service.buildChapterItems('u1', 's1', 6)).map((i) => i.title)).toEqual([
      '数与运算',
      '图形与几何',
      '统计与概率',
    ]);
  });

  it('章节本来就是空的（数据没录全）时不隐藏，避免伪装成「本年级不该有」', async () => {
    const empty = new Map<string, Knowledge[]>([['c1', []]]);
    const service = createChapterService(createFakes([makeChapter('c1', '空章节')], empty, []));
    const items = await service.buildChapterItems('u1', 's1', 1);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('空章节');
  });

  it('游戏/测试入口按过滤后的知识点数判定（不是过滤前的）', async () => {
    // 5 个单词但只有 1 个属于当前年级 → 游戏入口（需 ≥4）应隐藏
    const list = [
      makeKnowledge('a', 'c1', 'word', 0, 1),
      ...['b', 'c', 'd', 'e'].map((id) => makeKnowledge(id, 'c1', 'word', 0, 9)),
    ];
    const service = createChapterService(
      createFakes([makeChapter('c1', 'Unit 1')], new Map([['c1', list]]), []),
    );
    const items = await service.buildChapterItems('u1', 's1', 1);
    expect(items[0]?.showGame).toBe(false);
    expect(items[0]?.showTest).toBe(true);
  });
});
