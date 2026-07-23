// SpeedChoiceService 单元测试（Chapter 08 §5 计分/§10 方法/§9 记录字段）。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { MemoryGameRecordCreate } from '../miniprogram/repositories/memoryGameRepository';
import { gameResultStore } from '../miniprogram/services/gameResultStore';
import {
  createSpeedChoiceService,
  scoreForSpeedAnswer,
} from '../miniprogram/services/speedChoiceService';

const CHAPTER = 'chapter-1';

const makeKnowledge = (id: string, meaning: string, order: number): Knowledge => ({
  _id: id,
  chapterId: CHAPTER,
  word: `word-${id}`,
  meaning,
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const knowledgeList = [
  makeKnowledge('k1', '苹果', 1),
  makeKnowledge('k2', '香蕉', 2),
  makeKnowledge('k3', '橘子', 3),
  makeKnowledge('k4', '葡萄', 4),
  makeKnowledge('k5', '西瓜', 5),
];

const seededRandom = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0.5;
};

function createFakes() {
  const saved: MemoryGameRecordCreate[] = [];
  const applied: Array<{ wrongIds: string[]; correctIds: string[] }> = [];
  const knowledgeRepository = {
    async listByChapter() {
      return knowledgeList;
    },
    async listByIds(ids: string[]) {
      return knowledgeList.filter((item) => ids.includes(item._id));
    },
  };
  const memoryGameRepository = {
    async save(input: MemoryGameRecordCreate) {
      saved.push(input);
      return { _id: 'record-1', ...input, createdAt: new Date(), updatedAt: new Date() };
    },
    async listByUser() {
      return [];
    },
  };
  const reviewResultApplier = {
    async applyGameResults(
      _userId: string,
      _chapterId: string,
      wrongIds: string[],
      correctIds: string[],
    ) {
      applied.push({ wrongIds, correctIds });
    },
  };
  return {
    saved,
    applied,
    service: createSpeedChoiceService({
      knowledgeRepository,
      memoryGameRepository,
      reviewResultApplier,
      random: seededRandom([0.1, 0.9]),
    }),
  };
}

describe('scoreForSpeedAnswer（§5：基础+连击+速度奖励）', () => {
  it('剩余 3 秒、0 连击 → 10+2×1+3×2 = 18', () => {
    expect(scoreForSpeedAnswer(3, 0)).toEqual({ delta: 18, newStreak: 1 });
  });

  it('剩余 0 秒、1 连击 → 10+2×2+0 = 14', () => {
    expect(scoreForSpeedAnswer(0, 1)).toEqual({ delta: 14, newStreak: 2 });
  });
});

describe('SpeedChoiceService.startGame', () => {
  it('知识点 ≥4 生成四选一题目，正确答案在选项中', async () => {
    const { service } = createFakes();
    const start = await service.startGame('user-1', CHAPTER);
    expect(start.eligible).toBe(true);
    expect(start.questions.length).toBeGreaterThanOrEqual(4);
    for (const question of start.questions) {
      const source = knowledgeList.find((item) => item._id === question.knowledgeId);
      expect(question.options[question.correctIndex]).toBe(source?.meaning);
    }
  });

  it('知识点 <4 → 不可开局', async () => {
    const service = createSpeedChoiceService({
      knowledgeRepository: {
        async listByChapter() {
          return knowledgeList.slice(0, 3);
        },
        async listByIds() {
          return [];
        },
      },
      memoryGameRepository: {
        async save(input: MemoryGameRecordCreate) {
          return { _id: 'r', ...input, createdAt: new Date(), updatedAt: new Date() };
        },
        async listByUser() {
          return [];
        },
      },
      reviewResultApplier: { async applyGameResults() {} },
      random: seededRandom([0.5]),
    });
    expect((await service.startGame('user-1', CHAPTER)).eligible).toBe(false);
  });
});

describe('SpeedChoiceService.finishGame（§9：gameType/avgResponseMs）', () => {
  it('记录带 gameType=speed 与平均反应时间；结果登记进共享通道', async () => {
    const { service, saved } = createFakes();
    const start = await service.startGame('user-1', CHAPTER);
    const questions = start.questions;
    const correctIds = questions.slice(0, 3).map((q) => q.knowledgeId);
    const wrongIds = questions.slice(3, 4).map((q) => q.knowledgeId);
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: CHAPTER,
      questions,
      correctIds,
      wrongIds,
      score: 42,
      responseTimes: [1000, 2000, 3000],
    });
    expect(saved[0]?.gameType).toBe('speed');
    expect(saved[0]?.avgResponseMs).toBe(2000);
    expect(saved[0]?.duration).toBe(6);
    expect(detail.mastered).toHaveLength(3);
    expect(detail.weak).toHaveLength(1);
    expect(gameResultStore.get()?.gameType).toBe('speed');
    expect(gameResultStore.get()?.avgResponseMs).toBe(2000);
  });

  it('「加入复习」闭包触发 §12 集成', async () => {
    const { service, applied } = createFakes();
    const start = await service.startGame('user-1', CHAPTER);
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: CHAPTER,
      questions: start.questions,
      correctIds: ['k1'],
      wrongIds: ['k2'],
      score: 10,
      responseTimes: [1000],
    });
    await detail.integrateToReview();
    expect(applied[0]?.wrongIds).toEqual(['k2']);
    expect(applied[0]?.correctIds).toEqual(['k1']);
  });
});
