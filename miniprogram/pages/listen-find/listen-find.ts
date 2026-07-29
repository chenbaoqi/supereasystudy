// 听音找词游戏页（Chapter 09 §7：大播放按钮/每题倒计时/进度/分数/Combo/4 单词选项；
// §5：每题 8 秒含播放与作答，超时判错自动下一题；Q4：重播不限；切后台自动暂停）。
import { LISTEN_QUESTION_SECONDS } from '../../config/gameRules';
import type { ChoiceQuestion } from '../../services/quizLogic';
import { scoreForCorrect, scoreForWrong } from '../../services/memoryGameLogic';
import { listenFindService } from '../../services/listenFindService';
import { pronunciationService } from '../../services/pronunciationService';
import { userService } from '../../services/userService';

type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
type ListenMode = 'word' | 'meaning'; // 听音选词 / 听音选义（Owner 2026-07-20 修订）
const ANSWER_FLASH_DELAY = 450; // 作答反馈展示时长（ms）
const TIMER_TICK = 200; // 倒计时刷新间隔（ms）

Page({
  data: {
    status: 'READY' as GameStatus,
    poolEmpty: false,
    questions: [] as ChoiceQuestion[],
    question: null as ChoiceQuestion | null,
    currentIndex: 0,
    total: 0,
    selected: -1,
    answered: false,
    score: 0,
    streak: 0,
    correctCount: 0,
    wrongCount: 0,
    remaining: LISTEN_QUESTION_SECONDS,
    totalSeconds: LISTEN_QUESTION_SECONDS,
    speaking: false,
  },

  chapterId: '',
  semesterId: '',
  userId: '',
  correctIds: new Set<string>(),
  wrongIds: new Set<string>(),
  responseTimes: [] as number[],
  questionStartAt: 0,
  deadlineAt: 0,
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  audio: null as WechatMiniprogram.InnerAudioContext | null,
  audioSrc: '',

  async onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user || !query.chapterId) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.chapterId = query.chapterId;
    this.semesterId = query.semesterId ?? '';
  },

  // READY 页双模式入口（Owner 2026-07-20 修订：听音选词 / 听音选义）
  async onStartGame(event: WechatMiniprogram.TouchEvent) {
    const { mode } = event.currentTarget.dataset as { mode: ListenMode };
    const start = await listenFindService.startGame(this.userId, this.chapterId, mode);
    if (!start.eligible) {
      this.setData({ poolEmpty: true }); // §13：提示知识点不足
      return;
    }
    this.setData({
      questions: start.questions,
      total: start.questions.length,
      status: 'PLAYING',
    });
    this.showQuestion(0);
    // §7：退出需要确认（真机手势返回时拦截提示）
    wx.enableAlertBeforeUnload({ message: '本局进行中，退出将不保存' });
  },

  showQuestion(index: number) {
    const question = this.data.questions[index] ?? null;
    this.questionStartAt = Date.now();
    this.deadlineAt = this.questionStartAt + LISTEN_QUESTION_SECONDS * 1000;
    this.setData({
      question,
      currentIndex: index,
      selected: -1,
      answered: false,
      remaining: LISTEN_QUESTION_SECONDS,
    });
    this.startTimer();
    if (question) void this.playAudio(question.word); // 自动播放当前题（§7）
  },

  // 播放发音（Q4 重播不限）：插件实时合成后缓存当前题音频
  async playAudio(word: string) {
    if (this.data.speaking) return;
    this.setData({ speaking: true });
    try {
      const src = await pronunciationService.speak(word);
      this.audioSrc = src;
      this.playSrc(src);
    } catch (error) {
      // §13：音频源不可用（插件未开通/网络异常）时明确提示
      console.error('发音合成失败', error);
      wx.showToast({ title: '音频源不可用，请检查网络或插件配置', icon: 'none' });
    } finally {
      this.setData({ speaking: false });
    }
  },

  playSrc(src: string) {
    if (!this.audio) this.audio = wx.createInnerAudioContext();
    this.audio.stop();
    this.audio.src = src;
    this.audio.play();
  },

  onReplay() {
    // 重播：已有缓存直接播，否则重新合成
    if (this.audioSrc) this.playSrc(this.audioSrc);
    else if (this.data.question) void this.playAudio(this.data.question.word);
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const remainingMs = Math.max(0, this.deadlineAt - Date.now());
      this.setData({ remaining: Math.ceil(remainingMs / 100) / 10 });
      if (remainingMs <= 0) void this.answer(-1);
    }, TIMER_TICK);
  },

  stopTimer() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  },

  // 切后台自动暂停：停表停音频；回前台按剩余时间继续
  onHide() {
    if (this.data.status !== 'PLAYING') return;
    this.stopTimer();
    this.audio?.stop();
    this.setData({ status: 'PAUSED' });
  },

  onShow() {
    if (this.data.status !== 'PAUSED') return;
    this.deadlineAt = Date.now() + this.data.remaining * 1000;
    this.setData({ status: 'PLAYING' });
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
    wx.disableAlertBeforeUnload();
  },

  onSelect(event: WechatMiniprogram.TouchEvent) {
    if (this.data.answered || this.data.status !== 'PLAYING') return;
    const { index } = event.currentTarget.dataset as { index: number };
    void this.answer(index);
  },

  // index=-1 表示超时未答（§5：超时按答错处理并自动进入下一题）
  async answer(index: number) {
    const { question, answered } = this.data;
    if (!question || answered) return;
    this.stopTimer();
    this.responseTimes.push(Date.now() - this.questionStartAt);
    const correct = index === question.correctIndex;
    if (correct) {
      const { delta, newStreak } = scoreForCorrect(this.data.streak); // Q2：无速度奖励
      this.correctIds.add(question.knowledgeId);
      this.setData({
        answered: true,
        selected: index,
        score: this.data.score + delta,
        streak: newStreak,
        correctCount: this.data.correctCount + 1,
      });
    } else {
      this.wrongIds.add(question.knowledgeId);
      this.setData({
        answered: true,
        selected: index,
        score: scoreForWrong(this.data.score),
        streak: 0,
        wrongCount: this.data.wrongCount + 1,
      });
    }
    setTimeout(() => void this.next(), ANSWER_FLASH_DELAY);
  },

  async next() {
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex < this.data.questions.length) {
      this.audioSrc = ''; // 进入下一题，清音频缓存
      this.showQuestion(nextIndex);
      return;
    }
    await this.finish();
  },

  async finish() {
    if (this.data.status === 'FINISHED') return;
    this.stopTimer();
    wx.disableAlertBeforeUnload();
    this.setData({ status: 'FINISHED' });
    await listenFindService.finishGame({
      userId: this.userId,
      chapterId: this.chapterId,
      questions: this.data.questions,
      correctIds: [...this.correctIds],
      wrongIds: [...this.wrongIds],
      score: this.data.score,
      responseTimes: this.responseTimes,
    });
    wx.redirectTo({
      url: `/pages/memory-result/memory-result?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  onExit() {
    // §13：退出需确认，退出不保存本局
    wx.showModal({
      title: '退出游戏',
      content: '本局进行中，退出将不保存',
      confirmText: '退出',
      success: (res) => {
        if (res.confirm) wx.navigateBack();
      },
    });
  },
});
