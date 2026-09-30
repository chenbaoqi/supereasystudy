// questions 集合访问（ADR-008 / 需求第二十九章）：题库。
import type { Question } from '../core/question';
import type { SemesterStage } from '../utils/stage';

export interface QuestionFilter {
  readonly knowledgePointIds?: readonly string[];
  readonly stage?: SemesterStage;
  readonly grade?: number;
  readonly status?: Question['status'];
}

export interface QuestionRepository {
  listByKnowledge(knowledgeId: string): Promise<Question[]>;
  listByFilter(filter: QuestionFilter): Promise<Question[]>;
  getById(questionId: string): Promise<Question | null>;
}

const COLLECTION = 'questions';

export const questionRepository: QuestionRepository = {
  async listByKnowledge(knowledgeId) {
    // knowledgePointIds 是数组字段：云数据库中直接用标量匹配即为「数组包含该值」
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ knowledgePointIds: knowledgeId })
      .limit(200)
      .get();
    return res.data as Question[];
  },

  async listByFilter(filter) {
    const where: Record<string, unknown> = {};
    if (filter.stage) where.stage = filter.stage;
    if (filter.grade !== undefined) where.grade = filter.grade;
    if (filter.status) where.status = filter.status;
    const res = await wx.cloud.database().collection(COLLECTION).where(where).limit(200).get();
    return res.data as Question[];
  },

  async getById(questionId) {
    const db = wx.cloud.database();
    const res = await db.collection(COLLECTION).where({ questionId }).limit(1).get();
    return (res.data[0] as Question | undefined) ?? null;
  },
};
