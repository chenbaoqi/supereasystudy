import type { BaseEntity } from './base';

// 游戏状态机（Chapter 07 §6 显式定义，禁止增删）。
// RESULT 在小程序内表现为独立结果页（pages/memory-result）。
export type MemoryGameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'RESULT';

// 单局游戏记录（memory_game_records 集合，Chapter 07 §9 显式字段 + ADR-006）。
// 每局一条：对局内容只存 knowledgeIds（知识点内容以 knowledge 集合为唯一来源，SSOT）。
export interface MemoryGameRecord extends BaseEntity {
  readonly userId: string; // 关联 users._id
  readonly chapterId: string; // 本局所属章节
  readonly knowledgeIds: string[]; // 本局使用的知识点
  readonly score: number; // 总分（含连击与时间 Bonus，细则见 Q2）
  readonly correctCount: number; // 配对成功数
  readonly wrongCount: number; // 配对错误数
  readonly duration: number; // 实际用时（秒）
}
