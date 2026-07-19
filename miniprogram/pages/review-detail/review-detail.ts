// 复习详情页（Chapter 05 §4：知识卡 + 认识/不认识自评；§7：无音频/无例句则隐藏）。
import type { ReviewItem } from '../../services/reviewService';
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';

Page({
  data: {
    items: [] as ReviewItem[],
    current: null as ReviewItem | null,
    index: 0,
    total: 0,
    loading: true,
  },

  async onLoad() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    // startReview：取今日待复习并置 REVIEWING（Q6）
    const items = await reviewService.startReview(user._id);
    this.setData({ items, total: items.length, loading: false });
    this.showAt(0);
  },

  userId: '',

  showAt(index: number) {
    this.setData({ current: this.data.items[index] ?? null, index });
  },

  async answer(known: boolean) {
    const { current, index, items } = this.data;
    if (!current || !this.userId) return;
    await reviewService.submitReview(this.userId, current.knowledge._id, known);
    if (index + 1 < items.length) {
      this.showAt(index + 1);
      return;
    }
    // 全部答完：finishReview 归位中断态并刷新统计（Q6），回复习页（onShow 自动刷新）
    await reviewService.finishReview(this.userId);
    wx.navigateBack();
  },

  onKnown() {
    void this.answer(true);
  },

  onUnknown() {
    void this.answer(false);
  },

  onPlayAudio() {
    // §7：无音频时按钮隐藏（规格默认值）
    const url = this.data.current?.knowledge.pronunciation;
    if (!url) return;
    const audio = wx.createInnerAudioContext();
    audio.src = url;
    audio.play();
  },
});
