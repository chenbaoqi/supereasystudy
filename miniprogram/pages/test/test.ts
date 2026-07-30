// 测试页（Chapter 04 §5 单元测试 → Chapter 13 综合测评卷：听力 Section 自动播放）。
import type { QuizQuestion } from '../../services/testService';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { pronunciationService } from '../../services/pronunciationService';
import { testService } from '../../services/testService';
import { userService } from '../../services/userService';

Page({
  data: {
    questions: [] as QuizQuestion[],
    question: null as QuizQuestion | null,
    currentIndex: 0,
    total: 0,
    selected: -1,
    answered: false,
    isCorrect: false,
    correctCount: 0,
    isLastQuestion: false,
    loading: true,
    // 空态类型：empty=无数据；grammar-pending=章节全为语法点（专项题目二期上线，Chapter 12 §7）
    emptyType: '' as '' | 'empty' | 'grammar-pending',
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
    this.startTime = Date.now();
    const knowledgeList = await knowledgeRepository.listByChapter(this.chapterId);
    // Chapter 13：综合测评卷（听力 Section 在前）
    const questions = testService.buildPaper(knowledgeList);
    const emptyType =
      questions.length === 0 && knowledgeList.some((item) => item.type === 'grammar')
        ? 'grammar-pending'
        : 'empty';
    this.setData({ questions, total: questions.length, loading: false, emptyType });
    this.showQuestion(0);
  },

  userId: '',
  chapterId: '',
  semesterId: '',
  startTime: 0,

  showQuestion(index: number) {
    const question = this.data.questions[index] ?? null;
    this.setData({
      question,
      currentIndex: index,
      selected: -1,
      answered: false,
      isCorrect: false,
      isLastQuestion: index >= this.data.questions.length - 1,
    });
    // Chapter 13：听力题自动播放（可重播，见 wxml 喇叭）
    if (question?.kind === 'listening' && question.audioWord) {
      void this.playAudio(question.audioWord);
    }
  },

  audio: null as WechatMiniprogram.InnerAudioContext | null,

  destroyed: false,

  async playAudio(word: string) {
    try {
      const src = await pronunciationService.speak(word);
      // 异步竞态防护：页面已销毁（答题跳结果页/退出）时不再播放
      if (this.destroyed) return;
      if (!this.audio) this.audio = wx.createInnerAudioContext();
      this.audio.stop();
      this.audio.src = src;
      this.audio.play();
    } catch (error) {
      console.error('听力题发音失败', error);
      wx.showToast({ title: '音频源不可用，请检查网络或插件配置', icon: 'none' });
    }
  },

  onReplayAudio() {
    if (this.data.question?.audioWord) void this.playAudio(this.data.question.audioWord);
  },

  // 答对自动进下一题的延时（ms）：留一拍展示绿色反馈，避免闪烁感
  autoNextDelay: 500,
  autoNextTimer: 0 as number | undefined,

  onSelect(event: WechatMiniprogram.TouchEvent) {
    if (this.data.answered || !this.data.question) return;
    const { index } = event.currentTarget.dataset as { index: number };
    const correct = index === this.data.question.correctIndex;
    this.setData({
      selected: index,
      answered: true,
      isCorrect: correct,
      correctCount: this.data.correctCount + (correct ? 1 : 0),
    });
    // Owner 2026-07-19：答对自动下一题（无需再点）；答错停留看反馈，手动继续
    if (correct) {
      this.autoNextTimer = setTimeout(() => {
        void this.onNext();
      }, this.autoNextDelay) as unknown as number;
    }
  },

  onUnload() {
    this.destroyed = true;
    if (this.autoNextTimer !== undefined) clearTimeout(this.autoNextTimer);
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
  },

  onGoReview() {
    // 语法专项题目二期上线前的过渡出口（Chapter 12 §7：语法复习走 review 体系）
    wx.reLaunch({ url: '/pages/review/review' });
  },

  async onNext() {
    const next = this.data.currentIndex + 1;
    if (next < this.data.questions.length) {
      this.showQuestion(next);
      return;
    }
    const durationMs = Date.now() - this.startTime;
    const { correctCount, total } = this.data;
    await testService.submitTest(this.userId, this.chapterId, { correctCount, totalCount: total });
    wx.redirectTo({
      url: `/pages/test-result/test-result?chapterId=${this.chapterId}&semesterId=${this.semesterId}&correct=${correctCount}&total=${total}&duration=${durationMs}`,
    });
  },
});
