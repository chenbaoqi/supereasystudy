import type { BaseEntity } from './base';

// 册次（semesters 集合，§5 Semester：读取 semesters）。
export interface Semester extends BaseEntity {
  readonly textbookId: string; // 所属教材（§3：Textbook → Semester）
  readonly name: string; // 册次名（如 上册/下册）
  readonly order: number; // 列表排序
}
