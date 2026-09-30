// 登录页（Chapter 04 §5：自动检测登录 / 微信登录 / 恢复用户；§8：失败可重试）。
import { userService } from '../../services/userService';
import { withTimeout } from '../../utils/withTimeout';

// 登录超时：避免云端无响应时「正在登录…」永久转圈（§8 失败必须可重试）
const LOGIN_TIMEOUT_MS = 8000;

Page({
  data: { loading: true, failed: false },

  async onLoad() {
    // 自动检测：进入即尝试静默登录（§5）
    await this.tryLogin();
  },

  async tryLogin() {
    this.setData({ loading: true, failed: false });
    const user = await withTimeout(userService.login(), LOGIN_TIMEOUT_MS, '登录');
    if (user) {
      wx.reLaunch({ url: '/pages/home/home' });
      return;
    }
    this.setData({ loading: false, failed: true });
  },
});
