// 知识图谱单测（ADR-008 / 需求第三十五章，2026-09-14 补全 B-2）。
//
// 覆盖三件事：
//   1. 建图：按类型分桶、去重、反向索引
//   2. 传递闭包：前置的前置也要找出来（学生卡在 C，真正不会的可能是 A）
//   3. 补弱顺序：只补**根源**，且最上游先补
//
// 数据录错（成环）是最容易发生的：这里必须有环保护，否则页面直接卡死。
import { describe, expect, it } from 'vitest';
import type { KnowledgeRelation, RelationType } from '../miniprogram/core/knowledgeRelation';
import {
  buildGraph,
  createKnowledgeGraphService,
  prerequisiteChainOf,
  PREREQ_READY_SCORE,
  remediationOrder,
} from '../miniprogram/services/knowledgeGraphService';

let seq = 0;
function rel(
  knowledgeId: string,
  relatedId: string,
  type: RelationType = 'prerequisite',
): KnowledgeRelation {
  seq += 1;
  const now = new Date('2026-09-14T00:00:00Z');
  return { _id: `r${seq}`, knowledgeId, relatedId, type, createdAt: now, updatedAt: now };
}

// 链式：A ← B ← C（学 C 要先会 B，学 B 要先会 A）
const chain = [rel('B', 'A'), rel('C', 'B')];

const svc = createKnowledgeGraphService({ knowledgeRelationRepository: {} } as never);

describe('buildGraph', () => {
  it('按关系类型分桶', () => {
    const g = buildGraph([
      rel('a', 'b', 'prerequisite'),
      rel('a', 'c', 'related'),
      rel('a', 'd', 'next'),
    ]);
    expect(g.prerequisiteOf['a']).toEqual(['b']);
    expect(g.relatedOf['a']).toEqual(['c']);
    expect(g.nextOf['a']).toEqual(['d']);
  });

  it('重复关系去重（导入脚本跑两次也不会让图谱膨胀）', () => {
    const g = buildGraph([rel('a', 'b'), rel('a', 'b')]);
    expect(g.prerequisiteOf['a']).toEqual(['b']);
  });

  it('建反向索引：谁把我当前置', () => {
    const g = buildGraph([rel('B', 'A'), rel('C', 'A')]);
    expect([...svc.dependentsOf(g, 'A')].sort()).toEqual(['B', 'C']);
    expect(svc.dependentsOf(g, 'B')).toEqual([]);
  });

  it('反向索引只记 prerequisite，related / next 不算「依赖」', () => {
    const g = buildGraph([rel('B', 'A', 'related'), rel('C', 'A', 'next')]);
    expect(svc.dependentsOf(g, 'A')).toEqual([]);
  });
});

describe('prerequisiteChainOf（传递闭包）', () => {
  it('直接前置', () => {
    const g = buildGraph([rel('C', 'B')]);
    expect(prerequisiteChainOf(g, 'C')).toEqual(['B']);
  });

  it('多级：C 的前置链包含 A（真正卡住的可能在这里）', () => {
    const g = buildGraph(chain);
    expect([...prerequisiteChainOf(g, 'C')].sort()).toEqual(['A', 'B']);
  });

  it('没有关系 → 空数组', () => {
    const g = buildGraph(chain);
    expect(prerequisiteChainOf(g, 'A')).toEqual([]);
  });

  it('成环不死循环（数据录错也必须能返回）', () => {
    const g = buildGraph([rel('A', 'B'), rel('B', 'A')]);
    expect([...prerequisiteChainOf(g, 'A')].sort()).toEqual(['B']);
  });

  it('自环：不把自己算进自己的前置', () => {
    const g = buildGraph([rel('A', 'A')]);
    expect(prerequisiteChainOf(g, 'A')).toEqual([]);
  });
});

describe('remediationOrder（补弱顺序）', () => {
  const g = buildGraph(chain); // A ← B ← C
  const mastered = { A: PREREQ_READY_SCORE + 10, B: PREREQ_READY_SCORE + 10, C: 0 };

  it('前置都达标 → 不用补', () => {
    expect(remediationOrder(g, mastered, 'C')).toEqual([]);
  });

  it('只补根源：B 未达标但根因是 A 时，返回 A 而不是 B', () => {
    const mastery = { A: 10, B: 20, C: 0 };
    expect(remediationOrder(g, mastery, 'C')).toEqual(['A']);
  });

  it('B 已达标、A 未达标的情况不会出现（达标即停止上溯）', () => {
    // B 达标 → 不再往上查 A，因此 A 不会被当成 C 的补弱项
    const mastery = { A: 0, B: PREREQ_READY_SCORE + 5, C: 0 };
    expect(remediationOrder(g, mastery, 'C')).toEqual([]);
  });

  it('多个根源时都列出（分叉图）', () => {
    const forked = buildGraph([rel('C', 'B'), rel('C', 'D'), rel('B', 'A')]);
    const mastery = { A: 0, B: 0, D: 0, C: 0 };
    expect([...remediationOrder(forked, mastery, 'C')].sort()).toEqual(['A', 'D']);
  });

  it('成环不死循环', () => {
    const cyclic = buildGraph([rel('A', 'B'), rel('B', 'A')]);
    expect(remediationOrder(cyclic, { A: 0, B: 0 }, 'A')).toEqual(['B']);
  });

  it('与 unmasteredPrerequisites 的区别：前者给直接前置，本函数给根源', () => {
    const mastery = { A: 10, B: 20, C: 0 };
    expect(svc.unmasteredPrerequisites(g, mastery, 'C')).toEqual(['B']); // 直接前置
    expect(svc.remediationOrder(g, mastery, 'C')).toEqual(['A']); // 根源
  });
});
