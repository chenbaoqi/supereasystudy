// 测试服务（Chapter 04 §5 Test/Result；§10 未将其列入 LearningService，
// 按单一职责拆分为独立服务——Baseline Spec §9 允许 AI 决定文件拆分）。
// Chapter 13：单元测试升级为综合测评卷（听力+单词，题型标签化 Section）。
// 题目生成已抽取至 quizLogic（Chapter 08 §10，与极速选择共用）。
import { TEST_PAPER_CONFIG } from '../config/testPaper';
import type { Knowledge } from '../core/knowledge';
import { buildChoiceQuestions, type ChoiceQuestion } from './quizLogic';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';

// 综合卷题目（Chapter 13）：在共享四选一结构上加题型标签与听力载体
export interface QuizQuestion extends ChoiceQuestion {
  readonly kind: 'word' | 'listening' | 'grammar';
  readonly audioWord?: string; // kind=listening 时 TTS 朗读的单词
}

export type TestQuestion = ChoiceQuestion;

export interface TestSummary {
  readonly correctCount: number;
  readonly totalCount: number;
}

export interface TestService {
  // 纯函数：每个知识点一道题（§5）。random 可注入以便确定性单测
  generateQuestions(knowledgeList: readonly Knowledge[], random?: () => number): TestQuestion[];
  // 综合测评卷（Chapter 13 一期）：听力 N（前）+ 单词 M（后），总量向 TEST_PAPER_CONFIG.total 靠拢
  buildPaper(knowledgeList: readonly Knowledge[], random?: () => number): QuizQuestion[];
  // 交卷：状态机 COMPLETED → TESTED（§6）
  submitTest(userId: string, chapterId: string, summary: TestSummary): Promise<void>;
}

export function createTestService(deps: {
  learningRecordRepository: LearningRecordRepository;
}): TestService {
  // 语法点不进单词题（Chapter 12 §7 修订，Owner 2026-07-30 确认）；缺省按 word
  const wordOnly = (list: readonly Knowledge[]) =>
    list.filter((item) => (item.type ?? 'word') === 'word');

  const shuffled = <T>(list: readonly T[], random: () => number): T[] =>
    [...list].sort(() => random() - 0.5);

  return {
    generateQuestions(knowledgeList, random = Math.random) {
      return buildChoiceQuestions(wordOnly(knowledgeList), random);
    },

    buildPaper(knowledgeList, random = Math.random) {
      const pool = wordOnly(knowledgeList);
      // 语法题池：本章语法点内嵌 quiz（type='grammar' 且带 quiz 数据），先洗牌备用
      const grammarPool = knowledgeList
        .filter((item) => item.type === 'grammar' && (item.quiz?.length ?? 0) > 0)
        .flatMap((item) =>
          (item.quiz ?? []).map((quizItem): QuizQuestion => ({
            knowledgeId: item._id,
            word: item.word,
            prompt: quizItem.stem,
            options: quizItem.options,
            correctIndex: quizItem.answerIndex,
            kind: 'grammar',
          })),
        )
        .sort(() => random() - 0.5);
      if (pool.length === 0 && grammarPool.length === 0) return [];

      // 听力题：随机取 N 个（题干为 TTS 发音，选项为释义，复用共享生成器）
      const listeningPool = shuffled(pool, random).slice(0, TEST_PAPER_CONFIG.listening);
      const listeningIds = new Set(listeningPool.map((item) => item._id));
      const listeningQuestions = buildChoiceQuestions(listeningPool, random).map(
        (question): QuizQuestion => ({ ...question, kind: 'listening', audioWord: question.word }),
      );
      // 单词题：余下知识点按配比取
      const restPool = pool.filter((item) => !listeningIds.has(item._id));
      const wordQuestions = buildChoiceQuestions(
        restPool.slice(0, TEST_PAPER_CONFIG.word),
        random,
      ).map((question): QuizQuestion => ({ ...question, kind: 'word' }));

      // Section 顺序：听力 → 单词 → 语法（Chapter 13 §3）
      let paper = [
        ...listeningQuestions,
        ...wordQuestions,
        ...grammarPool.slice(0, TEST_PAPER_CONFIG.grammar),
      ];
      // 补足逻辑（Chapter 13：试卷向 total 靠拢——单词章节用剩余单词补齐，
      // 语法章节用剩余语法题补齐，保证 grammar-only 章节也能成卷）
      if (paper.length < TEST_PAPER_CONFIG.total) {
        const grammarRest = grammarPool.slice(TEST_PAPER_CONFIG.grammar);
        const wordRest = buildChoiceQuestions(restPool.slice(TEST_PAPER_CONFIG.word), random).map(
          (question): QuizQuestion => ({ ...question, kind: 'word' }),
        );
        paper = paper.concat([...grammarRest, ...wordRest]).slice(0, TEST_PAPER_CONFIG.total);
      }
      return paper;
    },

    async submitTest(userId, chapterId, _summary) {
      // 成绩本身不入库（Chapter 04 未要求持久化成绩，结果页数据由页面传递）。
      // Chapter 05 §6（Q1）：交卷后 TESTED → REVIEW_DUE（复习任务已在 finishLearning 创建）。
      await deps.learningRecordRepository.updateState(userId, chapterId, 'REVIEW_DUE');
    },
  };
}

export const testService = createTestService({ learningRecordRepository });
