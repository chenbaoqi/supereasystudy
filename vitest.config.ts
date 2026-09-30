import { defineConfig } from 'vitest/config';

// 只跑 tests/ 下的用例。
// 原因：工程根会有 `_archive-*/` 归档区（下线功能留退路用，见 _archive-math-drill/RESTORE.md），
// 归档代码不在打包范围（miniprogramRoot = miniprogram/）里、依赖链已断，不能被测试扫到。
// 用 include 精确指向 tests/ 而不是加 exclude，下一个归档目录会自动被排除。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // ⚠️ 单进程跑（2026-09-26 发现）：默认的多线程池在本机会**偶发丢文件** ——
    //    同一份代码多线程跑到过 51 files / 723 tests，单线程稳定 53 / 765。
    //    门禁数字会飘 = 门禁不可信（可能漏测），所以牺牲几秒换确定性。
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
