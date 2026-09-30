// 勋章墙（2026-09-20）：把孩子攒下的徽章摆出来让他看见。
//
// 为什么需要这一页：徽章系统（L1）早就做好了——结算时会弹「🎉 解锁徽章」，
// 但那一下过去就没了，**没有一个地方能回头看自己攒了什么**。
// 对小孩子来说「看见自己收集了什么」本身就是继续用的动力（参考同类产品的勋章墙），
// 攒了一盒贴纸却没地方贴，等于白攒。
//
// 数据全部现成：config/growth.ts 定义徽章，gameProfileService.growthView 给出
// 每一枚的 owned 状态。本页只做「读出来 → 摆出来」。
import type { GameBadgeView } from '../../services/gameProfileService';
import { gameProfileService } from '../../services/gameProfileService';
import { userService } from '../../services/userService';
import { withTimeout } from '../../utils/withTimeout';

// 读档最多等这么久：超时按「读不到」处理并显示可重试的空态，绝不转圈
const LOAD_WAIT_MS = 6000;

Page({
  data: {
    loading: true,
    loadFailed: false,
    // 三态必须分开：加载失败 / 一条都没有 / 有数据
    source: 'loading' as 'loading' | 'error' | 'ready',
    badges: [] as GameBadgeView[],
    ownedCount: 0,
    totalCount: 0,
  },

  alive: true,

  onLoad() {
    this.alive = true;
    void this.load();
  },

  onUnload() {
    this.alive = false;
  },

  onShow() {
    // 玩完一局回来可能有新解锁的勋章，重新读一次
    if (!this.data.loading) void this.load();
  },

  async load() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ loading: true, loadFailed: false });
    const res = await withTimeout(gameProfileService.load(user._id), LOAD_WAIT_MS, '勋章读取');
    if (!this.alive) return;
    if (res === null) {
      this.setData({ loading: false, loadFailed: true, source: 'error' });
      return;
    }
    const view = gameProfileService.growthView(res.profile);
    this.setData({
      loading: false,
      source: 'ready',
      badges: view.badges,
      ownedCount: view.badges.filter((item) => item.owned).length,
      totalCount: view.badges.length,
    });
  },

  onRetry() {
    void this.load();
  },
});
