// users 集合访问（Chapter 04 §5 Login，Owner 确认 E：users 属登录基础设施）。
// 微信云开发标准模式：客户端不直查/直写 users，统一经云函数
// （云端 getWXContext 取 openid，身份不可伪造）。
import type { User, UserPreferences } from '../core/user';

export interface UserRepository {
  // 调用 login 云函数：按 openid 查用户，不存在则建档；返回完整用户记录
  fetchCurrent(): Promise<User>;
  // 调用 updateUserPreferences 云函数：保存教材偏好（Chapter 14 §3）
  updatePreferences(preferences: UserPreferences): Promise<User>;
}

export const userRepository: UserRepository = {
  async fetchCurrent() {
    const res = await wx.cloud.callFunction({ name: 'login' });
    return res.result as User;
  },

  async updatePreferences(preferences) {
    const res = await wx.cloud.callFunction({
      name: 'updateUserPreferences',
      data: { preferences },
    });
    return res.result as User;
  },
};
