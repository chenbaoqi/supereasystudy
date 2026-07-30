// 学习 tab「我的课程」（Chapter 14 §4 课程统一视图）：
// 已设偏好直达当前册次课程页——「单词」分区（该册 units）+「语法」分区（对应学段语法专题包）；
// 未设偏好显示引导卡。顶部横条可切回选择流更换教材。
import type { ChapterItem } from '../../services/chapterService';
import { chapterService } from '../../services/chapterService';
import { grammarPackService } from '../../services/grammarPackService';
import { semesterRepository } from '../../repositories/semesterRepository';
import { subjectRepository } from '../../repositories/subjectRepository';
import { userService } from '../../services/userService';
import { stageOfSemester } from '../../utils/stage';

Page({
  data: {
    hasPreference: false,
    textbookName: '',
    semesterName: '',
    items: [] as ChapterItem[], // 单词分区（当前册次章节）
    semesterId: '', // 单词册次 id
    hasGrammar: false,
    grammarItems: [] as ChapterItem[], // 语法分区（学段语法专题包章节）
    grammarSemesterId: '', // 语法专题包册次 id
    loading: true,
  },

  hidden: false,

  async onShow() {
    this.hidden = false;
    await this.loadMine();
  },

  onHide() {
    this.hidden = true;
  },

  async loadMine() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const preferences = userService.getPreferences();
    if (!preferences) {
      if (!this.hidden) this.setData({ hasPreference: false, loading: false });
      return;
    }
    try {
      // 单词分区：当前册次章节
      let semesterId = preferences.semesterId;
      let items = await chapterService.buildChapterItems(user._id, semesterId);
      // 陈旧偏好自愈（早期全清重导致使旧册次 id 失效）：
      // 按 textbookId+semesterName 重新解析并静默修正存储（upsert 后 id 已稳定，仅一次性）
      if (items.length === 0) {
        const semesters = await semesterRepository.listByTextbook(preferences.textbookId);
        const found = semesters.find((item) => item.name === preferences.semesterName);
        if (found) {
          semesterId = found._id;
          items = await chapterService.buildChapterItems(user._id, semesterId);
          await userService.savePreferences({ ...preferences, semesterId });
        }
      }
      // 语法分区：按册次名推断学段 → 解析语法专题包（小学语法专题/初中语法专题）
      const stage = stageOfSemester(preferences.semesterName);
      const grammarSemesterId = await grammarPackService.resolveSemesterId(stage);
      const grammarItems = grammarSemesterId
        ? await chapterService.buildChapterItems(user._id, grammarSemesterId)
        : [];
      // 异步竞态防护：tab 已切走时不再 setData
      if (this.hidden) return;
      this.setData({
        hasPreference: true,
        textbookName: preferences.textbookName,
        semesterName: preferences.semesterName,
        items,
        semesterId,
        hasGrammar: grammarItems.length > 0,
        grammarItems,
        grammarSemesterId: grammarSemesterId ?? '',
        loading: false,
      });
    } catch (error) {
      console.error('我的课程加载失败', error);
      if (!this.hidden) this.setData({ loading: false });
    }
  },

  // 引导/切换：进入选择流（学科分发页会自动跳到学习路径）
  async onTapGuide() {
    const subjects = await subjectRepository.listAll();
    const firstOpen = subjects.find((item) => item.open);
    if (!firstOpen) return;
    wx.navigateTo({ url: `/pages/subject/subject?subjectId=${firstOpen._id}` });
  },

  onTapSwitch() {
    void this.onTapGuide();
  },

  // 章节/按钮统一从 dataset 取章节所属册次（单词与语法分区册次不同）
  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/study-detail/study-detail?chapterId=${id}&semesterId=${semesterId}`,
    });
  },

  onTapTest(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({ url: `/pages/test/test?chapterId=${id}&semesterId=${semesterId}` });
  },

  onTapGame(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/game-center/game-center?chapterId=${id}&semesterId=${semesterId}`,
    });
  },
});
