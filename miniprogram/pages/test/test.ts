// 测试页（Chapter 04 §5 单元测试 → Chapter 13 综合测评卷：听力 Section 自动播放）。
import type { QuizQuestion } from '../../services/testService';
import type { Knowledge } from '../../core/knowledge';
import { visualViewOf, type VisualType } from '../../core/visual';
import { getSubjectUiConfig } from '../../config/subjects';
import { FEATURE_FLAGS } from '../../config/features';
import { aiTutorHandoff } from '../../services/aiTutorHandoff';
import { buildQuestionHandoff } from '../../services/aiTutorQuestion';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { gradeScope, withinGrade } from '../../services/gradeScope';
import { pronunciationService } from '../../services/pronunciationService';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { testService } from '../../services/testService';
import { userService } from '../../services/userService';
import { haptics } from '../../utils/haptics';
import { gameResultSync } from '../../services/gameResultSyncService';
import { gameProfileService } from '../../services/gameProfileService';
import { starsForTest } from '../../core/growth';
import { showStarGain } from '../../utils/starFeedback';

Page({
  data: {
    questions: [] as QuizQuestion[],
    question: null as QuizQuestion | null,
    currentIndex: 0,
    total: 0,
    selected: -1,
    answered: false,
    isCorrect: false,
    correctCount: 0,
    isLastQuestion: false,
    loading: true,
    // 空态类型：empty=无数据；grammar-pending=章节全为语法点（专项题目二期上线，Chapter 12 §7）
    emptyType: '' as '' | 'empty' | 'grammar-pending',
    // 答错后才出现「问 AI」（答对会自动进下一题，弹一下按钮反而晃眼）
    showAiTutor: FEATURE_FLAGS.aiTutor,
    // 选项标号：AI 辅导页会按 A/B/C/D 讲解，这里跟着标，否则学生不知道「B」是哪个
    optionLetters: ['A', 'B', 'C', 'D', 'E', 'F'],
    // 题目配图（B-7 闭环）：空串 = 本题没有图
    visualType: '' as VisualType | '',
    visualProps: {} as Record<string, unknown>,
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
    // 年级过滤：出题范围与学习页/详情页保持一致，别考还没学到的公式（ADR-012）
    const knowledgeList = withinGrade(
      await knowledgeRepository.listByChapter(this.chapterId),
      gradeScope.currentGrade(),
    );
    // 语音能力按学科判定：数学等学科不出听力 Section（TTS 固定 en_US，念中文是乱码）
    const subject = this.semesterId ? await resolveSubjectOfSemester(this.semesterId) : null;
    const supportsSpeech = subject ? getSubjectUiConfig(subject.subjectName).supportsSpeech : true;
    // 记下来给「问 AI」用：AI 需要知道这是几年级哪一科，否则讲法会跑偏（需求第三十八章）
    this.subjectName = subject?.subjectName ?? '';
    this.grade = gradeScope.currentGrade();
    this.knowledgeById = new Map(knowledgeList.map((item) => [item._id, item]));
    // Chapter 13：综合测评卷（听力 Section 在前）
    const questions = testService.buildPaper(knowledgeList, undefined, supportsSpeech);
    const emptyType =
      questions.length === 0 && knowledgeList.some((item) => item.type === 'grammar')
        ? 'grammar-pending'
        : 'empty';
    this.setData({ questions, total: questions.length, loading: false, emptyType });
    this.showQuestion(0);
  },

  userId: '',
  chapterId: '',
  semesterId: '',
  startTime: 0,
  subjectName: '',
  grade: null as number | null,
  // 题目只带 knowledgeId，而「问 AI」要给出知识点释义/例句做提示，故按 id 留一份索引
  knowledgeById: new Map<string, Knowledge>(),

  showQuestion(index: number) {
    const question = this.data.questions[index] ?? null;
    this.setData({
      question,
      currentIndex: index,
      selected: -1,
      answered: false,
      isCorrect: false,
      isLastQuestion: index >= this.data.questions.length - 1,
      // 题目配图（B-7 闭环）：类型不认识时 visualType 为空串，wxml 不渲染也不报错
      ...visualViewOf(question?.visual),
    });
    // Chapter 13：听力题自动播放（可重播，见 wxml 喇叭）
    if (question?.kind === 'listening' && question.audioWord) {
      void this.playAudio(question.audioWord);
    }
  },

  audio: null as WechatMiniprogram.InnerAudioContext | null,

  destroyed: false,

  async playAudio(word: string) {
    try {
      const src = await pronunciationService.speak(word);
      // 异步竞态防护：页面已销毁（答题跳结果页/退出）时不再播放
      if (this.destroyed) return;
      if (!this.audio) this.audio = wx.createInnerAudioContext();
      this.audio.stop();
      this.audio.src = src;
      this.audio.play();
    } catch (error) {
      console.error('听力题发音失败', error);
      wx.showToast({ title: '音频源不可用，请检查网络或插件配置', icon: 'none' });
    }
  },

  onReplayAudio() {
    if (this.data.question?.audioWord) void this.playAudio(this.data.question.audioWord);
  },

  // 答对自动进下一题的延时（ms）：留一拍展示绿色反馈，避免闪烁感
  autoNextDelay: 500,
  autoNextTimer: 0 as number | undefined,

  onSelect(event: WechatMiniprogram.TouchEvent) {
    if (this.data.answered || !this.data.question) return;
    const { index } = event.currentTarget.dataset as { index: number };
    const correct = index === this.data.question.correctIndex;
    this.setData({
      selected: index,
      answered: true,
      isCorrect: correct,
      correctCount: this.data.correctCount + (correct ? 1 : 0),
    });
    // 触感：答对轻一下、答错重一下。测试是最需要「知道自己选错了」的场景，
    // 反馈早于看解析出现（可在设置页关掉）
    haptics.cue(correct ? 'correct' : 'wrong');
    // L3 回流：把这一题的对错写进掌握度与错题本（发后不理）。
    // 测试是最正式的正确率来源，不记它掌握度就少了一半数据。
    const knowledgeId = this.data.question.knowledgeId;
    if (knowledgeId) {
      void gameResultSync
        .sync({
          userId: this.userId,
          source: 'test',
          correctIds: correct ? [knowledgeId] : [],
          wrongIds: correct ? [] : [knowledgeId],
        })
        .catch((error: unknown) => console.error('测试结果回流失败', error));
    }
    // Owner 2026-07-19：答对自动下一题（无需再点）；答错停留看反馈，手动继续
    if (correct) {
      this.autoNextTimer = setTimeout(() => {
        void this.onNext();
      }, this.autoNextDelay) as unknown as number;
    }
  },

  onUnload() {
    this.destroyed = true;
    if (this.autoNextTimer !== undefined) clearTimeout(this.autoNextTimer);
    this.audio?.stop();
    this.audio?.destroy();
    this.audio = null;
  },

  // 答错 → 问 AI：把题干/选项/学生答案/正确答案/三级提示一次性交给 AI 页。
  // 走内存交接（aiTutorHandoff）而不是 URL：选项与提示是数组，塞进 URL 又长又脆。
  onAskAi() {
    const question = this.data.question;
    if (!question) return;
    aiTutorHandoff.set(
      buildQuestionHandoff({
        question,
        knowledge: question.knowledgeId ? this.knowledgeById.get(question.knowledgeId) : undefined,
        subjectName: this.subjectName,
        grade: this.grade,
        selectedIndex: this.data.selected,
      }),
    );
    wx.navigateTo({ url: '/pages/ai-tutor/ai-tutor' });
  },

  onGoReview() {
    // 语法专项题目二期上线前的过渡出口（Chapter 12 §7：语法复习走 review 体系）
    wx.reLaunch({ url: '/pages/review/review' });
  },

  /** 测试学分（发后不理：入账失败不影响交卷）。+N⭐ 由结果页展示，这里只报徽章。 */
  awardTestStars(stars: number, correct: number): void {
    if (stars <= 0 || !this.userId) return;
    void gameProfileService
      .awardLearning(this.userId, { stars, correct })
      .then((badges) => showStarGain(0, badges))
      .catch((error: unknown) => console.error('测试经验入账失败', error));
  },

  async onNext() {
    const next = this.data.currentIndex + 1;
    if (next < this.data.questions.length) {
      this.showQuestion(next);
      return;
    }
    const durationMs = Date.now() - this.startTime;
    const { correctCount, total } = this.data;
    // 学分：测试按正确率给经验值（满分 +10 / ≥80% +5 / ≥60% +2 / 做完了 +1）。
    // 答对数同时计入 totalCorrect——「百题斩」那类勋章靠它。+N⭐ 随路由传给结果页展示。
    const stars = starsForTest(correctCount, total);
    this.awardTestStars(stars, correctCount);
    await testService.submitTest(this.userId, this.chapterId, { correctCount, totalCount: total });
    wx.redirectTo({
      // attempt = 开考时刻：结果页用它做门禁的业务标识，保证「本次」是唯一的一次
      url: `/pages/test-result/test-result?chapterId=${this.chapterId}&semesterId=${this.semesterId}&correct=${correctCount}&total=${total}&stars=${stars}&duration=${durationMs}&attempt=${this.startTime}`,
    });
  },
});
