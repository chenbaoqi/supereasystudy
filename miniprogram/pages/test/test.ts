// 测试页（Chapter 04 §5：每个知识点一道题；Owner 确认 B：英译中四选一，即时判对错）。
import type { TestQuestion } from '../../services/testService';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { testService } from '../../services/testService';
import { userService } from '../../services/userService';

Page({
  data: {
    questions: [] as TestQuestion[],
    question: null as TestQuestion | null,
    currentIndex: 0,
    total: 0,
    selected: -1,
    answered: false,
    correctCount: 0,
    isLastQuestion: false,
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
    this.startTime = Date.now();
    const knowledgeList = await knowledgeRepository.listByChapter(this.chapterId);
    const questions = testService.generateQuestions(knowledgeList);
    this.setData({ questions, total: questions.length, loading: false });
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
      isLastQuestion: index >= this.data.questions.length - 1,
    });
  },

  onSelect(event: WechatMiniprogram.TouchEvent) {
    if (this.data.answered || !this.data.question) return;
    const { index } = event.currentTarget.dataset as { index: number };
    const correct = index === this.data.question.correctIndex;
    this.setData({
      selected: index,
      answered: true,
      correctCount: this.data.correctCount + (correct ? 1 : 0),
    });
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
