// 口算冒险岛 · 答题页（数学学科·小学）。
//
// 一次一题：数字键盘输入 → 判定 → 即时反馈 → 关卡进度推进 → 结算。
// 本页的设计要点（也是它存在的理由）：
//   1. 有生命 ❤️ 与连胜 🔥，答错不直接过，第一次错给第二次机会（不公布答案）；
//   2. 每关有各自的进度表现（森林步数 / 桥板 / 火山能量 / 巨龙血量 / 宝箱评级）；
//   3. 结束回本页结算弹层（可再来一次），不跳统一结果页——冒险岛的成长感在自己这闭环。
//
// 判定与进度推进全部走 core/mathIsland 的纯函数，本页只管渲染与计时。
import {
  applyCorrect,
  applyWrongFirst,
  applyWrongSecond,
  createRun,
  currentQuestion,
  freeLevel,
  timeoutRun,
  accuracyOf,
  ISLAND_MAX_LIVES,
  ISLAND_OPS,
  type IslandLevelDef,
  type IslandOp,
  type IslandProgress,
  type IslandQuestion,
  type IslandRunState,
} from '../../core/mathIsland';
import { isInputComplete } from '../../core/answerInput';
import {
  comboWordOf,
  findLevel,
  islandCfgWithGrade,
  ISLAND_ENCOURAGE,
} from '../../config/mathIsland';
import { mathIslandService } from '../../services/mathIslandService';
import { islandBadgePatchOf } from '../../services/mathIslandService';
import type { IslandRunSummary } from '../../services/mathIslandService';
import { gameProfileService } from '../../services/gameProfileService';
import { gainTextOf } from '../../services/gameRewardService';
import { userService } from '../../services/userService';
import { gradeScope } from '../../services/gradeScope';
import { gameResultSync } from '../../services/gameResultSyncService';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { withTimeout } from '../../utils/withTimeout';
import { haptics } from '../../utils/haptics';

// 反馈展示时长（与参考实现一致：答对短、二次错要留出看答案的时间）
const DELAY_CORRECT = 620;
const DELAY_WRONG_FIRST = 900;
const DELAY_WRONG_SECOND = 1700;

// 冒险岛查章知识点最多等这么久：等不到就当没有（不挂知识点、不回流，照样能玩）
const ISLAND_KNOWLEDGE_WAIT_MS = 3000;
const MAX_INPUT_LEN = 4;

type FeedbackKind = '' | 'correct' | 'wrong' | 'answer';

function parseOps(raw: string | undefined): IslandOp[] {
  if (!raw) return ['add', 'sub'];
  const list = raw
    .split(',')
    .filter((o): o is IslandOp => (ISLAND_OPS as readonly string[]).includes(o));
  return list.length > 0 ? list : ['add', 'sub'];
}

Page({
  data: {
    levelName: '',
    env: '',
    mode: '' as string,
    question: null as IslandQuestion | null,
    input: '',
    feedback: '' as FeedbackKind,
    feedbackTitle: '',
    feedbackSub: '',
    hearts: '❤️❤️❤️',
    stars: 0,
    combo: 0,
    metaText: '',
    barLabel: '',
    barRight: '',
    barPercent: 0,
    barHint: '',
    // 带 i 字段：WXML 的 wx:key 要求唯一，'todo'/'false' 会重复，不能直接 *this
    forestDots: [] as { i: number; state: string }[],
    bridgePlanks: [] as { i: number; on: boolean }[],
    timeLeft: 0,
    showResult: false,
    summary: null as IslandRunSummary | null,
    // 入账到全站钱包后的展示（让孩子看到「这一局为账户赚了多少」）
    walletGain: '',
    walletBadgeText: '',
  },

  run: null as IslandRunState | null,
  level: null as IslandLevelDef | null,
  userId: '',
  chapterId: '',
  startedAt: 0,
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  locked: false,
  /**
   * L4：本局每道题的作答结果（结算时回流错题本 / 掌握度用）。
   * 只有挂上了知识点的题才会记进来——没挂上的题照样能玩，只是不回流。
   */
  answerLog: [] as { knowledgeId: string; correct: boolean; hintUsed: boolean }[],
  // 当前这道题是否已经「第一次错、给了第二次机会」（第二次做对了也该扣掌握度）
  pendingHint: false,
  // 账号存档：进页面就预取（不阻塞开局），结算时用来合并星星/金币/关卡状态
  progress: null as IslandProgress | null,
  progressPromise: null as Promise<IslandProgress> | null,

  // 存档按账号走：同一局可能连玩多关，取一次就缓存，结算后再覆盖为最新
  loadProgress(): Promise<IslandProgress> {
    if (this.progress) return Promise.resolve(this.progress);
    if (!this.progressPromise) {
      this.progressPromise = mathIslandService.load(this.userId).then((res) => {
        this.progress = res.progress;
        return res.progress;
      });
    }
    return this.progressPromise;
  },

  onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.chapterId = query.chapterId ?? '';
    void this.loadProgress(); // 预取：结算时就不必再等云

    // 自由练习：难度由地图页传过来（默认按册次推荐，家长可改）
    const level =
      query.levelId === 'free'
        ? freeLevel(parseOps(query.ops), Number(query.range) || 20, Number(query.count) || 10)
        : findLevel(query.levelId ?? '');
    if (!level) {
      wx.showToast({ title: '关卡不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.level = level;
    wx.setNavigationBarTitle({ title: `${level.icon} ${level.name}` });
    void this.startRun();
  },

  onUnload() {
    this.stopTimer();
  },

  onHide() {
    this.stopTimer();
  },

  onShow() {
    // 火山关从后台回来：倒计时继续（不清零，避免切后台刷时间）
    const run = this.run;
    if (run && !run.finished && run.mode === 'volcano' && this.timer === undefined) {
      this.startTimer();
    }
  },

  async startRun() {
    const level = this.level;
    if (!level) return;
    // L4：口算难度按当前年级收窄（一年级不给 100 以内除法，六年级不困在 10 以内加减）。
    // 年级解析不出时 islandCfgWithGrade 原样返回关卡曲线——宁可简单，也不瞎猜。
    const grade = gradeScope.currentGrade();
    // L4 第二阶段：查当前章节知识点，给每道口算题对上教材知识点（答错才能回流错题本）。
    // ⚠️ 读不到就当没有（空数组）→ 这一局只是不回流，不影响玩。
    const knowledgeList = this.chapterId
      ? ((await withTimeout(
          knowledgeRepository.listByChapter(this.chapterId),
          ISLAND_KNOWLEDGE_WAIT_MS,
          '冒险岛知识点',
        )) ?? [])
      : [];
    // 本局的作答记录（用于结算回流）：新的一局重新开始记
    this.answerLog = [];
    this.pendingHint = false;
    this.run = createRun(level, Math.random, islandCfgWithGrade(level.cfg, grade), knowledgeList);
    this.startedAt = Date.now();
    this.locked = false;
    this.setData({
      levelName: level.name,
      env: level.env,
      mode: level.mode,
      showResult: false,
      summary: null,
      feedback: '',
      input: '',
      timeLeft: level.seconds,
    });
    this.renderRun(this.run);
    if (level.mode === 'volcano') this.startTimer();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const left = this.data.timeLeft - 1;
      // 秒数要跟着刷新：metaText / barRight 只在 renderRun 里算，不在这里同步就会停在 60 秒
      this.setData({
        timeLeft: left,
        metaText: `🌋 剩 ${left} 秒`,
        barRight: `⏱ ${left} 秒`,
      });
      if (left > 0) return;
      this.stopTimer();
      const run = this.run;
      if (!run || run.finished) return;
      this.run = timeoutRun(run);
      this.renderRun(this.run);
      this.finishRun();
    }, 1000);
  },

  stopTimer() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  },

  // 把 run 的领域状态翻译成可直接渲染的视图字段（WXML 不做计算）
  renderRun(run: IslandRunState) {
    const q = currentQuestion(run);
    let metaText = `第 ${Math.min(run.idx + 1, run.need || run.questions.length)} / ${
      run.need || run.questions.length
    } 题`;
    let barLabel = '📚 自由练习';
    let barRight = `${Math.min(run.idx + 1, run.need)}/${run.need}`;
    let barPercent = 0;
    let barHint = '';
    const forestDots: { i: number; state: string }[] = [];
    const bridgePlanks: { i: number; on: boolean }[] = [];

    if (run.mode === 'volcano') {
      metaText = `🌋 剩 ${this.data.timeLeft} 秒`;
      barLabel = `🌋 火山能量 ${run.energy}%`;
      barRight = `⏱ ${this.data.timeLeft} 秒`;
      barPercent = run.energy;
      barHint = `已灭火 ${100 - run.energy}%，答对一次 -10%`;
    } else if (run.mode === 'dragon') {
      metaText = `🐉 巨龙 ${run.hp}/${this.level?.hp ?? 10} HP`;
      barLabel = '🐉 巨龙血量';
      barRight = `${run.hp} / ${this.level?.hp ?? 10} HP`;
      barPercent = Math.round((run.hp / Math.max(1, this.level?.hp ?? 10)) * 100);
      barHint = '连对 3 次连续攻击 · 连对 5 次直接必杀';
    } else if (run.mode === 'forest') {
      metaText = `🌲 第 ${Math.min(run.steps + 1, run.target)}/${run.target} 步`;
      barLabel = '🌲 森林小路';
      barRight = `${run.steps}/${run.target} 步${run.combo >= 3 ? ' ⚡加速中' : ''}`;
      for (let i = 0; i < run.target; i += 1) {
        forestDots.push({
          i,
          state: i < run.steps ? 'done' : i === run.steps ? 'now' : 'todo',
        });
      }
    } else if (run.mode === 'bridge') {
      metaText = `🌉 第 ${Math.min(run.planks + 1, run.target)}/${run.target} 块`;
      barLabel = '🌉 独木桥';
      barRight = `已点亮 ${run.planks}/${run.target} 块`;
      for (let i = 0; i < run.target; i += 1) bridgePlanks.push({ i, on: i < run.planks });
    } else if (run.need > 0) {
      // 固定题量关卡（口算村 / 胡萝卜 / 城堡 / 自由练习）：进度条按题号走
      if (run.mode === 'carrot') barLabel = '🥕 收集胡萝卜';
      else if (run.mode === 'castle') barLabel = '🏰 打开宝箱';
      else if (run.mode === 'village') barLabel = '🏡 口算村';
      barPercent = Math.round((Math.min(run.idx + 1, run.need) / Math.max(1, run.need)) * 100);
      if (run.mode === 'carrot') {
        barHint = `正确率 ≥ ${Math.round(run.passAcc * 100)}% 通关，现在 ${accuracyOf(run)}%`;
      }
    }
    // 森林 / 桥用点与板表现进度，不画数值条（它们的 need = 0，别拿它当分母）

    this.setData({
      question: q,
      hearts: '❤️'.repeat(run.lives) + '🤍'.repeat(Math.max(0, ISLAND_MAX_LIVES - run.lives)),
      stars: run.gainStars,
      combo: run.combo,
      metaText,
      barLabel,
      barRight,
      barPercent,
      barHint,
      forestDots,
      bridgePlanks,
    });
  },

  onKey(event: WechatMiniprogram.TouchEvent) {
    if (this.locked || !this.run || this.run.finished) return;
    const k = event.currentTarget.dataset.k as string;
    if (k === 'del') {
      this.setData({ input: this.data.input.slice(0, -1) });
    } else if (k === 'ok') {
      this.submit();
    } else if (this.data.input.length < MAX_INPUT_LEN) {
      const input = this.data.input + k;
      this.setData({ input });
      this.autoJudge(input);
    }
  },

  // 填对了就自动判定，不必再按「确定」（Owner 要求：填完就该自动检测）。
  // 判据与副作用说明见 core/answerInput.isInputComplete。
  autoJudge(input: string) {
    const run = this.run;
    if (!run || run.finished || this.locked) return;
    const q = currentQuestion(run);
    if (q && isInputComplete(input, q.answer)) this.submit(input);
  },

  submit(value?: string) {
    const run = this.run;
    if (!run || run.finished || this.locked) return;
    const q = currentQuestion(run);
    if (!q) return;
    // 显式把「刚按下的那个数」传进来，不依赖 this.data 的更新时机
    const raw = value ?? this.data.input;
    if (raw === '') {
      wx.showToast({ title: '先写下答案哦', icon: 'none' });
      return;
    }
    const val = Number(raw);
    if (!Number.isFinite(val)) {
      wx.showToast({ title: '请输入数字', icon: 'none' });
      return;
    }
    if (val === q.answer) this.onRight(run);
    else if (run.attempts === 0) this.onWrongFirst(run);
    else this.onWrongSecond(run, q);
  },

  onRight(run: IslandRunState) {
    const beforeSteps = run.steps;
    const beforeHp = run.hp;
    const next = applyCorrect(run);
    const word = comboWordOf(next.combo);
    let extra = '';
    if (next.mode === 'forest') {
      extra = next.steps - beforeSteps >= 2 ? '🌲 加速前进 2 步！' : '🌲 前进 1 步';
    } else if (next.mode === 'bridge') {
      extra = `🌉 点亮第 ${next.planks} 块桥板`;
    } else if (next.mode === 'volcano') {
      extra = '💧 灭火 -10%';
    } else if (next.mode === 'dragon') {
      const damage = beforeHp - next.hp;
      extra = damage >= 10 ? '⚔️ 必杀！' : `⚔️ 造成 ${damage} 点伤害`;
    }
    const healed = next.lives > run.lives;
    const sub = [extra, healed ? '❤️ 连对 3 题，恢复 1 颗生命' : '', word]
      .filter(Boolean)
      .join('　');
    haptics.cue('correct');
    this.logAnswer(run, true);
    this.applyAndShow(next, 'correct', '🎉 答对啦！', sub, DELAY_CORRECT);
  },

  // 第一次错：扣生命、断连胜，但不公布答案——再给一次机会
  onWrongFirst(run: IslandRunState) {
    // 只在第一次错震：第二次错紧接着来一下重震会很烦，那次已经是要公布答案了
    haptics.cue('wrong');
    // 第一次错不算「答错」，但算「用了提示」——第二次做对了也不能按一遍就对来记
    this.pendingHint = true;
    const next = applyWrongFirst(run);
    this.applyAndShow(
      next,
      'wrong',
      '❌ 再想一想！',
      '不着急，慢慢算～ 你还有一次机会',
      DELAY_WRONG_FIRST,
    );
  },

  // 第二次错：公布答案 + 鼓励，进入下一题
  onWrongSecond(run: IslandRunState, q: IslandQuestion) {
    this.logAnswer(run, false);
    const next = applyWrongSecond(run);
    const word =
      ISLAND_ENCOURAGE[Math.floor(Math.random() * ISLAND_ENCOURAGE.length)] ?? '继续加油！';
    this.applyAndShow(next, 'answer', `💪 答案是 ${q.answer}`, word, DELAY_WRONG_SECOND);
  },

  /**
   * 记一道题的结果（只记挂上了知识点的题）。
   * ⚠️ 没挂上知识点就什么都不记——宁可这一局不回流，也不往错题本里塞猜出来的知识点。
   */
  logAnswer(run: IslandRunState, correct: boolean): void {
    const q = currentQuestion(run);
    const knowledgeId = q?.knowledgeId;
    if (!knowledgeId) return;
    this.answerLog.push({ knowledgeId, correct, hintUsed: this.pendingHint });
    this.pendingHint = false;
  },

  applyAndShow(
    next: IslandRunState,
    feedback: FeedbackKind,
    title: string,
    sub: string,
    delay: number,
  ) {
    this.run = next;
    this.locked = true;
    this.renderRun(next);
    this.setData({ feedback, feedbackTitle: title, feedbackSub: sub, input: '' });
    setTimeout(() => {
      if (next.finished) {
        void this.finishRun();
        return;
      }
      this.locked = false;
      this.setData({ feedback: '' });
    }, delay);
  },

  async finishRun() {
    const run = this.run;
    const level = this.level;
    if (!run || !level) return;
    this.stopTimer();
    this.locked = true;
    const durationMs = Date.now() - this.startedAt;
    const progress = await this.loadProgress();
    const { progress: next, summary } = mathIslandService.commitRun({
      userId: this.userId,
      chapterId: this.chapterId,
      progress,
      level,
      run,
      durationMs,
    });
    // 连玩多关（再挑战一次）时，下一局直接用合并后的存档，不与云端来回
    this.progress = next;
    this.progressPromise = null;

    // 入账到全站钱包：星星/金币/钥匙 + 徽章判定（冒险岛把「本域事实」传进去）
    await this.rewardWallet(next, summary);

    // L4：把本局对错回流到掌握度与错题本。
    // ⚠️ 冒险岛不走 gameRewardService 门面（它自己管钱包），所以这里单独调一次。
    //    发后不理：回流只是锦上添花，绝不能拖慢结算页这一屏。
    this.syncResult();

    // 过关才震（summary.success === false = 生命用完 / 时间到，那一下不该是庆祝）
    if (summary.success) haptics.cue('finish');
    this.setData({ showResult: true, summary, feedback: '' });
  },

  /**
   * 结算时回流（发后不理）。
   * 只有「挂上了知识点的题」会被记进 answerLog，所以没挂上的局这里什么都不会做——
   * 孩子照样玩，只是不进错题本。
   */
  syncResult(): void {
    const log = this.answerLog;
    this.answerLog = [];
    if (log.length === 0) return;
    const correctIds: string[] = [];
    const wrongIds: string[] = [];
    const hintIds: string[] = [];
    for (const item of log) {
      if (item.correct) correctIds.push(item.knowledgeId);
      else wrongIds.push(item.knowledgeId);
      if (item.hintUsed) hintIds.push(item.knowledgeId);
    }
    void gameResultSync
      .sync({ userId: this.userId, source: 'island', correctIds, wrongIds, hintIds })
      .catch((error: unknown) => console.error('冒险岛结果回流失败', error));
  },

  async rewardWallet(progress: IslandProgress, summary: IslandRunSummary) {
    const loaded = await gameProfileService.load(this.userId);
    const res = gameProfileService.reward({
      userId: this.userId,
      profile: loaded.profile,
      stars: summary.stars,
      coins: summary.coins,
      correct: summary.correct,
      gameId: 'island',
      keys: summary.gainedKeys,
      badge: islandBadgePatchOf(progress, summary.maxCombo),
    });
    const text = res.newBadges.map((b) => `${b.icon}${b.name}`).join('、');
    this.setData({
      // 与其它游戏共用 gainTextOf：文案口径只有一处，不会一边写全角空格一边写普通空格
      walletGain: gainTextOf([
        `⭐+${summary.stars}`,
        `🪙+${summary.coins}`,
        summary.gainedKeys > 0 ? '🔑+1' : '',
      ]),
      walletBadgeText: text ? `🏅 新徽章：${text}` : '',
    });
  },

  onReplay() {
    void this.startRun();
  },

  onBackToMap() {
    wx.navigateBack();
  },

  onExit() {
    wx.showModal({
      title: '退出本关',
      content: '这局不会保存，确定退出吗？',
      confirmText: '退出',
      success: (res) => {
        if (res.confirm) wx.navigateBack();
      },
    });
  },
});
