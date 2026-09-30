// 学习 tab「我的课程」（Chapter 14 §4 课程统一视图）：
// 已设偏好直达当前册次课程页——主分区（该册 units）+ 专题分区（对应学段专题包）；
// 未设偏好显示引导卡。分区按当前学科动态渲染：英语=单词/语法，数学=概念/公式。
// 学科由偏好的册次反查（semester→textbook→learningPath→subject），不写死单科逻辑。
import type { ChapterItem } from '../../services/chapterService';
import { chapterService } from '../../services/chapterService';
import { grammarPackService } from '../../services/grammarPackService';
import { semesterRepository } from '../../repositories/semesterRepository';
import { subjectRepository } from '../../repositories/subjectRepository';
import { userService } from '../../services/userService';
import { gradeOfSemester, stageOfSemesterWith } from '../../utils/stage';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { getSubjectUiConfig } from '../../config/subjects';

interface Partition {
  readonly key: 'main' | 'topic';
  readonly label: string; // 分区标题（单词/语法/概念/公式）
  readonly iconClass: string; // study.wxss 中的图标样式类
  readonly iconText: string; // 图标字
  readonly unit: string; // 计数单位
  readonly count: number;
  readonly items: ChapterItem[];
  readonly semesterId: string;
  readonly expanded: boolean;
}

Page({
  data: {
    hasPreference: false,
    textbookName: '',
    semesterName: '',
    subjectName: '', // 顶部横条显示「学科 · 教材 · 册次」（只写「人教版 · 七年级下册」分不清是哪一科）
    partitions: [] as Partition[],
    loading: true,
  },

  hidden: false,

  async onShow() {
    this.hidden = false;
    await this.loadMine();
  },

  onHide() {
    this.hidden = true;
  },

  async loadMine() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    // 多科修复 2026-09-08：优先按「当前学科」取该科册次；
    // 该科未选过则回退旧字段（直接点底部 tab 进入的场景），两者都无才显示引导卡。
    const currentSubjectId = userService.getCurrentSubjectId();
    const preferences =
      (currentSubjectId ? userService.getPreferences(currentSubjectId) : null) ??
      userService.getPreferences();
    if (!preferences) {
      if (!this.hidden) this.setData({ hasPreference: false, loading: false });
      return;
    }
    try {
      // 主分区：当前册次章节（陈旧偏好自愈见下）
      let semesterId = preferences.semesterId;
      let semesterName = preferences.semesterName;
      // 当前年级：专题包（公式/语法）是整学段词典，靠它过滤掉还没学到的内容（ADR-012）
      const grade = gradeOfSemester(semesterName);
      // ⚠️ 这两件事都只依赖 semesterId，原本串行等了两轮云调用。
      //    学习页是四个 tab 里加载最重的，并起来是最直接的一处提速。
      let [items, resolved] = await Promise.all([
        chapterService.buildChapterItems(user._id, semesterId, grade),
        resolveSubjectOfSemester(semesterId),
      ]);
      // 陈旧偏好自愈（早期全清重导致旧册次 id 失效）：
      // 按 textbookId+semesterName 重新解析并静默修正存储（upsert 后 id 已稳定，仅一次性）
      if (items.length === 0) {
        const semesters = await semesterRepository.listByTextbook(preferences.textbookId);
        const found = semesters.find((item) => item.name === preferences.semesterName);
        if (found) {
          semesterId = found._id;
          semesterName = found.name;
          // 自愈换了册次 id，上面那条学科反查是基于旧 id 的，必须重查一次
          const [fixed, fixedResolved] = await Promise.all([
            chapterService.buildChapterItems(user._id, semesterId, grade),
            resolveSubjectOfSemester(semesterId),
          ]);
          items = fixed;
          resolved = fixedResolved;
          await userService.savePreferences(
            { ...preferences, semesterId },
            currentSubjectId || undefined,
          );
        }
      }

      // 顶部横条要显示学科：反查不到就留空，**不假装是「英语」**
      // —— 数学册顶部写着「英语 · 人教版 · 七年级下册」比不显示更糟（2026-09-14）
      const subjectName = resolved?.subjectName ?? '';
      const subjectId = resolved?.subjectId ?? '';
      // UI 配置仍需要兜底：主/专题分区标签、图标都从它取
      const ui = getSubjectUiConfig(subjectName || '英语');
      // 学科以册次实际归属为准：避免「点数学却停在英语」的状态错位再次发生
      if (subjectId) userService.setCurrentSubjectId(subjectId);
      // 学段 = 教材名优先、册次名兜底（utils/stage.ts 的 stageOfSemesterWith）。
      // ⚠️ 这里不能只用 stageOfSemester(semesterName)：公式专题的册次一律叫「全册」，
      // 年级解析不出时会兜底成 junior，公式分区就会永远指向「初中公式专题」——
      // 小学生也看到初中公式（2026-09-19 用户反馈的「小学与初中公式一样」）。
      const stage = stageOfSemesterWith(semesterName, preferences.textbookName);

      // 专题分区：按学科 + 专题路径名 + 学段解析专题册次（英语语法/数学公式同构）
      const topicSemesterId = subjectId
        ? await grammarPackService.resolveSemesterIdByPath(subjectId, ui.topicPathName, stage)
        : null;
      const topicItems = topicSemesterId
        ? await chapterService.buildChapterItems(user._id, topicSemesterId, grade)
        : [];

      // ⚠️ 当前教材**本身就是专题包**时（如「初中语法专题 · 全册」），
      //    主分区与专题分区会指向同一个册次 —— 界面上就会出现上下两块内容一模一样，
      //    而且主分区的标签还是「单词」（内容却是语法章节）。
      //    2026-09-21 Owner 截图里那处「重复」就是这个，不是数据重复。
      //    处理：同册次时只留一个分区，并把标签改对。
      const topicIsCurrent = topicSemesterId !== null && topicSemesterId === semesterId;
      const partitions: Partition[] = [
        {
          key: 'main',
          label: topicIsCurrent ? ui.topicLabel : ui.mainLabel,
          iconClass: topicIsCurrent ? ui.topicIconClass : ui.mainIconClass,
          iconText: topicIsCurrent ? ui.topicIcon : ui.mainIcon,
          unit: topicIsCurrent ? ui.topicUnit : ui.mainUnit,
          count: items.length,
          items,
          semesterId,
          // ⚠️ 默认展开（2026-09-21）：折叠着的时候 Owner 按名字找不到「语法」分区
          expanded: true,
        },
      ];
      if (topicItems.length > 0 && !topicIsCurrent) {
        partitions.push({
          key: 'topic',
          label: ui.topicLabel,
          iconClass: ui.topicIconClass,
          iconText: ui.topicIcon,
          unit: ui.topicUnit,
          count: topicItems.length,
          items: topicItems,
          semesterId: topicSemesterId ?? '',
          // ⚠️ 专题分区也默认展开：「语法 / 公式」是独立于教材的一条学习线，
          //    折叠起来用户根本不知道它存在（2026-09-21 Owner 找不到时态专题）。
          expanded: true,
        });
      }

      // 异步竞态防护：tab 已切走时不再 setData
      if (this.hidden) return;
      this.setData({
        hasPreference: true,
        textbookName: preferences.textbookName,
        semesterName, // 用自愈后的名称，避免 id 修正后顶部横条仍显示旧值
        subjectName,
        partitions,
        loading: false,
      });
    } catch (error) {
      console.error('我的课程加载失败', error);
      if (!this.hidden) this.setData({ loading: false });
    }
  },

  // 未设偏好时的引导卡：回首页选学科
  onTapGuide() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  // 顶部横条「教材选择 ▾」：直接进**当前学科**的换教材流程。
  // 历史 bug（2026-09-13 用户反馈「重新选别的教材选不了」）：这里原本回首页，
  // 而首页九宫格对该学科已有偏好时会立刻 switchTab 回本页 —— 形成死循环，
  // 结果就是选过一次教材后再也进不去 textbook/semester 选择流。
  /**
   * 换科目（2026-09-21）。
   * 用 ActionSheet 直接列已开放学科——不必先回首页再点一次，
   * 学习流程里就能切；选完直接进该科目的选教材页。
   */
  async onTapSwitchSubject() {
    let subjects: Awaited<ReturnType<typeof subjectRepository.listAll>> = [];
    try {
      subjects = await subjectRepository.listAll();
    } catch (error) {
      console.error('学科列表读取失败', error);
      wx.showToast({ title: '读不到科目，稍后再试', icon: 'none' });
      return;
    }
    const opened = subjects.filter((item) => item.open);
    if (opened.length === 0) {
      wx.showToast({ title: '暂时没有可选的科目', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: opened.map((item) => item.name),
      success: (res) => {
        const picked = opened[res.tapIndex];
        if (!picked) return;
        userService.setCurrentSubjectId(picked._id);
        // ⚠️ 学习页是 tab 页，必须 navigateTo（redirectTo 不能替换 tab）
        wx.navigateTo({ url: `/pages/textbook/textbook?subjectId=${picked._id}` });
      },
      fail: () => undefined, // 用户取消：什么都不做
    });
  },

  onTapSwitch() {
    const subjectId = userService.getCurrentSubjectId();
    if (!subjectId) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    wx.navigateTo({ url: `/pages/textbook/textbook?subjectId=${subjectId}` });
  },

  // 章节/按钮统一从 dataset 取章节所属册次（主/专题分区册次不同）
  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/study-detail/study-detail?chapterId=${id}&semesterId=${semesterId}`,
    });
  },

  onTapTest(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({ url: `/pages/test/test?chapterId=${id}&semesterId=${semesterId}` });
  },

  onTapGame(event: WechatMiniprogram.TouchEvent) {
    const { id, semesterId } = event.currentTarget.dataset as { id: string; semesterId: string };
    wx.navigateTo({
      url: `/pages/game-center/game-center?chapterId=${id}&semesterId=${semesterId}`,
    });
  },

  // 分类卡折叠：默认收起，使各分区卡片钉在顶部
  onToggle(event: WechatMiniprogram.TouchEvent) {
    const key = event.currentTarget.dataset.key as string;
    const partitions = this.data.partitions.map((p) =>
      p.key === key ? { ...p, expanded: !p.expanded } : p,
    );
    this.setData({ partitions });
  },
});
