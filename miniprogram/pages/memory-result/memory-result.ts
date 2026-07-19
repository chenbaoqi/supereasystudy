// 游戏结果页（Chapter 07 §8：总分/正确/错误/用时 + 掌握/薄弱分析 + 三按钮）。
// 明细数据来自当局内存结果（结果页仅当局后可达，getLastResult 注释有述）。
import type { Knowledge } from '../../core/knowledge';
import { memoryGameService } from '../../services/memoryGameService';
import { userService } from '../../services/userService';

Page({
  data: {
    missing: false,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    duration: 0,
    mastered: [] as Knowledge[],
    weak: [] as Knowledge[],
    integrating: false,
    integrated: false,
  },

  chapterId: '',
  semesterId: '',

  onLoad(query: Record<string, string>) {
    this.chapterId = query.chapterId ?? '';
    this.semesterId = query.semesterId ?? '';
    const detail = memoryGameService.getLastResult();
    if (!detail) {
      this.setData({ missing: true });
      return;
    }
    this.setData({
      score: detail.record.score,
      correctCount: detail.record.correctCount,
      wrongCount: detail.record.wrongCount,
      duration: detail.record.duration,
      mastered: detail.mastered,
      weak: detail.weak,
    });
  },

  onReplay() {
    wx.redirectTo({
      url: `/pages/memory-game/memory-game?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  onBackToStudy() {
    wx.reLaunch({ url: `/pages/chapter/chapter?semesterId=${this.semesterId}` });
  },

  async onAddToReview() {
    // §8/§12（Q4：按钮触发复习集成）：错误进复习、正确 masteryLevel+1
    const user = userService.getCurrentUser();
    if (!user || this.data.integrating || this.data.integrated) return;
    this.setData({ integrating: true });
    await memoryGameService.integrateToReview(user._id, this.chapterId);
    this.setData({ integrating: false, integrated: true });
    wx.showToast({ title: '已加入复习', icon: 'success' });
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/review/review' });
    }, 800);
  },
});
