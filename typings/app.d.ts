import type { User } from '../miniprogram/core/user';

declare global {
  // 全局 App 实例类型：globalData 结构的单点定义（One Source of Truth）。
  // 写入只允许发生在 UserService（登录态唯一写入口）。
  interface IAppOption {
    globalData: {
      currentUser: User | null;
    };
  }
}

export {};
