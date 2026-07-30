// 用户服务（Chapter 04 §5 Login：自动检测登录 / 微信登录 / 恢复用户）。
// openid 登录天然幂等：login 与 restoreSession 走同一云函数，
// 前者是用户主动行为（登录页按钮），后者是应用启动时的静默恢复——语义不同，页面各取所需。
import type { User, UserPreferences } from '../core/user';
import { userRepository, type UserRepository } from '../repositories/userRepository';

export interface UserService {
  login(): Promise<User | null>;
  restoreSession(): Promise<User | null>;
  getCurrentUser(): User | null;
  // 教材偏好（Chapter 14 §3/§4）
  getPreferences(): UserPreferences | null;
  savePreferences(preferences: UserPreferences): Promise<User | null>;
}

export function createUserService(deps: { userRepository: UserRepository }): UserService {
  // 登录态写入 globalData 的唯一位置（One Source of Truth）
  const saveSession = (user: User | null): User | null => {
    getApp<IAppOption>().globalData.currentUser = user;
    return user;
  };

  const silentLogin = async (): Promise<User | null> => {
    try {
      return saveSession(await deps.userRepository.fetchCurrent());
    } catch (error) {
      console.error('登录失败（§8 由登录页提供重试）', error);
      return saveSession(null);
    }
  };

  return {
    login: silentLogin,
    restoreSession: silentLogin,
    getCurrentUser() {
      return getApp<IAppOption>().globalData.currentUser;
    },

    getPreferences() {
      return getApp<IAppOption>().globalData.currentUser?.preferences ?? null;
    },

    async savePreferences(preferences) {
      try {
        // 保存后同步全局登录态（学习 tab/首页当次会话即可读到新偏好）
        const user = await deps.userRepository.updatePreferences(preferences);
        return saveSession(user);
      } catch (error) {
        console.error('保存教材偏好失败', error);
        return null;
      }
    },
  };
}

export const userService = createUserService({ userRepository });
