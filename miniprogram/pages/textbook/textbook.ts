// 教材页（Chapter 04 §5：读取 textbooks）。教材无 open 概念，全部可点。
// 2026-09-13 IA 调整：教材是**最顶层**选择项——学科之后直接列教材，
// 不再让用户先选「知识点 / 公式」这类路径（那是内容组织维度，不是学生选书的维度）。
// 主入口带 subjectId（按学科汇总、排除专题包）；旧入口 learningPathId 保留兼容。
import { textbookRepository } from '../../repositories/textbookRepository';
import { textbookPicker } from '../../services/textbookPicker';
import { createListPage } from '../shared/createListPage';

Page(
  createListPage({
    async fetchItems(query) {
      const textbooks = query.subjectId
        ? await textbookPicker.listTextbooks(query.subjectId)
        : await textbookRepository.listByLearningPath(query.learningPathId ?? '');
      return textbooks.map((item) => ({ id: item._id, title: item.name, open: true }));
    },
    buildNextUrl: (item) =>
      `/pages/semester/semester?textbookId=${item.id}&textbookName=${encodeURIComponent(item.title)}`,
  }),
);
