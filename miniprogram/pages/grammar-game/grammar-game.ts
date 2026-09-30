// 语法闯关游戏页（二期）：复用极速选择的计时/连击/速度奖励/结果登记引擎，
// 但题源为语法专题包内 type='grammar' 知识点的内嵌 quiz（见 services/grammarGameService）。
// 题干展示 quiz.stem（含空句的句子），options 为四选一；word 字段为语法点名（副标题）。
import { SPEED_QUESTION_SECONDS } from '../../config/gameRules';
import type { ChoiceQuestion } from '../../services/quizLogic';
import { scoreForSpeedAnswer } from '../../services/speedChoiceService';
import { scoreForWrong } from '../../services/memoryGameLogic';
import { grammarGameService } from '../../services/grammarGameService';
import { gradeScope } from '../../services/gradeScope';
import { userService } from '../../services/userService';

type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
const ANSWER_FLASH_DELAY = 450; // 作答反馈展示时长（ms）
const TIMER_TICK = 200; // 倒计时刷新间隔（ms）

Page({
  data: {
    status: 'READY' as GameStatus,
    poolEmpty: false,
    emptyReason: '' as '' | 'no-grammar-semester' | 'empty',
    questions: [] as ChoiceQuestion[],
    question: null as ChoiceQuestion | null,
    currentIndex: 0,
    total: 0,
    selected: -1,
    answered: false,
    lastCorrect: false,
    score: 0,
    streak: 0,
    correctCount: 0,
    wrongCount: 0,
    remaining: SPEED_QUESTION_SECONDS,
    totalSeconds: SPEED_QUESTION_SECONDS,
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

  async onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user || !query.chapterId) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.chapterId = query.chapterId;
    this.semesterId = query.semesterId ?? '';
    // 语法游戏按转发来的「单词册次 id」解析语法专题包题源
    // ADR-012：题源按当前年级过滤，别考还没学到的内容
    const start = await grammarGameService.startGame(
      user._id,
      this.semesterId,
      gradeScope.currentGrade(),
    );
    if (!start.eligible) {
      this.setData({ poolEmpty: true, emptyReason: start.reason ?? 'empty' }); // §13：提示暂无语法题
      return;
    }
    this.setData({ questions: start.questions, total: start.questions.length });
  },

  onStartGame() {
    this.setData({ status: 'PLAYING' });
    this.showQuestion(0);
    // §7：退出需要确认（真机手势返回时拦截提示）
    wx.enableAlertBeforeUnload({ message: '本局进行中，退出将不保存' });
  },

  showQuestion(index: number) {
    const question = this.data.questions[index] ?? null;
    this.questionStartAt = Date.now();
    this.deadlineAt = this.questionStartAt + SPEED_QUESTION_SECONDS * 1000;
    this.setData({
      question,
      currentIndex: index,
      selected: -1,
      answered: false,
      lastCorrect: false,
      remaining: SPEED_QUESTION_SECONDS,
    });
    this.startTimer();
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

  // 切后台自动暂停（本题为公平重新计时的当前题）
  onHide() {
    if (this.data.status !== 'PLAYING') return;
    this.stopTimer();
    this.setData({ status: 'PAUSED' });
  },

  onShow() {
    if (this.data.status !== 'PAUSED') return;
    // 恢复：本题按剩余时间继续计时
    this.deadlineAt = Date.now() + this.data.remaining * 1000;
    this.setData({ status: 'PLAYING' });
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
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
    const responseMs = Date.now() - this.questionStartAt;
    this.responseTimes.push(responseMs);
    const correct = index === question.correctIndex;
    if (correct) {
      const remainingSeconds = Math.max(0, (this.deadlineAt - Date.now()) / 1000);
      const { delta, newStreak } = scoreForSpeedAnswer(remainingSeconds, this.data.streak);
      this.correctIds.add(question.knowledgeId);
      this.setData({
        answered: true,
        selected: index,
        lastCorrect: true,
        score: this.data.score + delta,
        streak: newStreak,
        correctCount: this.data.correctCount + 1,
      });
    } else {
      this.wrongIds.add(question.knowledgeId);
      this.setData({
        answered: true,
        selected: index,
        lastCorrect: false,
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
    await grammarGameService.finishGame({
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
