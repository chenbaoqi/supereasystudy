// 冒险岛按年级调难度（L4）。
//
// 核心不变量：**不能超纲**。一年级的孩子打到最后一关，也不能见到除法；
// 反过来高年级不该被困在 10 以内加减。
import { describe, expect, it } from 'vitest';
import { islandCfgWithGrade, ISLAND_LEVELS } from '../miniprogram/config/mathIsland';
import { createRun } from '../miniprogram/core/mathIsland';

// 最后一关（城堡）是默认曲线里最难的：四则 + range 100
const hardest = ISLAND_LEVELS[ISLAND_LEVELS.length - 1]!;
// 第一关（口算村）是最简单的：add/sub + range 10
const easiest = ISLAND_LEVELS[0]!;

describe('islandCfgWithGrade', () => {
  it('年级解析不出 → 原样返回（宁可简单，不瞎猜）', () => {
    expect(islandCfgWithGrade(hardest.cfg, null)).toEqual(hardest.cfg);
  });

  it('⚠️ 一年级：最后一关也不能出现乘除，数值不超过 20', () => {
    const cfg = islandCfgWithGrade(hardest.cfg, 1);
    expect(cfg.ops).toEqual(['add', 'sub']);
    expect(cfg.range).toBeLessThanOrEqual(20);
  });

  it('二年级：有乘法但没有除法（除法三年级才学）', () => {
    const cfg = islandCfgWithGrade(hardest.cfg, 2);
    expect(cfg.ops).toContain('mul');
    expect(cfg.ops).not.toContain('div');
  });

  it('三年级：数值放宽到 50，仍不给除法', () => {
    const cfg = islandCfgWithGrade(hardest.cfg, 3);
    expect(cfg.range).toBeLessThanOrEqual(50);
    expect(cfg.ops).not.toContain('div');
  });

  it('四年级以上：不收窄，保留关卡默认曲线', () => {
    expect(islandCfgWithGrade(hardest.cfg, 4)).toEqual(hardest.cfg);
    expect(islandCfgWithGrade(hardest.cfg, 9)).toEqual(hardest.cfg);
  });

  it('关卡本身就比年级上限简单时，听关卡的（取交集不放大）', () => {
    const cfg = islandCfgWithGrade(easiest.cfg, 6);
    expect(cfg.range).toBe(easiest.cfg.range);
    expect(cfg.ops).toEqual(easiest.cfg.ops);
  });

  it('交集为空也不给空关卡（退回加法）', () => {
    // 构造一个极端：关卡只有除法，年级是一年级
    const cfg = islandCfgWithGrade({ ops: ['div'], range: 100 }, 1);
    expect(cfg.ops).toEqual(['add']);
  });
});

describe('createRun 接入年级难度', () => {
  it('一年级开局：整局都不会出除法题', () => {
    const run = createRun(hardest, () => 0.5, islandCfgWithGrade(hardest.cfg, 1));
    expect(run.ops).toEqual(['add', 'sub']);
    expect(run.range).toBeLessThanOrEqual(20);
    // 题目确实生成出来了（不是空局）
    expect(run.questions.length).toBeGreaterThan(0);
  });

  it('不传 cfg 覆盖 → 与老行为一致', () => {
    const run = createRun(hardest, () => 0.5);
    expect(run.ops).toEqual(hardest.cfg.ops);
    expect(run.range).toBe(hardest.cfg.range);
  });
});
