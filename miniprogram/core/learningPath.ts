import type { BaseEntity } from './base';

// 学习路径（learning_paths 集合）。§5 Learning Path：Vocabulary 开放，其余 Coming Soon。
export interface LearningPath extends BaseEntity {
  readonly subjectId: string; // 所属学科（§3：Subject → Learning Path）
  readonly name: string; // 路径名（V1：Vocabulary）
  readonly open: boolean; // 同 Subject.open：数据驱动，禁止硬编码
  readonly order: number; // 列表排序
}
