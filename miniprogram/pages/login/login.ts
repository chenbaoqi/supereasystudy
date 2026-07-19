// 登录页（Chapter 04 §5：自动检测登录 / 微信登录 / 恢复用户；§8：失败可重试）。
import { userService } from '../../services/userService';

Page({
  data: { loading: true, failed: false },

  async onLoad() {
    // 自动检测：进入即尝试静默登录（§5）
    await this.tryLogin();
  },

  async tryLogin() {
    this.setData({ loading: true, failed: false });
    const user = await userService.login();
    if (user) {
      wx.reLaunch({ url: '/pages/subject/subject' });
      return;
    }
    this.setData({ loading: false, failed: true });
  },
});
