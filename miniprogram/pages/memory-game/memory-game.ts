// 游戏页（Chapter 07 §7；玩法为消消乐——Owner 2026-07-19 定）：
// 卡片全部明面，点选两张「单词+释义」配对正确即消除，全部消除获胜。
// 计时用时间戳（setInterval 会漂移）；切后台自动 PAUSED（Q5）；退出弹确认（§7）。
import {
  GAME_DURATION_SECONDS,
  isMatch,
  scoreForCorrect,
  scoreForWrong,
  type MemoryCard,
} from '../../services/memoryGameLogic';
import { memoryGameService } from '../../services/memoryGameService';
import { userService } from '../../services/userService';

type BoardCard = MemoryCard & { selected: boolean; wrong: boolean };
type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
const WRONG_FLASH_DELAY = 400; // 配对错误的红闪提示时长（ms）
const TIMER_TICK = 500; // 倒计时刷新间隔（ms；剩余秒按时间戳折算，不受 tick 漂移影响）

Page({
  data: {
    status: 'READY' as GameStatus,
    poolEmpty: false,
    cards: [] as BoardCard[],
    selected: -1, // 当前选中卡片下标（-1=无）
    lock: false,
    score: 0,
    streak: 0,
    correctCount: 0,
    wrongCount: 0,
    matchedPairs: 0,
    totalPairs: 0,
    remainingSeconds: GAME_DURATION_SECONDS,
  },

  chapterId: '',
  semesterId: '',
  userId: '',
  poolIds: [] as string[],
  correctIds: new Set<string>(),
  wrongIds: new Set<string>(),
  endAt: 0,
  // 计时器句柄类型随编译环境而定（微信=number，Node 测试环境=Timeout），用 ReturnType 兼容
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
    const start = await memoryGameService.startGame(user._id, this.chapterId);
    if (!start.eligible) {
      this.setData({ poolEmpty: true }); // §13：提示先完成学习
      return;
    }
    this.poolIds = start.poolIds;
    this.setData({
      cards: start.deck.map((card) => ({ ...card, selected: false, wrong: false })),
      totalPairs: start.poolIds.length,
    });
  },

  onStartGame() {
    this.endAt = Date.now() + GAME_DURATION_SECONDS * 1000;
    this.setData({ status: 'PLAYING' });
    this.startTimer();
    // §7：退出需要确认（真机手势返回时拦截提示）
    wx.enableAlertBeforeUnload({ message: '本局进行中，退出将不保存' });
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((this.endAt - Date.now()) / 1000));
      this.setData({ remainingSeconds: remaining });
      if (remaining <= 0) void this.finish(false);
    }, TIMER_TICK);
  },

  stopTimer() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  },

  // Q5：切后台自动暂停，回前台从剩余秒继续
  onHide() {
    if (this.data.status !== 'PLAYING') return;
    this.stopTimer();
    this.setData({ status: 'PAUSED' });
  },

  onShow() {
    if (this.data.status !== 'PAUSED') return;
    this.endAt = Date.now() + this.data.remainingSeconds * 1000;
    this.setData({ status: 'PLAYING' });
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
    wx.disableAlertBeforeUnload();
  },

  // 消消乐点选：第一次选中，第二次判定（配对消除 / 不配红闪）
  onCardTap(event: WechatMiniprogram.CustomEvent<{ index: number }>) {
    const { index } = event.detail;
    const { status, lock, cards, selected } = this.data;
    if (status !== 'PLAYING' || lock) return;
    const card = cards[index];
    if (!card || card.eliminated) return;
    // 未选中 → 选中本卡
    if (selected === -1) {
      this.setData({
        selected: index,
        cards: cards.map((item, idx) => (idx === index ? { ...item, selected: true } : item)),
      });
      return;
    }
    // 再点同一卡 → 取消选中
    if (selected === index) {
      this.setData({
        selected: -1,
        cards: cards.map((item, idx) => (idx === index ? { ...item, selected: false } : item)),
      });
      return;
    }
    const first = cards[selected];
    if (!first) return;
    if (isMatch(first, card)) {
      this.applyMatch(selected, index, first);
      return;
    }
    this.applyMismatch(selected, index, first, card);
  },

  // 配对成功：两卡消除 + 计分（Q2），全部消除即获胜
  applyMatch(firstIndex: number, secondIndex: number, first: BoardCard) {
    const { delta, newStreak } = scoreForCorrect(this.data.streak);
    this.correctIds.add(first.knowledgeId);
    const matchedPairs = this.data.matchedPairs + 1;
    this.setData({
      cards: this.data.cards.map((item, idx) =>
        idx === firstIndex || idx === secondIndex
          ? { ...item, eliminated: true, selected: false }
          : item,
      ),
      selected: -1,
      score: this.data.score + delta,
      streak: newStreak,
      correctCount: this.data.correctCount + 1,
      matchedPairs,
    });
    if (matchedPairs >= this.data.totalPairs) void this.finish(true);
  },

  // 配对失败：红闪一拍后复位，-2 分且连击清零（Q2）
  applyMismatch(firstIndex: number, secondIndex: number, first: BoardCard, second: BoardCard) {
    this.wrongIds.add(first.knowledgeId);
    this.wrongIds.add(second.knowledgeId);
    this.setData({
      lock: true,
      score: scoreForWrong(this.data.score),
      streak: 0,
      wrongCount: this.data.wrongCount + 1,
      cards: this.data.cards.map((item, idx) =>
        idx === firstIndex || idx === secondIndex ? { ...item, wrong: true } : item,
      ),
    });
    setTimeout(() => {
      this.setData({
        selected: -1,
        lock: false,
        cards: this.data.cards.map((item, idx) =>
          idx === firstIndex || idx === secondIndex
            ? { ...item, wrong: false, selected: false }
            : item,
        ),
      });
    }, WRONG_FLASH_DELAY);
  },

  async finish(allMatched: boolean) {
    if (this.data.status === 'FINISHED') return;
    this.stopTimer();
    wx.disableAlertBeforeUnload();
    this.setData({ status: 'FINISHED' });
    await memoryGameService.finishGame({
      userId: this.userId,
      chapterId: this.chapterId,
      poolIds: this.poolIds,
      correctIds: [...this.correctIds],
      wrongIds: [...this.wrongIds],
      score: this.data.score,
      remainingSeconds: this.data.remainingSeconds,
      allMatched,
    });
    wx.redirectTo({
      url: `/pages/memory-result/memory-result?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  onExit() {
    // §7/§13：退出需确认，退出不保存本局
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
