// 徽章配置的自检（2026-09-20 加的）。
//
// 为什么会有这个文件：那天加勋章时加了**两条一模一样的「百题斩」**——
// 原有的那条是单行格式 `{ id: 'q100', ... }`，被 prettier 压成了一行，
// 我用「按换行分块」的方式去数，两次都把它漏掉了（第一次以为只有 12 枚，
// 第二次检查还向 Owner 报告「无重复」）。所以这里**直接测运行时数组**，
// 不碰文本格式——格式怎么排都不会漏。
import { describe, expect, it } from 'vitest';
import { BADGES, RANKS } from '../miniprogram/config/growth';

describe('BADGES 配置自检', () => {
  it('⚠️ id 必须唯一（重复 id 会让同一枚勋章出现两次、且判定互相打架）', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('⚠️ 名字也不能重复（孩子看到两枚同名勋章会以为出了 bug）', () => {
    const names = BADGES.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('每枚都得有图标、名字、解锁条件文案和正的阈值', () => {
    for (const badge of BADGES) {
      expect(badge.icon.length).toBeGreaterThan(0);
      expect(badge.name.length).toBeGreaterThan(0);
      // desc 就是「怎么才能拿到」，孩子要照着它去努力，不能空着
      expect(badge.desc.length).toBeGreaterThan(0);
      expect(badge.value).toBeGreaterThan(0);
    }
  });

  it('clearedLevel / plays 这类按名字判定的必须带 param', () => {
    for (const badge of BADGES) {
      if (badge.kind === 'clearedLevel' || badge.kind === 'plays') {
        expect(badge.param, `${badge.id} 缺 param，判定永远不成立`).toBeTruthy();
      }
    }
  });

  it('每款游戏的勋章 gameId 都真实存在（写错就永远拿不到）', () => {
    const gameIds = ['memory', 'speed', 'listen', 'shooter', 'grammar', 'island', 'scene'];
    for (const badge of BADGES) {
      if (badge.kind !== 'plays') continue;
      expect(gameIds, `${badge.id} 的 param 不是已知 gameId`).toContain(badge.param);
    }
  });
});

describe('RANKS 配置自检', () => {
  it('等级门槛严格递增（否则升级逻辑会跳级或卡住）', () => {
    for (let i = 1; i < RANKS.length; i += 1) {
      expect(RANKS[i]!.min).toBeGreaterThan(RANKS[i - 1]!.min);
    }
  });

  it('第一级从 0 开始（新用户必须有个能停的档）', () => {
    expect(RANKS[0]?.min).toBe(0);
  });

  it('⚠️ 等级名不该再出现「口算」（等级是全站的，学英语的孩子也看它）', () => {
    for (const rank of RANKS) {
      expect(rank.title).not.toContain('口算');
    }
  });
});
