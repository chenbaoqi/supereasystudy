// 小程序入口。
// Phase 2 切片入口策略（Chapter 04 §3：流程从 Login/Subject 开始）：
// 启动时静默恢复登录态——成功直进学科页，失败进登录页（§8 无网络 Retry 在登录页）。
// home tab 待首页规范（Specification 第 12 章）后启用。
import { CLOUD_ENV } from './config/cloud';
import { userService } from './services/userService';

App<IAppOption>({
  globalData: {
    currentUser: null,
  },
  async onLaunch() {
    if (!wx.cloud) {
      // 低版本基础库无云开发能力：属环境兜底提示，非业务分支
      console.error('当前微信基础库不支持云开发，请升级基础库');
      return;
    }
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    const user = await userService.restoreSession();
    wx.reLaunch({ url: user ? '/pages/subject/subject' : '/pages/login/login' });
  },
});
