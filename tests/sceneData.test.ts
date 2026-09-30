// 情景闯关题库的数据自检（数学 + 英语）。
//
// 为什么单独一个文件测「数据」：题是手写的，手滑漏 hint、answerIndex 写越界、
// 两个选项复制粘贴成同一句——这些都不会被 tsc 抓到，只会在孩子做题时变成
// 「点了 B 显示答错，其实 B 就是答案」。这里把它们变成红灯。
//
// 另外两条是**拍板结论的验收**：
//   ① 补齐一二年级 → 数学每个场景都必须有 grade <= 2 的组；
//   ② 英语版要做 → 英语包存在且覆盖三~四、五~六两个学段。
import { describe, expect, it } from 'vitest';
import { SCENE_PACKS } from '../miniprogram/config/scenes';
import { MATH_SCENE_PACKS } from '../miniprogram/config/mathScenes';
import { ENGLISH_SCENE_PACKS } from '../miniprogram/config/englishScenes';
import type { ScenePack } from '../miniprogram/core/scene';

const PACK_GROUPS: ReadonlyArray<{ label: string; packs: readonly ScenePack[] }> = [
  { label: '数学', packs: MATH_SCENE_PACKS },
  { label: '英语', packs: ENGLISH_SCENE_PACKS },
];

describe.each(PACK_GROUPS)('$label 情景题数据自检', ({ packs }) => {
  it('包 id 与组 id 全局唯一', () => {
    const packIds = packs.map((p) => p.id);
    expect(new Set(packIds).size).toBe(packIds.length);
    const questIds = packs.flatMap((p) => p.quests.map((q) => q.id));
    expect(new Set(questIds).size).toBe(questIds.length);
  });

  it('每组恰好 4 问，每题恰好 4 个选项且互不重复', () => {
    for (const pack of packs) {
      for (const quest of pack.quests) {
        expect(quest.questions.length, `${quest.id} 应当 4 问`).toBe(4);
        for (const [i, q] of quest.questions.entries()) {
          expect(q.options.length, `${quest.id} 第 ${i + 1} 问`).toBe(4);
          expect(new Set(q.options).size, `${quest.id} 第 ${i + 1} 问选项重复`).toBe(4);
        }
      }
    }
  });

  it('answerIndex 合法，stem / hint / explain 都非空', () => {
    for (const pack of packs) {
      for (const quest of pack.quests) {
        expect(quest.story.trim(), `${quest.id} 缺情景卡`).not.toBe('');
        for (const [i, q] of quest.questions.entries()) {
          const at = `${quest.id} 第 ${i + 1} 问`;
          expect(q.answerIndex, at).toBeGreaterThanOrEqual(0);
          expect(q.answerIndex, at).toBeLessThan(q.options.length);
          expect(q.stem.trim(), at).not.toBe('');
          expect(q.hint.trim(), `${at} 缺 hint`).not.toBe('');
          expect(q.explain.trim(), `${at} 缺 explain`).not.toBe('');
        }
      }
    }
  });

  it('同一组内的组按 grade 升序排（列表页依赖这个顺序）', () => {
    for (const pack of packs) {
      const grades = pack.quests.map((q) => q.grade ?? 0);
      expect(
        [...grades].sort((a, b) => a - b),
        pack.id,
      ).toEqual(grades);
    }
  });
});

describe('数学：拍板① 一二年级要有得做', () => {
  it('每个场景包都至少有一组 grade <= 2', () => {
    for (const pack of MATH_SCENE_PACKS) {
      const low = pack.quests.filter((q) => (q.grade ?? 0) <= 2);
      expect(low.length, `${pack.name} 缺低年级组`).toBeGreaterThan(0);
    }
  });

  it('四个场景齐备，每个场景覆盖低/中/高三个学段', () => {
    expect(MATH_SCENE_PACKS.length).toBe(4);
    for (const pack of MATH_SCENE_PACKS) {
      const grades = new Set(pack.quests.map((q) => q.grade));
      expect(grades.has(1), `${pack.name} 缺一年级组`).toBe(true);
      expect(
        [...grades].some((g) => g !== undefined && g >= 3 && g <= 4),
        `${pack.name} 缺中段`,
      ).toBe(true);
      expect(
        [...grades].some((g) => g !== undefined && g >= 5),
        `${pack.name} 缺高段`,
      ).toBe(true);
    }
  });
});

describe('英语：拍板② 情景题要做', () => {
  it('四个场景齐备，每个场景覆盖三~四 / 五~六两个学段', () => {
    expect(ENGLISH_SCENE_PACKS.length).toBe(4);
    for (const pack of ENGLISH_SCENE_PACKS) {
      const grades = new Set(pack.quests.map((q) => q.grade));
      expect(grades.has(3), `${pack.name} 缺三~四年级组`).toBe(true);
      expect(grades.has(5), `${pack.name} 缺五~六年级组`).toBe(true);
    }
  });

  it('英语题不出现一二年级组（英语从三年级起）', () => {
    for (const pack of ENGLISH_SCENE_PACKS) {
      for (const quest of pack.quests) {
        expect(quest.grade ?? 9, quest.id).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('总入口', () => {
  it('SCENE_PACKS = 数学 + 英语，subject 字段与来源一致', () => {
    expect(SCENE_PACKS.length).toBe(MATH_SCENE_PACKS.length + ENGLISH_SCENE_PACKS.length);
    expect(SCENE_PACKS.filter((p) => p.subject === '数学').length).toBe(MATH_SCENE_PACKS.length);
    expect(SCENE_PACKS.filter((p) => p.subject === '英语').length).toBe(ENGLISH_SCENE_PACKS.length);
  });
});
