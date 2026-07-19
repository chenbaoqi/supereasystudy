// 登录框架契约（Baseline Spec §1「登录框架」允许骨架；§7 允许创建接口）。
// 业务实现（微信登录、登录态恢复）属 Phase 2，流程以 Specification 为准。
import type { User } from '../core/user';

export interface UserService {
  // 微信登录；成功返回当前用户，失败或用户拒绝返回 null
  login(): Promise<User | null>;

  // 恢复上次登录态；无有效登录态返回 null
  restoreSession(): Promise<User | null>;
}
