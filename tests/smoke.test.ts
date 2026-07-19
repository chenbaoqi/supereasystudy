import { describe, expect, it } from 'vitest';

// 冒烟测试：仅验证「测试框架 → CI」链路可用，不含任何业务断言。
// 第一个业务测试出现时，本文件可删除。
describe('工程基座', () => {
  it('测试链路可用', () => {
    expect(true).toBe(true);
  });
});
