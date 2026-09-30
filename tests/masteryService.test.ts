// 掌握度服务 + 知识图谱服务单测（ADR-008 落地，需求第三十四章 / 第三十五章）。
import { describe, expect, it } from 'vitest';
import type { UserMastery } from '../miniprogram/core/masteryRecord';
import type { KnowledgeRelation } from '../miniprogram/core/knowledgeRelation';
import { createMasteryService, scoreWithDecay } from '../miniprogram/services/masteryService';
import type { MasteryUpsertInput } from '../miniprogram/repositories/userMasteryRepository';
import {
  buildGraph,
  createKnowledgeGraphService,
  PREREQ_READY_SCORE,
} from '../miniprogram/services/knowledgeGraphService';

function fakeRepo(initial: Record<string, UserMastery> = {}) {
  const store = new Map<string, UserMastery>(Object.entries(initial));
  const key = (u: string, k: string) => `${u}:${k}`;
  return {
    store,
    async listByUser(userId: string) {
      return [...store.values()].filter((r) => r.userId === userId);
    },
    async getByUserAndKnowledge(userId: string, knowledgeId: string) {
      return store.get(key(userId, knowledgeId)) ?? null;
    },
    async upsert(userId: string, knowledgeId: string, data: MasteryUpsertInput) {
      const prev = store.get(key(userId, knowledgeId));
      store.set(key(userId, knowledgeId), {
        _id: prev?._id ?? key(userId, knowledgeId),
        createdAt: prev?.createdAt ?? new Date(0),
        updatedAt: new Date(0),
        userId,
        knowledgeId,
        ...data,
      });
    },
  };
}

const NOW = 1_000_000;

describe('scoreWithDecay（遗忘衰减）', () => {
  const base: UserMastery = {
    _id: '1',
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    userId: 'u',
    knowledgeId: 'k',
    masteryScore: 100,
    practiceCount: 10,
    firstTryCorrectRate: 1,
    recentCorrectRate: 1,
    hintUsedRate: 0,
    wrongFixedRate: 1,
    lastPracticedAt: NOW,
  };

  it('当天读取不衰减', () => {
    expect(scoreWithDecay(base, NOW)).toBe(100);
  });

  it('长期不练会衰减（破解「学过即掌握」假象）', () => {
    const days120 = NOW + 120 * 24 * 60 * 60 * 1000;
    expect(scoreWithDecay(base, days120)).toBeLessThan(100);
  });

  it('衰减有下限，不会归零', () => {
    const years = NOW + 3650 * 24 * 60 * 60 * 1000;
    expect(scoreWithDecay(base, years)).toBeGreaterThanOrEqual(70);
  });

  it('从未练过按 0 天处理（不惩罚）', () => {
    const noTime: UserMastery = { ...base, lastPracticedAt: undefined };
    expect(scoreWithDecay(noTime, NOW + 10 ** 10)).toBe(100);
  });
});

describe('createMasteryService', () => {
  it('未学过的知识点掌握度为 0', async () => {
    const svc = createMasteryService({ userMasteryRepository: fakeRepo() } as never);
    expect(await svc.getScore('u', 'k', NOW)).toBe(0);
  });

  it('首次答对后记录建档，样本不足封顶 60', async () => {
    const repo = fakeRepo();
    const svc = createMasteryService({ userMasteryRepository: repo } as never);
    const rec = await svc.recordAttempt('u', 'k', { firstTryCorrect: true }, NOW);
    expect(rec.practiceCount).toBe(1);
    expect(rec.firstTryCorrectRate).toBe(1);
    expect(rec.masteryScore).toBeLessThanOrEqual(60); // 小样本护栏
  });

  it('连续答对会累积，达到 3 次后不再封顶', async () => {
    const repo = fakeRepo();
    const svc = createMasteryService({ userMasteryRepository: repo } as never);
    let last = await svc.recordAttempt('u', 'k', { firstTryCorrect: true }, NOW);
    for (let i = 0; i < 5; i += 1) {
      last = await svc.recordAttempt('u', 'k', { firstTryCorrect: true }, NOW);
    }
    expect(last.practiceCount).toBe(6);
    expect(last.masteryScore).toBeGreaterThan(60);
  });

  it('首次正确率按累计平均计算（对 2 错 1 → 2/3）', async () => {
    const repo = fakeRepo();
    const svc = createMasteryService({ userMasteryRepository: repo } as never);
    await svc.recordAttempt('u', 'k', { firstTryCorrect: true }, NOW);
    await svc.recordAttempt('u', 'k', { firstTryCorrect: true }, NOW);
    const rec = await svc.recordAttempt('u', 'k', { firstTryCorrect: false }, NOW);
    expect(rec.firstTryCorrectRate).toBeCloseTo(2 / 3, 10);
  });

  it('用过提示会降低掌握度', async () => {
    const repoA = fakeRepo();
    const repoB = fakeRepo();
    const svcA = createMasteryService({ userMasteryRepository: repoA } as never);
    const svcB = createMasteryService({ userMasteryRepository: repoB } as never);
    for (let i = 0; i < 5; i += 1) {
      await svcA.recordAttempt('u', 'k', { firstTryCorrect: true }, NOW);
      await svcB.recordAttempt('u', 'k', { firstTryCorrect: true, hintUsed: true }, NOW);
    }
    const a = await svcA.getScore('u', 'k', NOW);
    const b = await svcB.getScore('u', 'k', NOW);
    expect(b).toBeLessThan(a);
  });

  it('masteryMap 输出「知识点 → 掌握度」，供组卷直接使用', async () => {
    const repo = fakeRepo();
    const svc = createMasteryService({ userMasteryRepository: repo } as never);
    for (let i = 0; i < 4; i += 1) {
      await svc.recordAttempt('u', 'prob', { firstTryCorrect: true }, NOW);
    }
    await svc.recordAttempt('u', 'func', { firstTryCorrect: false }, NOW);
    const map = await svc.masteryMap('u', NOW);
    expect(Object.keys(map).sort()).toEqual(['func', 'prob']);
    expect(map.prob).toBeGreaterThan(map.func ?? 0);
  });
});

describe('知识图谱', () => {
  const relations: KnowledgeRelation[] = [
    {
      _id: '1',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      knowledgeId: 'similar',
      relatedId: 'ratio',
      type: 'prerequisite',
    },
    {
      _id: '2',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      knowledgeId: 'similar',
      relatedId: 'congruence',
      type: 'related',
    },
    {
      _id: '3',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      knowledgeId: 'ratio',
      relatedId: 'fraction',
      type: 'prerequisite',
    },
    {
      _id: '4',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      knowledgeId: 'similar',
      relatedId: 'ratio',
      type: 'prerequisite',
    }, // 重复
  ];

  it('buildGraph 按类型分桶并去重', () => {
    const g = buildGraph(relations);
    expect(g.prerequisiteOf['similar']).toEqual(['ratio']);
    expect(g.relatedOf['similar']).toEqual(['congruence']);
    expect(g.prerequisiteOf['ratio']).toEqual(['fraction']);
  });

  it('无关系的知识点返回空数组', () => {
    const g = buildGraph(relations);
    const svc = createKnowledgeGraphService({ knowledgeRelationRepository: {} } as never);
    expect(svc.prerequisitesOf(g, 'nonexistent')).toEqual([]);
  });

  it('unmasteredPrerequisites 找出未达标的前置（补弱切入点）', () => {
    const g = buildGraph(relations);
    const svc = createKnowledgeGraphService({ knowledgeRelationRepository: {} } as never);
    const weak = svc.unmasteredPrerequisites(g, { ratio: 30 }, 'similar');
    expect(weak).toEqual(['ratio']);

    const ok = svc.unmasteredPrerequisites(g, { ratio: PREREQ_READY_SCORE + 10 }, 'similar');
    expect(ok).toEqual([]);
  });

  it('掌握度缺失的前置视为未达标（不能默认会）', () => {
    const g = buildGraph(relations);
    const svc = createKnowledgeGraphService({ knowledgeRelationRepository: {} } as never);
    expect(svc.unmasteredPrerequisites(g, {}, 'similar')).toEqual(['ratio']);
  });
});
