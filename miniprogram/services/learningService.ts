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
import { reviewService } from './reviewService';
import { withinGrade } from './gradeScope';
import { withTimeout } from '../utils/withTimeout';

// 章节知识点最多等这么久：超时交给页面显示「读不到 + 重试」，不干等
const KNOWLEDGE_WAIT_MS = 6000;

export interface LearningSession {
  readonly chapterId: string;
  readonly knowledgeList: readonly Knowledge[];
  readonly record: LearningRecord;
  readonly currentIndex: number; // 恢复位置：currentKnowledgeId 在列表中的下标
}

// 末尾 grade 参数（ADR-012）：跨年级专题包按当前年级过滤超纲内容，
// 不传 = 不限年级（旧行为）。学习列表、进度分母、当前卡都必须用同一份过滤结果，
// 否则会出现「列表 4 条但进度条按 19 条算」的错位。
export interface LearningService {
  startLearning(userId: string, chapterId: string, grade?: number | null): Promise<LearningSession>;
  continueLearning(
    userId: string,
    chapterId: string,
    grade?: number | null,
  ): Promise<LearningSession>;
  finishLearning(userId: string, chapterId: string, grade?: number | null): Promise<LearningRecord>;
  updateProgress(
    userId: string,
    chapterId: string,
    knowledgeId: string,
    progress: number,
  ): Promise<LearningRecord>;
  getCurrentKnowledge(
    userId: string,
    chapterId: string,
    grade?: number | null,
  ): Promise<Knowledge | null>;
}

// 复习任务创建端口（Chapter 05 §3）：LearningService 不 import ReviewService 实现，
// 依赖最小接口，避免服务间硬耦合（端口模式）。
export interface ReviewTaskCreator {
  // ADR-012：grade 透传给复习任务创建，保证「学了几条就复习几条」
  createReviewTasksForChapter(
    userId: string,
    chapterId: string,
    grade?: number | null,
  ): Promise<number>;
}

export interface LearningServiceDeps {
  knowledgeRepository: KnowledgeRepository;
  learningRecordRepository: LearningRecordRepository;
  reviewTaskCreator: ReviewTaskCreator;
}

export function createLearningService(deps: LearningServiceDeps): LearningService {
  // 单章知识点 + 年级过滤（ADR-012）：全服务共用，保证列表/分母/当前卡口径一致
  // ⚠️ 云调用必须带超时（项目老规矩）：腾讯云偶尔会静默挂住，
  //    没有超时的话「学习详情」会一直转圈，孩子以为坏了（2026-09-21 一起修的）。
  const listOf = async (chapterId: string, grade?: number | null): Promise<Knowledge[]> => {
    const list = await withTimeout(
      deps.knowledgeRepository.listByChapter(chapterId),
      KNOWLEDGE_WAIT_MS,
      '章节知识点',
    );
    // 超时返回 null：交给页面显示「读不到 + 重试」，而不是无限转圈
    if (list === null) throw new Error('章节知识点读取超时');
    return withinGrade(list, grade ?? null);
  };

  const buildSession = (
    chapterId: string,
    list: Knowledge[],
    record: LearningRecord,
  ): LearningSession => {
    const found = list.findIndex((item) => item._id === record.currentKnowledgeId);
    return { chapterId, knowledgeList: list, record, currentIndex: found >= 0 ? found : 0 };
  };

  return {
    async startLearning(userId, chapterId, grade) {
      // 重新开始：进度清零、状态回到 LEARNING（测试结果页的「重新学习」也走这里）
      const list = await listOf(chapterId, grade);
      const record = await deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: list[0]?._id,
        progress: 0,
        state: 'LEARNING',
      });
      return buildSession(chapterId, list, record);
    },

    async continueLearning(userId, chapterId, grade) {
      // 继续学习：无记录则视为初次（等价 startLearning）
      const list = await listOf(chapterId, grade);
      const existing = await deps.learningRecordRepository.findByUserAndChapter(userId, chapterId);
      if (existing) {
        // 仅 LEARNING 状态续学（Chapter 04 §5 恢复位置）；
        // 已完成/已测试/复习中的章节重新进入 = 从第一条重新浏览（Owner 2026-07-19 反馈），
        // 记录不重置：点「下一条」时由 updateProgress 自然回到 LEARNING。
        const session = buildSession(chapterId, list, existing);
        return existing.state === 'LEARNING' ? session : { ...session, currentIndex: 0 };
      }
      const record = await deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: list[0]?._id,
        progress: 0,
        state: 'LEARNING',
      });
      return buildSession(chapterId, list, record);
    },

    async finishLearning(userId, chapterId, grade) {
      const total = (await listOf(chapterId, grade)).length;
      const existing = await deps.learningRecordRepository.findByUserAndChapter(userId, chapterId);
      const record = await deps.learningRecordRepository.upsert({
        userId,
        chapterId,
        currentKnowledgeId: existing?.currentKnowledgeId,
        progress: total,
        state: 'COMPLETED',
      });
      // Chapter 05 §3「Study Complete → Create Review Task」（Q1）：学习完成即生成复习任务
      await deps.reviewTaskCreator.createReviewTasksForChapter(userId, chapterId, grade);
      return record;
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

    async getCurrentKnowledge(userId, chapterId, grade) {
      const record = await deps.learningRecordRepository.findByUserAndChapter(userId, chapterId);
      if (!record?.currentKnowledgeId) return null;
      const list = await listOf(chapterId, grade);
      return list.find((item) => item._id === record.currentKnowledgeId) ?? null;
    },
  };
}

export const learningService = createLearningService({
  knowledgeRepository,
  learningRecordRepository,
  reviewTaskCreator: reviewService,
});
