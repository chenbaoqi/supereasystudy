// knowledge_relations 集合访问（ADR-008 / 需求第三十五章）：知识图谱关系。
import type { KnowledgeRelation, RelationType } from '../core/knowledgeRelation';

export interface KnowledgeRelationRepository {
  listAll(): Promise<KnowledgeRelation[]>;
  listByKnowledge(knowledgeId: string): Promise<KnowledgeRelation[]>;
  // 反查：谁把我当作某类关系（补弱流程需要「谁依赖我」）
  listByRelated(relatedId: string, type?: RelationType): Promise<KnowledgeRelation[]>;
}

const COLLECTION = 'knowledge_relations';

export const knowledgeRelationRepository: KnowledgeRelationRepository = {
  async listAll() {
    const res = await wx.cloud.database().collection(COLLECTION).limit(1000).get();
    return res.data as KnowledgeRelation[];
  },

  async listByKnowledge(knowledgeId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ knowledgeId })
      .limit(100)
      .get();
    return res.data as KnowledgeRelation[];
  },

  async listByRelated(relatedId, type) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where(type ? { relatedId, type } : { relatedId })
      .limit(100)
      .get();
    return res.data as KnowledgeRelation[];
  },
};
