// 拼写练习（2026-09-21）：给中文释义，让孩子把单词**打出来**。
//
// 为什么需要它：英语那 2348 道题**全是四选一**——孩子只能「认出」正确答案。
// 而记忆研究里「认出来」和「想出来」差得远：手写/拼写逼他想出整个单词，才记得住。
// （同类产品「单词乐园」敢把「手写」写进标题当卖点，就是赌这一点。）
//
// ⚠️ 为什么不塞进测试页：测试是「考」，考到一半要打字会打断节奏；
//    而且测试页的题全是 ChoiceQuestion，改它的题型链路要动生成/渲染/统计好几处。
//    拼写是「练」，独立成页更贴合，也不碰已经跑通的考试链路。
//
// 数据：不用新增——词汇点自带 word + meaning + pronunciation。
// 判定：复用 questionJudge 的 normalizeText（已转小写、去空格、全角转半角）。
import { shuffle } from '../../core/quizPool';
import { chapterRepository } from '../../repositories/chapterRepository';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { userService } from '../../services/userService';
import { gameProfileService } from '../../services/gameProfileService';
import { gameResultSync } from '../../services/gameResultSyncService';
import { normalizeText } from '../../services/questionJudge';
import { pronunciationService } from '../../services/pronunciationService';
import { withTimeout } from '../../utils/withTimeout';
import { showStarGain } from '../../utils/starFeedback';

const QUESTION_COUNT = 10; // 一次练几个词
const LOAD_WAIT_MS = 6000;
const STAR_PER_CORRECT = 1; // 拼对 1 个 = 1 经验（与「学完一个知识点」同档）

interface SpellItem {
  readonly _id: string;
  readonly word: string;
  readonly meaning: string;
  readonly pronunciation?: string; // 预录发音（有就用它，比合成快也准）
}

Page({
  data: {
    loading: true,
    loadFailed: false,
    items: [] as SpellItem[],
    index: 0,
    total: 0,
    current: null as SpellItem | null,
    input: '',
    // '': 作答中 / 'correct': 答对 / 'wrong': 答错（展示正确答案）
    feedback: '' as '' | 'correct' | 'wrong',
    correctCount: 0,
    // 首字母提示（降低难度：完全凭空拼对低年级太难了）
    hint: '',
    showResult: false,
    gainedStars: 0, // 本局获得的学分（结果页展示 +N⭐）
  },

  userId: '',
  semesterId: '',
  wrongIds: [] as string[],

  onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.semesterId = query.semesterId ?? '';
    void this.load();
  },

  async load() {
    this.setData({ loading: true, loadFailed: false });
    const chapters = await withTimeout(
      chapterRepository.listBySemester(this.semesterId),
      LOAD_WAIT_MS,
      '拼写题目读取',
    );
    if (chapters === null) {
      this.setData({ loading: false, loadFailed: true });
      return;
    }
    // 各章知识点并行读（串行会明显变慢，见「打开页面慢」那次的教训）
    const lists = await Promise.all(
      chapters.map((chapter) =>
        withTimeout(
          knowledgeRepository.listByChapter(chapter._id),
          LOAD_WAIT_MS,
          '拼写题目读取',
        ).catch(() => null),
      ),
    );
    const pool: SpellItem[] = [];
    for (const list of lists) {
      for (const item of list ?? []) {
        const word = (item.word ?? '').trim();
        const meaning = (item.meaning ?? '').trim();
        // 只收词汇点（有英文单词 + 中文释义，且单词里只有字母/连字符/空格）
        if (!word || !meaning) continue;
        if (!/^[A-Za-z][A-Za-z\-' ]*$/.test(word)) continue;
        pool.push({ _id: item._id, word, meaning, pronunciation: item.pronunciation });
      }
    }
    const picked = shuffle(pool, Math.random).slice(0, QUESTION_COUNT);
    this.setData({
      loading: false,
      items: picked,
      total: picked.length,
    });
    this.showAt(0);
  },

  showAt(index: number) {
    const current = this.data.items[index] ?? null;
    this.setData({
      index,
      current,
      input: '',
      feedback: '',
      hint: current ? `${current.word[0]}…` : '',
    });
  },

  onInput(event: WechatMiniprogram.Input) {
    this.setData({ input: event.detail.value ?? '' });
  },

  /** 听一遍发音（听音拼写，比看中文更难一档，但更接近真实使用） */
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

  onSubmit() {
    if (this.data.feedback !== '') return; // 已经判过，等进入下一题
    const current = this.data.current;
    if (!current) return;
    const got = normalizeText(this.data.input);
    if (!got) {
      wx.showToast({ title: '先写下单词哦', icon: 'none' });
      return;
    }
    const correct = got === normalizeText(current.word);
    if (correct) {
      this.setData({ feedback: 'correct', correctCount: this.data.correctCount + 1 });
    } else {
      this.wrongIds.push(current._id);
      this.setData({ feedback: 'wrong' });
    }
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
    // 经验值：拼对了就给（与「学完一个知识点」同档）。+N⭐ 由结果页展示，这里只报徽章
    if (stars > 0) {
      void gameProfileService
        .awardLearning(this.userId, { stars, correct: correctCount })
        .then((badges) => showStarGain(0, badges))
        .catch((error: unknown) => console.error('拼写学分入账失败', error));
    }
    // 拼错的回流错题本（发后不理）
    if (this.wrongIds.length > 0) {
      void gameResultSync
        .sync({ userId: this.userId, source: 'spelling', correctIds: [], wrongIds: this.wrongIds })
        .catch((error: unknown) => console.error('拼写结果回流失败', error));
    }
    this.setData({ showResult: true, gainedStars: stars });
  },

  onBack() {
    wx.navigateBack();
  },

  onUnload() {
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
  },
});
