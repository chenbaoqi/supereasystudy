// 测试服务（Chapter 04 §5 Test/Result；§10 未将其列入 LearningService，
// 按单一职责拆分为独立服务——Baseline Spec §9 允许 AI 决定文件拆分）。
// Chapter 13：单元测试升级为综合测评卷（听力+单词，题型标签化 Section）。
// 题目生成已抽取至 quizLogic（Chapter 08 §10，与极速选择共用）。
import { getTestPaperConfig } from '../config/testPaper';
import type { Knowledge } from '../core/knowledge';
import type { QuestionVisual } from '../core/visual';
import { buildChoiceQuestions, type ChoiceQuestion } from './quizLogic';
import {
  learningRecordRepository,
  type LearningRecordRepository,
} from '../repositories/learningRecordRepository';

// 综合卷题目（Chapter 13）：在共享四选一结构上加题型标签与听力载体
export interface QuizQuestion extends ChoiceQuestion {
  // quiz = 知识点自带的专项题（英语语法 / 数学概念与公式），与「背释义」的 word 题区分
  readonly kind: 'word' | 'listening' | 'grammar' | 'quiz';
  readonly audioWord?: string; // kind=listening 时 TTS 朗读的单词
  // 题目配图（B-7 可视化闭环）：由知识点的 quiz 项带出，渲染层用 visualOf 校验后再画
  readonly visual?: QuestionVisual;
}

export type TestQuestion = ChoiceQuestion;

export interface TestSummary {
  readonly correctCount: number;
  readonly totalCount: number;
}

export interface TestService {
  // 纯函数：每个知识点一道题（§5）。random 可注入以便确定性单测
  generateQuestions(knowledgeList: readonly Knowledge[], random?: () => number): TestQuestion[];
  // 综合测评卷（Chapter 13 一期）：听力 N（前）+ 单词 M（后），总量向 total 靠拢。
  // supportsSpeech=false（非语言学科）时不生成听力 Section，题量补给普通题。
  buildPaper(
    knowledgeList: readonly Knowledge[],
    random?: () => number,
    supportsSpeech?: boolean,
  ): QuizQuestion[];
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

    buildPaper(knowledgeList, random = Math.random, supportsSpeech = true) {
      const config = getTestPaperConfig(supportsSpeech);
      // 自带专项题的知识点（英语语法点、数学概念与公式）。两处改动：
      // ① 不再进「背释义」的池子——同一个知识点不该既出释义题又出专项题
      // ② 原来只认 type='grammar'，数学 74 条公式里的 27 道题**一直没被组卷用上**，
      //    现在按「有没有 quiz」判定，与学科无关
      const quizIds = new Set(
        knowledgeList.filter((item) => (item.quiz?.length ?? 0) > 0).map((item) => item._id),
      );
      const pool = wordOnly(knowledgeList).filter((item) => !quizIds.has(item._id));
      const quizPool = knowledgeList
        .filter((item) => quizIds.has(item._id))
        .flatMap((item) =>
          (item.quiz ?? []).map((quizItem): QuizQuestion => ({
            knowledgeId: item._id,
            word: item.word,
            prompt: quizItem.stem,
            options: quizItem.options,
            correctIndex: quizItem.answerIndex,
            kind: item.type === 'grammar' ? 'grammar' : 'quiz',
            visual: quizItem.visual,
          })),
        )
        .sort(() => random() - 0.5);
      if (pool.length === 0 && quizPool.length === 0) return [];

      // 听力题：随机取 N 个（题干为 TTS 发音，选项为释义，复用共享生成器）
      // 非语言学科 config.listening=0 → 本段自然为空，不出听力题
      const listeningPool = shuffled(pool, random).slice(0, config.listening);
      const listeningIds = new Set(listeningPool.map((item) => item._id));
      const listeningQuestions = buildChoiceQuestions(listeningPool, random).map(
        (question): QuizQuestion => ({ ...question, kind: 'listening', audioWord: question.word }),
      );
      // 单词题：余下知识点按配比取
      const restPool = pool.filter((item) => !listeningIds.has(item._id));
      const wordQuestions = buildChoiceQuestions(restPool.slice(0, config.word), random).map(
        (question): QuizQuestion => ({ ...question, kind: 'word' }),
      );

      // Section 顺序：听力 → 单词 → 专项（Chapter 13 §3）
      let paper = [...listeningQuestions, ...wordQuestions, ...quizPool.slice(0, config.grammar)];
      // 补足逻辑（Chapter 13：试卷向 total 靠拢——单词章节用剩余单词补齐，
      // 专项章节用剩余专项题补齐，保证 grammar-only 章节也能成卷）
      if (paper.length < config.total) {
        const grammarRest = quizPool.slice(config.grammar);
        const wordRest = buildChoiceQuestions(restPool.slice(config.word), random).map(
          (question): QuizQuestion => ({ ...question, kind: 'word' }),
        );
        paper = paper.concat([...grammarRest, ...wordRest]).slice(0, config.total);
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
