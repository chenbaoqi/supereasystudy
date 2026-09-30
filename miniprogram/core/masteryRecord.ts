// 用户×知识点掌握度（user_mastery 集合，ADR-008）。
// 需求第三十四章：「每个学生每个知识点：masteryScore = 0～100」。
//
// 为什么需要独立集合：LearningRecord 是「用户×章节」粒度，而需求要的是知识点粒度；
// 章节级 masteryScore 只能用于展示，无法驱动组卷难度与推荐优先级。
import type { BaseEntity } from './base';

export interface UserMastery extends BaseEntity {
  readonly userId: string;
  readonly knowledgeId: string; // 知识点（knowledge._id）
  readonly masteryScore: number; // 0-100，算法见 core/mastery.ts
  // 计算掌握度所需的原始信号（保留以便后续调参与复盘）
  readonly practiceCount: number;
  readonly firstTryCorrectRate: number; // 0-1
  readonly recentCorrectRate: number; // 0-1
  readonly hintUsedRate?: number; // 0-1
  readonly wrongFixedRate?: number; // 0-1
  // 毫秒时间戳（用 number 而非 Date，便于直接做时间衰减计算）
  readonly lastPracticedAt?: number;
}
