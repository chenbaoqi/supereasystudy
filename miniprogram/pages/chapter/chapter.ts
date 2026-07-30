// 章节页（Chapter 04 §5：读取 chapters，显示 Not Started / Learning / Completed）。
// 数据装配已抽取至 chapterService.buildChapterItems（Chapter 14 §4，与学习 tab 共用）。
import type { ChapterItem } from '../../services/chapterService';
import { chapterService } from '../../services/chapterService';
import { userService } from '../../services/userService';

Page({
  data: { items: [] as ChapterItem[], loading: true, loadFailed: false, semesterId: '' },

  destroyed: false,

  async onLoad() {
    await this.loadChapters();
  },

  async loadChapters() {
    const user = userService.getCurrentUser();
    const semesterId = this.options.semesterId;
    if (!user || !semesterId) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    try {
      const items = await chapterService.buildChapterItems(user._id, semesterId);
      // 异步竞态防护：页面已被切走/销毁时不再 setData
      if (this.destroyed) return;
      this.setData({ items, loading: false, loadFailed: false, semesterId });
    } catch (error) {
      console.error('章节加载失败（§8 重试）', error);
      if (this.destroyed) return;
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadChapters();
  },

  onUnload() {
    this.destroyed = true;
  },

  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/study-detail/study-detail?chapterId=${id}&semesterId=${semesterId}`,
    });
  },

  // 游戏中心入口（Chapter 08 §16 Q1：章节 🎮 → 游戏中心选游戏）
  onTapGame(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/game-center/game-center?chapterId=${id}&semesterId=${semesterId}`,
    });
  },

  // 测试入口（Owner 2026-07-30：章节页显式测试入口，不必先完成学习）
  onTapTest(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/test/test?chapterId=${id}&semesterId=${semesterId}`,
    });
  },
});
