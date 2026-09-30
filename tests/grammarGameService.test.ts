// GrammarGameService 单元测试（二期：语法闯关）。
// 覆盖：startGame 由单词册次解析语法专题包并展开 quiz 出题；无语法分区/无题 → 不可开局；
// finishGame 记录携带 gameType='grammar' 与平均反应时间，并登记进结果共享通道。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { MemoryGameRecordCreate } from '../miniprogram/repositories/memoryGameRepository';
import type { SemesterStage } from '../miniprogram/utils/stage';
import { gameResultStore } from '../miniprogram/services/gameResultStore';
import { createGrammarGameService } from '../miniprogram/services/grammarGameService';

const WORD_SEMESTER = 'word-sem-7a'; // 七年级上册 → 初中(junior)
const GRAMMAR_SEMESTER = 'grammar-sem-junior';

const makeGrammar = (
  id: string,
  word: string,
  quizzes: Array<{ stem: string; options: string[]; answerIndex: number }>,
): Knowledge => ({
  _id: id,
  chapterId: 'gch-1',
  word,
  meaning: word,
  type: 'grammar',
  quiz: quizzes.map((q) => ({ stem: q.stem, options: q.options, answerIndex: q.answerIndex })),
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const grammarList = [
  makeGrammar('g1', '一般现在时', [
    {
      stem: 'He ___ to school every day.',
      options: ['go', 'goes', 'went', 'going'],
      answerIndex: 1,
    },
    {
      stem: 'They ___ football on Sundays.',
      options: ['play', 'plays', 'playing', 'played'],
      answerIndex: 0,
    },
  ]),
  makeGrammar('g2', '名词复数', [
    {
      stem: 'The ___ are on the table.',
      options: ['book', 'books', 'bookes', 'bookies'],
      answerIndex: 1,
    },
  ]),
];

const makeFakes = (
  overrides: {
    grammarSemesterId?: string | null;
    grammarList?: Knowledge[];
    // 单词册次的形态：名 + 可选 stage 显式字段（用于验证「显式字段优先」）
    wordSemesterName?: string;
    wordSemesterStage?: SemesterStage;
  } = {},
) => {
  const saved: MemoryGameRecordCreate[] = [];
  const applied: Array<{ wrongIds: string[]; correctIds: string[] }> = [];
  const rewarded: Array<{ gameId: string; correct: number; total: number }> = [];
  // 解析专题包时收到的学段：用它断言「学段到底是怎么定出来的」
  const stages: SemesterStage[] = [];
  const service = createGrammarGameService({
    semesterRepository: {
      async getById(id: string) {
        if (id !== WORD_SEMESTER) return null;
        const doc: Record<string, unknown> = {
          _id: WORD_SEMESTER,
          textbookId: 'tb',
          name: overrides.wordSemesterName ?? '七年级上册',
          order: 1,
        };
        // 未传 stage 时不写这个键，模拟老数据缺字段（走兜底）
        if (overrides.wordSemesterStage !== undefined) doc.stage = overrides.wordSemesterStage;
        return doc as never;
      },
      async listByTextbook() {
        return [];
      },
    },
    grammarPackService: {
      async resolveSemesterId(stage: SemesterStage) {
        stages.push(stage);
        // 显式传 null 时返回 null（模拟该学段无语法分区）；未传则回落到默认语法册次
        return overrides.grammarSemesterId === undefined
          ? GRAMMAR_SEMESTER
          : overrides.grammarSemesterId;
      },
      async resolveSemesterIdByPath() {
        return null;
      },
    },
    chapterRepository: {
      async listBySemester() {
        return [{ _id: 'gch-1', semesterId: GRAMMAR_SEMESTER, name: '全册', order: 1 } as never];
      },
      async listByIds() {
        return [];
      },
    },
    knowledgeRepository: {
      async listByChapter() {
        return overrides.grammarList ?? grammarList;
      },
      async listByIds(ids: string[]) {
        const all = overrides.grammarList ?? grammarList;
        return all.filter((item) => ids.includes(item._id));
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
    // 全站钱包替身：只记下被喂进来的数（真实入账要碰 wx / 云，测试里不跑）
    rewarder: {
      async reward(input: { gameId: string; correct: number; total: number }) {
        rewarded.push({ gameId: input.gameId, correct: input.correct, total: input.total });
        return {
          stars: input.correct,
          coins: input.correct,
          newBadges: [],
          gainText: input.correct > 0 ? `⭐+${input.correct} 🪙+${input.correct}` : '',
          badgeText: '',
        };
      },
    },
  });
  return { saved, applied, rewarded, stages, service };
};

describe('GrammarGameService.startGame', () => {
  it('由单词册次解析语法专题包，展开 quiz 出题，正确答案在选项中', async () => {
    const { service } = makeFakes();
    const start = await service.startGame('user-1', WORD_SEMESTER);
    expect(start.eligible).toBe(true);
    expect(start.questions.length).toBe(3); // g1×2 + g2×1
    for (const question of start.questions) {
      const source = grammarList.find((item) => item._id === question.knowledgeId);
      const quiz = source?.quiz ?? [];
      const correctText = quiz.flatMap((q) =>
        question.prompt === q.stem ? [q.options[q.answerIndex]] : [],
      )[0];
      expect(question.options[question.correctIndex]).toBe(correctText);
      expect(question.prompt).toBeTruthy();
      expect(question.word).toBe(source?.word);
    }
  });

  // 2026-09-19：册次名叫「全册」时 stageOfSemester 会兜底成 junior（学习页公式分区那次事故同源）。
  // 这里手上有册次文档，stage 显式字段是权威来源，必须优先读它。
  it('册次带 stage 显式字段时以它为准，不被册次名带偏', async () => {
    const { service, stages } = makeFakes({
      wordSemesterName: '七年级上册', // 名字看着是初中
      wordSemesterStage: 'primary', // 但显式字段写的是小学
    });
    await service.startGame('user-1', WORD_SEMESTER);
    expect(stages).toEqual(['primary']);
  });

  it('册次名叫「全册」但没有 stage 字段 → 回落字符串解析（老数据不回归）', async () => {
    const { service, stages } = makeFakes({ wordSemesterName: '全册' });
    await service.startGame('user-1', WORD_SEMESTER);
    // 兜底行为本身是错的（junior），这里只锁住「缺字段时不崩、仍走旧逻辑」
    expect(stages).toEqual(['junior']);
  });

  it('册次名叫「全册」且带 stage → 按显式字段，不再误判成初中', async () => {
    const { service, stages } = makeFakes({
      wordSemesterName: '全册',
      wordSemesterStage: 'primary',
    });
    await service.startGame('user-1', WORD_SEMESTER);
    expect(stages).toEqual(['primary']);
  });

  it('该学段无语法专题包 → 不可开局（no-grammar-semester）', async () => {
    const { service } = makeFakes({ grammarSemesterId: null });
    const start = await service.startGame('user-1', WORD_SEMESTER);
    expect(start.eligible).toBe(false);
    expect(start.reason).toBe('no-grammar-semester');
  });

  it('语法专题包无语法点 → 不可开局（empty）', async () => {
    const { service } = makeFakes({ grammarList: [] });
    const start = await service.startGame('user-1', WORD_SEMESTER);
    expect(start.eligible).toBe(false);
    expect(start.reason).toBe('empty');
  });

  it('单词册次 id 缺失 → 不可开局（empty）', async () => {
    const { service } = makeFakes();
    const start = await service.startGame('user-1', '');
    expect(start.eligible).toBe(false);
    expect(start.reason).toBe('empty');
  });
});

describe('GrammarGameService.finishGame（gameType=grammar）', () => {
  it('记录带 gameType=grammar 与平均反应时间；结果登记进共享通道', async () => {
    const { service, saved } = makeFakes();
    const start = await service.startGame('user-1', WORD_SEMESTER);
    const questions = start.questions;
    const correctIds = questions.slice(0, 2).map((q) => q.knowledgeId);
    const wrongIds = questions.slice(2, 3).map((q) => q.knowledgeId);
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: 'word-ch-1',
      questions,
      correctIds,
      wrongIds,
      score: 42,
      responseTimes: [1000, 2000, 3000],
    });
    expect(saved[0]?.gameType).toBe('grammar');
    expect(saved[0]?.avgResponseMs).toBe(2000);
    expect(saved[0]?.duration).toBe(6);
    expect(detail.mastered).toHaveLength(2);
    expect(detail.weak).toHaveLength(1);
    expect(detail.replayUrl).toBe('/pages/grammar-game/grammar-game');
    expect(gameResultStore.get()?.gameType).toBe('grammar');
  });

  it('把「答对数/总题数」喂给全站钱包（L1）', async () => {
    const { service, rewarded } = makeFakes();
    const start = await service.startGame('user-1', WORD_SEMESTER);
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: 'word-ch-1',
      questions: start.questions,
      correctIds: ['g1'],
      wrongIds: ['g2'],
      score: 10,
      responseTimes: [1000],
    });
    expect(rewarded[0]).toEqual({ gameId: 'grammar', correct: 1, total: start.questions.length });
    expect(detail.wallet?.gain).toContain('⭐+1');
  });

  it('「加入复习」闭包触发集成', async () => {
    const { service, applied } = makeFakes();
    const start = await service.startGame('user-1', WORD_SEMESTER);
    const detail = await service.finishGame({
      userId: 'user-1',
      chapterId: 'word-ch-1',
      questions: start.questions,
      correctIds: ['g1'],
      wrongIds: ['g2'],
      score: 10,
      responseTimes: [1000],
    });
    await detail.integrateToReview();
    expect(applied[0]?.wrongIds).toEqual(['g2']);
    expect(applied[0]?.correctIds).toEqual(['g1']);
  });
});
