// 小蜜蜂射击服务（Chapter 15 §11：startGame / finishGame）。
// 复用 memoryGameService 模式：结果登记 gameResultStore，统一结果页渲染。
import type { Knowledge } from '../core/knowledge';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  memoryGameRepository,
  type MemoryGameRepository,
} from '../repositories/memoryGameRepository';
import { reviewService } from './reviewService';
import { withinGrade } from './gradeScope';
import { gameResultStore, type GameResultDetail } from './gameResultStore';
import { selectPool } from './memoryGameLogic';
import { gameRewardService, walletViewOf, type RunRewarder } from './gameRewardService';

export interface ShooterGameStart {
  readonly eligible: boolean;
  readonly pool: Knowledge[];
}

export interface ShooterFinishInput {
  readonly userId: string;
  readonly chapterId: string;
  readonly pool: Knowledge[];
  readonly hitIds: string[];
  readonly missIds: string[];
  readonly score: number;
  readonly duration: number;
}

export function createSpaceShooterService(deps: {
  knowledgeRepository: KnowledgeRepository;
  memoryGameRepository: MemoryGameRepository;
  reviewResultApplier: { applyGameResults(...args: unknown[]): Promise<void> };
  // 全站钱包入账（缺省 = 真实服务；单测可注入替身）
  rewarder?: RunRewarder;
  random?: () => number;
}) {
  const rewarder = deps.rewarder ?? gameRewardService;
  return {
    // ADR-012：末尾 grade 用于按当前年级过滤跨年级专题包，不传 = 不限年级
    async startGame(
      _userId: string,
      chapterId: string,
      grade: number | null = null,
    ): Promise<ShooterGameStart> {
      const knowledgeList = withinGrade(
        await deps.knowledgeRepository.listByChapter(chapterId),
        grade,
      );
      const { pool, eligible } = selectPool(knowledgeList, deps.random ?? Math.random);
      if (!eligible) return { eligible: false, pool: [] };
      return { eligible: true, pool };
    },

    async finishGame(input: ShooterFinishInput): Promise<GameResultDetail> {
      const record = await deps.memoryGameRepository.save({
        userId: input.userId,
        chapterId: input.chapterId,
        knowledgeIds: input.pool.map((item) => item._id),
        score: input.score,
        correctCount: input.hitIds.length,
        wrongCount: input.missIds.length,
        duration: input.duration,
        gameType: 'shooter',
      });
      const map = new Map(input.pool.map((item) => [item._id, item]));
      const pick = (ids: string[]) =>
        ids.flatMap((id) => {
          const k = map.get(id);
          return k ? [k] : [];
        });
      const detail: GameResultDetail = {
        gameType: 'shooter',
        record,
        mastered: pick(input.hitIds),
        weak: pick(input.missIds),
        correctIds: input.hitIds,
        wrongIds: input.missIds,
        replayUrl: '/pages/space-shooter/space-shooter',
        wallet: walletViewOf(
          await rewarder.reward({
            userId: input.userId,
            gameId: 'shooter',
            correct: input.hitIds.length,
            total: input.pool.length,
            attempts: { correctIds: input.hitIds, wrongIds: input.missIds },
          }),
        ),
        integrateToReview: async () => {
          await deps.reviewResultApplier.applyGameResults(
            input.userId,
            input.chapterId,
            input.missIds,
            input.hitIds,
          );
        },
      };
      gameResultStore.set(detail);
      return detail;
    },
  };
}

export const spaceShooterService = createSpaceShooterService({
  knowledgeRepository,
  memoryGameRepository,
  reviewResultApplier: reviewService as { applyGameResults(...args: unknown[]): Promise<void> },
});
