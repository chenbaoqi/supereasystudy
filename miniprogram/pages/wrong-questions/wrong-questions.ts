// 错题本（L3 / 需求第三十六、三十七章）。
//
// 定位：**错题本不是收藏夹**。这一页不是「把错过的题堆出来让人反复刷」，
// 而是显示每条错题现在走到补弱流程的哪一步（待诊断 / 重做中 / 待重测 / 已修复），
// 让人知道「还有几道没补完」。
//
// 数据两个来源，缺一不可：
//   1. user_wrong_questions：错题记录（只存知识点 id，不存题面——游戏题是动态展开的）
//   2. knowledge：知识点名（错题里只有 id，要 join 出名字）
// ⚠️ join 不到名字时显示「（已下线的知识点）」而不是留空或瞎猜——
//    教材重置后知识点 id 会变，旧错题对不上是正常现象，不能假装它还在。
import type { Knowledge } from '../../core/knowledge';
import type { RemediationStage } from '../../core/wrongQuestion';
import { REMEDIATION_STAGE_LABEL } from '../../core/wrongQuestion';
import { knowledgeRepository } from '../../repositories/knowledgeRepository';
import { wrongQuestionRepository } from '../../repositories/wrongQuestionRepository';
import { userService } from '../../services/userService';
import { withTimeout } from '../../utils/withTimeout';

// 读库最多等这么久：超时按「读不到」处理并显示可重试的空态，绝不转圈
const LOAD_WAIT_MS = 6000;

interface WrongRow {
  readonly key: string;
  readonly knowledgeId: string;
  /** 所属章节：跳学习详情**必须**带它（study-detail 只认 chapterId，没有就 reLaunch 到登录页） */
  readonly chapterId: string;
  readonly title: string;
  readonly stageText: string;
  readonly stageClass: string;
  readonly wrongCount: number;
  readonly fixed: boolean;
}

// 补弱阶段 → chip 配色（与 u-chip-* 的语义一致：未修复用 warning，已修复用 success）
const STAGE_CLASS: Partial<Record<RemediationStage, string>> = {
  new: 'u-chip-warning',
  diagnosed: 'u-chip-warning',
  hint_shown: 'u-chip-warning',
  redo: 'u-chip-warning',
  explained: 'u-chip-warning',
  prereq_check: 'u-chip-warning',
  similar_easy: 'u-chip-warning',
  variant: 'u-chip-warning',
  scheduled: 'u-chip-brand',
  fixed: 'u-chip-success',
};

Page({
  data: {
    loading: true,
    loadFailed: false,
    // three states must be distinguishable（记忆里的老规矩：空 / 失败 / 有数据三种态不能都写「加载失败」）
    source: 'loading' as 'loading' | 'empty' | 'error' | 'ready',
    rows: [] as WrongRow[],
    unfixedCount: 0,
    fixedCount: 0,
  },

  alive: true,

  onLoad() {
    this.alive = true;
    void this.load();
  },

  onUnload() {
    this.alive = false;
  },

  onShow() {
    // 从学习详情返回时可能有新进展（目前补弱由详情页推进，回来要刷新）
    if (!this.data.loading) void this.load();
  },

  async load() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ loading: true, loadFailed: false });
    const records = await withTimeout(
      wrongQuestionRepository.listByUser(user._id),
      LOAD_WAIT_MS,
      '错题本读取',
    );
    if (!this.alive) return;
    if (records === null) {
      this.setData({ loading: false, loadFailed: true, source: 'error' });
      return;
    }
    if (records.length === 0) {
      this.setData({ loading: false, source: 'empty', rows: [], unfixedCount: 0, fixedCount: 0 });
      return;
    }
    const ids = [...new Set(records.map((item) => item.knowledgePointIds[0] ?? item.questionId))];
    const knowledgeList = await withTimeout(
      knowledgeRepository.listByIds(ids),
      LOAD_WAIT_MS,
      '错题知识点',
    );
    if (!this.alive) return;
    const byId = new Map<string, Knowledge>((knowledgeList ?? []).map((item) => [item._id, item]));

    const rows: WrongRow[] = records.map((record, index) => {
      const knowledgeId = record.knowledgePointIds[0] ?? record.questionId;
      const knowledge = byId.get(knowledgeId);
      return {
        key: record._id ?? `${knowledgeId}-${index}`,
        knowledgeId,
        chapterId: knowledge?.chapterId ?? '',
        title: knowledge?.word ?? '（已下线的知识点）',
        stageText: REMEDIATION_STAGE_LABEL[record.stage] ?? '待诊断',
        stageClass: STAGE_CLASS[record.stage] ?? 'u-chip-warning',
        wrongCount: record.wrongCount,
        fixed: record.fixed,
      };
    });
    // 未修复的排前面：错题本的意义是「还有多少没补完」，不是考古
    rows.sort((a, b) => Number(a.fixed) - Number(b.fixed) || b.wrongCount - a.wrongCount);
    this.setData({
      loading: false,
      source: 'ready',
      rows,
      unfixedCount: rows.filter((item) => !item.fixed).length,
      fixedCount: rows.filter((item) => item.fixed).length,
    });
  },

  onRetry() {
    void this.load();
  },

  // 点一条 → 回这个知识点所在的章节重学一遍（V1 的补弱入口）。
  // ⚠️ 必须带 chapterId：study-detail 的 onLoad 里 `!query.chapterId` 会直接 reLaunch 到登录页，
  //    传 knowledgeId 过去等于把用户踢出去了。知识点 join 不到时（教材重置过）没有 chapterId，
  //    这时宁可提示也不跳。
  onTapRow(event: WechatMiniprogram.TouchEvent) {
    const { chapter } = event.currentTarget.dataset as { chapter: string };
    if (!chapter) {
      wx.showToast({
        title: '这条错题对应的知识点已不在当前教材里',
        icon: 'none',
      });
      return;
    }
    wx.navigateTo({ url: `/pages/study-detail/study-detail?chapterId=${chapter}` });
  },
});
