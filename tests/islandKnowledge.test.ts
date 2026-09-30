// 冒险岛口算题 ↔ 知识点匹配（2026-09-19：让数学唯一的游戏也能回流错题本）。
//
// 核心不变量：**没有把握时必须返回 null**。挂错知识点会在错题本里造出假错题，
// 那种数据会一直污染补弱流程，比不回流更糟。
import { describe, expect, it } from 'vitest';
import { pickIslandKnowledge, type IslandKnowledge } from '../miniprogram/core/islandKnowledge';

// 一年级上册的真实知识点命名（来自教材数据，不是瞎编的）
const G1_UP: readonly IslandKnowledge[] = [
  { _id: 'k-add', word: '加法' },
  { _id: 'k-sub', word: '减法' },
  { _id: 'k-10', word: '10以内加减法' },
  { _id: 'k-9', word: '9加几' },
  { _id: 'k-shape', word: '长方体' },
];

// 二年级上册（有乘法口诀）
const G2_UP: readonly IslandKnowledge[] = [
  { _id: 'k-mul-intro', word: '乘法的初步认识' },
  { _id: 'k-mul5', word: '5的乘法口诀' },
  { _id: 'k-div', word: '用2~6口诀求商' },
];

describe('pickIslandKnowledge', () => {
  it('⚠️ 运算 + 范围同时命中时优先（10 以内的加法挂在「10以内加减法」上）', () => {
    expect(pickIslandKnowledge(G1_UP, 'add', 10)).toBe('k-10');
  });

  it('范围放宽后命中对应知识点（20 以内加法 → 「9加几」）', () => {
    expect(pickIslandKnowledge(G1_UP, 'add', 20)).toBe('k-9');
  });

  it('减法命中减法类知识点', () => {
    expect(pickIslandKnowledge(G1_UP, 'sub', 10)).toBe('k-10');
  });

  it('⚠️ 二年级有「乘法口诀」也有「初步认识」时，挂在口诀上（练的是算得快，不是概念）', () => {
    expect(pickIslandKnowledge(G2_UP, 'mul', 20)).toBe('k-mul5');
  });

  it('除法命中「求商」类知识点', () => {
    expect(pickIslandKnowledge(G2_UP, 'div', 20)).toBe('k-div');
  });

  it('⚠️ 一年级还没学乘法 → 返回 null（不硬猜、不拿第一个凑数）', () => {
    expect(pickIslandKnowledge(G1_UP, 'mul', 20)).toBeNull();
    expect(pickIslandKnowledge(G1_UP, 'div', 20)).toBeNull();
  });

  it('完全没有相关知识点 → null', () => {
    expect(pickIslandKnowledge([{ _id: 'k-1', word: '长方体' }], 'add', 10)).toBeNull();
  });

  it('空列表 → null（不抛错）', () => {
    expect(pickIslandKnowledge([], 'add', 10)).toBeNull();
  });

  it('不会把图形类知识点误当口算知识点', () => {
    expect(pickIslandKnowledge(G1_UP, 'add', 100)).not.toBe('k-shape');
  });
});
