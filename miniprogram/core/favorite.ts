import type { BaseEntity } from './base';

// 收藏（favorites 集合）。
// 依据：2026-07-19 Owner 决策（ADR-005）——独立于 learning_records 建集合，
// 每「用户×知识点」一条。收藏页按 userId 查询后与 knowledge 聚合。
export interface Favorite extends BaseEntity {
  readonly userId: string; // 关联 users._id
  readonly knowledgeId: string; // 关联 knowledge._id
}
