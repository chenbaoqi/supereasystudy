// 用户服务单测（多科修复 2026-09-08：分科教材偏好 + 当前学科传递）。
// 背景：首页点「数学」却被英语偏好送进英语学习页——根因是偏好全局单科、
// 且 switchTab 无法带参数。本文件锁定按学科取/存偏好的行为。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User, UserPreferences } from '../miniprogram/core/user';
import type { UserRepository } from '../miniprogram/repositories/userRepository';
import { createUserService } from '../miniprogram/services/userService';

const ENGLISH: UserPreferences = {
  textbookId: 'tb-en',
  textbookName: '人教版 PEP',
  semesterId: 'sem-en-3a',
  semesterName: '三年级上册',
};

const MATH: UserPreferences = {
  textbookId: 'tb-math',
  textbookName: '人教版',
  semesterId: 'sem-math-1a',
  semesterName: '一年级上册',
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: 'u1',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    openid: 'openid-1',
    ...overrides,
  };
}

interface Harness {
  app: { globalData: { currentUser: User | null } };
  storage: Map<string, string>;
  calls: Array<{ preferences: UserPreferences; subjectId: string | undefined }>;
  service: ReturnType<typeof createUserService>;
}

function setup(initialUser: User | null = null): Harness {
  const app = { globalData: { currentUser: initialUser } };
  const storage = new Map<string, string>();
  const calls: Array<{ preferences: UserPreferences; subjectId: string | undefined }> = [];
  // 模拟云端语义：preferencesBySubject 在既有文档上累积（旧学科不会被后来者清掉）
  let bySubject: Record<string, UserPreferences> = {};

  vi.stubGlobal('getApp', () => app);
  vi.stubGlobal('wx', {
    getStorageSync: (key: string) => storage.get(key) ?? '',
    setStorageSync: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeStorageSync: (key: string) => {
      storage.delete(key);
    },
  });

  const userRepository: UserRepository = {
    async fetchCurrent() {
      return makeUser();
    },
    async updatePreferences(preferences, subjectId) {
      calls.push({ preferences, subjectId });
      if (subjectId) bySubject = { ...bySubject, [subjectId]: preferences };
      return makeUser({ preferences, preferencesBySubject: bySubject });
    },
  };

  return {
    app,
    storage,
    calls,
    service: createUserService({ userRepository }),
  };
}

describe('getPreferences（分科读取）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('不传学科 → 读旧字段 preferences（向后兼容）', () => {
    const h = setup(makeUser({ preferences: ENGLISH }));
    expect(h.service.getPreferences()).toEqual(ENGLISH);
  });

  it('传学科 → 读 preferencesBySubject[subjectId]', () => {
    const h = setup(makeUser({ preferences: ENGLISH, preferencesBySubject: { 'sj-math': MATH } }));
    expect(h.service.getPreferences('sj-math')).toEqual(MATH);
  });

  it('该学科未选过 → 返回 null（不回退到别的学科，避免点数学命中英语）', () => {
    const h = setup(makeUser({ preferences: ENGLISH }));
    expect(h.service.getPreferences('sj-math')).toBeNull();
  });

  it('未登录 → 返回 null', () => {
    const h = setup(null);
    expect(h.service.getPreferences()).toBeNull();
    expect(h.service.getPreferences('sj-math')).toBeNull();
  });
});

describe('savePreferences（分科写入）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('带 subjectId → 透传给 repository', async () => {
    const h = setup();
    await h.service.savePreferences(MATH, 'sj-math');
    expect(h.calls).toEqual([{ preferences: MATH, subjectId: 'sj-math' }]);
  });

  it('不带 subjectId → 只写旧字段（老链路零回归）', async () => {
    const h = setup();
    await h.service.savePreferences(ENGLISH);
    expect(h.calls).toEqual([{ preferences: ENGLISH, subjectId: undefined }]);
  });

  it('保存后当次会话即可按学科读到新偏好', async () => {
    const h = setup();
    await h.service.savePreferences(MATH, 'sj-math');
    expect(h.service.getPreferences('sj-math')).toEqual(MATH);
  });

  it('两个学科的册次互不覆盖（先选英语再选数学，英语仍在）', async () => {
    const h = setup();
    await h.service.savePreferences(ENGLISH, 'sj-en');
    await h.service.savePreferences(MATH, 'sj-math');
    expect(h.service.getPreferences('sj-en')).toEqual(ENGLISH);
    expect(h.service.getPreferences('sj-math')).toEqual(MATH);
  });

  it('写入失败 → 返回 null 且不抛异常', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = createUserService({
      userRepository: {
        async fetchCurrent() {
          return makeUser();
        },
        async updatePreferences() {
          throw new Error('network');
        },
      },
    });
    await expect(failing.savePreferences(MATH, 'sj-math')).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});

describe('当前学科（switchTab 无参数，走本地存储）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('写入后可读回', () => {
    const h = setup();
    h.service.setCurrentSubjectId('sj-math');
    expect(h.service.getCurrentSubjectId()).toBe('sj-math');
    expect(h.storage.get('currentSubjectId')).toBe('sj-math');
  });

  it('传空串 → 清除', () => {
    const h = setup();
    h.service.setCurrentSubjectId('sj-math');
    h.service.setCurrentSubjectId('');
    expect(h.service.getCurrentSubjectId()).toBe('');
  });

  it('存储异常不抛出，降级为空串', () => {
    const h = setup();
    vi.stubGlobal('wx', {
      getStorageSync: () => {
        throw new Error('storage denied');
      },
      setStorageSync: () => {
        throw new Error('storage denied');
      },
      removeStorageSync: () => {
        throw new Error('storage denied');
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => h.service.setCurrentSubjectId('sj-math')).not.toThrow();
    expect(h.service.getCurrentSubjectId()).toBe('');
    vi.restoreAllMocks();
  });
});

// 2026-09-19「第一次打开都很慢」：restoreSession 走的是**云函数**，冷启动要 1~3 秒。
// 改成「先给本机缓存、云函数后台刷新」，启动路径不再干等。
describe('restoreSession 登录态缓存（冷启动提速）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  function harness(cached: User | null) {
    const app = { globalData: { currentUser: null as User | null } };
    const storage = new Map<string, unknown>();
    let fetchCalls = 0;
    vi.stubGlobal('getApp', () => app);
    vi.stubGlobal('wx', {
      getStorageSync: (key: string) => storage.get(key) ?? '',
      setStorageSync: (key: string, value: unknown) => {
        storage.set(key, value);
      },
      removeStorageSync: (key: string) => {
        storage.delete(key);
      },
    });
    if (cached) storage.set('cachedUser', cached);
    const service = createUserService({
      userRepository: {
        async fetchCurrent() {
          fetchCalls += 1;
          return makeUser({ openid: 'fresh' });
        },
        async updatePreferences() {
          return makeUser();
        },
      },
    });
    return { app, storage, service, calls: () => fetchCalls };
  }

  it('⚠️ 有缓存时立刻返回，不等云函数（这是提速的关键）', async () => {
    const h = harness(makeUser());
    const user = await h.service.restoreSession();
    expect(user?._id).toBe('u1');
    expect(h.app.globalData.currentUser?._id).toBe('u1');
    // 后台刷新的那次在 await 之后才可能发生，这里只断言「没有阻塞」
    expect(user?.openid).toBe('openid-1'); // 来自缓存，不是云端的 fresh
  });

  it('有缓存时后台仍会刷新一次（保证不会一直用旧数据）', async () => {
    const h = harness(makeUser());
    await h.service.restoreSession();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.calls()).toBe(1);
    expect(h.app.globalData.currentUser?.openid).toBe('fresh');
  });

  it('没有缓存 → 走云函数（老行为不变）', async () => {
    const h = harness(null);
    const user = await h.service.restoreSession();
    expect(user?.openid).toBe('fresh');
    expect(h.calls()).toBe(1);
  });

  it('缓存缺 _id → 视为无效，不拿它凑合', async () => {
    const broken = { openid: 'x' } as User;
    const h = harness(broken);
    const user = await h.service.restoreSession();
    expect(user?.openid).toBe('fresh'); // 走了云函数
    expect(h.calls()).toBe(1);
  });

  it('登录（login）仍然走云函数，不被缓存短路', async () => {
    const h = harness(makeUser());
    const user = await h.service.login();
    expect(user?.openid).toBe('fresh');
    expect(h.calls()).toBe(1);
  });
});

// 2026-09-20 启动崩溃回归测试。
//
// 现象：`App.onLaunch` 期间打印「启动登录失败 TypeError: Cannot read properties of
// undefined (reading 'globalData') at saveSession」。
// 根因：onLaunch 里 `getApp()` 会返回 undefined（官方明确说 onLaunch 内别用 getApp，实例还没初始化），
// 而 restoreSession 命中本机缓存时会**同步**写一次登录态，正好落在这个阶段。
describe('App.onLaunch 阶段 getApp 未就绪（启动崩溃回归）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  function harness(cached: User | null, appReady: boolean) {
    const app = { globalData: { currentUser: null as User | null } };
    const storage = new Map<string, unknown>();
    vi.stubGlobal('getApp', () => (appReady ? app : undefined));
    vi.stubGlobal('wx', {
      getStorageSync: (key: string) => storage.get(key) ?? '',
      setStorageSync: (key: string, value: unknown) => {
        storage.set(key, value);
      },
      removeStorageSync: (key: string) => {
        storage.delete(key);
      },
    });
    if (cached) storage.set('cachedUser', cached);
    const service = createUserService({
      userRepository: {
        async fetchCurrent() {
          return makeUser({ openid: 'fresh' });
        },
        async updatePreferences() {
          return makeUser();
        },
      },
    });
    return { app, storage, service };
  }

  it('⚠️ getApp() 返回 undefined 时不能抛（原来就是这里崩的）', async () => {
    const h = harness(makeUser(), false);
    await expect(h.service.restoreSession()).resolves.toBeTruthy();
  });

  it('⚠️ globalData 写不进去时，getCurrentUser 用本机缓存兜底（否则页面会把人踢去登录页）', () => {
    const h = harness(makeUser(), false);
    expect(h.service.getCurrentUser()?._id).toBe('u1');
  });

  it('App 就绪后仍然优先用 globalData', () => {
    const h = harness(makeUser(), true);
    h.app.globalData.currentUser = makeUser({ openid: 'from-app' });
    expect(h.service.getCurrentUser()?.openid).toBe('from-app');
  });
});
