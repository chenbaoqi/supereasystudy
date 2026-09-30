// 启动/登录超时兜底单测。
// 背景（2026-09-13）：云调用挂起导致 appLaunch 卡死 → 整屏白板、无报错。
// 本文件锁定「挂起必须退化为明确的失败结果」这一行为。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../miniprogram/utils/withTimeout';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withTimeout（启动兜底）', () => {
  it('按时 resolve → 透传结果', async () => {
    await expect(withTimeout(Promise.resolve('user-1'), 50, '启动登录')).resolves.toBe('user-1');
  });

  it('按时 resolve(null) → 保持 null（未登录，不是超时）', async () => {
    await expect(withTimeout(Promise.resolve(null), 50, '启动登录')).resolves.toBeNull();
  });

  it('永不 settle → 超时后返回 null（而不是一直挂着）', async () => {
    const never = new Promise<number>(() => undefined);
    await expect(withTimeout(never, 10, '启动登录')).resolves.toBeNull();
  });

  it('reject → 返回 null，不向调用方抛异常', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('scf/invoke -3')), 50, '登录'),
    ).resolves.toBeNull();
  });

  it('超时之后原 Promise 才 resolve → 结果仍为 null（只 settle 一次）', async () => {
    let release!: (value: number) => void;
    const slow = new Promise<number>((resolve) => {
      release = resolve;
    });
    const result = withTimeout(slow, 10, '登录');
    await expect(result).resolves.toBeNull();
    release(7); // 迟到的好消息必须被忽略
    await expect(result).resolves.toBeNull();
  });

  it('超时时间未到不会提前返回', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('ok');
      }, 20);
    });
    await expect(withTimeout(slow, 500, '登录')).resolves.toBe('ok');
  });
});
