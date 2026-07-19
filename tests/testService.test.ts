// TestService 单元测试（§5 每知识点一题；Owner 确认 B：英译中四选一 + 同章节干扰项）。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import type { LearningRecordUpsert } from '../miniprogram/repositories/learningRecordRepository';
import { createTestService } from '../miniprogram/services/testService';

const makeKnowledge = (id: string, meaning: string, order: number): Knowledge => ({
  _id: id,
  chapterId: 'chapter-1',
  word: `word-${id}`,
  meaning,
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const knowledgeList = [
  makeKnowledge('k1', '苹果', 1),
  makeKnowledge('k2', '香蕉', 2),
  makeKnowledge('k3', '橘子', 3),
  makeKnowledge('k4', '葡萄', 4),
  makeKnowledge('k5', '西瓜', 5),
];

// 确定性随机：注入固定序列，保证测试可重复
function createSeededRandom(sequence: number[]) {
  let index = 0;
  return () => sequence[index++ % sequence.length] ?? 0.5;
}

describe('TestService.generateQuestions', () => {
  it('每个知识点一道题（§5）', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList, createSeededRandom([0.1, 0.9]));
    expect(questions).toHaveLength(5);
    expect(questions.map((q) => q.knowledgeId)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5']);
  });

  it('正确答案位于 options[correctIndex]', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList, createSeededRandom([0.3, 0.7]));
    for (const question of questions) {
      const source = knowledgeList.find((item) => item._id === question.knowledgeId);
      expect(question.options[question.correctIndex]).toBe(source?.meaning);
    }
  });

  it('选项 ≤4 且无重复，干扰项取自同章节其他释义（B 方案）', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList, createSeededRandom([0.5]));
    const allMeanings = knowledgeList.map((item) => item.meaning);
    for (const question of questions) {
      expect(question.options.length).toBeLessThanOrEqual(4);
      expect(new Set(question.options).size).toBe(question.options.length);
      for (const option of question.options) expect(allMeanings).toContain(option);
    }
  });

  it('边界：章节仅 2 个知识点时选项为 2 个', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList.slice(0, 2), createSeededRandom([0.5]));
    expect(questions[0]?.options).toHaveLength(2);
  });

  it('同一 random 序列下结果确定（可重复）', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const first = generateQuestions(knowledgeList, createSeededRandom([0.2, 0.8]));
    const second = generateQuestions(knowledgeList, createSeededRandom([0.2, 0.8]));
    expect(first).toEqual(second);
  });
});

describe('TestService.submitTest', () => {
  it('交卷后状态流转为 TESTED（§6）', async () => {
    const repo = createFakeRepo();
    await repo.upsert({
      userId: 'user-1',
      chapterId: 'chapter-1',
      progress: 5,
      state: 'COMPLETED',
    });
    const { submitTest } = createTestService({ learningRecordRepository: repo });
    await submitTest('user-1', 'chapter-1', { correctCount: 4, totalCount: 5 });
    const record = await repo.findByUserAndChapter('user-1', 'chapter-1');
    expect(record?.state).toBe('TESTED');
    expect(record?.progress).toBe(5); // 进度不受测试影响
  });
});

function createFakeRepo() {
  const store = new Map<string, LearningRecord>();
  const key = (userId: string, chapterId: string) => `${userId}:${chapterId}`;
  return {
    async findByUserAndChapter(userId: string, chapterId: string) {
      return store.get(key(userId, chapterId)) ?? null;
    },
    async listByUserAndChapters(userId: string, chapterIds: string[]) {
      return [...store.values()].filter(
        (record) => record.userId === userId && chapterIds.includes(record.chapterId),
      );
    },
    async upsert(input: LearningRecordUpsert) {
      const existing = store.get(key(input.userId, input.chapterId));
      const record: LearningRecord = {
        _id: existing?._id ?? `record-${store.size + 1}`,
        ...input,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };
      store.set(key(input.userId, input.chapterId), record);
      return record;
    },
    async updateState(userId: string, chapterId: string, state: LearningRecord['state']) {
      const existing = store.get(key(userId, chapterId));
      if (existing) store.set(key(userId, chapterId), { ...existing, state });
    },
  };
}
