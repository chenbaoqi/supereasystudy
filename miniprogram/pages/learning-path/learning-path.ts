// 学习路径页（Chapter 04 §5：Vocabulary 开放，其余 Coming Soon）。
// 语法：有偏好时按学段直达语法章节；无偏好时引导教材选择（版本→册次）。
import { grammarPackService } from '../../services/grammarPackService';
import { learningPathRepository } from '../../repositories/learningPathRepository';
import { userService } from '../../services/userService';
import { stageOfSemester } from '../../utils/stage';
import { createListPage } from '../shared/createListPage';

const GRAMMAR_PATH_NAME = '语法';

Page(
  createListPage({
    async fetchItems(query) {
      const paths = await learningPathRepository.listBySubject(query.subjectId ?? '');
      return paths.map((item) => ({ id: item._id, title: item.name, open: item.open }));
    },
    buildNextUrl: (item) => `/pages/textbook/textbook?learningPathId=${item.id}`,
    async onTapItem(item, query) {
      if (!item.open) {
        wx.navigateTo({ url: '/pages/coming-soon/coming-soon' });
        return;
      }
      // 语法：有偏好 → 直达章节；无偏好 → 引导教材选择（找词汇路径的 textbook）
      if (item.title === GRAMMAR_PATH_NAME) {
        const preferences = userService.getPreferences();
        if (preferences) {
          const stage = stageOfSemester(preferences.semesterName);
          const semesterId = await grammarPackService.resolveSemesterId(stage);
          if (semesterId) {
            wx.navigateTo({ url: `/pages/chapter/chapter?semesterId=${semesterId}` });
            return;
          }
        }
        // 未设偏好 → 用词汇路径的 textbookId 进入版本选择
        const paths = await learningPathRepository.listBySubject(query.subjectId ?? '');
        const vocabPath = paths.find((item) => item.name === '词汇');
        if (vocabPath) {
          wx.navigateTo({ url: `/pages/textbook/textbook?learningPathId=${vocabPath._id}` });
          return;
        }
      }
      wx.navigateTo({ url: `/pages/textbook/textbook?learningPathId=${item.id}` });
    },
  }),
);
