// 学习统计页（Specification §12.5：今日复习 / 今日学习章节 / 累计知识点 / 连续天数）。
import type { LearningStatistics } from '../../services/statisticsService';
import { statisticsService } from '../../services/statisticsService';
import { userService } from '../../services/userService';

Page({
  data: {
    stats: null as LearningStatistics | null,
    loading: true,
    loadFailed: false,
  },

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
      const stats = await statisticsService.getStatistics(user._id);
      this.setData({ stats, loading: false, loadFailed: false });
    } catch (error) {
      console.error('统计加载失败（§12.3 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadStats();
  },
});
