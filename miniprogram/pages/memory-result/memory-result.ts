// 游戏结果统一页（Chapter 07 §8 / Chapter 08 §10 泛化：Memory Challenge 全系列共用）。
// 数据源为 gameResultStore（当局登记，仅当局后可达）。
import type { Knowledge } from '../../core/knowledge';
import { gameResultStore } from '../../services/gameResultStore';

Page({
  data: {
    missing: false,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    duration: 0,
    avgResponseText: '', // 平均反应时间（秒，TS 层格式化；WXML 不支持 toFixed 等方法调用）
    mastered: [] as Knowledge[],
    weak: [] as Knowledge[],
    integrating: false,
    integrated: false,
  },

  chapterId: '',
  semesterId: '',
  replayUrl: '',

  onLoad(query: Record<string, string>) {
    this.chapterId = query.chapterId ?? '';
    this.semesterId = query.semesterId ?? '';
    const detail = gameResultStore.get();
    if (!detail) {
      this.setData({ missing: true });
      return;
    }
    this.replayUrl = detail.replayUrl;
    this.setData({
      score: detail.record.score,
      correctCount: detail.record.correctCount,
      wrongCount: detail.record.wrongCount,
      duration: detail.record.duration,
      avgResponseText: detail.avgResponseMs != null ? (detail.avgResponseMs / 1000).toFixed(1) : '',
      mastered: detail.mastered,
      weak: detail.weak,
    });
  },

  onReplay() {
    wx.redirectTo({
      url: `${this.replayUrl}?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  onBackToStudy() {
    wx.reLaunch({ url: `/pages/chapter/chapter?semesterId=${this.semesterId}` });
  },

  async onAddToReview() {
    // §12 集成（Q4：按钮触发）：错误进复习、正确 masteryLevel+1
    const detail = gameResultStore.get();
    if (!detail || this.data.integrating || this.data.integrated) return;
    this.setData({ integrating: true });
    await detail.integrateToReview();
    this.setData({ integrating: false, integrated: true });
    wx.showToast({ title: '已加入复习', icon: 'success' });
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/review/review' });
    }, 800);
  },
});
