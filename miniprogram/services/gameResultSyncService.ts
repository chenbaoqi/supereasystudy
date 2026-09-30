// 游戏 / 测试结果回流（L3）：把「玩过 / 考过」变成错题本与掌握度里的数据。
//
// 为什么单独一个服务：L1 打通了钱包（星币/等级），L2 打通了战绩（局数/正确率），
// 但**游戏和学习一直是两张皮** —— 游戏里答错了，错题本不知道，掌握度也不动。
// 这一层就是那根管道。
//
// 三条硬约束：
//   1. **失败一律静默**（try/catch + withTimeout）：回流是锦上添花，
//      绝不能因为它读不到云就让结算页崩掉或转圈（与 gameRewardService 同一条规矩）。
//   2. **错题按知识点聚合**，不是按题：游戏题是从 knowledge.quiz 动态展开的，
//      没有独立题目 id（冒险岛连 knowledgeId 都没有）。硬造一个题目 id 只会得到
//      「同一道题错了两次算两条」的假数据。所以 questionId 就取 knowledgeId，
//      语义是「这个知识点我没答对」，正好落在需求第三十六章的口径上。
//   3. **答对也要更新掌握度**：只有错题没有掌握度，等于只记了坏的没记好的，
//      掌握度会一路走低。答对记 firstTryCorrect=true，答错记 false。
//
// ⚠️ 补弱流程（诊断→提示→重做→讲解→查前置→同类题→变式→延迟重测）由错题本页推进，
//    这里只负责「记一笔」，不擅自把 stage 往前推。
import type { WrongQuestion } from '../core/wrongQuestion';
import { bumpWrong } from './wrongQuestionService';
import type { MasteryService } from './masteryService';
import { masteryService } from './masteryService';
import type { WrongQuestionRepository } from '../repositories/wrongQuestionRepository';
import { wrongQuestionRepository } from '../repositories/wrongQuestionRepository';
import { withTimeout } from '../utils/withTimeout';

// 回流最多等这么久。超时后后台那条链会自己跑完，这里只是不再等。
const SYNC_WAIT_MS = 2000;

export interface AttemptSyncInput {
  readonly userId: string;
  /** 来源（gameId 或 'test'）：只用于日志排查，不进业务字段 */
  readonly source: string;
  /** 答对的知识点 id */
  readonly correctIds: readonly string[];
  /** 答错 + 超时的知识点 id（与各游戏 finishGame 的 wrongIds 同口径） */
  readonly wrongIds: readonly string[];
  /**
   * 用过提示（或第一次没做对、给了第二次机会）的知识点 id。
   * 这些点即使最终做对，掌握度也不该按满分算——「看提示才做出来」和「一遍就对」不是一回事。
   * 可选：不传就是老口径（只看最终对错）。
   */
  readonly hintIds?: readonly string[];
}

export interface AttemptSyncer {
  sync(input: AttemptSyncInput): Promise<void>;
}

export interface GameResultSyncDeps {
  mastery: MasteryService;
  wrongRepo: WrongQuestionRepository;
  waitMs?: number;
}

export function createGameResultSync(deps: GameResultSyncDeps): AttemptSyncer {
  const waitMs = deps.waitMs ?? SYNC_WAIT_MS;

  return {
    async sync(input) {
      const now = Date.now();
      const ids = [...new Set([...input.correctIds, ...input.wrongIds])].filter((id) => id !== '');
      if (ids.length === 0) return;
      const wrongSet = new Set(input.wrongIds);
      const hintSet = new Set(input.hintIds ?? []);

      await withTimeout(
        (async () => {
          for (const knowledgeId of ids) {
            const correct = !wrongSet.has(knowledgeId);
            // 1) 掌握度：答对答错都记（只记错的那掌握度会一路走低）
            await deps.mastery.recordAttempt(input.userId, knowledgeId, {
              firstTryCorrect: correct,
              hintUsed: hintSet.has(knowledgeId),
            });
            if (correct) continue;
            // 2) 答错 → 错题本（已有记录则累加次数，不新增一条）
            await upsertWrong(deps.wrongRepo, input.userId, knowledgeId, now);
          }
        })(),
        waitMs,
        `结果回流（${input.source}）`,
      );
    },
  };
}

// 错题 upsert：同一知识点只留一条，重复错累加 wrongCount（bumpWrong 是纯函数，可单测）。
// 已修复后又错 → bumpWrong 会把它打回「已讲解」并清掉修复标记（这正是「不是收藏夹」的意思）。
async function upsertWrong(
  repo: WrongQuestionRepository,
  userId: string,
  knowledgeId: string,
  now: number,
): Promise<void> {
  const existing = await repo.getByUserAndQuestion(userId, knowledgeId);
  // _id 为空是异常数据（理论上不会有），跳过 update 而不是拿空串去 update ——
  // 那会报「doc id 无效」，把一次可容忍的失败变成日志里看不懂的错
  if (existing && existing._id) {
    await repo.update(existing._id, bumpWrong(existing, now));
    return;
  }
  const record: Omit<WrongQuestion, '_id' | 'createdAt' | 'updatedAt'> = {
    userId,
    questionId: knowledgeId,
    knowledgePointIds: [knowledgeId],
    // 游戏里没有「学生写了什么」这回事（配对 / 选择 / 输入的是数字），
    // 留空串而不是瞎填 —— 错题本页按「知识点错了」展示，不需要这两列。
    studentAnswer: '',
    correctAnswerText: '',
    // 游戏场景诊断不出具体错因（没有步骤、没有单位线索），用概念兜底
    errorTypes: ['concept'],
    wrongCount: 1,
    hintUsedCount: 0,
    firstWrongAt: now,
    lastWrongAt: now,
    stage: 'new',
    fixed: false,
  };
  await repo.add(record);
}

export const gameResultSync: AttemptSyncer = createGameResultSync({
  mastery: masteryService,
  wrongRepo: wrongQuestionRepository,
});
