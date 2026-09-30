// 游戏结算 → 全站钱包入账的门面（L1）。
//
// 这里只测**门面自己**该负责的两件事：
//   1. 把「答对/总题」换算成星币，并真的调 profile.reward 落档；
//   2. 钱包不可用时不能把结算页拖崩（返回 null 之外的情况都要带上本局所得）。
// 换算规则本身在 growth.test.ts 的 rewardOfRun 里测。
import { describe, expect, it } from 'vitest';
import { initialProfile, type BadgeDef, type GameProfile } from '../miniprogram/core/growth';
import { createGameRewardService, walletViewOf } from '../miniprogram/services/gameRewardService';
import type { GameProfileService } from '../miniprogram/services/gameProfileService';

const BADGE: BadgeDef = {
  id: 'b1',
  icon: '🌱',
  name: '初次出发',
  desc: '通关任意 1 个关卡',
  kind: 'clearedCount',
  value: 1,
};

interface Stub {
  service: ReturnType<typeof createGameRewardService>;
  calls: Array<{ stars: number; coins: number; correct: number; gameId?: string }>;
  synced: Array<{ source: string; correctIds: readonly string[]; wrongIds: readonly string[] }>;
}

function makeStub(
  options: { fail?: boolean; badges?: BadgeDef[]; loadMs?: number; waitMs?: number } = {},
): Stub {
  const calls: Stub['calls'] = [];
  const profile: GameProfileService = {
    async load() {
      if (options.fail) throw new Error('云不可用');
      if (options.loadMs != null) {
        await new Promise((resolve) => setTimeout(resolve, options.loadMs));
      }
      return { profile: initialProfile(), source: 'mirror' };
    },
    save(_userId: string, p: GameProfile) {
      return { ...p, rev: p.rev + 1 };
    },
    growthView: () => {
      throw new Error('门面不该调 growthView');
    },
    checkIn: () => {
      throw new Error('门面不该调 checkIn');
    },
    openChest: () => {
      throw new Error('门面不该调 openChest');
    },
    reward(input) {
      calls.push({
        stars: input.stars,
        coins: input.coins,
        correct: input.correct ?? 0,
        gameId: input.gameId,
      });
      return { profile: initialProfile(), newBadges: options.badges ?? [] };
    },
    mergeIsland: (input) => input.profile,
    async awardLearning() {
      throw new Error('门面不该调 awardLearning');
    },
  };
  const synced: Array<{
    source: string;
    correctIds: readonly string[];
    wrongIds: readonly string[];
  }> = [];
  return {
    service: createGameRewardService({
      profile,
      waitMs: options.waitMs,
      // L3 回流替身：只记「有没有被喂进来」，不碰云
      syncer: {
        async sync(input) {
          synced.push({
            source: input.source,
            correctIds: input.correctIds,
            wrongIds: input.wrongIds,
          });
        },
      },
    }),
    calls,
    synced,
  };
}

describe('gameRewardService.reward', () => {
  it('把本局换算结果送进钱包，带上 gameId 与答对数', async () => {
    const { service, calls } = makeStub();
    const res = await service.reward({
      userId: 'u1',
      gameId: 'speed',
      correct: 10,
      total: 10,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.gameId).toBe('speed');
    expect(calls[0]?.correct).toBe(10);
    expect(calls[0]?.stars).toBeGreaterThan(10); // 每题 1 星 + 全对奖励
    expect(res?.gainText).toContain('⭐+');
  });

  it('解锁徽章时给出徽章文案（结果页要能看到「长大了什么」）', async () => {
    const { service } = makeStub({ badges: [BADGE] });
    const res = await service.reward({ userId: 'u1', gameId: 'memory', correct: 4, total: 4 });
    expect(res?.newBadges.map((b) => b.id)).toEqual(['b1']);
    expect(res?.badgeText).toContain('🌱初次出发');
  });

  it('钱包不可用 → 不抛错，仍返回本局所得（结算页不因基础设施问题少给正反馈）', async () => {
    const { service } = makeStub({ fail: true });
    const res = await service.reward({ userId: 'u1', gameId: 'listen', correct: 6, total: 8 });
    expect(res?.stars).toBeGreaterThan(0);
    expect(res?.gainText).toContain('⭐+');
    expect(res?.newBadges).toHaveLength(0);
  });

  it('云太慢 → 只等 2s 就放行（结果页不陪着转圈），本局所得照给', async () => {
    const { service } = makeStub({ loadMs: 60, waitMs: 10 });
    const started = Date.now();
    const res = await service.reward({ userId: 'u1', gameId: 'shooter', correct: 5, total: 10 });
    expect(Date.now() - started).toBeLessThan(50);
    expect(res?.stars).toBeGreaterThan(0);
    expect(res?.gainText).toContain('⭐+');
  });
});

describe('walletViewOf（结果页视图）', () => {
  it('有收获 → 给出 gain；一题没对（文案空）→ undefined，页面整块隐藏', () => {
    expect(
      walletViewOf({
        stars: 3,
        coins: 3,
        newBadges: [],
        gainText: '⭐+3　🪙+3',
        badgeText: '',
      }),
    ).toEqual({ gain: '⭐+3　🪙+3', badges: '' });
    expect(
      walletViewOf({ stars: 0, coins: 0, newBadges: [], gainText: '', badgeText: '' }),
    ).toBeUndefined();
    expect(walletViewOf(null)).toBeUndefined();
  });

  // L3：带 attempts 才回流。情景闯关与冒险岛不传 attempts（前者 Owner 拍板不进错题本，
  // 后者题目没有知识点可挂），所以这条同时是「哪些游戏不该回流」的守卫。
  it('带 attempts 时把逐题对错喂给回流器', async () => {
    const { service, synced } = makeStub();
    await service.reward({
      userId: 'u1',
      gameId: 'speed',
      correct: 2,
      total: 3,
      attempts: { correctIds: ['k1', 'k2'], wrongIds: ['k3'] },
    });
    // 回流是发后不理，这里等一拍让它落地
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(synced).toEqual([{ source: 'speed', correctIds: ['k1', 'k2'], wrongIds: ['k3'] }]);
  });

  it('没带 attempts 就不回流（情景闯关 / 冒险岛走这条路）', async () => {
    const { service, synced } = makeStub();
    await service.reward({ userId: 'u1', gameId: 'scene', correct: 3, total: 4 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(synced).toEqual([]);
  });

  it('只有徽章、没有星币时也要显示（别把徽章消息吞掉）', () => {
    expect(
      walletViewOf({
        stars: 0,
        coins: 0,
        newBadges: [BADGE],
        gainText: '',
        badgeText: '🎉 解锁徽章',
      }),
    ).toEqual({ gain: '', badges: '🎉 解锁徽章' });
  });
});
