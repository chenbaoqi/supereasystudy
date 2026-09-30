// 跟读练习（2026-09-29 跟读 POC）：听标准发音 → 按住说话复读 → 语音识别 → 判对错。
//
// 为什么需要它：拼写练的是「认出来」，跟读练的是「开口说」——这正是竞品「AI 外教」
// 真刀真枪的那半边，也是小程序端唯一可行的语音识别路径（微信同声传译插件）。
//
// ⚠️ 能力边界：只判「读对没」（识别文本 === 目标单词），**不判发音标不标准**——
//    插件 ASR 只返回文本、不给发音评分（见方案）。判分逻辑在 services/followReadService.ts。
//
// ⚠️ POC 决策：读对的词**不回流错题本**——语音识别有误判率，回流会把「读对了判错」
//    的假错题写进错题本；等真机验证误判率后再定。奖励：读对 1 词 = 1⭐。
import { shuffle } from '../../core/quizPool';
import { chapterRepository } from '../../repositories/chapterRepository';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { userService } from '../../services/userService';
import { gameProfileService } from '../../services/gameProfileService';
import { pronunciationService } from '../../services/pronunciationService';
import { matchSpoken } from '../../services/followReadService';
import { speechRecognizer, MicrophonePermissionError } from '../../services/speechRecognizer';
import { haptics } from '../../utils/haptics';
import { withTimeout } from '../../utils/withTimeout';
import { showStarGain } from '../../utils/starFeedback';

const QUESTION_COUNT = 10; // 一次跟读几个词
const LOAD_WAIT_MS = 6000;
const STAR_PER_CORRECT = 1; // 读对 1 个 = 1 经验（与「学完一个知识点」同档）

interface ReadItem {
  readonly _id: string;
  readonly word: string;
  readonly meaning: string;
  readonly pronunciation?: string; // 预录发音（有就用它，比合成快也准）
}

Page({
  data: {
    loading: true,
    loadFailed: false,
    items: [] as ReadItem[],
    index: 0,
    total: 0,
    current: null as ReadItem | null,
    recording: false,
    // '': 待读 / 'correct': 读对 / 'wrong': 读错（展示正确答案）
    result: '' as '' | 'correct' | 'wrong',
    recognized: '', // 识别出的文本（读错时展示「你读成了什么」）
    correctCount: 0,
    showResult: false,
    gainedStars: 0, // 本局获得的学分（结果页展示 +N⭐）
  },

  userId: '',
  semesterId: '',

  onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.semesterId = query.semesterId ?? '';
    void this.load();
    this.warmUpRecognizer();
  },

  onUnload() {
    // ⚠️ 管理器是全局单例，离开页面必须 stop，否则残留录音状态
    speechRecognizer.dispose();
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
  },

  // 预热：进页就先把录音权限要了 + 让插件完成首次初始化。
  // 两个真机坑（2026-09-29 实测）都靠它规避：
  //   ① 插件「第一次识别常返回空」（官方社区已知，第二次才好）——预热就是那次「第一次」；
  //   ② 授权弹窗会打断 touchstart，导致「按住 → 弹窗 → 松手」时 stop 拿到空串被判「没听清」。
  warmUpRecognizer() {
    void (async () => {
      try {
        await speechRecognizer.start();
        await new Promise((r) => setTimeout(r, 150));
        await speechRecognizer.stop();
      } catch (error) {
        // 预热失败静默：权限被拒不打扰，正式使用时再处理
        if (!(error instanceof MicrophonePermissionError)) console.error('跟读预热失败', error);
      }
    })();
  },

  async load() {
    this.setData({ loading: true, loadFailed: false });
    const chapters = await withTimeout(
      chapterRepository.listBySemester(this.semesterId),
      LOAD_WAIT_MS,
      '跟读题目读取',
    );
    if (chapters === null) {
      this.setData({ loading: false, loadFailed: true });
      return;
    }
    const lists = await Promise.all(
      chapters.map((chapter) =>
        withTimeout(
          knowledgeRepository.listByChapter(chapter._id),
          LOAD_WAIT_MS,
          '跟读题目读取',
        ).catch(() => null),
      ),
    );
    const pool: ReadItem[] = [];
    for (const list of lists) {
      for (const item of list ?? []) {
        const word = (item.word ?? '').trim();
        const meaning = (item.meaning ?? '').trim();
        // 只收能读的词汇点（有英文单词 + 中文释义，且单词里只有字母/连字符/空格）
        if (!word || !meaning) continue;
        if (!/^[A-Za-z][A-Za-z\-' ]*$/.test(word)) continue;
        pool.push({ _id: item._id, word, meaning, pronunciation: item.pronunciation });
      }
    }
    const picked = shuffle(pool, Math.random).slice(0, QUESTION_COUNT);
    this.setData({ loading: false, items: picked, total: picked.length });
    this.showAt(0);
  },

  showAt(index: number) {
    const current = this.data.items[index] ?? null;
    this.setData({ index, current, recording: false, result: '', recognized: '' });
  },

  /** 听一遍标准发音（跟读前的示范，也帮孩子回忆） */
  onPlayAudio() {
    const current = this.data.current;
    if (!current) return;
    void this.playSource(
      () => pronunciationService.speak(current.word, current.pronunciation),
      '发音不可用，请检查网络或插件配置',
    );
  },

  audio: null as WechatMiniprogram.InnerAudioContext | null,

  // 拿到音频地址后播放（speak 只返回地址，播放是这里的责任）
  async playSource(loadSrc: () => Promise<string>, errorMessage: string) {
    try {
      const src = await loadSrc();
      if (!this.audio) {
        this.audio = wx.createInnerAudioContext();
        // 播放失败（地址失效 / 网络）时 play() 不报错、只触发 onError，必须监听否则静默无声
        this.audio.onError(() => {
          console.error(errorMessage);
          wx.showToast({ title: '发音播放失败，请检查网络', icon: 'none' });
        });
      }
      this.audio.stop();
      this.audio.src = src;
      this.audio.play();
    } catch (error) {
      console.error(errorMessage, error);
      wx.showToast({ title: errorMessage, icon: 'none' });
    }
  },

  async onTouchStart() {
    if (this.data.result !== '') return; // 已判分，等进入下一词
    if (this.data.recording) return;
    try {
      await speechRecognizer.start();
      // start 真正成功（录音已开始）才置 recording：授权弹窗打断 touchstart 时，
      // 不置 true，onTouchEnd 就不会误判「没听清」
      this.setData({ recording: true });
    } catch (error) {
      // 权限被拒时识别器已经弹过「去开启」引导，别再弹一次 toast
      if (!(error instanceof MicrophonePermissionError)) this.showError(error);
    }
  },

  async onTouchEnd() {
    if (!this.data.recording) return;
    this.setData({ recording: false });
    let text: string;
    try {
      text = await speechRecognizer.stop();
    } catch (error) {
      this.showError(error);
      return;
    }
    this.judge(text);
  },

  onTouchCancel() {
    // 手指滑出 / 系统打断：停止录音但不判分
    this.setData({ recording: false });
    void speechRecognizer.stop().catch(() => undefined);
  },

  judge(text: string) {
    const current = this.data.current;
    if (!current) return;
    const got = text.trim();
    if (!got) {
      // 没听清：不计对错、不切题，提示重试
      wx.showToast({ title: '没听清，再试一次', icon: 'none' });
      return;
    }
    const ok = matchSpoken(got, current.word);
    haptics.cue(ok ? 'correct' : 'wrong');
    this.setData({
      result: ok ? 'correct' : 'wrong',
      recognized: got,
      correctCount: this.data.correctCount + (ok ? 1 : 0),
    });
  },

  showError(error: unknown) {
    const msg = error instanceof Error ? error.message : '录音识别失败';
    wx.showToast({ title: msg, icon: 'none' });
  },

  onNext() {
    const next = this.data.index + 1;
    if (next >= this.data.total) {
      void this.finish();
      return;
    }
    this.showAt(next);
  },

  onRetry() {
    void this.load();
  },

  async finish() {
    const correctCount = this.data.correctCount;
    const stars = correctCount * STAR_PER_CORRECT;
    // 经验值：读对了就给（与「学完一个知识点」同档）。+N⭐ 由结果页展示，这里只报徽章。不回流错题本（POC 决策）
    if (stars > 0) {
      void gameProfileService
        .awardLearning(this.userId, { stars, correct: correctCount })
        .then((badges) => showStarGain(0, badges))
        .catch((error: unknown) => console.error('跟读学分入账失败', error));
    }
    this.setData({ showResult: true, gainedStars: stars });
  },

  onBack() {
    wx.navigateBack();
  },
});
