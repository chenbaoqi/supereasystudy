// 情景闯关的结算服务。
//
// 只测服务自己该负责的三件事：
//   1. 真的把本局成绩交给全站钱包门面（gameId 必须是 'scene'，否则战绩页对不上名）；
//   2. 真的写一条 memory_game_records（这是「战绩黑洞」的出口，不能漏）；
//   3. **战绩写失败不能拖垮结算页**——孩子该看到的正反馈不能被基础设施吃掉。
import { describe, expect, it } from 'vitest';
import { createSceneQuestService } from '../miniprogram/services/sceneQuestService';
import {
  GAIN_SEP,
  type RunRewardInput,
  type RunRewardResult,
  type RunRewarder,
} from '../miniprogram/services/gameRewardService';
import type {
  MemoryGameRecordCreate,
  MemoryGameRepository,
} from '../miniprogram/repositories/memoryGameRepository';
import type { MemoryGameRecord } from '../miniprogram/core/memoryGame';
import { createSceneRun, submitSceneAnswer, type SceneQuest } from '../miniprogram/core/scene';

function makeQuest(): SceneQuest {
  return {
    id: 'q1',
    name: '测试组',
    story: '故事',
    grade: 1,
    questions: Array.from({ length: 4 }, (_, i) => ({
      stem: `第 ${i + 1} 问`,
      options: ['A', 'B', 'C', 'D'],
      answerIndex: 1,
      hint: 'h',
      explain: 'e',
    })),
  };
}

interface Stub {
  service: ReturnType<typeof createSceneQuestService>;
  rewards: RunRewardInput[];
  saves: MemoryGameRecordCreate[];
}

function makeStub(
  options: { rewardResult?: RunRewardResult | null; saveFails?: boolean } = {},
): Stub {
  const rewards: RunRewardInput[] = [];
  const saves: MemoryGameRecordCreate[] = [];
  const rewarder: RunRewarder = {
    async reward(input) {
      rewards.push(input);
      return options.rewardResult === undefined
        ? { stars: 9, coins: 15, newBadges: [], gainText: `⭐+9${GAIN_SEP}🪙+15`, badgeText: '' }
        : options.rewardResult;
    },
  };
  const records: MemoryGameRepository = {
    async save(input) {
      saves.push(input);
      if (options.saveFails) throw new Error('云挂了');
      return {
        _id: 'r1',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MemoryGameRecord;
    },
    async listByUser() {
      return [];
    },
  };
  return { service: createSceneQuestService({ rewarder, records }), rewards, saves };
}

// 全对一局
function finishedRun(quest: SceneQuest) {
  let run = createSceneRun(quest);
  for (let i = 0; i < quest.questions.length; i += 1) run = submitSceneAnswer(quest, run, 1).run;
  return run;
}

describe('sceneQuestService.commitRun', () => {
  it('把本局成绩交给钱包门面，gameId 是 scene', async () => {
    const quest = makeQuest();
    const stub = makeStub();
    await stub.service.commitRun({
      userId: 'u1',
      quest,
      run: finishedRun(quest),
      durationMs: 9000,
    });
    expect(stub.rewards).toEqual([{ userId: 'u1', gameId: 'scene', correct: 4, total: 4 }]);
  });

  it('写一条 scene 战绩，时长至少 1 秒', async () => {
    const quest = makeQuest();
    const stub = makeStub();
    await stub.service.commitRun({
      userId: 'u1',
      quest,
      run: finishedRun(quest),
      durationMs: 9000,
    });
    expect(stub.saves).toHaveLength(1);
    const saved = stub.saves[0];
    expect(saved?.gameType).toBe('scene');
    expect(saved?.correctCount).toBe(4);
    expect(saved?.wrongCount).toBe(0);
    expect(saved?.duration).toBe(9);
    // 不挂知识点：情景题现在不进错题本、也不进 knowledge（规格 §7-3）
    expect(saved?.knowledgeIds).toEqual([]);
  });

  it('战绩写失败也要正常返回（不许拖垮结算页）', async () => {
    const quest = makeQuest();
    const stub = makeStub({ saveFails: true });
    const res = await stub.service.commitRun({
      userId: 'u1',
      quest,
      run: finishedRun(quest),
      durationMs: 1000,
    });
    expect(res.summary.correct).toBe(4);
    expect(res.wallet?.gain).toBeTruthy();
  });

  it('钱包读不到时 wallet 为 undefined，但成绩照常给', async () => {
    const quest = makeQuest();
    const stub = makeStub({ rewardResult: null });
    const res = await stub.service.commitRun({
      userId: 'u1',
      quest,
      run: finishedRun(quest),
      durationMs: 1000,
    });
    expect(res.wallet).toBeUndefined();
    expect(res.summary).toEqual({ total: 4, correct: 4, accuracy: 100, passed: true });
  });
});
