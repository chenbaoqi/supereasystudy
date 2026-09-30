// 变现门禁组件（ADR-015）：放行就渲染 slot 里的真实内容，拦住就渲染解锁卡。
//
// 用法：
//   <entitlement-gate feature="test-result" scope="{{scope}}">
//     ...被门禁保护的内容...
//   </entitlement-gate>
//
// 两条必须守住的降级：
//   1. 权益读不到 / 未登录 / feature 名写错 → 一律放行（可用性 > 转化率）。
//   2. 广告位没配、加载失败、看完回调丢失 → 放行并提示，绝不把用户卡在门外。
//
// 组件内**不能**用 app.wxss 的 u- 类（微信全局样式对自定义组件无效），
// 所以按钮样式在本组件 wxss 里自己写一份，色值仍走 tokens 的 var()。
import type { EntitlementDecision } from '../../core/entitlement';
import { featureOf } from '../../config/entitlements';
import { entitlementService } from '../../services/entitlementService';
import { rewardedAdService } from '../../services/rewardedAdService';
import { userService } from '../../services/userService';
import { resolveGate, type GateState } from '../../utils/entitlementGate';

Component({
  properties: {
    feature: { type: String, value: '' },
    // 业务标识：测试结果传「本次尝试」，AI 传固定值即可（key 里已含日期）
    scope: { type: String, value: 'default' },
  },

  data: {
    state: 'checking' as GateState,
    title: '',
    desc: '',
    buttonText: '',
    memberText: '',
    unlocking: false,
  },

  observers: {
    'feature, scope': function () {
      void this.refresh();
    },
  },

  lifetimes: {
    attached() {
      void this.refresh();
    },
  },

  methods: {
    async refresh() {
      const feature = featureOf(this.data.feature);
      this.setData(resolveGate({ checking: true, decision: null, feature, adAvailable: true }));

      const user = userService.getCurrentUser();
      let decision: EntitlementDecision | null = null;
      if (user && feature) {
        // entitlementService 内部已兜住异常，这里拿不到结果也只是 null → 放行
        decision = await entitlementService.check(user._id, feature, this.data.scope);
      }
      this.setData(
        resolveGate({
          checking: false,
          decision,
          feature,
          adAvailable: rewardedAdService.available(),
        }),
      );
    },

    async onUnlock() {
      if (this.data.unlocking) return;
      this.setData({ unlocking: true });
      const result = await rewardedAdService.watch();
      this.setData({ unlocking: false });

      if (result.ok) {
        await this.grant();
        return;
      }
      if (result.outcome === 'closed') {
        // 中途退出：不给解锁，也不放行
        wx.showToast({ title: '需要完整观看视频才能解锁', icon: 'none' });
        return;
      }
      // 没广告位 / 播放失败：直接开门，别让用户为一个拉不出来的广告买单
      this.setData({ state: 'open' });
      wx.showToast({ title: '暂时无法播放视频，已直接为你打开', icon: 'none' });
    },

    async grant() {
      const feature = featureOf(this.data.feature);
      const user = userService.getCurrentUser();
      if (user && feature) {
        // 写失败不影响使用：本次已经放行了，最多下次再问一次
        await entitlementService.grantUnlock(user._id, feature, this.data.scope);
      }
      this.setData({ state: 'open' });
    },
  },
});
