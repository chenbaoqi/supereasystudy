// 学科页（Chapter 04 §5：V1 仅开放 English，其余进 Coming Soon——数据驱动 open 字段）。
import { subjectRepository } from '../../repositories/subjectRepository';
import { createListPage } from '../shared/createListPage';

Page(
  createListPage({
    async fetchItems() {
      const subjects = await subjectRepository.listAll();
      return subjects.map((item) => ({ id: item._id, title: item.name, open: item.open }));
    },
    buildNextUrl: (id) => `/pages/learning-path/learning-path?subjectId=${id}`,
  }),
);
