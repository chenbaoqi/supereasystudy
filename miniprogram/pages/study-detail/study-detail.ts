// 学习详情页（Chapter 04 §5：知识卡 + 收藏 + 进度 + 上一条/下一条/完成学习；
// §7：Next 后立即更新学习记录；§8：无例句/图片则隐藏）。
import type { Knowledge } from '../../core/knowledge';
import type { LearningSession } from '../../services/learningService';
import { favoriteRepository } from '../../repositories/favoriteRepository';
import { learningService } from '../../services/learningService';
import { pronunciationService } from '../../services/pronunciationService';
import { userService } from '../../services/userService';

Page({
  data: {
    session: null as LearningSession | null,
    current: null as Knowledge | null,
    index: 0,
    total: 0,
    isFirst: true,
    isLast: false,
    isFavorite: false,
    favoriteIds: [] as string[],
    loading: true,
  },

  async onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user || !query.chapterId) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.chapterId = query.chapterId;
    this.semesterId = query.semesterId ?? '';
    // restart=1：来自测试结果页「重新学习」（§5 Test Result），重置进度
    const session = query.restart
      ? await learningService.startLearning(user._id, this.chapterId)
      : await learningService.continueLearning(user._id, this.chapterId);
    const favorites = await favoriteRepository.listByUser(user._id);
    this.setData({
      session,
      total: session.knowledgeList.length,
      favoriteIds: favorites.map((item) => item.knowledgeId),
    });
    this.showAt(session.currentIndex);
  },

  userId: '',
  chapterId: '',
  semesterId: '',

  showAt(index: number) {
    const session = this.data.session;
    if (!session) return;
    const current = session.knowledgeList[index] ?? null;
    this.setData({
      current,
      index,
      isFirst: index <= 0,
      isLast: index >= session.knowledgeList.length - 1,
      isFavorite: current ? this.data.favoriteIds.includes(current._id) : false,
      loading: false,
    });
  },

  async onNext() {
    const { session, index } = this.data;
    if (!session || !this.userId) return;
    const next = index + 1;
    const target = session.knowledgeList[next];
    if (!target) return;
    // §7：Next 后立即更新学习记录（progress = 已学数量，F 确认）
    await learningService.updateProgress(this.userId, this.chapterId, target._id, next);
    this.showAt(next);
  },

  onPrevious() {
    if (this.data.index > 0) this.showAt(this.data.index - 1);
  },

  async onFinish() {
    if (!this.userId) return;
    await learningService.finishLearning(this.userId, this.chapterId);
    wx.redirectTo({
      url: `/pages/test/test?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  async onToggleFavorite() {
    const { current, isFavorite, favoriteIds } = this.data;
    if (!current || !this.userId) return;
    if (isFavorite) {
      await favoriteRepository.remove(this.userId, current._id);
      this.setData({
        isFavorite: false,
        favoriteIds: favoriteIds.filter((id) => id !== current._id),
      });
    } else {
      await favoriteRepository.add(this.userId, current._id);
      this.setData({ isFavorite: true, favoriteIds: [...favoriteIds, current._id] });
    }
  },

  audio: null as WechatMiniprogram.InnerAudioContext | null,

  // 发音（Owner 2026-07-20 修订：TTS 常态化，不再依赖数据自带音频；重播不限）
  async onPlayWord() {
    const current = this.data.current;
    if (!current) return;
    await this.playSource(
      () => pronunciationService.speak(current.word, current.pronunciation),
      '音频源不可用，请检查网络或插件配置',
    );
  },

  async playSource(loadSrc: () => Promise<string>, errorMessage: string) {
    try {
      const src = await loadSrc();
      if (!this.audio) this.audio = wx.createInnerAudioContext();
      this.audio.stop();
      this.audio.src = src;
      this.audio.play();
    } catch (error) {
      console.error(errorMessage, error);
      wx.showToast({ title: errorMessage, icon: 'none' });
    }
  },

  onUnload() {
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
  },
});
