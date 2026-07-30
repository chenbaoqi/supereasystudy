// 教材页（Chapter 04 §5：读取 textbooks）。教材无 open 概念，全部可点。
import { textbookRepository } from '../../repositories/textbookRepository';
import { createListPage } from '../shared/createListPage';

Page(
  createListPage({
    async fetchItems(query) {
      const textbooks = await textbookRepository.listByLearningPath(query.learningPathId ?? '');
      return textbooks.map((item) => ({ id: item._id, title: item.name, open: true }));
    },
    buildNextUrl: (item) =>
      `/pages/grade/grade?textbookId=${item.id}&textbookName=${encodeURIComponent(item.title)}`,
  }),
);
