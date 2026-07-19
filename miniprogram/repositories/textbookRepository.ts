// textbooks 集合访问（Chapter 04 §9）。
import type { Textbook } from '../core/textbook';

export interface TextbookRepository {
  listByLearningPath(learningPathId: string): Promise<Textbook[]>;
}

export const textbookRepository: TextbookRepository = {
  async listByLearningPath(learningPathId) {
    const res = await wx.cloud
      .database()
      .collection('textbooks')
      .where({ learningPathId })
      .orderBy('order', 'asc')
      .limit(100)
      .get();
    return res.data as Textbook[];
  },
};
