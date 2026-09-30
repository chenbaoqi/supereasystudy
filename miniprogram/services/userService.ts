// 用户服务（Chapter 04 §5 Login：自动检测登录 / 微信登录 / 恢复用户）。
// openid 登录天然幂等：login 与 restoreSession 走同一云函数，
// 前者是用户主动行为（登录页按钮），后者是应用启动时的静默恢复——语义不同，页面各取所需。
import type { User, UserPreferences } from '../core/user';
import { userRepository, type UserRepository } from '../repositories/userRepository';

// 「当前学科」本地键：wx.switchTab 不支持 URL 参数，tab 页（学习）拿不到点击的学科，
// 故用同步存储传递（同步是硬要求——跳转前必须写完，异步会读到旧值）。
const CURRENT_SUBJECT_KEY = 'currentSubjectId';

export interface UserService {
  login(): Promise<User | null>;
  restoreSession(): Promise<User | null>;
  getCurrentUser(): User | null;
  // 教材偏好（Chapter 14 §3/§4）
  // 传 subjectId → 取该学科的册次（多科）；不传 → 取旧字段 preferences（兼容/回退）
  getPreferences(subjectId?: string): UserPreferences | null;
  savePreferences(preferences: UserPreferences, subjectId?: string): Promise<User | null>;
  // 当前学科（首页点选 / 选教材后写入，学习 tab 读取）
  getCurrentSubjectId(): string;
  setCurrentSubjectId(subjectId: string): void;
  // 清除本本机保存的「当前学科」等本地态（设置页「恢复默认」用；不动云端学习记录）
  clearLocalState(): void;
}

// 本地存储读写容错：模拟器/隐私模式下可能抛异常，失败不应阻断页面跳转
function readLocal(key: string): string {
  try {
    return (wx.getStorageSync<string>(key) as string | undefined) ?? '';
  } catch {
    return '';
  }
}

function writeLocal(key: string, value: string): void {
  try {
    if (value) wx.setStorageSync(key, value);
    else wx.removeStorageSync(key);
  } catch (error) {
    console.error('本地存储写入失败', error);
  }
}

// ---------- 登录态的本机缓存（为「冷启动第一次打开慢」而加）----------
// 与 CURRENT_SUBJECT_KEY 一样只存本机：这是「这台设备的使用者」，不是账号级共享数据。
const SESSION_CACHE_KEY = 'cachedUser';

function readSessionCache(): User | null {
  try {
    const raw = wx.getStorageSync<User | string>(SESSION_CACHE_KEY);
    if (!raw) return null;
    const user = typeof raw === 'string' ? (JSON.parse(raw) as User) : raw;
    // _id 是后续所有查询的凭据，缺了这份缓存没有意义
    return user && user._id ? user : null;
  } catch (error) {
    console.error('登录态缓存读取失败（按没有缓存处理）', error);
    return null;
  }
}

function writeSessionCache(user: User | null): void {
  try {
    if (user) wx.setStorageSync(SESSION_CACHE_KEY, user);
    else wx.removeStorageSync(SESSION_CACHE_KEY);
  } catch (error) {
    console.error('登录态缓存写入失败', error);
  }
}

export function createUserService(deps: { userRepository: UserRepository }): UserService {
  // 登录态写入 globalData 的唯一位置（One Source of Truth）
  //
  // ⚠️ 必须容错（2026-09-20 启动崩过）：`App.onLaunch` 期间 `getApp()` 可能返回 undefined
  //    ——官方明确说「不要在 onLaunch 里用 getApp，用 this」，那时实例还没完成初始化。
  //    而 restoreSession 现在会**同步**写一次登录态（命中本机缓存时），正好落在 onLaunch 的同步阶段，
  //    于是 `getApp().globalData` 直接抛 `Cannot read properties of undefined`，
  //    表现为「启动登录失败」红字 + 首页拿不到用户。
  //    这里改成拿不到就只写本机缓存，globalData 由后续（App 就绪后）的读取兜底。
  const saveSession = (user: User | null): User | null => {
    try {
      const app = getApp<IAppOption>();
      if (app?.globalData) app.globalData.currentUser = user;
    } catch (error) {
      console.error('globalData 暂不可用（App 启动中）', error);
    }
    writeSessionCache(user);
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

  /**
   * 启动时的静默恢复：**先给本地缓存，云函数在后台刷新**。
   *
   * 为什么这么改（2026-09-19「第一次打开都很慢」）：
   * `userRepository.fetchCurrent()` 走的是**云函数**（`login`），而云函数有冷启动——
   * 小程序每次冷启动都要为它等 1~3 秒，用户看到的就是「第一次打开特别慢、之后快」。
   * 用户的 openid 不会变，这份缓存放本机是安全的（resetAndImport 也不动 users 集合）。
   *
   * 安全边界：
   *   - 缓存只用于「立刻进页面」，**后台一定会再刷一次**；刷新成功就覆盖缓存。
   *   - 刷新失败不清除缓存（那会把「慢」变成「进不去」），只记日志。
   */
  const restoreSession = async (): Promise<User | null> => {
    const cached = readSessionCache();
    if (!cached) return silentLogin();
    saveSession(cached);
    // 后台刷新：不 await —— 启动路径一秒都不能等
    void deps.userRepository
      .fetchCurrent()
      .then((user) => saveSession(user))
      .catch((error: unknown) => console.error('登录态后台刷新失败', error));
    return cached;
  };

  return {
    login: silentLogin,
    restoreSession,
    getCurrentUser() {
      try {
        const app = getApp<IAppOption>();
        if (app?.globalData?.currentUser) return app.globalData.currentUser;
      } catch (error) {
        // App 启动中，走下面的本机缓存兜底
        console.error('globalData 暂不可用，改用本机缓存', error);
      }
      // 兜底：本机缓存里就是上次同步过的登录态。没有它的话，
      // onLaunch 同步阶段设置的登录态会「写不进 globalData」，页面 onLoad 读到 null 就被踢去登录页。
      return readSessionCache();
    },

    getPreferences(subjectId) {
      const user = getApp<IAppOption>().globalData.currentUser;
      if (!user) return null;
      if (subjectId) return user.preferencesBySubject?.[subjectId] ?? null;
      return user.preferences ?? null;
    },

    async savePreferences(preferences, subjectId) {
      try {
        // 保存后同步全局登录态（学习 tab/首页当次会话即可读到新偏好）
        const user = await deps.userRepository.updatePreferences(preferences, subjectId);
        return saveSession(user);
      } catch (error) {
        console.error('保存教材偏好失败', error);
        return null;
      }
    },

    getCurrentSubjectId() {
      return readLocal(CURRENT_SUBJECT_KEY);
    },

    setCurrentSubjectId(subjectId) {
      writeLocal(CURRENT_SUBJECT_KEY, subjectId);
    },

    clearLocalState() {
      writeLocal(CURRENT_SUBJECT_KEY, '');
    },
  };
}

export const userService = createUserService({ userRepository });
