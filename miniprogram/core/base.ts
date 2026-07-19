// 所有集合共有的基础字段（Baseline Spec §4：字段未知时仅保留这三项；
// 后续只允许扩展字段，不允许修改集合名称）。单点定义，全项目引用（One Source of Truth）。
export interface BaseEntity {
  readonly _id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
