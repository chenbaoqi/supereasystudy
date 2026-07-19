// 学习路径页（Chapter 04 §5：Vocabulary 开放，其余 Coming Soon）。
import { learningPathRepository } from '../../repositories/learningPathRepository';
import { createListPage } from '../shared/createListPage';

Page(
  createListPage({
    async fetchItems(query) {
      const paths = await learningPathRepository.listBySubject(query.subjectId ?? '');
      return paths.map((item) => ({ id: item._id, title: item.name, open: item.open }));
    },
    buildNextUrl: (id) => `/pages/textbook/textbook?learningPathId=${id}`,
  }),
);
