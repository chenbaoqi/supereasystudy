// 加分反馈单测（2026-09-29）：锁 starGainText 的组合逻辑。
// 背景：加分反馈有四种组合（星/徽章的有无），文案错了会让孩子看到「+0⭐」或漏报徽章。
import { describe, expect, it } from 'vitest';
import { starGainText } from '../miniprogram/utils/starFeedback';
import type { BadgeDef } from '../miniprogram/core/growth';

const badge = (name: string): BadgeDef => ({
  id: 'b',
  icon: '⭐',
  name,
  desc: '',
  kind: 'stars',
  value: 1,
});

describe('starGainText（加分反馈文案）', () => {
  it('有星有徽章 → 一起报', () => {
    expect(starGainText(5, [badge('学有小成')])).toBe('+5⭐ 解锁「学有小成」');
  });

  it('只有星 → 报星', () => {
    expect(starGainText(3, [])).toBe('+3⭐');
  });

  it('只有徽章（stars=0）→ 只报徽章', () => {
    expect(starGainText(0, [badge('初次出发')])).toBe('🎉 解锁「初次出发」');
  });

  it('都没有 → 静默 null', () => {
    expect(starGainText(0, [])).toBeNull();
  });
});
