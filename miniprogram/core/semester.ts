import type { BaseEntity } from './base';
import type { SemesterStage } from '../utils/stage';

// 册次（semesters 集合，§5 Semester：读取 semesters）。
export interface Semester extends BaseEntity {
  readonly textbookId: string; // 所属教材（§3：Textbook → Semester）
  readonly name: string; // 册次名（如 一年级上册）
  readonly order: number; // 列表排序
  // 学段（需求第四章：数据库必须支持 stage grade semester curriculumVersion）。
  // 新增原因：此前 stage 靠册次名正则推断，且旧正则会把「一年级」误判为初中。
  // 缺省时由 utils/stage.ts 的 stageOfSemester(name) 兜底推断。
  readonly stage?: SemesterStage;
  // 年级 1-12（1-6 小学 / 7-9 初中 / 10-12 高中）。
  // 新增原因：年级是组卷、推荐、UI 分层的第一等维度，不应每次从名称解析。
  // 缺省时由 utils/stage.ts 的 gradeOfSemester(name) 兜底推断。
  readonly grade?: number;
}
