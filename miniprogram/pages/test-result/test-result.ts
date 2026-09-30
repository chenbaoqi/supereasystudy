// 测试结果页（Chapter 04 §5：显示正确率、耗时，并支持重新学习）。
// 成绩数据由测试页经路由参数传入（Chapter 04 未要求持久化成绩）。
Page({
  data: {
    chapterId: '',
    semesterId: '',
    correct: 0,
    total: 0,
    accuracy: 0,
    durationText: '',
    stars: 0, // 本次获得的学分（+N⭐，由测试页随路由传入）
    // 门禁的业务标识：解锁的是「这一次」，不是「这一章」
    scope: '',
  },

  onLoad(query: Record<string, string>) {
    const correct = Number(query.correct ?? 0);
    const total = Number(query.total ?? 0);
    const durationMs = Number(query.duration ?? 0);
    const stars = Number(query.stars ?? 0);
    const seconds = Math.round(durationMs / 1000);
    const durationText = `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
    const chapterId = query.chapterId ?? '';
    // attempt 由测试页传入（= 开考时刻）。同章节考第二次也要重新解锁，故带上它
    const attempt = query.attempt ?? '';
    this.setData({
      chapterId,
      semesterId: query.semesterId ?? '',
      scope: `${chapterId}:${attempt}`,
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      durationText,
      stars,
    });
  },

  onRestudy() {
    // 重新学习（§5）：restart=1 重置进度
    wx.reLaunch({
      url: `/pages/study-detail/study-detail?chapterId=${this.data.chapterId}&semesterId=${this.data.semesterId}&restart=1`,
    });
  },

  onBackToChapter() {
    wx.reLaunch({ url: `/pages/chapter/chapter?semesterId=${this.data.semesterId}` });
  },

  onGoReview() {
    // 去复习（Chapter 05 Q5：Review 页入口）
    wx.reLaunch({ url: '/pages/review/review' });
  },
});
