// 学习详情页（Chapter 04 §5：知识卡 + 收藏 + 进度 + 上一条/下一条/完成学习；
// §7：Next 后立即更新学习记录；§8：无例句/图片则隐藏）。
import type { Knowledge } from '../../core/knowledge';
import type { LearningSession } from '../../services/learningService';
import { favoriteRepository } from '../../repositories/favoriteRepository';
import { gradeScope } from '../../services/gradeScope';
import { learningService } from '../../services/learningService';
import { pronunciationService } from '../../services/pronunciationService';
import { allowSpeech } from '../../services/speechPolicy';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { visualViewOf, type VisualType } from '../../core/visual';
import { getSubjectUiConfig } from '../../config/subjects';
import { FEATURE_FLAGS } from '../../config/features';
import { gameProfileService } from '../../services/gameProfileService';
import { userService } from '../../services/userService';
import { showStarGain } from '../../utils/starFeedback';
import { readAloud, splitForSpeech } from '../../utils/readAloud';

// 学分经验值（2026-09-20）：学习**本来是**这个产品的主行为，
// 但升级只靠玩游戏——学完一整章进度条一动不动，等于告诉孩子「学习不算数」。
// 这两条数值与「学完一册 ≈ 160⭐（Lv.4）」对齐，跟教材进度同节奏。
const STAR_PER_KNOWLEDGE = 1; // 学完 1 个知识点
const STAR_PER_CHAPTER = 5; // 学完一整章
// 自动读讲解开关（本机存储，存「开」，默认关——手动点才是默认行为）
const EXPLAIN_AUTO_KEY = 'explain_aloud_auto_v1';

Page({
  data: {
    session: null as LearningSession | null,
    current: null as Knowledge | null,
    index: 0,
    total: 0,
    isFirst: true,
    isLast: false,
    isFavorite: false,
    favoriteIds: [] as string[],
    showSpeech: false, // 是否显示「🔊 发音」（非语言学科关闭）
    showExplain: false, // 是否有讲解（控制「听讲解」按钮显示；无讲解的词汇点不显示）
    autoRead: false, // 自动读讲解开关（打开后切换知识点自动朗读）
    showAiTutor: FEATURE_FLAGS.aiTutor, // 「问 AI」按钮（第三十八章）
    // 知识配图（B-7 闭环）：取本知识点第一道题声明的 visual。
    // 学习阶段也该看得见图 —— 只靠文字讲「坐标系/分数」对初中小学是抽象的。
    visualType: '' as VisualType | '',
    visualProps: {} as Record<string, unknown>,
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
    // 当前年级：跨年级专题包（如数学公式专题）按年级过滤超纲公式（ADR-012）
    this.grade = gradeScope.currentGrade();
    // ⚠️ 这三件事彼此没有依赖（都只用 user / query），原本串行等了三轮云调用。
    //    详情页是打开最频繁的页面之一，并起来是最直接的一处提速。
    const [subject, session, favorites] = await Promise.all([
      this.semesterId ? resolveSubjectOfSemester(this.semesterId) : Promise.resolve(null),
      // restart=1：来自测试结果页「重新学习」（§5 Test Result），重置进度
      query.restart
        ? learningService.startLearning(user._id, this.chapterId, this.grade)
        : learningService.continueLearning(user._id, this.chapterId, this.grade),
      favoriteRepository.listByUser(user._id),
    ]);
    // 语音能力按学科判定：数学等学科不支持朗读（详见 services/speechPolicy）
    this.subjectSupportsSpeech = subject
      ? getSubjectUiConfig(subject.subjectName).supportsSpeech
      : null;
    // 学科名同时给「问 AI」用（AI 需要知道自己在讲哪一科）
    this.subjectName = subject?.subjectName ?? '';
    this.setData({
      session,
      total: session.knowledgeList.length,
      favoriteIds: favorites.map((item) => item.knowledgeId),
    });
    this.showAt(session.currentIndex);
  },

  userId: '',
  chapterId: '',
  semesterId: '',
  grade: null as number | null,
  // 学科是否支持语音；null = 学科未知（缺 semesterId 或反查失败），交由知识点类型兜底
  subjectSupportsSpeech: null as boolean | null,
  subjectName: '',

  // 本次学习已发经验的进度位置：只给「新学到的」发，反复来回翻不重复计
  awardedUpTo: -1,

  /**
   * 发放学习经验（发后不理）。
   * ⚠️ 学习路径绝不能因为入账失败而中断——失败只是没拿到⭐，课照学。
   * announce=true 才报「+N⭐」：学知识点是高频（翻页就触发），不报星只报徽章；
   * 学完一章（+5⭐）才 announce。
   */
  awardStars(stars: number, announce = false): void {
    if (stars <= 0 || !this.userId) return;
    void gameProfileService
      .awardLearning(this.userId, { stars })
      .then((badges) => showStarGain(announce ? stars : 0, badges))
      .catch((error: unknown) => console.error('学习经验入账失败', error));
  },

  showAt(index: number) {
    const session = this.data.session;
    if (!session) return;
    const current = session.knowledgeList[index] ?? null;
    // 学分：学到**新**的知识点才给（回到看过的不再重复发）
    if (index > this.awardedUpTo) {
      this.awardedUpTo = index;
      this.awardStars(STAR_PER_KNOWLEDGE);
    }
    // 类型不认识 / 缺必填属性时 visualType 为空串，wxml 不渲染也不报错
    // 取该知识点里**第一道配了图的题**，而不是写死第一题：
    // 知识点展示的是「这个知识点本身」，配哪道题的图都成立；
    // 写死 quiz[0] 的话，题目顺序一调整（或某道题漏配图）图就突然没了（2026-09-19 排查踩到）。
    const visual = visualViewOf(current?.quiz?.find((item) => item.visual)?.visual);
    const autoRead = this.readAutoRead();
    this.setData({
      current,
      ...visual,
      index,
      isFirst: index <= 0,
      isLast: index >= session.knowledgeList.length - 1,
      isFavorite: current ? this.data.favoriteIds.includes(current._id) : false,
      showSpeech: allowSpeech(this.subjectSupportsSpeech, current),
      showExplain: !!current?.explanation,
      autoRead,
      loading: false,
    });
    // 自动读开关打开时，切换知识点就自动朗读讲解（打断上一个，读当前）
    if (autoRead && current?.explanation) {
      void this.onPlayExplanation();
    }
  },

  onNext() {
    const { session, index } = this.data;
    if (!session || !this.userId) return;
    const next = index + 1;
    const target = session.knowledgeList[next];
    if (!target) return;
    // ⚠️ 先翻页，再记进度（2026-09-21 Owner 报「点了没变化」）。
    //    原来这里是 `await updateProgress(...)` 之后才 showAt：
    //    那条云调用既没有超时保护、出错也没人接，只要它慢一下或抛一次，
    //    后面的 showAt 就永远不执行 —— 表现就是「点下一条毫无反应」。
    //    学习进度是**辅助记录**，绝不能让它卡住翻页这条主链路（发后不理）。
    this.showAt(next);
    void learningService
      .updateProgress(this.userId, this.chapterId, target._id, next)
      .catch((error: unknown) => console.error('学习进度保存失败（不影响继续学）', error));
  },

  onPrevious() {
    if (this.data.index > 0) this.showAt(this.data.index - 1);
  },

  onFinish() {
    if (!this.userId) return;
    // 学分：学完一整章额外奖励（比一个个知识点加起来更有「完成感」）
    this.awardStars(STAR_PER_CHAPTER, true);
    // 同上：收尾的云写入不阻塞跳转（不然「学完」按钮也会点了没反应）
    void learningService
      .finishLearning(this.userId, this.chapterId, this.grade)
      .catch((error: unknown) => console.error('学习完成记录失败（不影响进测试）', error));
    wx.redirectTo({
      url: `/pages/test/test?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  async onToggleFavorite() {
    const { current, isFavorite, favoriteIds } = this.data;
    if (!current || !this.userId) return;
    if (isFavorite) {
      await favoriteRepository.remove(this.userId, current._id);
      this.setData({
        isFavorite: false,
        favoriteIds: favoriteIds.filter((id) => id !== current._id),
      });
    } else {
      await favoriteRepository.add(this.userId, current._id);
      this.setData({ isFavorite: true, favoriteIds: [...favoriteIds, current._id] });
    }
  },

  // 问 AI（第三十八章）：只带短上下文——知识点名 + 学科 + 年级。
  // 不传意义/例句：AI 拿到知识点名就足够解释，URL 也不该塞长文本。
  onAskAi() {
    const current = this.data.current;
    if (!current) return;
    const params = [`knowledgeTitle=${encodeURIComponent(current.word)}`];
    if (this.subjectName) params.push(`subjectName=${encodeURIComponent(this.subjectName)}`);
    if (this.grade) params.push(`grade=${this.grade}`);
    wx.navigateTo({ url: `/pages/ai-tutor/ai-tutor?${params.join('&')}` });
  },

  audio: null as WechatMiniprogram.InnerAudioContext | null,

  // 发音（Owner 2026-07-20 修订：TTS 常态化，不再依赖数据自带音频；重播不限）
  async onPlayWord() {
    const current = this.data.current;
    if (!current) return;
    await this.playSource(
      () => pronunciationService.speak(current.word, current.pronunciation),
      '音频源不可用，请检查网络或插件配置',
    );
  },

  // 例句朗读（2026-09-29）：例句没有预录发音，走插件 TTS 合成英式发音。
  // 复用 onPlayWord 同一套播放与失败提示，别另写一份播放器。
  async onPlayExample() {
    const example = this.data.current?.example;
    if (!example) return;
    await this.playSource(
      () => pronunciationService.speak(example),
      '例句音频源不可用，请检查网络或插件配置',
    );
  },

  // 听讲解（2026-09-30 全语音讲解）：把 explanation 按标点切成 ≤50 字片段，
  // 走 readAloud.speakMany 逐段合成朗读（中文）。所有学科的中文讲解都能读，
  // 与「🔊 发音」解耦（发音按钮仍只给英语）。
  onPlayExplanation() {
    const text = this.data.current?.explanation;
    if (!text) return;
    void readAloud.speakMany(
      splitForSpeech(text).map((t) => ({ text: t, lang: 'zh_CN' as const })),
    );
  },

  // 自动读开关：打开后切换知识点自动朗读讲解；打开时顺手把当前读出来
  onToggleAutoRead() {
    const on = !this.data.autoRead;
    this.writeAutoRead(on);
    this.setData({ autoRead: on });
    if (on) this.onPlayExplanation();
  },

  readAutoRead(): boolean {
    try {
      return wx.getStorageSync(EXPLAIN_AUTO_KEY) === true;
    } catch {
      return false;
    }
  },

  writeAutoRead(on: boolean): void {
    try {
      if (on) wx.setStorageSync(EXPLAIN_AUTO_KEY, true);
      else wx.removeStorageSync(EXPLAIN_AUTO_KEY);
    } catch (error) {
      console.error('自动读讲解开关写入失败', error);
    }
  },

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

  onUnload() {
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
    readAloud.stop(); // 离开页面停止讲解朗读，别在别的页面继续念
  },
});
