// 册次排序（2026-09-21 Owner 反馈「排序乱糟糟」）。
//
// 数据里英语「七年级上册」的 order 是 13（排在最后），照搬数据顺序会乱。
// 这里锁住展示层的排序规则：年级优先，同年级按 上 → 下 → 全册。
import { describe, expect, it } from 'vitest';
import { compareSemesterNames, semesterSortKey } from '../miniprogram/utils/stage';

describe('册次排序', () => {
  // 真实数据里的顺序（七年级上册确实排在最后）
  const actual = [
    '三年级上册',
    '三年级下册',
    '四年级上册',
    '四年级下册',
    '五年级上册',
    '五年级下册',
    '六年级上册',
    '六年级下册',
    '七年级下册',
    '八年级上册',
    '八年级下册',
    '九年级全册',
    '七年级上册',
  ];

  it('⚠️ 七年级上册必须回到七年级下册前面（不能因为 order=13 掉到最后）', () => {
    const sorted = [...actual].sort(compareSemesterNames);
    const iUp = sorted.indexOf('七年级上册');
    const iDown = sorted.indexOf('七年级下册');
    expect(iUp).toBeLessThan(iDown);
    // ⚠️ 九年级在七年级**之后**（数字更大）——我第一版把这条写反了，白跑了一轮
    expect(iUp).toBeLessThan(sorted.indexOf('九年级全册'));
  });

  it('整体顺序：三年级 → … → 九年级', () => {
    const sorted = [...actual].sort(compareSemesterNames);
    expect(sorted.slice(0, 4)).toEqual(['三年级上册', '三年级下册', '四年级上册', '四年级下册']);
    expect(sorted[sorted.length - 1]).toBe('九年级全册');
  });

  it('同年级：上 → 下 → 全册', () => {
    const sorted = ['七年级全册', '七年级下册', '七年级上册'].sort(compareSemesterNames);
    expect(sorted).toEqual(['七年级上册', '七年级下册', '七年级全册']);
  });

  it('数学的一年级也能排（一~九年级全覆盖）', () => {
    const names = ['二年级上册', '一年级下册', '一年级上册'];
    expect([...names].sort(compareSemesterNames)).toEqual([
      '一年级上册',
      '一年级下册',
      '二年级上册',
    ]);
  });

  it('解析不出年级的（专题「全册」）排到最后', () => {
    const sorted = ['全册', '一年级上册'].sort(compareSemesterNames);
    expect(sorted).toEqual(['一年级上册', '全册']);
  });

  it('排序键随年级递增', () => {
    expect(semesterSortKey('一年级上册')).toBeLessThan(semesterSortKey('二年级上册'));
  });
});
