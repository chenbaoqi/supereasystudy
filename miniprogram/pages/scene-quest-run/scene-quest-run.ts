// 情景应用闯关 · 答题页（数学 + 英语共用）。
//
// 与冒险岛同口径的两条：
//   1. **第一次错不公布答案**——只给 hint，再给一次机会；第二次错才给 explain + 答案。
//   2. 结算不跳统一结果页，本页弹层（「成长感在自己这闭环」）。
// 但奖励**走全站钱包的统一门面**（services/gameRewardService），不像冒险岛那样自算星币——
// 情景闯关的奖励就是「答对几题」，跟其它小游戏同一条换算规则。
//
// 低年级识字率不高（Owner 2026-09-18）：题目**自动念一遍**，可以手动关。
//   - 进组：念情景卡 + 第一问；换题：只念该题。
//   - 反馈（提示/讲解）也念——否则一年级孩子根本读不到「为什么错」。
//   - 朗读开着时**念完再跳下一题**（不然声音会被切在半句话上）；
//     合成/播放失败一律静默降级，念不出来就退回原来的定时跳转，绝不会卡住。
//
// 判定与进度推进全部走 core/scene 的纯函数，本页只管渲染与计时。
import { SCENE_PACKS } from '../../config/scenes';
import {
  createSceneRun,
  currentSceneQuestion,
  findSceneQuestWithPack,
  sceneFeedbackSpeak,
  sceneQuestionSpeak,
  sceneQuestionViewOf,
  sceneStorySpeak,
  submitSceneAnswer,
  type SceneQuest,
  type SceneQuestionView,
  type SceneRunState,
  type SceneSubject,
} from '../../core/scene';
import { GAIN_SEP } from '../../services/gameRewardService';
import { sceneQuestService } from '../../services/sceneQuestService';
import { userService } from '../../services/userService';
import { sfx } from '../../utils/synthAudio';
import { readAloud } from '../../utils/readAloud';
import { haptics } from '../../utils/haptics';

// 反馈展示时长：答对短；一次错要留出读提示的时间；二次错要留出看答案和讲解的时间
const DELAY_CORRECT = 700;
const DELAY_HINT = 1300;
const DELAY_REVEAL = 1900;

type FeedbackKind = '' | 'correct' | 'hint' | 'reveal';

Page({
  data: {
    questName: '',
    story: '',
    view: null as SceneQuestionView | null,
    progressText: '',
    progressPercent: 0,
    feedback: '' as FeedbackKind,
    feedbackTitle: '',
    feedbackSub: '',
    // 读题开关（默认开；存的是「关」标记，所以老用户升级上来也是开的）
    readAloudOn: readAloud.enabled(),
    showResult: false,
    resultTitle: '',
    resultSub: '',
    resultStat: '',
    walletGain: '',
    walletBadgeText: '',
  },

  quest: null as SceneQuest | null,
  subject: '数学' as SceneSubject,
  run: null as SceneRunState | null,
  userId: '',
  locked: false,
  // 页面还活着吗：朗读是异步的，念完回来时页面可能已经退了
  alive: true,
  startedAt: 0,

  onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    const hit = findSceneQuestWithPack(SCENE_PACKS, query.questId ?? '');
    if (!hit) {
      wx.showToast({ title: '没有找到这一组题', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.quest = hit.quest;
    this.subject = hit.pack.subject;
    wx.setNavigationBarTitle({ title: hit.quest.name });
    this.startRun();
  },

  onUnload() {
    this.alive = false;
    this.locked = true; // 页面已销毁，别再让定时器往下走
    readAloud.stop(); // 退出就闭嘴，别在别的页面继续念
  },

  startRun() {
    const quest = this.quest;
    if (!quest) return;
    this.run = createSceneRun(quest);
    this.startedAt = Date.now();
    this.locked = false;
    this.setData({
      questName: quest.name,
      story: quest.story,
      showResult: false,
      feedback: '',
      feedbackTitle: '',
      feedbackSub: '',
      walletGain: '',
      walletBadgeText: '',
    });
    this.render();
    // 进组时把情景卡也念上（整组共享的前提，后几问就不再重复念了）
    void this.speakQuestion(true);
  },

  // picked = 孩子选了哪一项（-1 未选）；revealed = 是否公布答案
  render(picked = -1, revealed = false) {
    const quest = this.quest;
    const run = this.run;
    if (!quest || !run) return;
    const total = quest.questions.length;
    this.setData({
      view: sceneQuestionViewOf(quest, run, picked, revealed),
      progressText: `第 ${Math.min(run.idx + 1, total)} / ${total} 问`,
      // 进度条按「已结束的题数」走，不要用 idx / total 联动（一次错时 idx 不动）
      progressPercent: Math.round((run.answered / Math.max(1, total)) * 100),
    });
  },

  // 念题。withStory = 连情景卡一起念（只在进组时）
  async speakQuestion(withStory: boolean) {
    const quest = this.quest;
    const run = this.run;
    if (!quest || !run || !readAloud.available()) return;
    const segments = [
      ...(withStory ? sceneStorySpeak(quest, this.subject) : []),
      ...sceneQuestionSpeak(quest, run, this.subject),
    ];
    await readAloud.speakMany(segments);
  },

  onTapReadQuestion() {
    readAloud.stop(); // 先掐掉正在念的，否则「再读一遍」会被当成打断而什么都不做
    void this.speakQuestion(false);
  },

  onToggleReadAloud() {
    const on = !this.data.readAloudOn;
    readAloud.setEnabled(on);
    this.setData({ readAloudOn: on });
    if (on) {
      void this.speakQuestion(false);
      return;
    }
    wx.showToast({ title: '已关掉读题', icon: 'none' });
  },

  onPick(event: WechatMiniprogram.TouchEvent) {
    if (this.locked) return;
    const quest = this.quest;
    const run = this.run;
    if (!quest || !run || run.finished) return;
    const picked = Number(event.currentTarget.dataset.index);
    if (!Number.isFinite(picked) || picked < 0) return;
    const q = currentSceneQuestion(quest, run);
    if (!q) return;

    const res = submitSceneAnswer(quest, run, picked);
    this.run = res.run;
    this.locked = true;

    if (res.kind === 'correct') {
      sfx.play('correct');
      haptics.cue('correct');
      this.render(picked, false);
      void this.afterAnswer('correct', '🎉 答对啦！', q.explain, DELAY_CORRECT);
      return;
    }
    // 一次错只给提示、不公布答案（与冒险岛同口径）：震一下提醒「这次不对」，
    // 但第二次错（reveal）不再震 —— 连着两下重震会很烦
    if (res.kind === 'hint') {
      sfx.play('wrong');
      haptics.cue('wrong');
      this.render(picked, false);
      void this.afterAnswer('hint', '🤔 再想一想', q.hint, DELAY_HINT);
      return;
    }
    sfx.play('wrong');
    this.render(picked, true);
    void this.afterAnswer(
      'reveal',
      `💡 答案是 ${q.options[q.answerIndex] ?? ''}`,
      q.explain,
      DELAY_REVEAL,
    );
  },

  // 先念反馈，念完再跳。
  // 朗读关着 / 合成失败时 speakMany 立刻返回，节奏与以前完全一致。
  async afterAnswer(kind: FeedbackKind, title: string, body: string, delay: number) {
    this.setData({ feedback: kind, feedbackTitle: title, feedbackSub: body });
    if (readAloud.available()) await readAloud.speakMany(sceneFeedbackSpeak(title, body));
    if (!this.alive) return;
    // hint 是「留在本题再选一次」，另外两种才是前进
    if (kind === 'hint') this.retry(delay);
    else this.next(delay);
  },

  // 进入下一问（或结算）
  next(delay: number) {
    setTimeout(() => {
      if (!this.alive) return;
      const run = this.run;
      if (run && run.finished) {
        void this.finishRun();
        return;
      }
      this.locked = false;
      this.setData({ feedback: '' });
      this.render();
      void this.speakQuestion(false);
    }, delay);
  },

  // 一次错：留在本题，清掉选中态让孩子重选
  retry(delay: number) {
    setTimeout(() => {
      if (!this.alive) return;
      this.locked = false;
      this.setData({ feedback: '' });
      this.render();
      // 不自动重念题干：刚念过，而且孩子马上要在同一题上再选一次
    }, delay);
  },

  async finishRun() {
    const quest = this.quest;
    const run = this.run;
    if (!quest || !run) return;
    this.locked = true;
    readAloud.stop();
    const durationMs = Date.now() - this.startedAt;
    const { summary, wallet } = await sceneQuestService.commitRun({
      userId: this.userId,
      quest,
      run,
      durationMs,
    });
    if (!this.alive) return;
    sfx.play(summary.passed ? 'levelup' : 'coin');
    // 通关才震：没过的时候来一下「庆祝感」的震动，反而是添堵
    if (summary.passed) haptics.cue('finish');
    this.setData({
      showResult: true,
      feedback: '',
      resultTitle: summary.passed ? '🎉 通关啦！' : '💪 差一点点',
      resultSub: summary.passed ? '这个故事你读懂了' : '再读一遍故事，下次一定能过',
      // 分隔符用 GAIN_SEP（全角空格）：小程序文本节点会折叠连续普通空格，
      // 直接写普通空格会粘成一块；写成转义常量是为了躲 eslint 的 no-irregular-whitespace。
      resultStat: `答对 ${summary.correct} / ${summary.total} 问${GAIN_SEP}正确率 ${summary.accuracy}%`,
      walletGain: wallet?.gain ?? '',
      walletBadgeText: wallet?.badges ?? '',
    });
  },

  onReplay() {
    this.startRun();
  },

  onBack() {
    wx.navigateBack();
  },
});
