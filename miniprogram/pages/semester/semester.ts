// 册次页（Chapter 04 §5：读取 semesters）。册次无 open 概念，全部可点。
import { semesterRepository } from '../../repositories/semesterRepository';
import { createListPage } from '../shared/createListPage';

Page(
  createListPage({
    async fetchItems(query) {
      const semesters = await semesterRepository.listByTextbook(query.textbookId ?? '');
      return semesters.map((item) => ({ id: item._id, title: item.name, open: true }));
    },
    buildNextUrl: (id) => `/pages/chapter/chapter?semesterId=${id}`,
  }),
);
