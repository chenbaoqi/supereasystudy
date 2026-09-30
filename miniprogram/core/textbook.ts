import type { BaseEntity } from './base';

// 教材（textbooks 集合，§5 Textbook：读取 textbooks）。
export interface Textbook extends BaseEntity {
  readonly learningPathId: string; // 所属学习路径（§3：Learning Path → Textbook）
  readonly name: string; // 教材名（如 人教版）
  readonly order: number; // 列表排序
  // 教材版本（需求第四章：教材版本不要写死，预留 通用/人教版/北师大版/苏教版 等）。
  // 新增原因：版本此前隐含在 name（"人教版"）里，无法按版本筛选/切换教材。
  // 旧字段 name 保留不动（RULES §7 不得删除已有字段）；缺省时由
  // utils/stage.ts 的 curriculumVersionOfTextbook(name) 兜底推断。
  readonly curriculumVersion?: string;
}
