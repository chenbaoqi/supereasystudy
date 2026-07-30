// 学期选择页（Owner 2026-07-31 教材选择模型第三步：版本 → 年级 → 学期，选完即定）。
// 点开学期 = 保存教材偏好并回到学习页（页面标注版本年级学期）。
// 携带 grade 参数时按年级过滤学期列表（如 三年级 → 三年级上册/下册）。
import type { ListPageItem } from '../shared/createListPage';
import { semesterRepository } from '../../repositories/semesterRepository';
import { textbookRepository } from '../../repositories/textbookRepository';
import { userService } from '../../services/userService';
import { parseSemesterName } from '../../utils/stage';
import { createListPage } from '../shared/createListPage';

// 保存偏好后回到学习页（Owner 2026-07-31：选择到学期即结束，回到标注版本年级学期的课程页）
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
  // 选择到学期即结束：回到学习 tab（顶部横条标注 版本｜年级｜学期）
  wx.switchTab({ url: '/pages/study/study' });
}

Page(
  createListPage({
    async fetchItems(query) {
      const semesters = await semesterRepository.listByTextbook(query.textbookId ?? '');
      const grade = query.grade ? decodeURIComponent(query.grade) : '';
      const filtered = grade
        ? semesters.filter((item) => parseSemesterName(item.name).grade === grade)
        : semesters;
      return filtered.map((item) => ({ id: item._id, title: item.name, open: true }));
    },
    onTapItem(item, query) {
      void savePreferenceThenGo(item, query);
    },
  }),
);
