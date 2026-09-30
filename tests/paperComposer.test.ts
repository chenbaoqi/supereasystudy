// 规则驱动组卷单测（B-6，需求第三十二章 / 第三十三章）。
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../miniprogram/core/question';
import { PAPER_RULES } from '../miniprogram/config/testPaperRules';
import type { CandidateQuestion } from '../miniprogram/services/paperComposer';
import {
  composePaper,
  scoreQuestion,
  targetDifficulty,
} from '../miniprogram/services/paperComposer';

// 可复现随机源（mulberry32）
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 每个知识点造 count 道题（难度默认 3）
function build(knowledgePoints: readonly string[], count = 5, difficulty: Difficulty = 3) {
  const out: CandidateQuestion[] = [];
  for (const kp of knowledgePoints) {
    for (let i = 0; i < count; i += 1) {
      out.push({
        questionId: `${kp}-${i}`,
        knowledgePointIds: [kp],
        difficulty,
        questionType: 'single_choice',
      });
    }
  }
  return out;
}

const KPS = ['func', 'geo', 'eq', 'prob'];

describe('targetDifficulty', () => {
  it('掌握度越低目标难度越低（先建立正确率）', () => {
    expect(targetDifficulty(10)).toBe(1);
    expect(targetDifficulty(30)).toBe(2);
    expect(targetDifficulty(50)).toBe(3);
    expect(targetDifficulty(70)).toBe(4);
    expect(targetDifficulty(95)).toBe(5);
  });
});

describe('composePaper · 自适应倾斜（需求第三十三章例子）', () => {
  // 需求原文：函数 92 / 几何 54 / 方程 78 / 概率 42 → 下一次训练提高几何 + 概率
  const mastery = { func: 92, geo: 54, eq: 78, prob: 42 };
  const candidates = build(KPS, 5);
  const rule = { type: 'smart' as const, total: 8, adaptive: true, maxPerKnowledgePoint: 8 };

  it('组卷明显向薄弱点（概率、几何）倾斜', () => {
    const paper = composePaper({
      candidates,
      rule,
      masteryByKnowledge: mastery,
      random: seeded(1),
    });
    const count = (kp: string) => paper.filter((q) => q.knowledgePointIds.includes(kp)).length;
    const prob = count('prob');
    const geo = count('geo');
    const eq = count('eq');
    const func = count('func');

    expect(prob).toBeGreaterThanOrEqual(geo);
    expect(geo).toBeGreaterThan(eq);
    expect(func).toBe(0); // 掌握最好的函数不该占用名额
    expect(prob + geo).toBe(8); // 全部名额都给了两个薄弱点
  });

  it('掌握度反转后，倾斜方向也随之反转', () => {
    const reversed = { func: 20, geo: 90, eq: 85, prob: 88 };
    const paper = composePaper({
      candidates,
      rule,
      masteryByKnowledge: reversed,
      random: seeded(1),
    });
    const count = (kp: string) => paper.filter((q) => q.knowledgePointIds.includes(kp)).length;
    expect(count('func')).toBeGreaterThan(count('geo'));
    expect(count('geo')).toBe(0);
  });
});

describe('composePaper · 非自适应', () => {
  it('期中期末不按掌握度倾斜，各知识点都被覆盖', () => {
    const mastery = { func: 92, geo: 54, eq: 78, prob: 42 };
    const paper = composePaper({
      candidates: build(KPS, 5),
      rule: PAPER_RULES.midterm,
      masteryByKnowledge: mastery,
      random: seeded(7),
    });
    for (const kp of KPS) {
      expect(paper.filter((q) => q.knowledgePointIds.includes(kp)).length, kp).toBeGreaterThan(0);
    }
  });
});

describe('composePaper · 错题配额', () => {
  const candidates = build(KPS, 4);
  const wrong = { 'prob-0': 3, 'geo-0': 2, 'eq-0': 1 };

  it('错题重测（wrongRatio=1）全部取自错题', () => {
    const paper = composePaper({
      candidates,
      rule: PAPER_RULES.wrong_retest,
      wrongCountByQuestion: wrong,
      random: seeded(3),
    });
    expect(paper.every((q) => (wrong[q.questionId as keyof typeof wrong] ?? 0) > 0)).toBe(true);
  });

  it('智能测试按 wrongRatio 预留错题名额', () => {
    const paper = composePaper({
      candidates: build(KPS, 5),
      rule: PAPER_RULES.smart,
      wrongCountByQuestion: { ...wrong, 'func-0': 2, 'prob-1': 1 },
      random: seeded(3),
    });
    const wrongIds = new Set(Object.keys({ ...wrong, 'func-0': 2, 'prob-1': 1 }));
    const wrongPicked = paper.filter((q) => wrongIds.has(q.questionId)).length;
    expect(wrongPicked).toBeGreaterThan(0);
    expect(wrongPicked).toBeLessThanOrEqual(Math.round(10 * 0.3) + 1);
  });
});

describe('composePaper · 覆盖广度与过滤', () => {
  it('maxPerKnowledgePoint 限制单知识点题量', () => {
    const paper = composePaper({
      candidates: build(KPS, 5),
      rule: { type: 'unit', total: 10, adaptive: false, maxPerKnowledgePoint: 2 },
      random: seeded(5),
    });
    for (const kp of KPS) {
      expect(paper.filter((q) => q.knowledgePointIds.includes(kp)).length, kp).toBeLessThanOrEqual(
        2,
      );
    }
  });

  it('difficultyRange 过滤掉区间外的题', () => {
    const mixed: CandidateQuestion[] = [
      {
        questionId: 'easy',
        knowledgePointIds: ['k'],
        difficulty: 1,
        questionType: 'single_choice',
      },
      {
        questionId: 'hard',
        knowledgePointIds: ['k'],
        difficulty: 5,
        questionType: 'single_choice',
      },
    ];
    const paper = composePaper({
      candidates: mixed,
      rule: { type: 'unit', total: 5, adaptive: false, difficultyRange: [1, 2] },
      random: seeded(5),
    });
    expect(paper.map((q) => q.questionId)).toEqual(['easy']);
  });

  it('题量不足时返回能凑到的全部，不用重复题凑数', () => {
    const paper = composePaper({
      candidates: build(['k'], 3),
      rule: { type: 'unit', total: 10, adaptive: false },
      random: seeded(5),
    });
    expect(paper).toHaveLength(3);
    expect(new Set(paper.map((q) => q.questionId)).size).toBe(3);
  });
});

describe('composePaper · 前置知识（B-2 接入后生效）', () => {
  const q: CandidateQuestion = {
    questionId: 'q1',
    knowledgePointIds: ['similar'],
    difficulty: 3,
    questionType: 'single_choice',
  };
  const input = {
    candidates: [q],
    rule: { type: 'knowledge' as const, total: 5, adaptive: true },
    masteryByKnowledge: { similar: 50, ratio: 30 },
    prereqOf: { similar: ['ratio'] },
  };

  it('前置未达标时该题被降权', () => {
    const withPrereq = scoreQuestion(q, input);
    const without = scoreQuestion(q, { ...input, prereqOf: undefined });
    expect(withPrereq).toBeLessThan(without);
  });

  it('前置达标则不降权', () => {
    const ready = scoreQuestion(q, {
      ...input,
      masteryByKnowledge: { similar: 50, ratio: 80 },
    });
    const without = scoreQuestion(q, { ...input, prereqOf: undefined });
    expect(ready).toBeCloseTo(without, 10);
  });
});

describe('composePaper · 确定性', () => {
  it('相同随机源产出相同卷子', () => {
    const base = {
      candidates: build(KPS, 5),
      rule: PAPER_RULES.smart,
      masteryByKnowledge: { func: 92, geo: 54, eq: 78, prob: 42 },
    };
    const a = composePaper({ ...base, random: seeded(42) }).map((q) => q.questionId);
    const b = composePaper({ ...base, random: seeded(42) }).map((q) => q.questionId);
    expect(a).toEqual(b);
  });
});
