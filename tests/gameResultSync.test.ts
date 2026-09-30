// L3 结果回流单测：游戏 / 测试玩完之后，对错要真的落到掌握度与错题本里。
//
// 六条不变量：
//   1. 答对 → 只更新掌握度，**不写错题**
//   2. 答错 → 掌握度 + 错题本都要动
//   3. 同一知识点错两次 → 只留一条记录、wrongCount 累加（不能变成两条）
//   4. 回流失败（云炸了）→ 不能把异常抛给结算
//   5. 空输入直接返回，不做无谓的云调用
//   6. 门面收到 attempts 才回流（情景闯关 / 冒险岛不传，就不该有回流）
import { describe, expect, it } from 'vitest';
import type { WrongQuestion, WrongQuestionDoc } from '../miniprogram/core/wrongQuestion';
import { createGameResultSync } from '../miniprogram/services/gameResultSyncService';

interface SyncCall {
  readonly knowledgeId: string;
  readonly firstTryCorrect: boolean;
}

interface Harness {
  sync: ReturnType<typeof createGameResultSync>;
  attempts: SyncCall[];
  added: Array<Omit<WrongQuestion, '_id' | 'createdAt' | 'updatedAt'>>;
  updated: Array<{ id: string; patch: Partial<WrongQuestion> }>;
}

function makeHarness(
  options: { existing?: WrongQuestionDoc | null; failMastery?: boolean } = {},
): Harness {
  const attempts: SyncCall[] = [];
  const added: Harness['added'] = [];
  const updated: Harness['updated'] = [];
  const sync = createGameResultSync({
    mastery: {
      async recordAttempt(_userId, knowledgeId, input) {
        if (options.failMastery) throw new Error('云炸了');
        attempts.push({ knowledgeId, firstTryCorrect: input.firstTryCorrect });
        return {} as never;
      },
      async getScore() {
        return 0;
      },
      async masteryMap() {
        return {};
      },
      async listByUser() {
        return [];
      },
    },
    wrongRepo: {
      async listByUser() {
        return [];
      },
      async listUnfixed() {
        return [];
      },
      async getByUserAndQuestion() {
        return options.existing ?? null;
      },
      async add(record) {
        added.push(record);
      },
      async update(id, patch) {
        updated.push({ id, patch });
      },
    },
    waitMs: 50,
  });
  return { sync, attempts, added, updated };
}

function docOf(overrides: Partial<WrongQuestionDoc> = {}): WrongQuestionDoc {
  return {
    _id: 'wq-1',
    userId: 'u1',
    questionId: 'k1',
    knowledgePointIds: ['k1'],
    studentAnswer: '',
    correctAnswerText: '',
    errorTypes: ['concept'],
    wrongCount: 1,
    hintUsedCount: 0,
    firstWrongAt: 1000,
    lastWrongAt: 1000,
    stage: 'new',
    fixed: false,
    ...overrides,
  };
}

describe('L3 结果回流', () => {
  it('答对 → 更新掌握度，不写错题', async () => {
    const h = makeHarness();
    await h.sync.sync({ userId: 'u1', source: 'speed', correctIds: ['k1'], wrongIds: [] });
    expect(h.attempts).toEqual([{ knowledgeId: 'k1', firstTryCorrect: true }]);
    expect(h.added).toEqual([]);
    expect(h.updated).toEqual([]);
  });

  it('答错 → 掌握度 + 错题本都要动', async () => {
    const h = makeHarness();
    await h.sync.sync({ userId: 'u1', source: 'grammar', correctIds: [], wrongIds: ['k2'] });
    expect(h.attempts).toEqual([{ knowledgeId: 'k2', firstTryCorrect: false }]);
    expect(h.added.length).toBe(1);
    expect(h.added[0]?.questionId).toBe('k2');
    expect(h.added[0]?.knowledgePointIds).toEqual(['k2']);
  });

  it('同一知识点错两次 → 只留一条，wrongCount 累加（不变成两条）', async () => {
    const h = makeHarness({ existing: docOf() });
    await h.sync.sync({ userId: 'u1', source: 'test', correctIds: [], wrongIds: ['k1'] });
    expect(h.added).toEqual([]); // 不新增
    expect(h.updated.length).toBe(1);
    expect(h.updated[0]?.id).toBe('wq-1');
    expect(h.updated[0]?.patch.wrongCount).toBe(2);
  });

  it('已修复后又错 → 打回未修复（错题本不是收藏夹）', async () => {
    const h = makeHarness({ existing: docOf({ fixed: true, stage: 'fixed', fixedAt: 2000 }) });
    await h.sync.sync({ userId: 'u1', source: 'test', correctIds: [], wrongIds: ['k1'] });
    const patch = h.updated[0]?.patch;
    expect(patch?.fixed).toBe(false);
    expect(patch?.stage).toBe('explained');
  });

  it('回流失败不抛给调用方（结算不能被它拖垮）', async () => {
    const h = makeHarness({ failMastery: true });
    await expect(
      h.sync.sync({ userId: 'u1', source: 'speed', correctIds: ['k1'], wrongIds: [] }),
    ).resolves.toBeUndefined();
  });

  it('空输入直接返回，不做无谓的云调用', async () => {
    const h = makeHarness();
    await h.sync.sync({ userId: 'u1', source: 'speed', correctIds: [], wrongIds: [] });
    expect(h.attempts).toEqual([]);
    expect(h.added).toEqual([]);
  });

  it('同一知识点既在 correctIds 又在 wrongIds → 按答错算一次（去重，不重复记）', async () => {
    const h = makeHarness();
    await h.sync.sync({ userId: 'u1', source: 'memory', correctIds: ['k1'], wrongIds: ['k1'] });
    expect(h.attempts).toEqual([{ knowledgeId: 'k1', firstTryCorrect: false }]);
    expect(h.added.length).toBe(1);
  });
});
