// 复习详情页（Chapter 05 §4：知识卡 + 认识/不认识自评；§7：无音频/无例句则隐藏）。
import { gameProfileService } from '../../services/gameProfileService';
import type { ReviewItem } from '../../services/reviewService';
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';
import { showStarGain } from '../../utils/starFeedback';

// 学分（2026-09-20）：复习是最该被鼓励的行为，却一直是「白干」。
// ⚠️ 只有「记住了」才给分——复习不是打卡，装作记住不该拿奖励。
const STAR_PER_REVIEW_KNOWN = 1; // 复习时答对 1 个
const STAR_PER_REVIEW_ROUND = 3; // 完成一整轮复习

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

  /** 发放复习学分（发后不理：入账失败不影响复习继续）。
   *  announce=true 才报「+N⭐」：复习答对 +1⭐ 是高频，不报星只报徽章；完成一轮 +3⭐ 才 announce。 */
  awardStars(stars: number, correct: number, announce = false): void {
    if (stars <= 0 || !this.userId) return;
    void gameProfileService
      .awardLearning(this.userId, { stars, correct })
      .then((badges) => showStarGain(announce ? stars : 0, badges))
      .catch((error: unknown) => console.error('复习学分入账失败', error));
  },

  async answer(known: boolean) {
    const { current, index, items } = this.data;
    if (!current || !this.userId) return;
    await reviewService.submitReview(this.userId, current.knowledge._id, known);
    // 学分：只有「记住了」才给（known=false 说明忘了，那就不该拿分）
    if (known) this.awardStars(STAR_PER_REVIEW_KNOWN, 1);
    if (index + 1 < items.length) {
      this.showAt(index + 1);
      return;
    }
    // 全部答完：finishReview 归位中断态并刷新统计（Q6），回复习页（onShow 自动刷新）
    await reviewService.finishReview(this.userId);
    // 学分：完成一整轮复习额外奖励（复习最容易半途而废，值得单独哄一下）
    this.awardStars(STAR_PER_REVIEW_ROUND, 0, true);
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
