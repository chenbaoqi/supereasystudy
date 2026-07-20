// 我的页（TabBar）：用户功能入口集合——学习统计（Specification §12.5，Q6）、我的收藏。
Page({
  onTapStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },

  onTapFavorite() {
    wx.navigateTo({ url: '/pages/favorite/favorite' });
  },
});
