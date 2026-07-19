// 学习服务（Chapter 04 §10，方法集以规格为准，禁止扩写）。
// 状态机（§6）：开始学习→LEARNING；学完→COMPLETED；TESTED 由 TestService 写入；
// MASTERED 属复习体系（后续 Phase）。Next 后更新记录是 §7 的硬性要求。
import type { Knowledge } from '../core/knowledge';
import type { LearningRecord } from '../core/learningRecord';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';

export interface LearningSession {
  readonly chapterId: string;
  readonly knowledgeList: readonly Knowledge[];
  readonly record: LearningRecord;
  readonly currentIndex: number; // 恢复位置：currentKnowledgeId 在列表中的下标
}

export interface LearningService {
  startLearning(userId: string, chapterId: string): Promise<LearningSession>;
  continueLearning(userId: string, chapterId: string): Promise<LearningSession>;
  finishLearning(userId: string, chapterId: string): Promise<LearningRecord>;
  updateProgress(
    userId: string,
    chapterId: string,
    knowledgeId: string,
    progress: number,
  ): Promise<LearningRecord>;
  getCurrentKnowledge(userId: string, chapterId: string): Promise<Knowledge | null>;
}

export interface LearningServiceDeps {
  knowledgeRepository: KnowledgeRepository;
  learningRecordRepository: LearningRecordRepository;
}

export function createLearningService(deps: LearningServiceDeps): LearningService {
  const buildSession = (
    chapterId: string,
    list: Knowledge[],
    record: LearningRecord,
  ): LearningSession => {
    const found = list.findIndex((item) => item._id === record.currentKnowledgeId);
    return { chapterId, knowledgeList: list, record, currentIndex: found >= 0 ? found : 0 };
  };

  return {
    async startLearning(userId, chapterId) {
      // 重新开始：进度清零、状态回到 LEARNING（测试结果页的「重新学习」也走这里）
      const list = await deps.knowledgeRepository.listByChapter(chapterId);
      const record = await deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: list[0]?._id,
        progress: 0,
        state: 'LEARNING',
      });
      return buildSession(chapterId, list, record);
    },

    async continueLearning(userId, chapterId) {
      // 继续学习：无记录则视为初次（等价 startLearning）
      const list = await deps.knowledgeRepository.listByChapter(chapterId);
      const existing = await deps.learningRecordRepository.findByUserAndChapter(userId, chapterId);
      if (existing) return buildSession(chapterId, list, existing);
      const record = await deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: list[0]?._id,
        progress: 0,
        state: 'LEARNING',
      });
      return buildSession(chapterId, list, record);
    },

    async finishLearning(userId, chapterId) {
      const total = (await deps.knowledgeRepository.listByChapter(chapterId)).length;
      const existing = await deps.learningRecordRepository.findByUserAndChapter(userId, chapterId);
      return deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: existing?.currentKnowledgeId,
        progress: total,
        state: 'COMPLETED',
      });
    },

    async updateProgress(userId, chapterId, knowledgeId, progress) {
      // §7：Next 后立即更新 currentKnowledgeId / progress / updatedAt（upsert 内含 updatedAt）
      return deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: knowledgeId,
        progress,
        state: 'LEARNING',
      });
    },

    async getCurrentKnowledge(userId, chapterId) {
      const record = await deps.learningRecordRepository.findByUserAndChapter(userId, chapterId);
      if (!record?.currentKnowledgeId) return null;
      const list = await deps.knowledgeRepository.listByChapter(chapterId);
      return list.find((item) => item._id === record.currentKnowledgeId) ?? null;
    },
  };
}

export const learningService = createLearningService({
  knowledgeRepository,
  learningRecordRepository,
});
