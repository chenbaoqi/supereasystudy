import type { BaseEntity } from './base';

// 教材（textbooks 集合，§5 Textbook：读取 textbooks）。
export interface Textbook extends BaseEntity {
  readonly learningPathId: string; // 所属学习路径（§3：Learning Path → Textbook）
  readonly name: string; // 教材名（如 人教版）
  readonly order: number; // 列表排序
}
