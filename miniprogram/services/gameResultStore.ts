// 游戏结果共享通道（Chapter 08 §10 设计）：任何游戏结束在此登记，
// 统一结果页（memory-result）读取渲染——避免每款游戏一页结果页的重复（DRY）。
// 仅驻留内存：结果页仅当局后可达，刷新/直达为空时展示提示。
import type { Knowledge } from '../core/knowledge';
import type { MemoryGameRecord, MemoryGameType } from '../core/memoryGame';

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
