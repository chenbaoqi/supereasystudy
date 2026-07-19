// 复习页（Chapter 05 §4：今日待复习 / 已完成 / 完成率 / 开始复习；空状态文案按规格）。
// onShow 刷新：从复习详情返回后统计需更新。
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';

Page({
  data: { dueCount: 0, doneCount: 0, completionRate: 0, loading: true, loadFailed: false },

  async onShow() {
    await this.loadStats();
  },

  async loadStats() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    try {
      const stats = await reviewService.getTodayReviews(user._id);
      this.setData({
        dueCount: stats.dueCount,
        doneCount: stats.doneCount,
        completionRate: stats.completionRate,
        loading: false,
        loadFailed: false,
      });
    } catch (error) {
      console.error('复习统计加载失败（§7 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadStats();
  },

  onStart() {
    wx.navigateTo({ url: '/pages/review-detail/review-detail' });
  },
});
