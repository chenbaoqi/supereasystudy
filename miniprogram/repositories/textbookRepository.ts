// textbooks 集合访问（Chapter 04 §9）。
import type { Textbook } from '../core/textbook';

export interface TextbookRepository {
  listByLearningPath(learningPathId: string): Promise<Textbook[]>;
  // 按 id 取单本教材（Chapter 14：偏好保存时补名称用）
  findById(id: string): Promise<Textbook | null>;
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

  async findById(id) {
    const res = await wx.cloud.database().collection('textbooks').doc(id).get();
    return (res.data as Textbook | undefined) ?? null;
  },
};
