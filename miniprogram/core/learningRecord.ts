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
}
