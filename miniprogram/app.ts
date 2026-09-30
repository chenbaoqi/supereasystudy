// 小程序入口。
// 入口策略（Specification §12.5 起）：启动时静默恢复登录态——
// 成功直进首页 Dashboard（home tab），失败进登录页（§12.3 无网络 Retry 在登录页）。
import { CLOUD_ENV } from './config/cloud';
import { userService } from './services/userService';
import { withTimeout } from './utils/withTimeout';

// 启动兜底时长：云调用正常 <2s。超时即视为云端不可用，
// 直接按「未登录」进登录页（那里有可见的失败提示 + 重试按钮）。
// 绝不裸 await —— 那会让 appLaunch 永远不结束，表现为「导航栏与 tabBar 正常、内容区整片空白、控制台无报错」。
// 2026-09-13 用户实测白板，开发者工具日志里正是 `routeTo appLaunch timeout`。
const LAUNCH_TIMEOUT_MS = 8000;

App<IAppOption>({
  globalData: {
    currentUser: null,
  },

  async onLaunch() {
    if (!wx.cloud) {
      // 低版本基础库无云开发能力：属环境兜底提示，非业务分支
      console.error('当前微信基础库不支持云开发，请升级基础库');
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    const user = await withTimeout(userService.restoreSession(), LAUNCH_TIMEOUT_MS, '启动登录');
    wx.reLaunch({ url: user ? '/pages/home/home' : '/pages/login/login' });
  },
});
