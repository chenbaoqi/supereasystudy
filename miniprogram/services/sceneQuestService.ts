// 情景应用闯关的结算服务（数学 + 英语共用）。
//
// 与冒险岛一样「成长感在自己这闭环」：结算后不跳统一结果页，本页弹层。
// 但它**走全站钱包的统一门面**（gameRewardService），不像冒险岛那样自己算星币——
// 因为情景闯关的奖励就是「答对几题」，跟其它 5 个小游戏同一条换算规则。
//
// ⚠️ 战绩写入是「发后不理」：它是锦上添花的统计，绝不能因为云慢或失败
//    让孩子卡在结算页（教训见 utils/withTimeout）。
import type { MemoryGameRepository } from '../repositories/memoryGameRepository';
import { memoryGameRepository } from '../repositories/memoryGameRepository';
import type { RunRewarder, WalletGainView } from './gameRewardService';
import { gameRewardService, walletViewOf } from './gameRewardService';
import type { SceneQuest, SceneRunState, SceneSummary } from '../core/scene';
import { sceneSummaryOf } from '../core/scene';

export interface SceneCommitInput {
  readonly userId: string;
  readonly quest: SceneQuest;
  readonly run: SceneRunState;
  readonly durationMs: number;
}

export interface SceneCommitResult {
  readonly summary: SceneSummary;
  readonly wallet?: WalletGainView;
}

export interface SceneQuestServiceDeps {
  readonly rewarder: RunRewarder;
  readonly records: MemoryGameRepository;
}

export interface SceneQuestService {
  commitRun(input: SceneCommitInput): Promise<SceneCommitResult>;
}

// 一题 10 分：与消消乐/极速选择不是一个量纲，但战绩页只看「本局答对率」和局数，
// score 只是留档，不参与排名展示。
const SCORE_PER_CORRECT = 10;

export function createSceneQuestService(deps: SceneQuestServiceDeps): SceneQuestService {
  return {
    async commitRun(input) {
      const summary = sceneSummaryOf(input.quest, input.run);
      const wallet = walletViewOf(
        await deps.rewarder.reward({
          userId: input.userId,
          gameId: 'scene',
          correct: summary.correct,
          total: summary.total,
        }),
      );
      // 发后不理：写失败只记日志，不影响结算页（云挂了也要让孩子看到「你答对了几题」）
      void deps.records
        .save({
          userId: input.userId,
          // 情景题不挂知识点（见规格 §7-3：现在不进错题本、也不进 knowledge），
          // 所以 chapterId / knowledgeIds 都是空的——战绩页按 gameType 归类展示即可。
          chapterId: '',
          knowledgeIds: [],
          score: summary.correct * SCORE_PER_CORRECT,
          correctCount: summary.correct,
          wrongCount: Math.max(0, summary.total - summary.correct),
          duration: Math.max(1, Math.round(input.durationMs / 1000)),
          gameType: 'scene',
        })
        .catch((error: unknown) => console.error('情景闯关战绩写入失败', error));
      return { summary, wallet };
    },
  };
}

export const sceneQuestService: SceneQuestService = createSceneQuestService({
  rewarder: gameRewardService,
  records: memoryGameRepository,
});
