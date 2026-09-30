// 激励视频封装单测（ADR-015）。
// 广告是唯一「拿不到就必须放行」的外部依赖：拉不到、中途出错、回调丢失，
// 每一种失败都不能把用户锁在门外。这些分支在真机上很难复现，只能靠单测锁死。
import { describe, expect, it } from 'vitest';
import { createRewardedAdService } from '../miniprogram/services/rewardedAdService';
import type { RewardedAdLike } from '../miniprogram/services/rewardedAdService';

interface Harness {
  ad: RewardedAdLike;
  close(isEnded: boolean): void;
  fail(error: unknown): void;
  showCalls: number;
  loadCalls: number;
}

function harness(options: { showRejects?: number; loadRejects?: boolean } = {}): Harness {
  let onClose: ((res: { isEnded?: boolean } | undefined) => void) | null = null;
  let onError: ((error: unknown) => void) | null = null;
  const state = { showCalls: 0, loadCalls: 0 };

  const ad: RewardedAdLike = {
    async load() {
      state.loadCalls += 1;
      if (options.loadRejects) throw new Error('load failed');
    },
    async show() {
      state.showCalls += 1;
      if (state.showCalls <= (options.showRejects ?? 0)) throw new Error('not ready');
    },
    onClose(cb) {
      onClose = cb;
    },
    onError(cb) {
      onError = cb;
    },
  };

  return {
    ad,
    showCalls: state.showCalls,
    loadCalls: state.loadCalls,
    close(isEnded) {
      onClose?.({ isEnded });
    },
    fail(error) {
      onError?.(error);
    },
  };
}

describe('rewardedAdService', () => {
  it('没配广告位：available 为 false，watch 返回 no-ad（门禁据此放行）', async () => {
    const service = createRewardedAdService({ adUnitId: () => '' });
    expect(service.available()).toBe(false);
    await expect(service.watch()).resolves.toEqual({ ok: false, outcome: 'no-ad' });
  });

  it('广告位留了空格也视为未配置', () => {
    expect(createRewardedAdService({ adUnitId: () => '   ' }).available()).toBe(false);
  });

  it('配了广告位：available 为 true', () => {
    expect(createRewardedAdService({ adUnitId: () => 'adunit-1' }).available()).toBe(true);
  });

  it('完整看完 → rewarded', async () => {
    const h = harness();
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const pending = service.watch();
    h.close(true);
    await expect(pending).resolves.toEqual({ ok: true, outcome: 'rewarded' });
  });

  it('中途退出（isEnded=false）→ closed，不给奖励', async () => {
    const h = harness();
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const pending = service.watch();
    h.close(false);
    await expect(pending).resolves.toEqual({ ok: false, outcome: 'closed' });
  });

  it('isEnded 缺失（老客户端回调没带字段）→ 按没看完处理', async () => {
    const h = harness();
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const pending = service.watch();
    h.close(undefined as unknown as boolean);
    await expect(pending).resolves.toEqual({ ok: false, outcome: 'closed' });
  });

  it('播放报错 → error（调用方放行）', async () => {
    const h = harness();
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const pending = service.watch();
    h.fail(new Error('no fill'));
    await expect(pending).resolves.toEqual({ ok: false, outcome: 'error' });
  });

  it('首次 show 失败会先 load 再 show（微信要求素材就绪）', async () => {
    const h = harness({ showRejects: 1 });
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const pending = service.watch();
    // 等微任务队列里的 load→show 走完
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    h.close(true);
    await expect(pending).resolves.toEqual({ ok: true, outcome: 'rewarded' });
  });

  it('load 也失败 → error，不抛异常', async () => {
    const h = harness({ showRejects: 99, loadRejects: true });
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    await expect(service.watch()).resolves.toEqual({ ok: false, outcome: 'error' });
  });

  it('创建广告实例失败（环境不支持）→ no-ad', async () => {
    const service = createRewardedAdService({
      adUnitId: () => 'adunit-1',
      createAd: () => {
        throw new Error('createRewardedVideoAd undefined');
      },
    });
    await expect(service.watch()).resolves.toEqual({ ok: false, outcome: 'no-ad' });
  });

  it('连点两次：第二次直接拒绝，不叠加 Promise', async () => {
    const h = harness();
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const first = service.watch();
    await expect(service.watch()).resolves.toEqual({ ok: false, outcome: 'error' });
    h.close(true);
    await expect(first).resolves.toEqual({ ok: true, outcome: 'rewarded' });
  });

  it('看完一次后还能再看第二次（实例复用，不重复注册回调）', async () => {
    const h = harness();
    const service = createRewardedAdService({ adUnitId: () => 'adunit-1', createAd: () => h.ad });
    const first = service.watch();
    h.close(true);
    await expect(first).resolves.toEqual({ ok: true, outcome: 'rewarded' });

    const second = service.watch();
    h.close(true);
    await expect(second).resolves.toEqual({ ok: true, outcome: 'rewarded' });
  });
});
