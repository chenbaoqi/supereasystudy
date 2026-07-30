// 年级选择页（Owner 2026-07-31 教材选择模型第二步：版本 → 年级 → 学期）。
import { gradeService } from '../../services/gradeService';
import { createListPage } from '../shared/createListPage';

Page(
  createListPage({
    async fetchItems(query) {
      const grades = await gradeService.listGrades(query.textbookId ?? '');
      return grades.map((grade) => ({ id: grade, title: grade, open: true }));
    },
    onTapItem(item, query) {
      // 携带版本与年级进入学期选择（教材名已在路由中编码，学期页负责解码）
      wx.navigateTo({
        url:
          `/pages/semester/semester?textbookId=${query.textbookId ?? ''}` +
          `&textbookName=${query.textbookName ?? ''}&grade=${encodeURIComponent(item.title)}`,
      });
    },
  }),
);
