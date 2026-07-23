// 游戏中心（Chapter 08 §16 Q1 确认）：承载 Memory Challenge 系列游戏入口，随游戏增多扩展。
Page({
  data: { chapterId: '', semesterId: '' },

  onLoad(query: Record<string, string>) {
    this.setData({ chapterId: query.chapterId ?? '', semesterId: query.semesterId ?? '' });
  },

  onTapGame(event: WechatMiniprogram.TouchEvent) {
    const { url } = event.currentTarget.dataset as { url: string };
    wx.navigateTo({
      url: `${url}?chapterId=${this.data.chapterId}&semesterId=${this.data.semesterId}`,
    });
  },
});
