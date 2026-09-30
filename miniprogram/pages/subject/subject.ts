// 学科入口页（Owner 2026-07-19 重定位）：接收 subjectId——
// 已开放学科 → 直接进入**教材选择**（教材是最顶层选择项，学生的心智是
// 「我上人教版、一年级上册」，不是「我要学知识点还是公式」——2026-09-13 IA 调整）；
// 未开放学科 → 本页展示「敬请期待」（§12.3 中文文案）。
import { subjectRepository } from '../../repositories/subjectRepository';
import { userService } from '../../services/userService';

Page({
  data: { subjectName: '', loading: true, loadFailed: false },

  async onLoad(query: Record<string, string>) {
    try {
      // 记住当前学科：后续选教材流与学习 tab 都据此分科（switchTab 无法带参）
      if (query.subjectId) userService.setCurrentSubjectId(query.subjectId);
      const subjects = await subjectRepository.listAll();
      const subject = subjects.find((item) => item._id === query.subjectId);
      if (!subject) {
        this.setData({ loading: false });
        return;
      }
      if (subject.open) {
        wx.redirectTo({ url: `/pages/textbook/textbook?subjectId=${subject._id}` });
        return;
      }
      this.setData({ subjectName: subject.name, loading: false });
    } catch (error) {
      console.error('学科加载失败（§12.3 重试）', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRetry() {
    this.setData({ loading: true, loadFailed: false });
    void this.onLoad(this.options as Record<string, string>);
  },
});
