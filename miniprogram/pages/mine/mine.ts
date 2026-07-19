// 我的页（TabBar）。当前仅承载「学习统计」入口（Specification §12.5，Q6 确认）。
Page({
  onTapStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },
});
