// ListenFindService 单元测试（Chapter 09 §10 方法 + §9 记录 + 单词四选一生成器）。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { MemoryGameRecordCreate } from '../miniprogram/repositories/memoryGameRepository';
import { gameResultStore } from '../miniprogram/services/gameResultStore';
import { createListenFindService } from '../miniprogram/services/listenFindService';
import { buildWordChoiceQuestions } from '../miniprogram/services/quizLogic';

const CHAPTER = 'chapter-1';

const makeKnowledge = (id: string, word: string, order: number): Knowledge => ({
  _id: id,
  chapterId: CHAPTER,
  word,
  meaning: `释义-${word}`,
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const knowledgeList = [
  makeKnowledge('k1', 'apple', 1),
  makeKnowledge('k2', 'banana', 2),
  makeKnowledge('k3', 'orange', 3),
  makeKnowledge('k4', 'grape', 4),
  makeKnowledge('k5', 'peach', 5),
];

const seededRandom = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0.5;
};

describe('buildWordChoiceQuestions（§10：选项为英文单词）', () => {
  it('每题 4 个单词选项，正确项为单词本身且在选项中', () => {
    const questions = buildWordChoiceQuestions(knowledgeList, seededRandom([0.2, 0.8]));
    expect(questions).toHaveLength(5);
    for (const question of questions) {
      const source = knowledgeList.find((item) => item._id === question.knowledgeId);
      expect(question.options[question.correctIndex]).toBe(source?.word);
      // 选项全部是同章节单词（而非释义）
      const allWords = knowledgeList.map((item) => item.word);
      for (const option of question.options) expect(allWords).toContain(option);
    }
  });
});

describe('ListenFindService（§9：gameType=listen）', () => {
  function createFakes() {
    const saved: MemoryGameRecordCreate[] = [];
    const applied: Array<{ wrongIds: string[]; correctIds: string[] }> = [];
    const service = createListenFindService({
      knowledgeRepository: {
        async listByChapter() {
          return knowledgeList;
        },
        async listByIds(ids: string[]) {
          return knowledgeList.filter((item) => ids.includes(item._id));
        },
      },
      memoryGameRepository: {
        async save(input: MemoryGameRecordCreate) {
          saved.push(input);
          return { _id: 'record-1', ...input, createdAt: new Date(), updatedAt: new Date() };
        },
        async listByUser() {
          return [];
        },
      },
      reviewResultApplier: {
        async applyGameResults(
          _userId: string,
          _chapterId: string,
          wrongIds: string[],
          correctIds: string[],
        ) {
          applied.push({ wrongIds, correctIds });
        },
      },
      random: seededRandom([0.1, 0.9]),
    });
    return { service, saved, applied };
  }

  it('startGame（word 模式）：选项为英文单词；<4 不可开局', async () => {
    const { service } = createFakes();
    const start = await service.startGame('user-1', CHAPTER, 'word');
    expect(start.eligible).toBe(true);
    expect(start.questions.length).toBeGreaterThanOrEqual(4);
    const words = knowledgeList.map((item) => item.word);
    for (const question of start.questions) {
      for (const option of question.options) expect(words).toContain(option);
    }
  });

  it('startGame（meaning 模式，Owner 双模式修订）：选项为中文释义', async () => {
    const { service } = createFakes();
    const start = await service.startGame('user-1', CHAPTER, 'meaning');
    expect(start.eligible).toBe(true);
    const meanings = knowledgeList.map((item) => item.meaning);
    for (const question of start.questions) {
      for (const option of question.options) expect(meanings).toContain(option);
    }
  });

  it('finishGame：记录 gameType=listen 与 avgResponseMs；结果进共享通道', async () => {
    const { service, saved } = createFakes();
    const start = await service.startGame('user-1', CHAPTER, 'word');
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: CHAPTER,
      questions: start.questions,
      correctIds: ['k1', 'k2'],
      wrongIds: ['k3'],
      score: 24,
      responseTimes: [2000, 4000, 6000],
    });
    expect(saved[0]?.gameType).toBe('listen');
    expect(saved[0]?.avgResponseMs).toBe(4000);
    expect(saved[0]?.duration).toBe(12);
    expect(detail.mastered).toHaveLength(2);
    expect(detail.weak).toHaveLength(1);
    expect(gameResultStore.get()?.gameType).toBe('listen');
  });

  it('「加入复习」闭包触发 §12 集成', async () => {
    const { service, applied } = createFakes();
    const start = await service.startGame('user-1', CHAPTER, 'word');
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: CHAPTER,
      questions: start.questions,
      correctIds: ['k1'],
      wrongIds: ['k2'],
      score: 12,
      responseTimes: [1500],
    });
    await detail.integrateToReview();
    expect(applied[0]?.wrongIds).toEqual(['k2']);
    expect(applied[0]?.correctIds).toEqual(['k1']);
  });
});
