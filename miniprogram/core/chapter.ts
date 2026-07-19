import type { BaseEntity } from './base';

// 章节（chapters 集合）。
// 注意：§5 Chapter 页展示的 Not Started/Learning/Completed 是「用户×章节」状态，
// 存 learning_records（LearningRecord.state），不存本集合。
export interface Chapter extends BaseEntity {
  readonly semesterId: string; // 所属册次（§3：Semester → Chapter）
  readonly title: string; // 章节名（如 Unit 1）
  readonly order: number; // 册次内排序
}
