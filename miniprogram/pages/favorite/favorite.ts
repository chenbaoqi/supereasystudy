// 收藏页（Specification §12.5：收藏列表按时间倒序；点击进入所属章节学习详情，Q5 确认）。
import type { FavoriteItem } from '../../services/favoriteService';
import { favoriteService } from '../../services/favoriteService';
import { userService } from '../../services/userService';

Page({
  data: { items: [] as FavoriteItem[], loading: true, loadFailed: false },

  async onShow() {
    await this.loadFavorites();
  },

  async loadFavorites() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    try {
      const items = await favoriteService.getFavorites(user._id);
      this.setData({ items, loading: false, loadFailed: false });
    } catch (error) {
      console.error('收藏加载失败（§12.3 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadFavorites();
  },

  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const { chapterId } = event.currentTarget.dataset as { chapterId: string };
    wx.navigateTo({ url: `/pages/study-detail/study-detail?chapterId=${chapterId}` });
  },
});
