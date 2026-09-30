// 游戏中心（Chapter 08 §16 Q1 确认）：承载 Memory Challenge 系列游戏入口。
// 游戏清单配置化：见 config/games；本页按当前学科过滤（数学不显示听音/小蜜蜂/语法），
// 仅渲染与透传章节参数。
import { GAMES, type GameDef } from '../../config/games';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { gameProfileService, type GameGrowthView } from '../../services/gameProfileService';
import { userService } from '../../services/userService';

Page({
  data: {
    chapterId: '',
    semesterId: '',
    subjectName: '',
    games: GAMES as GameDef[],
    // 全站成长账户（L1）：让「玩哪个游戏都在长大」在入口就能看见
    growth: null as GameGrowthView | null,
  },

  async onLoad(query: Record<string, string>) {
    const chapterId = query.chapterId ?? '';
    const semesterId = query.semesterId ?? '';
    this.setData({ chapterId, semesterId });
    void this.loadGrowth();
    // 按学科过滤：未知学科时全量展示（不漏游戏）
    const subject = await resolveSubjectOfSemester(semesterId);
    if (subject) {
      const allowed = GAMES.filter((g) => !g.subjects || g.subjects.includes(subject.subjectName));
      this.setData({ subjectName: subject.subjectName, games: allowed as GameDef[] });
    }
  },

  // 成长条是「锦上添花」：读不到就整块不显示，绝不拖住游戏列表
  async loadGrowth() {
    this.userId = userService.getCurrentUser()?._id ?? '';
    if (!this.userId) return;
    try {
      const { profile } = await gameProfileService.load(this.userId);
      this.setData({ growth: gameProfileService.growthView(profile) });
    } catch {
      this.setData({ growth: null });
    }
  },

  userId: '',

  // 勋章墙：从「几 / 几」直接进成就页
  onTapBadges() {
    wx.navigateTo({ url: '/pages/badges/badges' });
  },

  onTapRecords() {
    wx.navigateTo({ url: '/pages/game-records/game-records' });
  },

  onTapGame(event: WechatMiniprogram.TouchEvent) {
    const { url } = event.currentTarget.dataset as { url: string };
    wx.navigateTo({
      url: `${url}?chapterId=${this.data.chapterId}&semesterId=${this.data.semesterId}`,
    });
  },
});
