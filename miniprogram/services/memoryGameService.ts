// Memory Challenge 服务（Chapter 07 §10：startGame / submitMatch / finishGame / saveResult）。
// 计分与卡组规则在 memoryGameLogic（纯模块）；§12 复习集成经 ReviewService 端口注入。
// 结果页数据（掌握/薄弱明细）驻留本模块内存：结果页仅当局后可达（Q6 口径），不落库。
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  memoryGameRepository,
  type MemoryGameRepository,
} from '../repositories/memoryGameRepository';
import { reviewService } from './reviewService';
import { gameResultStore, type GameResultDetail } from './gameResultStore';
import {
  buildDeck,
  isMatch,
  scoreForCorrect,
  scoreForWrong,
  timeBonus,
  selectPool,
  GAME_DURATION_SECONDS,
  type MemoryCard,
} from './memoryGameLogic';

export interface GameStart {
  readonly eligible: boolean; // false = 章节知识点不足（§13：提示知识点不足）
  readonly deck: MemoryCard[];
  readonly poolIds: string[];
}

export interface MemoryGameServiceDeps {
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
  random?: () => number;
}

export function createMemoryGameService(deps: MemoryGameServiceDeps) {
  return {
    // startGame：加载章节全部知识点构建卡组（2026-07-19 修订：与 progress 脱钩，挑战可直接进行）
    async startGame(_userId: string, chapterId: string): Promise<GameStart> {
      const knowledgeList = await deps.knowledgeRepository.listByChapter(chapterId);
      const { pool, eligible } = selectPool(knowledgeList, deps.random ?? Math.random);
      if (!eligible) return { eligible: false, deck: [], poolIds: [] };
      return {
        eligible: true,
        deck: buildDeck(pool, deps.random ?? Math.random),
        poolIds: pool.map((item) => item._id),
      };
    },

    // submitMatch：纯转发逻辑模块（页面计时与翻牌驱动；此处保持 §10 方法面完整）
    submitMatch,

    // finishGame + saveResult：结算（时间 Bonus）并保存记录（§7/§9）
    async finishGame(input: {
      userId: string;
      chapterId: string;
      poolIds: string[];
      correctIds: string[];
      wrongIds: string[];
      score: number;
      remainingSeconds: number;
      allMatched: boolean;
    }): Promise<GameResultDetail> {
      const bonus = input.allMatched ? timeBonus(input.remainingSeconds) : 0;
      const duration = GAME_DURATION_SECONDS - input.remainingSeconds;
      const record = await deps.memoryGameRepository.save({
        userId: input.userId,
        chapterId: input.chapterId,
        knowledgeIds: input.poolIds,
        score: input.score + bonus,
        correctCount: input.correctIds.length,
        wrongCount: input.wrongIds.length,
        duration,
        gameType: 'match',
      });
      const knowledgeList = await deps.knowledgeRepository.listByIds(input.poolIds);
      const map = new Map(knowledgeList.map((item) => [item._id, item]));
      const pick = (ids: string[]) =>
        ids.flatMap((id) => {
          const knowledge = map.get(id);
          return knowledge ? [knowledge] : [];
        });
      // 薄弱 = 配错过的 + 未配完的（Q6）
      const unfinishedIds = input.poolIds.filter(
        (id) => !input.correctIds.includes(id) && !input.wrongIds.includes(id),
      );
      const detail: GameResultDetail = {
        gameType: 'match',
        record,
        mastered: pick(input.correctIds),
        weak: pick([...input.wrongIds, ...unfinishedIds]),
        correctIds: input.correctIds,
        wrongIds: input.wrongIds,
        replayUrl: '/pages/memory-game/memory-game',
        // 加入复习（Q4 确认：按钮触发 §12 集成）
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

// §10 submitMatch 的实现：委托纯逻辑（导出名保持规格一致）
const submitMatch = { isMatch, scoreForCorrect, scoreForWrong };

export const memoryGameService = createMemoryGameService({
  knowledgeRepository,
  memoryGameRepository,
  reviewResultApplier: reviewService,
});
