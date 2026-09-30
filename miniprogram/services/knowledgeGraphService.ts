// 知识图谱服务（需求第三十五章）：把关系表构建成邻接表，供组卷与补弱查询。
//
// 关键用途：需求原文「系统通过图谱判断：学生当前卡住的原因可能来自哪个前置知识」。
// 组卷（paperComposer 的 prereqOf）与补弱（前置知识检查）都依赖本文件。
//
// 2026-09-14 补全（B-2）：
//   1. 反向索引 dependentOf —— 关系表的价值就在「谁依赖我」，之前只建了正向表，反查要全表扫。
//   2. 传递闭包 prerequisiteChainOf —— 「直接前置」不够用：学生卡在 C，真正不会的可能是 A。
//   3. 补弱顺序 remediationOrder —— 找出**最根源**的未达标前置。
//      直接前置 B 没达标时，先补 B 是错的（B 自己也依赖没学会的 A），必须先补 A。
import type { KnowledgeGraph, KnowledgeRelation } from '../core/knowledgeRelation';
import { knowledgeRelationRepository } from '../repositories/knowledgeRelationRepository';
import type { KnowledgeRelationRepository } from '../repositories/knowledgeRelationRepository';

// 前置知识达标线（与 paperComposer 的 PREREQ_MASTERY_THRESHOLD 保持一致）
export const PREREQ_READY_SCORE = 60;

function emptyGraph(): {
  prerequisiteOf: Record<string, string[]>;
  relatedOf: Record<string, string[]>;
  nextOf: Record<string, string[]>;
  dependentOf: Record<string, string[]>;
} {
  return { prerequisiteOf: {}, relatedOf: {}, nextOf: {}, dependentOf: {} };
}

// 关系列表 → 邻接表。同一对关系重复出现会去重。
export function buildGraph(relations: readonly KnowledgeRelation[]): KnowledgeGraph {
  const acc = emptyGraph();
  for (const r of relations) {
    const bucket =
      r.type === 'prerequisite'
        ? acc.prerequisiteOf
        : r.type === 'related'
          ? acc.relatedOf
          : acc.nextOf;
    const list = bucket[r.knowledgeId] ?? [];
    if (!list.includes(r.relatedId)) list.push(r.relatedId);
    bucket[r.knowledgeId] = list;

    // 反向索引只建「前置」一条：补弱要问的是「谁依赖我」，related / next 的反查没有这个语义
    if (r.type === 'prerequisite') {
      const deps = acc.dependentOf[r.relatedId] ?? [];
      if (!deps.includes(r.knowledgeId)) deps.push(r.knowledgeId);
      acc.dependentOf[r.relatedId] = deps;
    }
  }
  return acc;
}

// 传递闭包：某知识点的**全部**前置（含前置的前置）。
// 返回的不是拓扑序，只是去重后的集合；需要补弱顺序请用 remediationOrder。
// 环保护：数据录错（A 是 B 的前置、B 又是 A 的前置）时不能死循环。
export function prerequisiteChainOf(graph: KnowledgeGraph, knowledgeId: string): readonly string[] {
  const seen = new Set<string>();
  const stack = [...(graph.prerequisiteOf[knowledgeId] ?? [])];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const parent of graph.prerequisiteOf[current] ?? []) {
      if (!seen.has(parent)) stack.push(parent);
    }
  }
  seen.delete(knowledgeId); // 自环：自己不该出现在自己的前置里
  return [...seen];
}

// 补弱顺序：找出未达标的**根源**前置，最上游的排在最前。
// 为什么不能直接用「未达标的直接前置」：学生卡在 C，直接前置 B 没达标，
// 但 B 没达标是因为 A 没学会 —— 先补 B 等于让他去学一个还够不着的东西。
export function remediationOrder(
  graph: KnowledgeGraph,
  masteryMap: Readonly<Record<string, number>>,
  knowledgeId: string,
): readonly string[] {
  const out: string[] = [];
  const seen = new Set<string>([knowledgeId]);

  const walk = (id: string): void => {
    for (const pre of graph.prerequisiteOf[id] ?? []) {
      if (seen.has(pre)) continue; // 环保护：见过就不再展开
      seen.add(pre);
      // 已达标 → 不用补，也不必再往上（它的前置基本也是达标的）
      if ((masteryMap[pre] ?? 0) >= PREREQ_READY_SCORE) continue;
      const before = out.length;
      walk(pre);
      // 往上没找到更根源的未达标项 → 自己就是根源
      if (out.length === before) out.push(pre);
    }
  };

  walk(knowledgeId);
  return out;
}

export interface KnowledgeGraphService {
  loadGraph(): Promise<KnowledgeGraph>;
  // 某知识点的前置链（直接前置）
  prerequisitesOf(graph: KnowledgeGraph, knowledgeId: string): readonly string[];
  // 某知识点的全部前置（含前置的前置）
  prerequisiteChainOf(graph: KnowledgeGraph, knowledgeId: string): readonly string[];
  // 反查：谁把我当前置（补弱/下架影响面）
  dependentsOf(graph: KnowledgeGraph, knowledgeId: string): readonly string[];
  // 未达标的前置知识（补弱的切入点，仅直接前置）
  unmasteredPrerequisites(
    graph: KnowledgeGraph,
    masteryMap: Readonly<Record<string, number>>,
    knowledgeId: string,
  ): readonly string[];
  // 未达标的**根源**前置，按「最上游先补」排序
  remediationOrder(
    graph: KnowledgeGraph,
    masteryMap: Readonly<Record<string, number>>,
    knowledgeId: string,
  ): readonly string[];
}

export function createKnowledgeGraphService(deps: {
  knowledgeRelationRepository: KnowledgeRelationRepository;
}): KnowledgeGraphService {
  return {
    async loadGraph() {
      const relations = await deps.knowledgeRelationRepository.listAll();
      return buildGraph(relations);
    },

    prerequisitesOf(graph, knowledgeId) {
      return graph.prerequisiteOf[knowledgeId] ?? [];
    },

    prerequisiteChainOf,

    dependentsOf(graph, knowledgeId) {
      return graph.dependentOf[knowledgeId] ?? [];
    },

    unmasteredPrerequisites(graph, masteryMap, knowledgeId) {
      const pres = graph.prerequisiteOf[knowledgeId] ?? [];
      return pres.filter((p) => (masteryMap[p] ?? 0) < PREREQ_READY_SCORE);
    },

    remediationOrder,
  };
}

export const knowledgeGraphService: KnowledgeGraphService = createKnowledgeGraphService({
  knowledgeRelationRepository,
});
