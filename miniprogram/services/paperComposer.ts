// 规则驱动组卷（需求第三十二章 测试系统 / 第三十三章 自适应测试）。
//
// 设计约束：
// 1) 本文件是**新增**，不改动 testService.ts 与 config/testPaper.ts，英语零回归风险。
// 2) 自适应只用「掌握度 / 历史错误 / 难度贴合 / 近期表现」四个可解释信号 + 固定权重，
//    不用黑箱模型——需求第三十三章列了这些因素但没给权重，权重必须能说清、能调、能验证。
// 3) 前置知识（知识前置关系）为可选输入：B-2 知识图谱建成后接入，当前缺省不惩罚。
// 4) 纯函数，随机源可注入，便于确定性单测。
//
// 典型效果（需求第三十三章的例子）：函数 92 / 几何 54 / 方程 78 / 概率 42
// → 概率与几何的 need 分量最高，组卷会明显向这两块倾斜。

import type { Difficulty, QuestionType } from '../core/question';
import { ADAPTIVE_WEIGHTS, type PaperRule } from '../config/testPaperRules';

const DAY_MS = 24 * 60 * 60 * 1000;
// 掌握度未知时的中性假设（50 = 不偏不倚，既不优先也不冷落）
const MASTERY_UNKNOWN = 50;
// 前置知识达标线：低于此值认为学生还没准备好做该题
const PREREQ_MASTERY_THRESHOLD = 60;
// 从未出现过的题目给一点曝光机会（不是 0，否则新题永远排不上）
const UNSEEN_RECENCY = 0.3;
const WRONG_NORMALIZE = 3; // 错 3 次即视为满分信号
const DAYS_NORMALIZE = 30; // 30 天未练即视为满分信号

export interface CandidateQuestion {
  readonly questionId: string;
  readonly knowledgePointIds: readonly string[];
  readonly difficulty: Difficulty;
  readonly questionType: QuestionType;
}

export interface ComposeInput {
  readonly candidates: readonly CandidateQuestion[];
  readonly rule: PaperRule;
  // 知识点 → 掌握度 0-100（来自 B-4 掌握度引擎）
  readonly masteryByKnowledge?: Readonly<Record<string, number>>;
  // 题目 → 历史错误次数（来自 B-5 错题引擎）
  readonly wrongCountByQuestion?: Readonly<Record<string, number>>;
  // 题目 → 上次出现时间（毫秒时间戳）
  readonly lastSeenByQuestion?: Readonly<Record<string, number>>;
  // 知识点 → 前置知识点（B-2 知识图谱建成后注入；缺省则不做前置判断）
  readonly prereqOf?: Readonly<Record<string, readonly string[]>>;
  readonly now?: number;
  readonly random?: () => number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// 目标难度：掌握度越低越该出简单题（先建立正确率），越高越该上难度
export function targetDifficulty(mastery: number): Difficulty {
  if (mastery < 20) return 1;
  if (mastery < 40) return 2;
  if (mastery < 60) return 3;
  if (mastery < 80) return 4;
  return 5;
}

function avgMastery(
  q: CandidateQuestion,
  masteryByKnowledge?: Readonly<Record<string, number>>,
): number {
  if (!masteryByKnowledge || q.knowledgePointIds.length === 0) return MASTERY_UNKNOWN;
  let sum = 0;
  let n = 0;
  for (const kp of q.knowledgePointIds) {
    const m = masteryByKnowledge[kp];
    if (typeof m === 'number' && Number.isFinite(m)) {
      sum += m;
      n += 1;
    }
  }
  return n === 0 ? MASTERY_UNKNOWN : sum / n;
}

// 前置知识是否就绪：任一前置低于阈值即认为未准备好。无图谱数据时不惩罚。
function prereqReady(
  q: CandidateQuestion,
  prereqOf?: Readonly<Record<string, readonly string[]>>,
  masteryByKnowledge?: Readonly<Record<string, number>>,
): boolean {
  if (!prereqOf || !masteryByKnowledge) return true;
  for (const kp of q.knowledgePointIds) {
    for (const pre of prereqOf[kp] ?? []) {
      const m = masteryByKnowledge[pre];
      if (typeof m === 'number' && m < PREREQ_MASTERY_THRESHOLD) return false;
    }
  }
  return true;
}

// 单题优先级评分 0-1
export function scoreQuestion(q: CandidateQuestion, input: ComposeInput): number {
  const now = input.now ?? Date.now();
  const adaptive = input.rule.adaptive === true;

  const last = input.lastSeenByQuestion?.[q.questionId];
  const recency =
    last === undefined ? UNSEEN_RECENCY : clamp01((now - last) / (DAYS_NORMALIZE * DAY_MS));
  const wrong = clamp01((input.wrongCountByQuestion?.[q.questionId] ?? 0) / WRONG_NORMALIZE);

  if (!adaptive) {
    // 期中/期末/中考等：不按掌握度倾斜，只避开最近做过的题
    return 0.5 * recency + 0.5 * wrong;
  }

  const mastery = avgMastery(q, input.masteryByKnowledge);
  const need = 1 - clamp01(mastery / 100);
  const target = targetDifficulty(mastery);
  const fit = 1 - clamp01(Math.abs(q.difficulty - target) / 4);

  let score =
    ADAPTIVE_WEIGHTS.need * need +
    ADAPTIVE_WEIGHTS.wrong * wrong +
    ADAPTIVE_WEIGHTS.recency * recency +
    ADAPTIVE_WEIGHTS.difficultyFit * fit;

  if (!prereqReady(q, input.prereqOf, input.masteryByKnowledge)) {
    score *= 0.5; // 前置不会，先别做这道题
  }
  return score;
}

function inDifficultyRange(q: CandidateQuestion, rule: PaperRule): boolean {
  if (!rule.difficultyRange) return true;
  const [lo, hi] = rule.difficultyRange;
  return q.difficulty >= lo && q.difficulty <= hi;
}

// 选取器：跨多次调用保持状态，用 selectedIds 去重。
// ⚠️ 曾经的实现把「补足」写成对同一池子再挑一次，且没排除已选题 → 会产出重复题目。
//    现统一由本选取器维护已选集合，任何池子重复调用都不会重复出题。
class Picker {
  readonly selected: CandidateQuestion[] = [];

  private readonly ids = new Set<string>();

  private readonly used = new Map<string, number>();

  constructor(private readonly maxPerKnowledgePoint: number | undefined) {}

  // 取到 selected.length 达到 limit 为止；自动跳过已选题与超配额的知识点
  take(pool: readonly CandidateQuestion[], limit: number): void {
    // 提前取出：this.xxx 的收窄无法穿透箭头函数闭包，否则 TS2532
    const maxPer = this.maxPerKnowledgePoint;
    for (const q of pool) {
      if (this.selected.length >= limit) break;
      if (this.ids.has(q.questionId)) continue;
      if (maxPer !== undefined) {
        const over = q.knowledgePointIds.some((kp) => (this.used.get(kp) ?? 0) + 1 > maxPer);
        if (over) continue;
      }
      this.selected.push(q);
      this.ids.add(q.questionId);
      for (const kp of q.knowledgePointIds) {
        this.used.set(kp, (this.used.get(kp) ?? 0) + 1);
      }
    }
  }
}

// 组卷：返回选中的题目（不足时返回能凑到的全部，不用重复题凑数）
export function composePaper(input: ComposeInput): CandidateQuestion[] {
  const { rule } = input;
  const random = input.random ?? Math.random;
  const total = Math.max(1, Math.floor(rule.total));

  const pool = input.candidates.filter((q) => inDifficultyRange(q, rule));

  // 打分 + 微小随机扰动做同分打散（随机源可注入，保证可复现）
  const scored = pool
    .map((q) => ({ q, s: scoreQuestion(q, input) + random() * 0.001 }))
    .sort((a, b) => b.s - a.s);

  const wrongQuota = Math.min(total, Math.round(total * (rule.wrongRatio ?? 0)));
  const isWrong = (q: CandidateQuestion) => (input.wrongCountByQuestion?.[q.questionId] ?? 0) > 0;

  const wrongPool = scored.filter((x) => isWrong(x.q)).map((x) => x.q);
  const restPool = scored.filter((x) => !isWrong(x.q)).map((x) => x.q);

  const picker = new Picker(rule.maxPerKnowledgePoint);
  // wrongRatio >= 1（错题重测）：只出错题，错题不够就少出几道，不用普通题凑数。
  // 否则（如智能测试 0.3）：错题配额是「至少」，剩余名额用普通题补齐。
  const exclusiveWrong = (rule.wrongRatio ?? 0) >= 1;

  picker.take(wrongPool, Math.min(wrongQuota, total));
  if (!exclusiveWrong) {
    picker.take(restPool, total);
    picker.take(wrongPool, total);
  }

  return picker.selected.slice(0, total);
}
