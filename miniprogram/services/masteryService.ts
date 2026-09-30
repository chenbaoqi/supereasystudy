// 掌握度服务（需求第三十四章）：把 core/mastery.ts 的纯算法接到 user_mastery 集合。
import { computeMastery } from '../core/mastery';
import type { UserMastery } from '../core/masteryRecord';
import { userMasteryRepository } from '../repositories/userMasteryRepository';
import type { UserMasteryRepository } from '../repositories/userMasteryRepository';

const DAY_MS = 24 * 60 * 60 * 1000;
// 近期表现的指数移动平均系数：越靠近 1 越看重历史，越小越看重最近
const RECENT_EMA = 0.7;
const HINT_EMA = 0.7;

export interface AttemptInput {
  readonly firstTryCorrect: boolean; // 本次首次作答是否正确
  readonly hintUsed?: boolean; // 本次是否用了提示
  readonly wrongFixedRate?: number; // 错题修复率 0-1（由错题引擎提供）
}

export interface MasteryService {
  listByUser(userId: string): Promise<UserMastery[]>;
  // 读取掌握度（含遗忘衰减）；未学过返回 0
  getScore(userId: string, knowledgeId: string, now?: number): Promise<number>;
  // 供组卷/推荐使用的「知识点 → 掌握度」映射
  masteryMap(userId: string, now?: number): Promise<Record<string, number>>;
  // 记录一次作答并更新掌握度
  recordAttempt(
    userId: string,
    knowledgeId: string,
    input: AttemptInput,
    now?: number,
  ): Promise<UserMastery>;
}

function ema(oldValue: number, sample: number, alpha: number): number {
  return alpha * oldValue + (1 - alpha) * sample;
}

// 按「距上次练习天数」重算掌握度（遗忘衰减）。
// 为什么读取时才衰减：入库时学生刚练过（间隔 0），衰减恒为 1；
// 只有隔一段时间再读，衰减才有意义——这正是「学过即掌握」假象的破解点。
export function scoreWithDecay(record: UserMastery, now: number): number {
  const last = record.lastPracticedAt;
  const days = last === undefined ? 0 : Math.max(0, (now - last) / DAY_MS);
  return computeMastery({
    practiceCount: record.practiceCount,
    firstTryCorrectRate: record.firstTryCorrectRate,
    recentCorrectRate: record.recentCorrectRate,
    hintUsedRate: record.hintUsedRate ?? 0,
    wrongFixedRate: record.wrongFixedRate ?? 0,
    daysSinceLastPractice: days,
  });
}

export function createMasteryService(deps: {
  userMasteryRepository: UserMasteryRepository;
}): MasteryService {
  const repo = deps.userMasteryRepository;

  return {
    async listByUser(userId) {
      return repo.listByUser(userId);
    },

    async getScore(userId, knowledgeId, now = Date.now()) {
      const record = await repo.getByUserAndKnowledge(userId, knowledgeId);
      if (!record) return 0;
      return scoreWithDecay(record, now);
    },

    async masteryMap(userId, now = Date.now()) {
      const list = await repo.listByUser(userId);
      const map: Record<string, number> = {};
      for (const r of list) {
        map[r.knowledgeId] = scoreWithDecay(r, now);
      }
      return map;
    },

    async recordAttempt(userId, knowledgeId, input, now = Date.now()) {
      const existing = await repo.getByUserAndKnowledge(userId, knowledgeId);
      const count = (existing?.practiceCount ?? 0) + 1;
      const sample = input.firstTryCorrect ? 1 : 0;

      // 首次正确率：累计平均（每一次练习的「首次作答」各占一份权重）
      const firstTryCorrectRate =
        ((existing?.firstTryCorrectRate ?? 0) * (count - 1) + sample) / count;
      // 近期表现 / 提示使用率：指数移动平均，更看重近期
      const recentCorrectRate = existing
        ? ema(existing.recentCorrectRate, sample, RECENT_EMA)
        : sample;
      const hintUsedRate = existing
        ? ema(existing.hintUsedRate ?? 0, input.hintUsed ? 1 : 0, HINT_EMA)
        : input.hintUsed
          ? 1
          : 0;
      const wrongFixedRate = input.wrongFixedRate ?? existing?.wrongFixedRate ?? 0;

      const data = {
        masteryScore: computeMastery({
          practiceCount: count,
          firstTryCorrectRate,
          recentCorrectRate,
          hintUsedRate,
          wrongFixedRate,
          daysSinceLastPractice: 0, // 刚练过，不衰减
        }),
        practiceCount: count,
        firstTryCorrectRate,
        recentCorrectRate,
        hintUsedRate,
        wrongFixedRate,
        lastPracticedAt: now,
      };

      await repo.upsert(userId, knowledgeId, data);
      const saved = await repo.getByUserAndKnowledge(userId, knowledgeId);
      return (
        saved ?? {
          _id: '',
          createdAt: new Date(now),
          updatedAt: new Date(now),
          userId,
          knowledgeId,
          ...data,
        }
      );
    },
  };
}

export const masteryService: MasteryService = createMasteryService({ userMasteryRepository });
