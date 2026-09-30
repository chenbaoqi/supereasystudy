// 知识图谱关系（knowledge_relations 集合，ADR-008 / 需求第三十五章）。
//
// 需求原文：每个知识点建立 prerequisiteIds / relatedIds / nextIds，
// 「系统通过图谱判断：学生当前卡住的原因可能来自哪个前置知识」。
//
// 采用「关系表」而非「数组字段」的原因：
// 关系表可以按 relatedId 反查（谁依赖我），数组字段做不到，而补弱流程正需要反查。
import type { BaseEntity } from './base';

export type RelationType =
  | 'prerequisite' // 前置：学 A 之前要先会 B（A depends on B）
  | 'related' // 相关：易混淆 / 常一起考
  | 'next'; // 后继：学完 A 接着学 B

export const RELATION_TYPE_LABEL: Record<RelationType, string> = {
  prerequisite: '前置知识',
  related: '相关知识',
  next: '后继知识',
};

export interface KnowledgeRelation extends BaseEntity {
  readonly knowledgeId: string; // 主体知识点
  readonly relatedId: string; // 关联知识点
  readonly type: RelationType;
}

// 由关系列表构建的邻接表，供组卷/推荐直接查询。
// dependentOf 是 prerequisite 的**反向索引**（key 被谁当作前置），
// 由 buildGraph 一并建好——「谁依赖我」是补弱流程最常用的一次查询，不该每次全表扫。
export interface KnowledgeGraph {
  readonly prerequisiteOf: Readonly<Record<string, readonly string[]>>;
  readonly relatedOf: Readonly<Record<string, readonly string[]>>;
  readonly nextOf: Readonly<Record<string, readonly string[]>>;
  readonly dependentOf: Readonly<Record<string, readonly string[]>>;
}
