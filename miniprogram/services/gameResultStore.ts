// 游戏结果共享通道（Chapter 08 §10 设计）：任何游戏结束在此登记，
// 统一结果页（memory-result）读取渲染——避免每款游戏一页结果页的重复（DRY）。
// 仅驻留内存：结果页仅当局后可达，刷新/直达为空时展示提示。
import type { Knowledge } from '../core/knowledge';
import type { MemoryGameRecord, MemoryGameType } from '../core/memoryGame';

// 本局在全站钱包的入账（2026-09-16 L1：玩哪个游戏都在长大）。
// 文案在 service 侧格式化好——WXML 里不做字符串拼接。
export interface GameResultWallet {
  readonly gain: string; // 例「⭐+12 🪙+22」
  readonly badges: string; // 例「🎉 解锁徽章 🌱初次出发」
}

export interface GameResultDetail {
  readonly gameType: MemoryGameType;
  readonly record: MemoryGameRecord;
  readonly mastered: Knowledge[]; // 掌握知识（答对/配对成功）
  readonly weak: Knowledge[]; // 薄弱知识（答错/超时/未配完）
  readonly correctIds: string[];
  readonly wrongIds: string[];
  readonly avgResponseMs?: number; // 平均反应时间（极速选择）
  readonly replayUrl: string; // 「再来一次」目标路由（各游戏自带）
  readonly integrateToReview: () => Promise<void>; // 「加入复习」执行体（§12 集成）
  readonly wallet?: GameResultWallet; // 一题没对 / 钱包不可用时不给，页面整块隐藏
}

let current: GameResultDetail | null = null;

export const gameResultStore = {
  set(detail: GameResultDetail): void {
    current = detail;
  },
  get(): GameResultDetail | null {
    return current;
  },
};
