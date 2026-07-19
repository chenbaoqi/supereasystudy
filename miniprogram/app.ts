// 小程序入口。
// 入口策略（Specification §12.5 起）：启动时静默恢复登录态——
// 成功直进首页 Dashboard（home tab），失败进登录页（§12.3 无网络 Retry 在登录页）。
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
    wx.reLaunch({ url: user ? '/pages/home/home' : '/pages/login/login' });
  },
});
