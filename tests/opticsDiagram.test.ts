// 物理光路图纯逻辑单测（2026-09-30）：锁 opticsViewOf 的 kind 校验与说明文案。
import { describe, expect, it } from 'vitest';
import { opticsViewOf } from '../miniprogram/utils/opticsDiagram';

describe('opticsViewOf（光路图视图）', () => {
  it('三种合法 kind 各自返回对应视图', () => {
    expect(opticsViewOf('reflection')?.kind).toBe('reflection');
    expect(opticsViewOf('refraction')?.kind).toBe('refraction');
    expect(opticsViewOf('lens')?.kind).toBe('lens');
  });

  it('反射图说明文案正确', () => {
    expect(opticsViewOf('reflection')?.caption).toBe('反射角等于入射角');
  });

  it('非法 kind 返回 null（不渲染也不报错）', () => {
    expect(opticsViewOf('unknown')).toBeNull();
    expect(opticsViewOf('')).toBeNull();
    expect(opticsViewOf(undefined)).toBeNull();
  });
});
