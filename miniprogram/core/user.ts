import type { BaseEntity } from './base';

// 用户（users 集合，Baseline Spec §4）。
// 当前仅含基础字段；角色体系（游客/登录用户/VIP 预留/管理员）见 Specification 第三章。
// Phase 2 扩展字段时改为 interface User extends BaseEntity { ... }。
export type User = BaseEntity;
