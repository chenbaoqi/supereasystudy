// 游戏战绩服务（L2「我的战绩」）：给「只写不读」的 memory_game_records 一个出口。
//
// 背景：这张表从 Chapter 07 起每局都在写，但 `listByUser` **一直没有任何调用方**——
// 玩过的局像掉进黑洞。L2 补的就是这个出口。
//
// ⚠️ 云读取必须带超时：腾讯云在环境不可用时会长时间不返回也不报错，
//    裸 await 会把页面卡成空白（2026-09-13 事故，见 utils/withTimeout）。
import type { MemoryGameRecord } from '../core/memoryGame';
import { aggregateRecords, type GameRecordView } from '../core/gameRecord';
import { gameByRecordType } from '../config/games';
import type { MemoryGameRepository } from '../repositories/memoryGameRepository';
import { memoryGameRepository } from '../repositories/memoryGameRepository';
import { withTimeout } from '../utils/withTimeout';

const LOAD_TIMEOUT_MS = 6000;

export type GameRecordsSource = 'cloud' | 'empty' | 'error';

export interface GameRecordsResult {
  readonly view: GameRecordView;
  // 云读不到时页面要明说（UI v1.1 口径：不假装没数据）
  readonly source: GameRecordsSource;
  readonly empty: boolean;
}

export interface GameRecordServiceDeps {
  memoryGameRepository: MemoryGameRepository;
  now?: () => Date;
}

export interface GameRecordService {
  load(userId: string): Promise<GameRecordsResult>;
}

export function createGameRecordService(deps: GameRecordServiceDeps): GameRecordService {
  return {
    async load(userId) {
      const resolved = await withTimeout(
        deps.memoryGameRepository.listByUser(userId),
        LOAD_TIMEOUT_MS,
        '读取游戏战绩',
      );
      // withTimeout 超时/失败都返回 null——和「真的没有记录」区分开：
      // 前者要提示「暂时读不到」，后者才提示「还没玩过」。
      if (!resolved) {
        return {
          view: aggregateRecords([], {
            resolveGame: gameByRecordType,
            now: deps.now,
          }),
          source: 'error',
          empty: true,
        };
      }
      return {
        view: aggregateRecords(resolved as readonly MemoryGameRecord[], {
          resolveGame: gameByRecordType,
          now: deps.now,
        }),
        source: resolved.length === 0 ? 'empty' : 'cloud',
        empty: resolved.length === 0,
      };
    },
  };
}

export const gameRecordService = createGameRecordService({ memoryGameRepository });
