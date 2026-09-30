// 我的页（TabBar）：用户功能入口集合——当前教材、教材与册次（Chapter 14）、
// AI 辅导（第三十八章）、我的收藏、学习统计、设置；管理员入口按 FEATURE_FLAGS.adminEntry 预留（Baseline Spec §5）。
import { readProfile } from '../../services/profileService';
import { userService } from '../../services/userService';
import { FEATURE_FLAGS } from '../../config/features';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { gradeOfSemester } from '../../utils/stage';

Page({
  data: {
    textbookName: '',
    semesterName: '',
    subjectName: '', // 「学科 · 教材 · 册次」口径，与学习页/练习页一致
    avatar: '🙂', // 孩子自己选的头像（本机）
    nickname: '同学', // 孩子自己起的名字（本机，没起就用「同学」）
    showAdmin: FEATURE_FLAGS.adminEntry, // 默认 false：管理员入口不渲染
    showAiTutor: FEATURE_FLAGS.aiTutor, // AI 辅导入口（开关关掉则整行不渲染）
  },

  // AI 辅导的上下文（仅年级）：进入 AI 页时带上，AI 才知道该按几年级的口吻讲。
  // 学科不带 —— 自由问答由用户在 AI 页内自己切，不预设
  aiGrade: null as number | null,

  // 改头像 / 起名字
  onTapProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  async onShow() {
    // 形象存在本机，刚改完回来会变——每次显示都重读一次（成本为零，也不涉及云）
    this.setData({ ...readProfile() });
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    // 按当前学科展示册次（多科修复 2026-09-08），未设则回退旧字段
    const currentSubjectId = userService.getCurrentSubjectId();
    const preferences =
      (currentSubjectId ? userService.getPreferences(currentSubjectId) : null) ??
      userService.getPreferences();
    // 学科由册次反查：反查不到留空，不假装是「英语」
    const resolved = preferences?.semesterId
      ? await resolveSubjectOfSemester(preferences.semesterId)
      : null;
    this.setData({
      textbookName: preferences?.textbookName ?? '',
      semesterName: preferences?.semesterName ?? '',
      subjectName: resolved?.subjectName ?? '',
    });
    if (!preferences) return;
    // 只带年级，不带学科：自由问答不该被「当前教材偏好」悄悄框死
    // （Owner 2026-09-13：进去默认显示数学，但我可能想问英语）。学科由 AI 页内切换。
    this.aiGrade = gradeOfSemester(preferences.semesterName);
  },

  // 教材与册次（Chapter 14：切换教材的显性入口）→ 进当前学科的换教材流程。
  // 不回首页：首页九宫格对该学科已有偏好时会直接跳走，点了等于没反应
  // （与学习页 onTapSwitch 同一个死循环，2026-09-13 一并修掉）。
  onTapTextbook() {
    const subjectId = userService.getCurrentSubjectId();
    if (!subjectId) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    wx.navigateTo({ url: `/pages/textbook/textbook?subjectId=${subjectId}` });
  },

  // AI 辅导（第三十八章）：只带年级，学科留给用户进页后自己切
  onTapAiTutor() {
    const params: string[] = [];
    if (this.aiGrade) params.push(`grade=${this.aiGrade}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    wx.navigateTo({ url: `/pages/ai-tutor/ai-tutor${query}` });
  },

  // 勋章墙：把攒下的徽章摆出来给孩子看
  onTapBadges() {
    wx.navigateTo({ url: '/pages/badges/badges' });
  },

  // 错题本（L3）：游戏与测试答错的知识点
  onTapWrongQuestions() {
    wx.navigateTo({ url: '/pages/wrong-questions/wrong-questions' });
  },

  onTapFavorite() {
    wx.navigateTo({ url: '/pages/favorite/favorite' });
  },

  onTapStatistics() {
    wx.navigateTo({ url: '/pages/statistics/statistics' });
  },

  onTapSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  // 管理员入口（仅 FEATURE_FLAGS.adminEntry 为真时渲染）：V1 后台走云开发 CMS，小程序内仅预留
  onTapAdmin() {
    wx.navigateTo({ url: '/pages/coming-soon/coming-soon' });
  },
});
