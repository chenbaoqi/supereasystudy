// 首页 Dashboard（Specification §12.5：Banner / 统计条 / 最近学习 / 学科入口）。
// onShow 刷新：tab 切换回来时统计与最近学习需为最新。
import type { Banner } from '../../core/banner';
import type { Subject } from '../../core/subject';
import type { HomeDashboard, RecentLearningItem } from '../../services/homeService';
import { homeService } from '../../services/homeService';
import { subjectRepository } from '../../repositories/subjectRepository';
import { userService } from '../../services/userService';

Page({
  data: {
    banners: [] as Banner[],
    todayReviewedKnowledge: 0,
    streakDays: 0,
    recentLearning: [] as RecentLearningItem[],
    subjects: [] as Subject[],
    loading: true,
    loadFailed: false,
  },

  async onShow() {
    await this.loadDashboard();
  },

  async loadDashboard() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    try {
      const [dashboard, subjects] = await Promise.all([
        homeService.getDashboard(user._id),
        subjectRepository.listAll(),
      ]);
      this.setData({
        ...this.pickDashboard(dashboard),
        subjects,
        loading: false,
        loadFailed: false,
      });
    } catch (error) {
      console.error('首页加载失败（§12.3 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  pickDashboard(dashboard: HomeDashboard) {
    return {
      banners: dashboard.banners,
      todayReviewedKnowledge: dashboard.todayReviewedKnowledge,
      streakDays: dashboard.streakDays,
      recentLearning: dashboard.recentLearning,
    };
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadDashboard();
  },

  onTapRecent(event: WechatMiniprogram.TouchEvent) {
    const { chapterId, semesterId } = event.currentTarget.dataset as {
      chapterId: string;
      semesterId: string;
    };
    wx.navigateTo({
      url: `/pages/study-detail/study-detail?chapterId=${chapterId}&semesterId=${semesterId}`,
    });
  },

  onTapSubject(event: WechatMiniprogram.TouchEvent) {
    const { id, open } = event.currentTarget.dataset as { id: string; open: boolean };
    wx.navigateTo({
      url: open
        ? `/pages/learning-path/learning-path?subjectId=${id}`
        : '/pages/coming-soon/coming-soon',
    });
  },
});
