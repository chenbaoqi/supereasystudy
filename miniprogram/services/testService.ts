// 测试服务（Chapter 04 §5 Test/Result；§10 未将其列入 LearningService，
// 按单一职责拆分为独立服务——Baseline Spec §9 允许 AI 决定文件拆分）。
// 题目生成已抽取至 quizLogic（Chapter 08 §10，与极速选择共用）。
import type { Knowledge } from '../core/knowledge';
import { buildChoiceQuestions, type ChoiceQuestion } from './quizLogic';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';

export type TestQuestion = ChoiceQuestion;

export interface TestSummary {
  readonly correctCount: number;
  readonly totalCount: number;
}

export interface TestService {
  // 纯函数：每个知识点一道题（§5）。random 可注入以便确定性单测
  generateQuestions(knowledgeList: readonly Knowledge[], random?: () => number): TestQuestion[];
  // 交卷：状态机 COMPLETED → TESTED（§6）
  submitTest(userId: string, chapterId: string, summary: TestSummary): Promise<void>;
}

export function createTestService(deps: {
  learningRecordRepository: LearningRecordRepository;
}): TestService {
  return {
    generateQuestions(knowledgeList, random = Math.random) {
      // 委托共享生成器（Chapter 08 §10：与极速选择同源，行为不变）
      return buildChoiceQuestions(knowledgeList, random);
    },

    async submitTest(userId, chapterId, _summary) {
      // 成绩本身不入库（Chapter 04 未要求持久化成绩，结果页数据由页面传递）。
      // Chapter 05 §6（Q1）：交卷后 TESTED → REVIEW_DUE（复习任务已在 finishLearning 创建）。
      await deps.learningRecordRepository.updateState(userId, chapterId, 'REVIEW_DUE');
    },
  };
}

export const testService = createTestService({ learningRecordRepository });
