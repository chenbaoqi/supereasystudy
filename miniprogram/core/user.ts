import type { BaseEntity } from './base';

// 用户教材偏好（Chapter 14 §3：一次设置长期复用；名称冗余供顶部横条免 join 展示）
export interface UserPreferences {
  readonly textbookId: string; // 教材版本 id（如 人教版 PEP）
  readonly textbookName: string; // 名称冗余（展示免 join）
  readonly semesterId: string; // 册次 id
  readonly semesterName: string; // 名称冗余（如 三年级上册）
}

// 用户（users 集合）。openid 是微信登录与身份恢复的凭据
// （Chapter 04 §5 Login：自动检测登录/微信登录/恢复用户）。
// 角色体系（游客/VIP 预留/管理员）见 Specification 第三章，字段后续扩展。
export interface User extends BaseEntity {
  readonly openid: string;
  readonly preferences?: UserPreferences; // 教材偏好（Chapter 14；未设置时无此字段）
}
