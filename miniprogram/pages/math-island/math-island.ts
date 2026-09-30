// 口算冒险岛（数学学科·小学）——冒险地图主页。
//
// 职责：展示星星/金币与当前关卡、提供「继续冒险」与「自由练习」两个入口、渲染 7 关地图。
// 只做展示与跳转，出题与结算都在 math-island-run 页（小程序一个页面一件事）。
//
// 难度默认按当前册次推荐（小程序比独立 H5 强的地方：不用家长手工设难度），
// 家长可在「自由练习」里改运算符 / 题量 / 数字范围。
import type { IslandProgress, IslandOp } from '../../core/mathIsland';
import { ISLAND_OPS, ISLAND_OP_SYMBOL } from '../../core/mathIsland';
import { gradePresetOf, ISLAND_COUNT_OPTIONS, ISLAND_RANGE_OPTIONS } from '../../config/mathIsland';
import { mathIslandService } from '../../services/mathIslandService';
import type { IslandLevelView } from '../../services/mathIslandService';
import { gameProfileService } from '../../services/gameProfileService';
import type { GameGrowthView } from '../../services/gameProfileService';
import type { GameProfile } from '../../core/growth';
import { semesterRepository } from '../../repositories/semesterRepository';
import { userService } from '../../services/userService';
import { gradeLabel, gradeOfSemester } from '../../utils/stage';

interface OpChip {
  readonly op: IslandOp;
  readonly symbol: string;
  readonly active: boolean;
}

const MIN_OPS = 1; // 至少留一个运算符，全取消会出不了题

Page({
  data: {
    chapterId: '',
    semesterId: '',
    stars: 0,
    coins: 0,
    gradeText: '',
    levels: [] as IslandLevelView[],
    current: null as IslandLevelView | null,
    allDone: false,
    // 成长系统（全站钱包：等级 / 每日打卡 / 宝箱 / 徽章）
    growth: null as GameGrowthView | null,
    rankHint: '',
    // 自由练习（可手改）
    opChips: [] as OpChip[],
    countOptions: ISLAND_COUNT_OPTIONS as number[],
    rangeOptions: ISLAND_RANGE_OPTIONS as number[],
    count: 10,
    range: 20,
    freeSummary: '',
    // 存档来源提示：云读不到时会显式告诉用户「当前是本机进度」，不假装已同步
    offlineHint: '',
  },

  ops: [] as IslandOp[],
  count: 10,
  range: 20,
  userId: '',
  progress: null as IslandProgress | null,
  profile: null as GameProfile | null,
  loading: false,

  async onLoad(query: Record<string, string>) {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.setData({ chapterId: query.chapterId ?? '', semesterId: query.semesterId ?? '' });

    // 年级 → 自由练习默认难度
    let grade: number | null = null;
    if (query.semesterId) {
      const sem = await semesterRepository.getById(query.semesterId);
      if (sem) grade = gradeOfSemester(sem.name);
    }
    this.setData({
      gradeText: grade === null ? '' : `${gradeLabel(grade)} · 已按册次推荐难度`,
    });
    const preset = gradePresetOf(grade);
    this.ops = [...preset.ops];
    this.count = preset.count;
    this.range = preset.range;
    this.syncFree();

    await this.refresh();
  },

  onShow() {
    // 从答题页返回时刷新进度（星星 / 关卡点亮）；首次由 onLoad 负责
    if (this.data.levels.length > 0) void this.refresh();
  },

  async refresh() {
    if (!this.userId) return;
    // 连续触发（onLoad + onShow）只让一次真正打云
    if (this.loading) return;
    this.loading = true;
    try {
      const { progress, source } = await mathIslandService.load(this.userId);
      this.progress = progress;
      const levels = mathIslandService.levelViews(progress);
      const currentId = mathIslandService.currentLevelId(progress);
      const current = currentId ? (levels.find((l) => l.def.id === currentId) ?? null) : null;
      this.setData({
        levels: levels as IslandLevelView[],
        current,
        allDone: currentId === null,
        offlineHint: source === 'mirror' ? '当前是本机进度（联网后自动同步）' : '',
      });

      // 成长账户（全站钱包）：星星/金币/等级/徽章/打卡/宝箱都在这里
      const loaded = await gameProfileService.load(this.userId);
      let profile = loaded.profile;
      // 一次性把「冒险岛旧存档里的星星/金币」并入钱包（幂等，只做一次）
      if (!profile.mergedIsland && (progress.stars > 0 || progress.coins > 0)) {
        profile = gameProfileService.mergeIsland({
          userId: this.userId,
          profile,
          islandStars: progress.stars,
          islandCoins: progress.coins,
        });
      }
      this.profile = profile;
      this.applyGrowth(profile);
      // 每天首次进页面自动打卡（幂等：同一天重复进来不会再发奖）
      await this.tryCheckIn();
    } finally {
      this.loading = false;
    }
  },

  // 把「成长态」刷到视图上；星级/金币也一并刷（打卡与开箱都会改它们）
  applyGrowth(profile: GameProfile) {
    const growth = gameProfileService.growthView(profile);
    this.setData({
      stars: profile.stars,
      coins: profile.coins,
      growth,
      rankHint:
        growth.rank.next === null ? '已是最高等级 👑' : `再得 ${growth.rank.toNext} ⭐ 升级`,
    });
  },

  async tryCheckIn() {
    const profile = this.profile;
    if (!profile) return;
    if (gameProfileService.growthView(profile).checkedToday) return;
    const res = gameProfileService.checkIn({ userId: this.userId, profile });
    this.profile = res.profile;
    this.applyGrowth(res.profile);
    if (!res.result.checked) return;
    const badgeText = res.newBadges.length
      ? `\n🏅 新徽章：${res.newBadges.map((b) => b.icon + b.name).join('、')}`
      : '';
    wx.showToast({ title: `${res.result.note}${badgeText}`, icon: 'none', duration: 2500 });
  },

  onOpenChest() {
    const profile = this.profile;
    if (!profile) return;
    if (profile.chest.keys <= 0) {
      wx.showToast({ title: '还没有钥匙 🔑，通关新关卡或连续打卡 7 天能得到', icon: 'none' });
      return;
    }
    const res = gameProfileService.openChest({ userId: this.userId, profile });
    this.profile = res.profile;
    this.applyGrowth(res.profile);
    if (!res.prize) {
      wx.showToast({ title: res.reason || '这次什么也没开出来', icon: 'none' });
      return;
    }
    const badgeText = res.newBadges.length
      ? `\n🏅 新徽章：${res.newBadges.map((b) => b.icon + b.name).join('、')}`
      : '';
    wx.showModal({
      title: '🎁 开箱',
      content: `获得 ${res.prize.text}${badgeText}`,
      showCancel: false,
    });
  },

  syncFree() {
    const opChips: OpChip[] = ISLAND_OPS.map((op) => ({
      op,
      symbol: ISLAND_OP_SYMBOL[op],
      active: this.ops.includes(op),
    }));
    const names = this.ops.map((op) => ISLAND_OP_SYMBOL[op]).join(' ');
    this.setData({
      opChips,
      count: this.count,
      range: this.range,
      freeSummary: `${names} · ${this.count} 题 · ${this.range} 以内`,
    });
  },

  onToggleOp(event: WechatMiniprogram.TouchEvent) {
    const op = event.currentTarget.dataset.op as IslandOp;
    const has = this.ops.includes(op);
    if (has) {
      if (this.ops.length <= MIN_OPS) {
        wx.showToast({ title: '至少留一个运算符', icon: 'none' });
        return;
      }
      this.ops = this.ops.filter((o) => o !== op);
    } else {
      this.ops = [...this.ops, op];
    }
    this.syncFree();
  },

  onPickCount(event: WechatMiniprogram.TouchEvent) {
    this.count = Number(event.currentTarget.dataset.v);
    this.syncFree();
  },

  onPickRange(event: WechatMiniprogram.TouchEvent) {
    this.range = Number(event.currentTarget.dataset.v);
    this.syncFree();
  },

  goRun(levelId: string, extra = '') {
    wx.navigateTo({
      url:
        `/pages/math-island-run/math-island-run?levelId=${levelId}` +
        `&chapterId=${this.data.chapterId}&semesterId=${this.data.semesterId}${extra}`,
    });
  },

  onStartCurrent() {
    const current = this.data.current;
    if (current) this.goRun(current.def.id);
  },

  onStartFree() {
    const ops = this.ops.join(',');
    this.goRun('free', `&ops=${ops}&count=${this.count}&range=${this.range}`);
  },

  onTapLevel(event: WechatMiniprogram.TouchEvent) {
    const id = event.currentTarget.dataset.id as string;
    const view = this.data.levels.find((l) => l.def.id === id);
    if (!view) return;
    if (!view.unlocked) {
      const prev = this.data.levels[this.data.levels.indexOf(view) - 1];
      wx.showToast({
        title: prev ? `先通过「${prev.def.name}」才能解锁` : '还没解锁',
        icon: 'none',
      });
      return;
    }
    // 点已通关的关卡 = 重玩（练得更快），不弹规则
    this.goRun(id);
  },
});
