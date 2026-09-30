// 学习路径页（Chapter 04 §5：Vocabulary 开放，其余 Coming Soon）。
// 语法：有偏好时按学段直达语法章节；无偏好时引导教材选择（版本→册次）。
//
// ⚠️ 2026-09-13 IA 调整后本页**不再是主入口**：学科之后直接进教材选择
// （教材是最顶层选择项，「知识点 / 公式」是内容组织维度，不该让用户先选）。
// 页面保留未删（它是唯一能按路径浏览的视图，专题直达等场景还会用到），
// 但当前没有任何路由指向它——如需彻底下线，需同时从 app.json 的 pages 移除。
import { grammarPackService } from '../../services/grammarPackService';
import { learningPathRepository } from '../../repositories/learningPathRepository';
import { userService } from '../../services/userService';
import { stageOfSemesterWith } from '../../utils/stage';
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
        // 按本学科取偏好（多科修复 2026-09-08），避免用英语册次推断数学学段
        const preferences =
          userService.getPreferences(query.subjectId) ?? userService.getPreferences();
        if (preferences) {
          // 同 pages/study/study.ts：专题册次叫「全册」时 stageOfSemester 会兜底成初中，
          // 必须用教材名优先的 stageOfSemesterWith
          const stage = stageOfSemesterWith(preferences.semesterName, preferences.textbookName);
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
