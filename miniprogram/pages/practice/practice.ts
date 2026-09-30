// 练习 tab（游戏入口）：展示当前教材册次的章节列表，点章节进入游戏中心选游戏。
// 复用 study tab 的章节装配与共享模板；游戏均为「按章节锁定知识点」（memory-game onLoad 要求 chapterId），
// 故 practice 不直接开游戏，而是落到章节后再经 game-center 选游戏，与既有「学习 tab → 章节 → 挑战」机制一致。
import type { ChapterItem } from '../../services/chapterService';
import { chapterService } from '../../services/chapterService';
import { userService } from '../../services/userService';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { gradeOfSemester } from '../../utils/stage';

Page({
  data: {
    hasPreference: false,
    textbookName: '',
    semesterName: '',
    subjectName: '', // 顶部横条显示「学科 · 教材 · 册次」（与学习页同款口径）
    items: [] as ChapterItem[],
    semesterId: '',
    isEnglish: false, // 拼写练习只对英语开放（数学没有「把公式拼出来」这回事）
    loading: true,
  },

  hidden: false,

  async onShow() {
    this.hidden = false;
    await this.loadPractice();
  },

  onHide() {
    this.hidden = true;
  },

  async loadPractice() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    // 按当前学科取册次（多科修复 2026-09-08），未设则回退旧字段
    const currentSubjectId = userService.getCurrentSubjectId();
    const preferences =
      (currentSubjectId ? userService.getPreferences(currentSubjectId) : null) ??
      userService.getPreferences();
    if (!preferences) {
      if (!this.hidden) this.setData({ hasPreference: false, loading: false });
      return;
    }
    try {
      // 练习 tab 仅暴露游戏入口：复用章节装配结果，隐藏「测试」按钮
      // ADR-012：按当前年级过滤（与学习页同口径）
      const items = (
        await chapterService.buildChapterItems(
          user._id,
          preferences.semesterId,
          gradeOfSemester(preferences.semesterName),
        )
      ).map((item) => ({ ...item, showTest: false }));
      // 顶部横条要显示学科：反查不到就留空，不假装是「英语」
      const resolved = await resolveSubjectOfSemester(preferences.semesterId);
      const subjectName = resolved?.subjectName ?? '';
      // 异步竞态防护：tab 已切走时不再 setData
      if (this.hidden) return;
      this.setData({
        hasPreference: true,
        textbookName: preferences.textbookName,
        semesterName: preferences.semesterName,
        subjectName,
        items,
        semesterId: preferences.semesterId,
        isEnglish: (resolved?.subjectName ?? '') === '英语',
        loading: false,
      });
    } catch (error) {
      console.error('练习页加载失败', error);
      if (!this.hidden) this.setData({ loading: false });
    }
  },

  // 引导（未选教材）：进入首页学科九宫格（多开放学科各自可选，不再写死单科）
  onTapGuide() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  // 头部「切换教材」：直接进**当前学科**的换教材流程。
  // 与学习页 onTapSwitch 同款：不能回首页，否则首页九宫格对该学科已有偏好时
  // 会立刻 switchTab 走，点了等于没反应（2026-09-13 修掉的死循环，练习页同源问题一并修）。
  // 拼写练习：给中文 → 把单词打出来（产出型练习）
  onTapSpelling() {
    wx.navigateTo({ url: `/pages/spelling/spelling?semesterId=${this.data.semesterId}` });
  },

  // 跟读练习（2026-09-29）：听发音 → 按住说话 → 判对错（开口说的那半边）
  onTapFollowRead() {
    wx.navigateTo({ url: `/pages/follow-read/follow-read?semesterId=${this.data.semesterId}` });
  },

  onTapSwitch() {
    const subjectId = userService.getCurrentSubjectId();
    if (!subjectId) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    wx.navigateTo({ url: `/pages/textbook/textbook?subjectId=${subjectId}` });
  },

  // 章节行点击：进入该章节的游戏中心选游戏
  onTapItem(event: WechatMiniprogram.TouchEvent) {
    this.openGameCenter(event);
  },

  // ⚠️ 共享模板 pages/shared/chapter-items.wxml 里那两个按钮绑定的是**宿主页**的
  //    onTapTest / onTapGame。模板拿不到宿主页的方法时**不报错、也不警告**，
  //    只是点了没反应——2026-09-18 Owner 实测踩到（练习 tab 的「挑战」全死了）。
  //    所以：**每个使用该模板的宿主页都必须自己实现这两个方法**（study / chapter 早就有了）。
  onTapGame(event: WechatMiniprogram.TouchEvent) {
    this.openGameCenter(event);
  },

  // 练习 tab 把 showTest 恒设为 false，这个按钮正常情况下不渲染；
  // 但处理器仍然留一个能用的，避免以后 showTest 一改就变成死按钮。
  onTapTest(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({ url: `/pages/test/test?chapterId=${id}&semesterId=${semesterId}` });
  },

  openGameCenter(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    // 双保险：dataset 缺一个就会拼出 chapterId=undefined，小程序**不报错**，只是白屏/无反应
    if (!id) {
      wx.showToast({ title: '这一章暂时打不开', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/game-center/game-center?chapterId=${id}&semesterId=${semesterId ?? ''}`,
    });
  },
});
