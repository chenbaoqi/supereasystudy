// 极速选择服务（Chapter 08 §10：startGame / submitAnswer / finishGame / saveResult）。
// 题目生成复用 quizLogic（§10）；游戏池规则复用 memoryGameLogic.selectPool（与消消乐一致）；
// 结果登记进 gameResultStore，由统一结果页渲染。
import { SPEED_BONUS_PER_REMAINING_SECOND } from '../config/gameRules';
import type { Knowledge } from '../core/knowledge';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  memoryGameRepository,
  type MemoryGameRepository,
} from '../repositories/memoryGameRepository';
import { reviewService } from './reviewService';
import { withinGrade } from './gradeScope';
import { gameResultStore, type GameResultDetail } from './gameResultStore';
import { selectPool, scoreForCorrect } from './memoryGameLogic';
import { buildChoiceQuestions, type ChoiceQuestion } from './quizLogic';
import { gameRewardService, walletViewOf, type RunRewarder } from './gameRewardService';
import { loadUnfixedKnowledgeIds } from './wrongQuestionService';

export interface SpeedGameStart {
  readonly eligible: boolean; // false = 章节知识点不足（§13）
  readonly questions: ChoiceQuestion[];
}

export interface SpeedAnswerScore {
  readonly delta: number;
  readonly newStreak: number;
}

export interface SpeedFinishInput {
  readonly userId: string;
  readonly chapterId: string;
  readonly questions: ChoiceQuestion[];
  readonly correctIds: string[];
  readonly wrongIds: string[]; // 答错 + 超时（§8 薄弱口径）
  readonly score: number;
  readonly responseTimes: number[]; // 每题反应毫秒（超时按满分限时计入）
}

// 答对计分（§5）：基础分+连击（复用消消乐规则）+ 速度奖励（剩余秒 × 系数）
export function scoreForSpeedAnswer(
  remainingSeconds: number,
  streakBefore: number,
): SpeedAnswerScore {
  const base = scoreForCorrect(streakBefore);
  return {
    delta: base.delta + Math.max(0, remainingSeconds) * SPEED_BONUS_PER_REMAINING_SECOND,
    newStreak: base.newStreak,
  };
}

export interface SpeedChoiceServiceDeps {
  knowledgeRepository: KnowledgeRepository;
  memoryGameRepository: MemoryGameRepository;
  reviewResultApplier: {
    applyGameResults(
      userId: string,
      chapterId: string,
      wrongIds: string[],
      correctIds: string[],
    ): Promise<void>;
  };
  // 全站钱包入账（缺省 = 真实服务；单测可注入替身）
  rewarder?: RunRewarder;
  random?: () => number;
}

export function createSpeedChoiceService(deps: SpeedChoiceServiceDeps) {
  const rewarder = deps.rewarder ?? gameRewardService;
  return {
    // ADR-012：末尾 grade 用于按当前年级过滤跨年级专题包，不传 = 不限年级
    async startGame(
      userId: string,
      chapterId: string,
      grade: number | null = null,
    ): Promise<SpeedGameStart> {
      const random = deps.random ?? Math.random;
      // L4：未修复的错题优先进本局池子（与拉知识点并行，不额外拖慢开局）
      const [rawList, wrongIds] = await Promise.all([
        deps.knowledgeRepository.listByChapter(chapterId),
        loadUnfixedKnowledgeIds(userId),
      ]);
      const knowledgeList = withinGrade(rawList, grade);
      const { pool, eligible } = selectPool(knowledgeList, random, wrongIds);
      if (!eligible) return { eligible: false, questions: [] };
      return { eligible: true, questions: buildChoiceQuestions(pool, random) };
    },

    async finishGame(input: SpeedFinishInput): Promise<GameResultDetail> {
      const totalMs = input.responseTimes.reduce((sum, ms) => sum + ms, 0);
      const avgResponseMs =
        input.responseTimes.length > 0 ? Math.round(totalMs / input.responseTimes.length) : 0;
      const record = await deps.memoryGameRepository.save({
        userId: input.userId,
        chapterId: input.chapterId,
        knowledgeIds: input.questions.map((q) => q.knowledgeId),
        score: input.score,
        correctCount: input.correctIds.length,
        wrongCount: input.wrongIds.length,
        duration: Math.round(totalMs / 1000),
        gameType: 'speed',
        avgResponseMs,
      });
      const knowledgeList = await deps.knowledgeRepository.listByIds(
        input.questions.map((q) => q.knowledgeId),
      );
      const map = new Map(knowledgeList.map((item) => [item._id, item]));
      const pick = (ids: string[]): Knowledge[] =>
        ids.flatMap((id) => {
          const knowledge = map.get(id);
          return knowledge ? [knowledge] : [];
        });
      const detail: GameResultDetail = {
        gameType: 'speed',
        record,
        mastered: pick(input.correctIds),
        weak: pick(input.wrongIds),
        correctIds: input.correctIds,
        wrongIds: input.wrongIds,
        avgResponseMs,
        replayUrl: '/pages/speed-choice/speed-choice',
        wallet: walletViewOf(
          await rewarder.reward({
            userId: input.userId,
            gameId: 'speed',
            correct: input.correctIds.length,
            total: input.questions.length,
            attempts: { correctIds: input.correctIds, wrongIds: input.wrongIds },
          }),
        ),
        integrateToReview: async () => {
          await deps.reviewResultApplier.applyGameResults(
            input.userId,
            input.chapterId,
            input.wrongIds,
            input.correctIds,
          );
        },
      };
      gameResultStore.set(detail);
      return detail;
    },
  };
}

export const speedChoiceService = createSpeedChoiceService({
  knowledgeRepository,
  memoryGameRepository,
  reviewResultApplier: reviewService,
});
