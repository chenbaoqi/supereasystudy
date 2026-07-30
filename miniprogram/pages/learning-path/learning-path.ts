// 学习路径页（Chapter 04 §5：Vocabulary 开放，其余 Coming Soon）。
// 语法扁平化（Owner 2026-07-31）：点「语法」按用户册次学段直接进语法专题章节，
// 跳过「语法专题包教材 + 全册册次」两层多余台阶；未设偏好时回退到教材选择页。
import type { ListPageItem } from '../shared/createListPage';
import { grammarPackService } from '../../services/grammarPackService';
import { learningPathRepository } from '../../repositories/learningPathRepository';
import { userService } from '../../services/userService';
import { stageOfSemester } from '../../utils/stage';
import { createListPage } from '../shared/createListPage';

// 语法路径名（数据内容键，来自种子/导入数据）
const GRAMMAR_PATH_NAME = '语法';

async function goGrammarChapters() {
  const preferences = userService.getPreferences();
  if (!preferences) return null; // 未设偏好 → 回退默认跳转（教材选择页）
  const stage = stageOfSemester(preferences.semesterName);
  const semesterId = await grammarPackService.resolveSemesterId(stage);
  if (!semesterId) return null;
  wx.navigateTo({ url: `/pages/chapter/chapter?semesterId=${semesterId}` });
  return true;
}

Page(
  createListPage({
    async fetchItems(query) {
      const paths = await learningPathRepository.listBySubject(query.subjectId ?? '');
      return paths.map((item) => ({ id: item._id, title: item.name, open: item.open }));
    },
    buildNextUrl: (item) => `/pages/textbook/textbook?learningPathId=${item.id}`,
    async onTapItem(item: ListPageItem, _query) {
      if (item.title === GRAMMAR_PATH_NAME && item.open) {
        const flattened = await goGrammarChapters();
        if (flattened) return; // 已按学段直达语法章节
      }
      wx.navigateTo({
        url: item.open
          ? `/pages/textbook/textbook?learningPathId=${item.id}`
          : '/pages/coming-soon/coming-soon',
      });
    },
  }),
);
