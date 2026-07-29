// 听音找词服务（Chapter 09 §10：startGame / submitAnswer / finishGame / saveResult）。
// 单词四选一生成器复用 quizLogic.buildWordChoiceQuestions；游戏池规则与全系列一致；
// 结果登记进 gameResultStore，由统一结果页渲染。
import type { Knowledge } from '../core/knowledge';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import {
  memoryGameRepository,
  type MemoryGameRepository,
} from '../repositories/memoryGameRepository';
import { reviewService } from './reviewService';
import { gameResultStore, type GameResultDetail } from './gameResultStore';
import { selectPool } from './memoryGameLogic';
import { buildChoiceQuestions, buildWordChoiceQuestions, type ChoiceQuestion } from './quizLogic';

// 听音模式（Owner 2026-07-20 修订：双形式——听音选词 / 听音选义）
export type ListenMode = 'word' | 'meaning';

export interface ListenGameStart {
  readonly eligible: boolean; // false = 章节知识点不足（§13）
  readonly questions: ChoiceQuestion[];
}

export interface ListenFinishInput {
  readonly userId: string;
  readonly chapterId: string;
  readonly questions: ChoiceQuestion[];
  readonly correctIds: string[];
  readonly wrongIds: string[]; // 答错 + 超时（§8 薄弱口径）
  readonly score: number;
  readonly responseTimes: number[]; // 每题反应毫秒（超时按满分限时计入）
}

export interface ListenFindServiceDeps {
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

export function createListenFindService(deps: ListenFindServiceDeps) {
  return {
    async startGame(
      _userId: string,
      chapterId: string,
      mode: ListenMode = 'word',
    ): Promise<ListenGameStart> {
      const knowledgeList = await deps.knowledgeRepository.listByChapter(chapterId);
      const random = deps.random ?? Math.random;
      const { pool, eligible } = selectPool(knowledgeList, random);
      if (!eligible) return { eligible: false, questions: [] };
      // 双形式：选词=英文单词选项；选义=中文释义选项（题干均为发音）
      const questions =
        mode === 'word'
          ? buildWordChoiceQuestions(pool, random)
          : buildChoiceQuestions(pool, random);
      return { eligible: true, questions };
    },

    async finishGame(input: ListenFinishInput): Promise<GameResultDetail> {
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
        gameType: 'listen',
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
        gameType: 'listen',
        record,
        mastered: pick(input.correctIds),
        weak: pick(input.wrongIds),
        correctIds: input.correctIds,
        wrongIds: input.wrongIds,
        avgResponseMs,
        replayUrl: '/pages/listen-find/listen-find',
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

export const listenFindService = createListenFindService({
  knowledgeRepository,
  memoryGameRepository,
  reviewResultApplier: reviewService,
});
