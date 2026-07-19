// LearningService 单元测试（Chapter 04 §10 方法集 + §6 状态机 + §7 记录更新）。
// 依赖注入 fake Repository：Service 是纯 TS，可脱离 wx.cloud 测试（分层规范）。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import type { LearningRecordUpsert } from '../miniprogram/repositories/learningRecordRepository';
import { createLearningService } from '../miniprogram/services/learningService';

const CHAPTER = 'chapter-1';
const USER = 'user-1';

const makeKnowledge = (id: string, order: number): Knowledge => ({
  _id: id,
  chapterId: CHAPTER,
  word: `word-${id}`,
  meaning: `释义-${id}`,
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const knowledgeList = [makeKnowledge('k1', 1), makeKnowledge('k2', 2), makeKnowledge('k3', 3)];

function createFakes() {
  const store = new Map<string, LearningRecord>();
  const key = (userId: string, chapterId: string) => `${userId}:${chapterId}`;
  const learningRecordRepository = {
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
  const knowledgeRepository = {
    async listByChapter() {
      return knowledgeList;
    },
  };
  return { learningRecordRepository, knowledgeRepository };
}

describe('LearningService', () => {
  it('startLearning：创建 LEARNING 记录，进度与位置归零（§6）', async () => {
    const service = createLearningService(createFakes());
    const session = await service.startLearning(USER, CHAPTER);
    expect(session.record.state).toBe('LEARNING');
    expect(session.record.progress).toBe(0);
    expect(session.record.currentKnowledgeId).toBe('k1');
    expect(session.currentIndex).toBe(0);
    expect(session.knowledgeList).toHaveLength(3);
  });

  it('updateProgress：Next 后立即更新 currentKnowledgeId 与 progress（§7）', async () => {
    const service = createLearningService(createFakes());
    await service.startLearning(USER, CHAPTER);
    const record = await service.updateProgress(USER, CHAPTER, 'k2', 1);
    expect(record.currentKnowledgeId).toBe('k2');
    expect(record.progress).toBe(1);
    expect(record.state).toBe('LEARNING');
  });

  it('continueLearning：有记录时从上次位置恢复（§5 继续学习）', async () => {
    const service = createLearningService(createFakes());
    await service.startLearning(USER, CHAPTER);
    await service.updateProgress(USER, CHAPTER, 'k3', 2);
    const session = await service.continueLearning(USER, CHAPTER);
    expect(session.currentIndex).toBe(2);
    expect(session.record.progress).toBe(2);
  });

  it('continueLearning：无记录时按初次处理（等价 startLearning）', async () => {
    const service = createLearningService(createFakes());
    const session = await service.continueLearning(USER, CHAPTER);
    expect(session.record.state).toBe('LEARNING');
    expect(session.currentIndex).toBe(0);
  });

  it('finishLearning：状态流转为 COMPLETED，进度记满（§6）', async () => {
    const service = createLearningService(createFakes());
    await service.startLearning(USER, CHAPTER);
    const record = await service.finishLearning(USER, CHAPTER);
    expect(record.state).toBe('COMPLETED');
    expect(record.progress).toBe(3);
  });

  it('getCurrentKnowledge：返回学习位置对应的知识点', async () => {
    const service = createLearningService(createFakes());
    await service.startLearning(USER, CHAPTER);
    await service.updateProgress(USER, CHAPTER, 'k2', 1);
    const current = await service.getCurrentKnowledge(USER, CHAPTER);
    expect(current?._id).toBe('k2');
  });

  it('getCurrentKnowledge：无记录返回 null', async () => {
    const service = createLearningService(createFakes());
    expect(await service.getCurrentKnowledge(USER, CHAPTER)).toBeNull();
  });
});
