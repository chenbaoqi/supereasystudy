// 我的战绩页（游戏打通 L2）：给「只写不读」的 memory_game_records 一个出口。
//
// 之前这张表每局都在写，却没有一个地方读——玩过的局像掉进黑洞。本页把它读出来：
// 概览（局数/答对/正确率/用时）+ 按游戏分组 + 最近战绩。
// 聚合与时间文案全在 core/gameRecord.ts（纯函数），本页只负责取数与渲染。
import type { GameRecordGroup, GameRecordRow, GameRecordView } from '../../core/gameRecord';
import { durationTextOf } from '../../core/gameRecord';
import { gameRecordService, type GameRecordsSource } from '../../services/gameRecordService';
import { userService } from '../../services/userService';

Page({
  data: {
    loading: true,
    loadFailed: false,
    empty: false,
    source: 'cloud' as GameRecordsSource,
    totalGames: 0,
    totalCorrect: 0,
    accuracy: 0,
    totalTimeText: '', // TS 层格式化：WXML 不能调方法
    groups: [] as GameRecordGroup[],
    rows: [] as GameRecordRow[],
  },

  userId: '',

  async onShow() {
    await this.loadRecords();
  },

  async loadRecords() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await gameRecordService.load(this.userId);
      this.applyView(res.view, res.source, res.empty);
    } catch (error) {
      console.error('战绩加载失败', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  applyView(view: GameRecordView, source: GameRecordsSource, empty: boolean) {
    this.setData({
      loading: false,
      loadFailed: false,
      empty,
      source,
      totalGames: view.stats.totalGames,
      totalCorrect: view.stats.totalCorrect,
      accuracy: view.stats.accuracy,
      totalTimeText: durationTextOf(view.stats.totalSeconds),
      groups: view.groups as GameRecordGroup[],
      rows: view.rows as GameRecordRow[],
    });
  },

  onRetry() {
    void this.loadRecords();
  },

  onBackToGameCenter() {
    wx.navigateBack();
  },
});
