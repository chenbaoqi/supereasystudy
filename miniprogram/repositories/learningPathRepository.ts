// learning_paths 集合访问（Chapter 04 §9）。
import type { LearningPath } from '../core/learningPath';

export interface LearningPathRepository {
  listBySubject(subjectId: string): Promise<LearningPath[]>;
}

export const learningPathRepository: LearningPathRepository = {
  async listBySubject(subjectId) {
    const res = await wx.cloud
      .database()
      .collection('learning_paths')
      .where({ subjectId })
      .orderBy('order', 'asc')
      .limit(100)
      .get();
    return res.data as LearningPath[];
  },
};
