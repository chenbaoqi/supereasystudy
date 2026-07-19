import type { BaseEntity } from './base';

// 用户（users 集合）。openid 是微信登录与身份恢复的凭据
// （Chapter 04 §5 Login：自动检测登录/微信登录/恢复用户）。
// 角色体系（游客/VIP 预留/管理员）见 Specification 第三章，字段后续扩展。
export interface User extends BaseEntity {
  readonly openid: string;
}
