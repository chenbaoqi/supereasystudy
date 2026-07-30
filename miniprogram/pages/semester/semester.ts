// 学期（册次）选择页（Owner 2026-07-31 修订：版本→册次两步，选完即回学习页）。
// 点开学期 = 保存教材偏好并回到学习页（页面标注版本 · 册次）。
import type { ListPageItem } from '../shared/createListPage';
import { semesterRepository } from '../../repositories/semesterRepository';
import { textbookRepository } from '../../repositories/textbookRepository';
import { userService } from '../../services/userService';
import { createListPage } from '../shared/createListPage';

// 保存偏好后回到学习页
async function savePreferenceThenGo(
  item: ListPageItem,
  query: Record<string, string>,
): Promise<void> {
  const textbookId = query.textbookId ?? '';
  // 修复乱码：路由参数里的教材名是 encodeURIComponent 编码的，入库前必须解码
  let textbookName = query.textbookName ? decodeURIComponent(query.textbookName) : '';
  if (!textbookName && textbookId) {
    const textbook = await textbookRepository.findById(textbookId);
    textbookName = textbook?.name ?? '';
  }
  if (textbookId) {
    await userService.savePreferences({
      textbookId,
      textbookName,
      semesterId: item.id,
      semesterName: item.title,
    });
  }
  wx.switchTab({ url: '/pages/study/study' });
}

Page(
  createListPage({
    async fetchItems(query) {
      const semesters = await semesterRepository.listByTextbook(query.textbookId ?? '');
      return semesters.map((item) => ({ id: item._id, title: item.name, open: true }));
    },
    onTapItem(item, query) {
      void savePreferenceThenGo(item, query);
    },
  }),
);
