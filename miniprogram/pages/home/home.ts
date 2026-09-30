// 首页 Dashboard（Specification §12.5：Banner / 统计条 / 最近学习 / 学科入口）。
// 视觉按 UI v1「清爽蓝」重做（2026-09-13）：通用件走 styles/，本页只保留业务装配。
// onShow 刷新：tab 切换回来时统计与最近学习需为最新。
import type { Banner } from '../../core/banner';
import type { Subject } from '../../core/subject';
import type { HomeDashboard, RecentLearningItem } from '../../services/homeService';
import { homeService } from '../../services/homeService';
import { subjectRepository } from '../../repositories/subjectRepository';
import { userService } from '../../services/userService';
import { getSubjectTheme, getSubjectUiConfig } from '../../config/subjects';

// 学科宫格视图模型：在 Subject 之上补出配色主题 / 图标 / 描述，页面不做字符串拼接
interface SubjectCard {
  readonly _id: string;
  readonly name: string;
  readonly open: boolean;
  readonly theme: string; // → class u-subject-<theme>（色值仍在 tokens.wxss）
  readonly icon: string;
  readonly desc: string;
}

const SUBJECT_ICON: Record<string, string> = {
  en: '🔤',
  math: '🔢',
  cn: '📖',
  default: '📚',
};

function toSubjectCard(subject: Subject): SubjectCard {
  const theme = getSubjectTheme(subject.name);
  const ui = getSubjectUiConfig(subject.name);
  return {
    _id: subject._id,
    name: subject.name,
    open: subject.open,
    theme,
    icon: SUBJECT_ICON[theme] ?? SUBJECT_ICON['default'] ?? '📚',
    desc: `${ui.mainLabel} · ${ui.topicLabel}`,
  };
}

function greetingOf(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

Page({
  data: {
    banners: [] as Banner[],
    todayReviewedKnowledge: 0,
    streakDays: 0,
    recentLearning: [] as RecentLearningItem[],
    subjectCards: [] as SubjectCard[],
    greeting: '你好',
    heroSub: '每天一点点，进步看得见',
    continueText: '开始学习',
    loading: true,
    loadFailed: false,
    hasPreference: false, // Chapter 14：未设教材偏好时显示引导卡
  },

  hidden: false,

  onShow() {
    this.hidden = false;
    void this.loadDashboard();
  },

  onHide() {
    this.hidden = true;
  },

  async loadDashboard() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    try {
      const [dashboard, subjects] = await Promise.all([
        homeService.getDashboard(user._id),
        subjectRepository.listAll(),
      ]);
      // 异步竞态防护：tab 已切走时不再 setData（防渲染层 Expected updated data 报错）
      if (this.hidden) return;
      const hasPreference = !!userService.getPreferences();
      this.setData({
        ...this.pickDashboard(dashboard),
        subjectCards: subjects.map(toSubjectCard),
        greeting: greetingOf(new Date()),
        heroSub: this.heroSubOf(dashboard, hasPreference),
        continueText: dashboard.recentLearning.length > 0 ? '继续上次学习' : '开始学习',
        loading: false,
        loadFailed: false,
        hasPreference, // Chapter 14 §4 引导卡显隐
      });
    } catch (error) {
      console.error('首页加载失败（§12.3 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  pickDashboard(dashboard: HomeDashboard) {
    return {
      banners: dashboard.banners,
      todayReviewedKnowledge: dashboard.todayReviewedKnowledge,
      streakDays: dashboard.streakDays,
      recentLearning: dashboard.recentLearning,
    };
  },

  // 头部副标题：把已有数据说成人话，没数据时不硬凑
  heroSubOf(dashboard: HomeDashboard, hasPreference: boolean): string {
    if (!hasPreference) return '先选好教材，学习更精准';
    if (dashboard.streakDays > 0) return `已连续学习 ${dashboard.streakDays} 天，保持住`;
    return '每天一点点，进步看得见';
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.loadDashboard();
  },

  // 头部主按钮：有最近学习→直达那一课；已选教材→学习 tab；否则走选教材引导
  onTapContinue() {
    const first = this.data.recentLearning[0];
    if (first) {
      wx.navigateTo({
        url: `/pages/study-detail/study-detail?chapterId=${first.chapterId}&semesterId=${first.semesterId}`,
      });
      return;
    }
    if (this.data.hasPreference) {
      wx.switchTab({ url: '/pages/study/study' });
      return;
    }
    void this.onTapGuide();
  },

  // 引导卡：进入教材选择流（Chapter 14 §4）。单科时直达该学科；多科时首页九宫格已是学科入口，无需强制跳转。
  async onTapGuide() {
    const open = this.data.subjectCards.filter((item) => item.open);
    if (open.length === 0) return;
    if (open.length === 1) {
      wx.navigateTo({ url: `/pages/subject/subject?subjectId=${open[0]!._id}` });
    }
    // 多科：首页九宫格即学科选择入口，用户自行点选
  },

  onTapRecent(event: WechatMiniprogram.TouchEvent) {
    const { chapterId, semesterId } = event.currentTarget.dataset as {
      chapterId: string;
      semesterId: string;
    };
    wx.navigateTo({
      url: `/pages/study-detail/study-detail?chapterId=${chapterId}&semesterId=${semesterId}`,
    });
  },

  // 最近学习项的游戏中心入口（Chapter 08 §16 Q1）
  onTapRecentGame(event: WechatMiniprogram.TouchEvent) {
    const { chapterId, semesterId } = event.currentTarget.dataset as {
      chapterId: string;
      semesterId: string;
    };
    wx.navigateTo({
      url: `/pages/game-center/game-center?chapterId=${chapterId}&semesterId=${semesterId}`,
    });
  },

  onTapSubject(event: WechatMiniprogram.TouchEvent) {
    // 学科点击：该学科已设偏好 → 直达学习页；否则 → 学科入口页走选教材流。
    // 注意（多科修复 2026-09-08）：判断必须按「点击的这个学科」分别判断，
    // 不能用全局偏好一刀切——否则点了数学也会被英语偏好送进英语学习页。
    const { id } = event.currentTarget.dataset as { id: string };
    userService.setCurrentSubjectId(id); // switchTab 无 URL 参数，用本地存储传学科
    if (userService.getPreferences(id)) {
      wx.switchTab({ url: '/pages/study/study' });
      return;
    }
    wx.navigateTo({ url: `/pages/subject/subject?subjectId=${id}` });
  },
});
