// 游戏战绩聚合（L2）单元测试 —— 纯函数，时钟与记录全都是注入的，跨天也不会飘。
import { describe, expect, it } from 'vitest';
import type { MemoryGameRecord } from '../miniprogram/core/memoryGame';
import {
  aggregateRecords,
  durationTextOf,
  whenTextOf,
  type GameRecordAggregateDeps,
} from '../miniprogram/core/gameRecord';
import { GAMES, gameByRecordType } from '../miniprogram/config/games';
import { createGameRecordService } from '../miniprogram/services/gameRecordService';
import type { MemoryGameRepository } from '../miniprogram/repositories/memoryGameRepository';

// 固定「现在」为 2026-09-17 12:00，便于断言「今天 / 昨天 / N 天前」
const NOW = new Date(2026, 8, 17, 12, 0, 0);

const NAMES: Record<string, { name: string; icon: string }> = {
  match: { name: '消消乐', icon: '🧩' },
  speed: { name: '极速选择', icon: '⚡' },
  listen: { name: '听音找词', icon: '🎧' },
  shooter: { name: '小蜜蜂', icon: '🐝' },
  grammar: { name: '语法闯关', icon: '🔤' },
  island: { name: '口算冒险岛', icon: '🗺️' },
};

const deps: GameRecordAggregateDeps = {
  resolveGame: (type) => NAMES[type],
  now: () => NOW,
};

const record = (
  over: Partial<MemoryGameRecord> & Pick<MemoryGameRecord, '_id' | 'gameType'>,
): MemoryGameRecord => ({
  userId: 'u1',
  chapterId: 'ch1',
  knowledgeIds: ['k1'],
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  duration: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe('gameByRecordType（gameType → 游戏定义）', () => {
  it('消消乐的记录里写的是 match，能反查回来（这是唯一一处对齐）', () => {
    expect(gameByRecordType('match')?.name).toBe('消消乐');
    expect(gameByRecordType('speed')?.name).toBe('极速选择');
    expect(gameByRecordType('island')?.name).toBe('口算冒险岛');
  });

  it('清单里的每个游戏都能被记录类型反查到（新增游戏忘了对 recordType 会被抓出来）', () => {
    const types = ['match', 'speed', 'listen', 'shooter', 'grammar', 'island'];
    for (const t of types) expect(gameByRecordType(t as never)).toBeDefined();
    // 反过来说，清单里不该有多余项
    expect(GAMES.filter((g) => types.includes(g.recordType ?? g.id))).toHaveLength(types.length);
  });
});

describe('whenTextOf / durationTextOf（文案）', () => {
  it('同一天只显示时刻，隔天显示「昨天」，更早给天数或日期', () => {
    expect(whenTextOf(new Date(2026, 8, 17, 9, 5), NOW)).toBe('今天 09:05');
    expect(whenTextOf(new Date(2026, 8, 16, 20, 30), NOW)).toBe('昨天 20:30');
    expect(whenTextOf(new Date(2026, 8, 14, 8, 0), NOW)).toBe('3 天前');
    expect(whenTextOf(new Date(2026, 5, 1, 8, 0), NOW)).toBe('2026-06-01');
  });

  it('脏日期不返回 Invalid Date，返回空串', () => {
    expect(whenTextOf(new Date(' nonsense '), NOW)).toBe('');
  });

  it('用时文案：不足 1 分只给秒，整分不给「0 秒」', () => {
    expect(durationTextOf(45)).toBe('45 秒');
    expect(durationTextOf(60)).toBe('1 分');
    expect(durationTextOf(80)).toBe('1 分 20 秒');
    expect(durationTextOf(Number.NaN)).toBe('0 秒');
  });
});

describe('aggregateRecords（聚合）', () => {
  it('概览：局数 / 答对 / 答错 / 用时 / 最高分 / 正确率', () => {
    const view = aggregateRecords(
      [
        record({
          _id: 'r1',
          gameType: 'speed',
          score: 100,
          correctCount: 8,
          wrongCount: 2,
          duration: 30,
        }),
        record({
          _id: 'r2',
          gameType: 'speed',
          score: 60,
          correctCount: 5,
          wrongCount: 5,
          duration: 30,
        }),
      ],
      deps,
    );
    expect(view.stats.totalGames).toBe(2);
    expect(view.stats.totalCorrect).toBe(13);
    expect(view.stats.totalWrong).toBe(7);
    expect(view.stats.totalSeconds).toBe(60);
    expect(view.stats.bestScore).toBe(100);
    expect(view.stats.accuracy).toBe(65); // 13/20
  });

  it('分组：按局数降序，同局数比最高分；正确率按该游戏自己的对错算', () => {
    const view = aggregateRecords(
      [
        record({ _id: 'r1', gameType: 'speed', score: 10, correctCount: 9, wrongCount: 1 }),
        record({ _id: 'r2', gameType: 'speed', score: 20, correctCount: 1, wrongCount: 9 }),
        record({ _id: 'r3', gameType: 'match', score: 50, correctCount: 5, wrongCount: 0 }),
      ],
      deps,
    );
    expect(view.groups).toHaveLength(2);
    expect(view.groups[0]?.gameType).toBe('speed'); // 2 局 > 1 局
    expect(view.groups[0]?.bestScore).toBe(20);
    expect(view.groups[0]?.accuracy).toBe(50);
    expect(view.groups[1]?.gameType).toBe('match');
    expect(view.groups[1]?.accuracy).toBe(100);
  });

  it('最近战绩按时间倒序，且不超过 20 条', () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      record({
        _id: `r${i}`,
        gameType: 'match',
        createdAt: new Date(2026, 8, 17, 12, 0, i), // 秒数递增 → 越大的越新
      }),
    );
    const view = aggregateRecords(rows, deps);
    expect(view.rows).toHaveLength(20);
    expect(view.rows[0]?.id).toBe('r24');
  });

  it('脏值兜底：NaN / 负数 / 缺失都不出 NaN，也不让页面崩', () => {
    const view = aggregateRecords(
      [
        record({
          _id: 'r1',
          gameType: 'match',
          correctCount: Number.NaN,
          wrongCount: -3,
          duration: -1,
          score: Number.NaN,
        }),
        record({ _id: 'r2', gameType: 'match' }),
        null as unknown as MemoryGameRecord,
      ],
      deps,
    );
    expect(view.stats.totalGames).toBe(3); // 坏记录也是一局，不能凭空消失
    expect(Number.isFinite(view.stats.totalCorrect)).toBe(true);
    expect(view.stats.totalCorrect).toBe(0);
    expect(view.stats.totalSeconds).toBe(0);
    expect(view.stats.accuracy).toBe(0); // 0 题对错时按 0，不按 100
    expect(view.groups[0]?.plays).toBe(3);
  });

  it('认不出 gameType 也照样显示（叫「未知游戏」而不是整页崩）', () => {
    const view = aggregateRecords([record({ _id: 'r1', gameType: 'nope' as never })], {
      resolveGame: () => undefined,
      now: () => NOW,
    });
    expect(view.groups[0]?.name).toBe('未知游戏');
    expect(view.rows[0]?.icon).toBe('🎮');
  });

  it('空列表：概览全 0，分组与列表都空', () => {
    const view = aggregateRecords([], deps);
    expect(view.stats).toEqual({
      totalGames: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalSeconds: 0,
      bestScore: 0,
      accuracy: 0,
    });
    expect(view.groups).toEqual([]);
    expect(view.rows).toEqual([]);
  });
});

describe('gameRecordService.load', () => {
  const repo = (records: MemoryGameRecord[]): MemoryGameRepository => ({
    async save(input) {
      return { _id: 'x', ...input, createdAt: new Date(), updatedAt: new Date() };
    },
    async listByUser() {
      return records;
    },
  });

  it('有记录 → source=cloud，且真的把聚合结果带出来', async () => {
    const service = createGameRecordService({
      memoryGameRepository: repo([record({ _id: 'r1', gameType: 'match', score: 10 })]),
      now: () => NOW,
    });
    const res = await service.load('u1');
    expect(res.source).toBe('cloud');
    expect(res.empty).toBe(false);
    expect(res.view.stats.totalGames).toBe(1);
  });

  it('没记录 → source=empty（页面提示「还没玩过」，而不是「加载失败」）', async () => {
    const service = createGameRecordService({ memoryGameRepository: repo([]), now: () => NOW });
    const res = await service.load('u1');
    expect(res.source).toBe('empty');
    expect(res.empty).toBe(true);
  });

  it('云读不到（仓储抛错）→ 包成 error 而不是抛上去，页面给「暂时读不到」', async () => {
    const service = createGameRecordService({
      memoryGameRepository: {
        async save() {
          throw new Error('unused');
        },
        async listByUser() {
          throw new Error('boom');
        },
      },
      now: () => NOW,
    });
    const res = await service.load('u1');
    expect(res.source).toBe('error');
    expect(res.view.stats.totalGames).toBe(0);
  });
});
