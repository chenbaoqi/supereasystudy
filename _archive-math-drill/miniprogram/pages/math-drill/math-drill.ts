// 数学速算游戏页（二期·数学学科）：限时四则运算快答。
// 题源为 mathDrillService 生成的四则运算题（街机式，不绑定知识点）；
// 计时/连击/速度奖励复用极速选择引擎（scoreForSpeedAnswer），结果经统一结果页渲染。
import { DRILL_QUESTION_SECONDS, DRILL_TOTAL } from '../../config/gameRules';
import { isInputComplete } from '../../core/answerInput';
import type { DrillProblem } from '../../services/mathDrillService';
import { mathDrillService } from '../../services/mathDrillService';
import { scoreForSpeedAnswer } from '../../services/speedChoiceService';
import { scoreForWrong } from '../../services/memoryGameLogic';
import { userService } from '../../services/userService';
import { semesterRepository } from '../../repositories/semesterRepository';
import { stageOfSemester, type SemesterStage } from '../../utils/stage';

type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
const ANSWER_FLASH_DELAY = 450; // 作答反馈展示时长（ms）
const TIMER_TICK = 200; // 倒计时刷新间隔（ms）
const MAX_INPUT_LEN = 4; // 最多输入位数

Page({
  data: {
    status: 'READY' as GameStatus,
    problems: [] as DrillProblem[],
    total: 0,
    problem: null as DrillProblem | null,
    currentIndex: 0,
    input: '',
    solved: false,
    feedback: '' as '' | 'correct' | 'wrong',
    score: 0,
    streak: 0,
    correctCount: 0,
    wrongCount: 0,
    remaining: DRILL_QUESTION_SECONDS,
    timePercent: 100,
  },

  chapterId: '',
  semesterId: '',
  userId: '',
  stage: 'primary' as SemesterStage,
  responseTimes: [] as number[],
  questionStartAt: 0,
  deadlineAt: 0,
  timer: undefined as ReturnType<typeof setInterval> | undefined,

  async onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.chapterId = query.chapterId ?? '';
    this.semesterId = query.semesterId ?? '';
    // 推断学段：有册次则按册次名，否则默认小学
    let stage: SemesterStage = 'primary';
    if (this.semesterId) {
      const sem = await semesterRepository.getById(this.semesterId);
      if (sem) stage = stageOfSemester(sem.name);
    }
    this.stage = stage;
    const start = mathDrillService.startGame(stage, DRILL_TOTAL);
    this.setData({ problems: start.problems, total: start.problems.length });
  },

  onStartGame() {
    this.setData({ status: 'PLAYING' });
    this.showQuestion(0);
    wx.enableAlertBeforeUnload({ message: '本局进行中，退出将不保存' });
  },

  showQuestion(index: number) {
    const problem = this.data.problems[index] ?? null;
    this.questionStartAt = Date.now();
    this.deadlineAt = this.questionStartAt + DRILL_QUESTION_SECONDS * 1000;
    this.setData({
      problem,
      currentIndex: index,
      input: '',
      solved: false,
      feedback: '',
      remaining: DRILL_QUESTION_SECONDS,
      timePercent: 100,
    });
    this.startTimer();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const remainingMs = Math.max(0, this.deadlineAt - Date.now());
      this.setData({
        remaining: Math.ceil(remainingMs / 100) / 10,
        timePercent: (remainingMs / (DRILL_QUESTION_SECONDS * 1000)) * 100,
      });
      if (remainingMs <= 0) this.submit(); // 超时按当前输入判定（空=错）
    }, TIMER_TICK);
  },

  stopTimer() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  },

  onHide() {
    if (this.data.status !== 'PLAYING') return;
    this.stopTimer();
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
    wx.disableAlertBeforeUnload();
  },

  onKey(event: WechatMiniprogram.TouchEvent) {
    if (this.data.solved || this.data.status !== 'PLAYING') return;
    const k = event.currentTarget.dataset.k as string;
    if (k === '⌫') {
      this.setData({ input: this.data.input.slice(0, -1) });
    } else if (k === 'ok') {
      this.submit();
    } else if (this.data.input.length < MAX_INPUT_LEN) {
      const input = this.data.input + k;
      this.setData({ input });
      // 填对就自动判定，限时模式下省掉按确定的一步（判据见 core/answerInput）
      const problem = this.data.problem;
      if (problem && isInputComplete(input, problem.answer)) this.submit(input);
    }
  },

  // 当前题判定（超时 / 按确定 / 填对自动判定均走此，空输入按答错）
  submit(value?: string) {
    if (this.data.solved || !this.data.problem) return;
    this.stopTimer();
    const responseMs = Date.now() - this.questionStartAt;
    this.responseTimes.push(responseMs);
    const answer = this.data.problem.answer;
    // 显式把「刚按下的那个数」传进来，不依赖 this.data 的更新时机
    const raw = value ?? this.data.input;
    const parsed = raw === '' ? NaN : Number(raw);
    const correct = !Number.isNaN(parsed) && parsed === answer;
    if (correct) {
      const remainingSeconds = Math.max(0, (this.deadlineAt - Date.now()) / 1000);
      const { delta, newStreak } = scoreForSpeedAnswer(remainingSeconds, this.data.streak);
      this.setData({
        solved: true,
        feedback: 'correct',
        score: this.data.score + delta,
        streak: newStreak,
        correctCount: this.data.correctCount + 1,
      });
    } else {
      this.setData({
        solved: true,
        feedback: 'wrong',
        score: scoreForWrong(this.data.score),
        streak: 0,
        wrongCount: this.data.wrongCount + 1,
      });
    }
    setTimeout(() => void this.next(), ANSWER_FLASH_DELAY);
  },

  async next() {
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex < this.data.problems.length) {
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
    await mathDrillService.finishGame({
      userId: this.userId,
      chapterId: this.chapterId,
      score: this.data.score,
      correctCount: this.data.correctCount,
      wrongCount: this.data.wrongCount,
      responseTimes: this.responseTimes,
    });
    wx.redirectTo({
      url: `/pages/memory-result/memory-result?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  onExit() {
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
