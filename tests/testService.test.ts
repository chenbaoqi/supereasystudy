// TestService 单元测试（§5 每知识点一题；Owner 确认 B：英译中四选一 + 同章节干扰项）。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import type { LearningRecord } from '../miniprogram/core/learningRecord';
import type { LearningRecordUpsert } from '../miniprogram/repositories/learningRecordRepository';
import { createTestService } from '../miniprogram/services/testService';
import { visualViewOf } from '../miniprogram/core/visual';

const makeKnowledge = (id: string, meaning: string, order: number): Knowledge => ({
  _id: id,
  chapterId: 'chapter-1',
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

// 确定性随机：注入固定序列，保证测试可重复
function createSeededRandom(sequence: number[]) {
  let index = 0;
  return () => sequence[index++ % sequence.length] ?? 0.5;
}

describe('TestService.generateQuestions', () => {
  it('每个知识点一道题（§5）', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList, createSeededRandom([0.1, 0.9]));
    expect(questions).toHaveLength(5);
    expect(questions.map((q) => q.knowledgeId)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5']);
  });

  it('正确答案位于 options[correctIndex]', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList, createSeededRandom([0.3, 0.7]));
    for (const question of questions) {
      const source = knowledgeList.find((item) => item._id === question.knowledgeId);
      expect(question.options[question.correctIndex]).toBe(source?.meaning);
    }
  });

  it('选项 ≤4 且无重复，干扰项取自同章节其他释义（B 方案）', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList, createSeededRandom([0.5]));
    const allMeanings = knowledgeList.map((item) => item.meaning);
    for (const question of questions) {
      expect(question.options.length).toBeLessThanOrEqual(4);
      expect(new Set(question.options).size).toBe(question.options.length);
      for (const option of question.options) expect(allMeanings).toContain(option);
    }
  });

  it('边界：章节仅 2 个知识点时选项为 2 个', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const questions = generateQuestions(knowledgeList.slice(0, 2), createSeededRandom([0.5]));
    expect(questions[0]?.options).toHaveLength(2);
  });

  it('同一 random 序列下结果确定（可重复）', () => {
    const { generateQuestions } = createTestService({ learningRecordRepository: createFakeRepo() });
    const first = generateQuestions(knowledgeList, createSeededRandom([0.2, 0.8]));
    const second = generateQuestions(knowledgeList, createSeededRandom([0.2, 0.8]));
    expect(first).toEqual(second);
  });
});

describe('TestService.buildPaper（Chapter 13 一期：听力 2 + 单词 8）', () => {
  const pool = Array.from({ length: 12 }, (_, index) =>
    makeKnowledge(`k${index + 1}`, `释义${index + 1}`, index + 1),
  );

  it('组卷：听力在前 2 题 + 单词在后 8 题，共 10 题，题型标签正确', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(pool, createSeededRandom([0.1, 0.9]));
    expect(paper).toHaveLength(10);
    expect(paper.slice(0, 2).every((q) => q.kind === 'listening')).toBe(true);
    expect(paper.slice(2).every((q) => q.kind === 'word')).toBe(true);
    // 听力题带 TTS 载体
    for (const q of paper.slice(0, 2)) expect(q.audioWord).toBeTruthy();
  });

  it('听力题与单词题不重复（听力池独立抽取）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(pool, createSeededRandom([0.3, 0.7]));
    const ids = paper.map((q) => q.knowledgeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('语法点不进试卷（Chapter 12 §7 修订）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const withGrammar = pool.map((item, index) =>
      index < 4 ? { ...item, type: 'grammar' as const } : item,
    );
    const paper = buildPaper(withGrammar, createSeededRandom([0.5]));
    // k1-k4 标记为语法点后不得出现在任何题目中
    expect(paper.every((q) => !['k1', 'k2', 'k3', 'k4'].includes(q.knowledgeId))).toBe(true);
    // 12 个知识点去掉 4 个语法 → 8 个单词全入卷
    expect(paper).toHaveLength(8);
  });

  it('小池兜底：知识点不足时按实际数量出卷', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(pool.slice(0, 5), createSeededRandom([0.5]));
    expect(paper).toHaveLength(5);
    expect(paper.slice(0, 2).every((q) => q.kind === 'listening')).toBe(true);
  });

  // 2026-09-13：数学等非语言学科不出听力题（TTS 固定 en_US，念中文概念是乱码）
  it('不支持语音的学科：无听力题，全部为普通题', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(pool, createSeededRandom([0.1, 0.9]), false);
    expect(paper).toHaveLength(10);
    expect(paper.some((q) => q.kind === 'listening')).toBe(false);
    expect(paper.every((q) => q.kind === 'word')).toBe(true);
    for (const q of paper) expect(q.audioWord).toBeUndefined();
  });

  it('不支持语音的学科：知识点不足时仍按实际数量出卷且无听力题', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(pool.slice(0, 5), createSeededRandom([0.5]), false);
    expect(paper).toHaveLength(5);
    expect(paper.some((q) => q.kind === 'listening')).toBe(false);
  });

  it('默认 third 参数缺省 → 保持含听力题的旧行为（英语零回归）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(pool, createSeededRandom([0.1, 0.9]));
    expect(paper.slice(0, 2).every((q) => q.kind === 'listening')).toBe(true);
  });
});

describe('TestService.buildPaper 语法题（Chapter 13 二期）', () => {
  it('语法点带 quiz 时：试卷含语法题（kind=grammar，题干为 quiz stem）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const grammarKnowledge = [
      {
        ...makeKnowledge('g1', '语法点A', 1),
        type: 'grammar' as const,
        quiz: [
          { stem: 'He ___ to school.', options: ['go', 'goes', 'going', 'went'], answerIndex: 1 },
          {
            stem: 'She ___ TV now.',
            options: ['watch', 'watches', 'is watching', 'watched'],
            answerIndex: 2,
          },
        ],
      },
    ];
    const paper = buildPaper(grammarKnowledge, createSeededRandom([0.5]));
    const grammarQuestions = paper.filter((q) => q.kind === 'grammar');
    expect(grammarQuestions.length).toBeGreaterThan(0);
    expect(grammarQuestions[0]?.prompt).toContain('___');
    expect(grammarQuestions[0]?.options).toHaveLength(4);
  });

  it('语法章节（无单词）也能成卷：听力/单词为空时仅语法题', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const grammarOnly = Array.from({ length: 3 }, (_, index) => ({
      ...makeKnowledge(`g${index}`, `语法点${index}`, index),
      type: 'grammar' as const,
      quiz: [{ stem: `题干${index}`, options: ['A', 'B', 'C', 'D'], answerIndex: 0 }],
    }));
    const paper = buildPaper(grammarOnly, createSeededRandom([0.5]));
    expect(paper.every((q) => q.kind === 'grammar')).toBe(true);
    // 补足逻辑：语法章节缺额用剩余语法题补齐（3 个语法点 × 1 题 = 3 题全入卷）
    expect(paper).toHaveLength(3);
  });
});

describe('TestService.submitTest', () => {
  it('交卷后状态流转为 REVIEW_DUE（Chapter 05 §6，Q1：TESTED→REVIEW_DUE）', async () => {
    const repo = createFakeRepo();
    await repo.upsert({
      userId: 'user-1',
      chapterId: 'chapter-1',
      progress: 5,
      state: 'COMPLETED',
    });
    const { submitTest } = createTestService({ learningRecordRepository: repo });
    await submitTest('user-1', 'chapter-1', { correctCount: 4, totalCount: 5 });
    const record = await repo.findByUserAndChapter('user-1', 'chapter-1');
    expect(record?.state).toBe('REVIEW_DUE');
    expect(record?.progress).toBe(5); // 进度不受测试影响
  });
});

describe('TestService.buildPaper（专项题组卷 + 可视化透传）', () => {
  // 带专项题的数学知识点（type 缺省 → 以前会被当成「单词」出释义题）
  const withQuiz = (id: string, stem: string, visual?: unknown): Knowledge => ({
    _id: id,
    chapterId: 'chapter-math',
    word: `点${id}`,
    meaning: `释义${id}`,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    quiz: [
      {
        stem,
        options: ['A', 'B', 'C', 'D'],
        answerIndex: 2,
        ...(visual ? { visual: visual as never } : {}),
      },
    ],
  });

  const seeded = createSeededRandom([0.2, 0.8]);

  it('★ 带专项题的知识点不再出「背释义」题（同一知识点不出两道）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper([withQuiz('m1', '点A在第几象限')], seeded, false);
    expect(paper).toHaveLength(1);
    expect(paper[0]?.prompt).toBe('点A在第几象限');
    // 不是自动生成的「释义是什么」
    expect(paper[0]?.prompt).not.toContain('释义');
  });

  it('★ 数学公式题（type=formula + quiz）现在能被组卷用上（以前只认 grammar）', () => {
    const formula: Knowledge = {
      ...withQuiz('f1', '三角形面积 = ?'),
      type: 'formula',
    };
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper([formula], seeded, false);
    expect(paper.some((q) => q.prompt === '三角形面积 = ?')).toBe(true);
    expect(paper.every((q) => q.kind === 'quiz')).toBe(true);
  });

  it('英语语法题仍是 kind=grammar（标签不变，不回归）', () => {
    const grammar: Knowledge = {
      ...withQuiz('g1', 'He ___ to school.'),
      type: 'grammar',
    };
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper([grammar], seeded, false);
    expect(paper[0]?.kind).toBe('grammar');
  });

  it('★ 题目的 visual 原样透传（渲染层据此决定画什么）', () => {
    const visual = { type: 'coordinate-plane', props: { xMin: -3, xMax: 3 } };
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper([withQuiz('m2', '看图选坐标', visual)], seeded, false);
    expect(paper[0]?.visual).toEqual(visual);
  });

  it('没声明 visual 的题：visual 为 undefined（页面不画图，正常答题）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper([withQuiz('m3', '普通题')], seeded, false);
    expect(paper[0]?.visual).toBeUndefined();
  });

  it('★ 污数据的 visual 也照样透传，由渲染层 visualOf 拦（服务层不做类型审判）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper([withQuiz('m4', '拼错类型', { type: 'pie' })], seeded, false);
    expect(paper[0]?.visual).toEqual({ type: 'pie' });
    // 渲染层必须把它判掉
    expect(visualViewOf(paper[0]?.visual).visualType).toBe('');
  });

  it('普通单词知识点行为不变（仍出释义题）', () => {
    const { buildPaper } = createTestService({ learningRecordRepository: createFakeRepo() });
    const paper = buildPaper(knowledgeList, seeded, false);
    expect(paper.length).toBeGreaterThan(0);
    expect(paper.every((q) => q.kind === 'word')).toBe(true);
  });
});

function createFakeRepo() {
  const store = new Map<string, LearningRecord>();
  const key = (userId: string, chapterId: string) => `${userId}:${chapterId}`;
  return {
    async findByUserAndChapter(userId: string, chapterId: string) {
      return store.get(key(userId, chapterId)) ?? null;
    },
    async listByUserAndChapters(userId: string, chapterIds: string[]) {
      return [...store.values()].filter(
        (record) => record.userId === userId && chapterIds.includes(record.chapterId),
      );
    },
    async listByUser(userId: string) {
      return [...store.values()].filter((record) => record.userId === userId);
    },
    async upsert(input: LearningRecordUpsert) {
      const existing = store.get(key(input.userId, input.chapterId));
      const record: LearningRecord = {
        _id: existing?._id ?? `record-${store.size + 1}`,
        ...input,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };
      store.set(key(input.userId, input.chapterId), record);
      return record;
    },
    async updateState(userId: string, chapterId: string, state: LearningRecord['state']) {
      const existing = store.get(key(userId, chapterId));
      if (existing) store.set(key(userId, chapterId), { ...existing, state });
    },
  };
}
