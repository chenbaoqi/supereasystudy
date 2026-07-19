// 小程序入口。
// Phase 1：云开发初始化（Baseline Spec §1；环境 ID 为占位值，§6 允许）+ 全局状态骨架（§1）。
// 登录态恢复等业务时机待 Phase 2，以 Specification 为准。
import { CLOUD_ENV } from './config/cloud';
import type { User } from './core/user';

App({
  globalData: {
    // 全局状态骨架（Baseline Spec §1「全局状态」）：当前登录用户，Phase 2 由 UserService 写入
    currentUser: null as User | null,
  },
  onLaunch() {
    if (!wx.cloud) {
      // 低版本基础库无云开发能力：属环境兜底提示，非业务分支
      console.error('当前微信基础库不支持云开发，请升级基础库');
      return;
    }
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
  },
});
