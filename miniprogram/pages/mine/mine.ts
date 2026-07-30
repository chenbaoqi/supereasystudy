// 我的页（TabBar）：用户功能入口集合——教材与册次（Chapter 14）、学习统计、我的收藏。
import { subjectRepository } from '../../repositories/subjectRepository';

Page({
  onTapStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },

  onTapFavorite() {
    wx.navigateTo({ url: '/pages/favorite/favorite' });
  },

  // 教材与册次（Chapter 14：切换教材的显性入口，解决「教材选择找不到」）
  async onTapTextbook() {
    const subjects = await subjectRepository.listAll();
    const firstOpen = subjects.find((item) => item.open);
    if (!firstOpen) return;
    wx.navigateTo({ url: `/pages/subject/subject?subjectId=${firstOpen._id}` });
  },
});
