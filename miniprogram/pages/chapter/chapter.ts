// 章节页（Chapter 04 §5：读取 chapters，显示 Not Started / Learning / Completed）。
// 三态显示与 §6 五态机的映射：NOT_STARTED→Not Started；LEARNING→Learning；
// COMPLETED/TESTED/MASTERED→Completed。
import type { LearningState } from '../../core/learningState';
import { chapterRepository } from '../../repositories/chapterRepository';
import { learningRecordRepository } from '../../repositories/learningRecordRepository';
import { userService } from '../../services/userService';

interface ChapterItem {
  readonly id: string;
  readonly title: string;
  readonly statusText: string;
}

function statusTextOf(state?: LearningState): string {
  if (!state || state === 'NOT_STARTED') return 'Not Started';
  if (state === 'LEARNING') return 'Learning';
  return 'Completed';
}

Page({
  data: { items: [] as ChapterItem[], loading: true, loadFailed: false },

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
      const chapters = await chapterRepository.listBySemester(semesterId);
      const records = await learningRecordRepository.listByUserAndChapters(
        user._id,
        chapters.map((item) => item._id),
      );
      const recordMap = new Map(records.map((item) => [item.chapterId, item]));
      this.setData({
        items: chapters.map((item) => ({
          id: item._id,
          title: item.title,
          statusText: statusTextOf(recordMap.get(item._id)?.state),
        })),
        loading: false,
        loadFailed: false,
      });
    } catch (error) {
      console.error('章节加载失败（§8 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadChapters();
  },

  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id: string };
    wx.navigateTo({
      url: `/pages/study-detail/study-detail?chapterId=${id}&semesterId=${this.options.semesterId}`,
    });
  },

  // 游戏中心入口（Chapter 08 §16 Q1：章节 🎮 → 游戏中心选游戏）
  onTapGame(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id: string };
    wx.navigateTo({
      url: `/pages/game-center/game-center?chapterId=${id}&semesterId=${this.options.semesterId}`,
    });
  },
});
