import type { BaseEntity } from './base';
import type { LearningState } from './learningState';

// 学习记录（learning_records 集合，Chapter 04 §7）。
// 每「用户×章节」一条：Next 后立即 upsert（currentKnowledgeId/progress/updatedAt）。
// 章节状态展示（§5 Chapter 页）与学习位置恢复（§5 Login/继续学习）的唯一数据源。
export interface LearningRecord extends BaseEntity {
  readonly userId: string; // 关联 users._id
  readonly chapterId: string; // 关联 chapters._id
  readonly currentKnowledgeId?: string; // §7：学到哪条知识点
  readonly progress: number; // §7：已学习知识点数量（页面配合总数展示 x/N）
  readonly state: LearningState; // §6 状态机
  // 章节掌握度 0-100（需求第三十四章）。
  // 新增原因：state 只有 6 个离散状态，颗粒度太粗，无法支撑「组卷难度 / 推荐优先级 /
  // 薄弱点排序」。本字段为章节级聚合值（由该章各知识点掌握度汇总），算法见 core/mastery.ts。
  // 旧字段 state 保留不动（RULES §7 不得删除已有字段），两者并存。
  // 注：需求要求「每学生每知识点」的掌握度，需新增 user_mastery 集合，待确认后再建。
  readonly masteryScore?: number;
}
