// users 集合的数据访问契约（Baseline Spec §1 允许 Repository 骨架；§7 允许创建接口）。
// 实现要求：封装 wx.cloud、输入输出使用 core 类型（见本目录 README）。
import type { User } from '../core/user';

export interface UserRepository {
  // 查找当前登录用户；不存在返回 null
  findCurrent(): Promise<User | null>;
}
