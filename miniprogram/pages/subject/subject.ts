// 学科入口页（Owner 2026-07-19 重定位）：接收 subjectId——
// 已开放学科 → 直接进入学习路径页；未开放学科 → 本页展示「敬请期待」（§12.3 中文文案）。
import { subjectRepository } from '../../repositories/subjectRepository';

Page({
  data: { subjectName: '', loading: true, loadFailed: false },

  async onLoad(query: Record<string, string>) {
    try {
      const subjects = await subjectRepository.listAll();
      const subject = subjects.find((item) => item._id === query.subjectId);
      if (!subject) {
        this.setData({ loading: false });
        return;
      }
      if (subject.open) {
        wx.redirectTo({ url: `/pages/learning-path/learning-path?subjectId=${subject._id}` });
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
