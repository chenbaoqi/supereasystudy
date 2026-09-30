// 激励视频封装（ADR-015）。
//
// 三条硬规则：
//   1. **不出错就是唯一目标**：广告拉不到、创建失败、播放中途出错，都不许抛异常，
//      只回一个 outcome 让调用方决定。页面永远不会被广告拖崩。
//   2. **只有 isEnded === true 才算看完**。中途退出不给解锁，否则等于「点一下就白嫖」。
//   3. **广告不可用 ≠ 用户不能用**：no-ad / error 由调用方按「放行」处理（见 config/ads.ts 说明）。
//
// 为什么把 wx 的调用收口在这里：别处要用广告只需要 `watch()` 一个 Promise，
// 不用各自处理 onClose/onError/load 重试这些容易漏的生命周期。
import { rewardedAdUnitId } from '../config/ads';

export type AdWatchOutcome =
  | 'rewarded' // 完整看完，可以发奖励
  | 'no-ad' // 没配广告位 / 环境不支持 → 调用方放行
  | 'closed' // 中途退出 → 不给奖励
  | 'error'; // 加载/播放失败 → 调用方放行

export interface AdWatchResult {
  readonly ok: boolean;
  readonly outcome: AdWatchOutcome;
}

// 只声明我们真正用到的那部分 wx 能力，便于单测注入假实现
export interface RewardedAdLike {
  load(): Promise<void>;
  show(): Promise<void>;
  onClose(callback: (res: { isEnded?: boolean } | undefined) => void): void;
  onError(callback: (error: unknown) => void): void;
}

export interface RewardedAdDeps {
  readonly createAd?: (adUnitId: string) => RewardedAdLike;
  readonly adUnitId?: () => string;
  // 兜底超时（毫秒）：close 回调万一不来，也不能把按钮永久锁在「解锁中」
  readonly timeoutMs?: number;
}

export interface RewardedAdService {
  // 是否配置了广告位（没配 → 门禁必须放行，不展示「观看视频」按钮）
  available(): boolean;
  watch(): Promise<AdWatchResult>;
}

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;

function defaultCreateAd(adUnitId: string): RewardedAdLike {
  const factory = (
    wx as unknown as {
      createRewardedVideoAd?: (options: { adUnitId: string }) => RewardedAdLike;
    }
  ).createRewardedVideoAd;
  if (!factory) throw new Error('当前环境不支持激励视频');
  return factory.call(wx, { adUnitId });
}

export function createRewardedAdService(deps: RewardedAdDeps = {}): RewardedAdService {
  const readUnitId = deps.adUnitId ?? rewardedAdUnitId;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // 统一在这里 trim：注入的 adUnitId 可能带空格（'   ' 必须等于没配，
  // 否则 available() 说有、创建时又拿到空串，门禁会两边不一致）
  const unitId = () => readUnitId().trim();

  let ad: RewardedAdLike | null = null;
  let settleAd: ((result: AdWatchResult) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function settle(result: AdWatchResult): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const resolve = settleAd;
    settleAd = null;
    resolve?.(result);
  }

  // 懒创建：登录前/未用到广告时不初始化；onClose/onError 只注册一次，避免重复叠加回调
  function ensureAd(): RewardedAdLike | null {
    const adUnitId = unitId();
    if (!adUnitId) return null;
    if (ad) return ad;
    try {
      ad = (deps.createAd ?? defaultCreateAd)(adUnitId);
    } catch (error) {
      console.warn('激励视频创建失败（按不可用处理）', error);
      return null;
    }
    ad.onClose((res) => {
      settle(
        res?.isEnded === true
          ? { ok: true, outcome: 'rewarded' }
          : { ok: false, outcome: 'closed' },
      );
    });
    ad.onError((error) => {
      console.warn('激励视频播放失败（按不可用处理）', error);
      settle({ ok: false, outcome: 'error' });
    });
    return ad;
  }

  return {
    available() {
      return unitId().length > 0;
    },

    async watch() {
      // 上一次还没结束（手快连点）→ 直接拒绝，不叠加 Promise
      if (settleAd) return { ok: false, outcome: 'error' };
      const instance = ensureAd();
      if (!instance) return { ok: false, outcome: 'no-ad' };

      return new Promise<AdWatchResult>((resolve) => {
        settleAd = resolve;
        timer = setTimeout(() => settle({ ok: false, outcome: 'error' }), timeoutMs);

        instance.show().catch(() => {
          // 首次 show 常因素材未就绪失败：微信要求先 load 再 show
          instance
            .load()
            .then(() => instance.show())
            .catch((error: unknown) => {
              console.warn('激励视频展示失败（按不可用处理）', error);
              settle({ ok: false, outcome: 'error' });
            });
        });
      });
    },
  };
}

export const rewardedAdService: RewardedAdService = createRewardedAdService();
