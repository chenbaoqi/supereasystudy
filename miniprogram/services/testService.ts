// 测试服务（Chapter 04 §5 Test/Result；§10 未将其列入 LearningService，
// 按单一职责拆分为独立服务——Baseline Spec §9 允许 AI 决定文件拆分）。
// 题型（Owner 确认 B）：英译中四选一，干扰项取同章节其他知识点的释义。
import type { Knowledge } from '../core/knowledge';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';

export interface TestQuestion {
  readonly knowledgeId: string;
  readonly word: string;
  readonly options: readonly string[]; // 中文释义选项（≤4）
  readonly correctIndex: number;
}

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

const shuffle = <T>(list: readonly T[], random: () => number): T[] =>
  [...list].sort(() => random() - 0.5);

export function createTestService(deps: {
  learningRecordRepository: LearningRecordRepository;
}): TestService {
  return {
    generateQuestions(knowledgeList, random = Math.random) {
      return knowledgeList.map((item) => {
        // 干扰项：同章节其他知识点的释义，随机取 ≤3 个
        const distractors = shuffle(
          knowledgeList.filter((other) => other._id !== item._id).map((other) => other.meaning),
          random,
        ).slice(0, 3);
        const options = shuffle([item.meaning, ...distractors], random);
        return {
          knowledgeId: item._id,
          word: item.word,
          options,
          correctIndex: options.indexOf(item.meaning),
        };
      });
    },

    async submitTest(userId, chapterId, _summary) {
      // 成绩本身不入库（Chapter 04 未要求持久化成绩，结果页数据由页面传递）。
      // Chapter 05 §6（Q1）：交卷后 TESTED → REVIEW_DUE（复习任务已在 finishLearning 创建）。
      await deps.learningRecordRepository.updateState(userId, chapterId, 'REVIEW_DUE');
    },
  };
}

export const testService = createTestService({ learningRecordRepository });
