// 设置页（Specification 页面清单里最后一个「占位·待定义」页，2026-09-14 定义 V1）。
//
// V1 只做两件有明确痛点的事，其余（提醒、音效、隐私）等需求明确再加：
//   1. **年级**：原来年级只能从册次名推导（gradeOfSemester），册次叫「全册」或名字不规范时
//      推导不出 → 学习/测试整片不过滤，超纲内容照样出现（2026-09-13 用户反馈的根因之一）。
//      这里让用户手动指定，优先级高于自动推导。
//   2. **恢复默认**：清掉本机保存的学科与年级偏好，解决「学科串了 / 教材切不动」这类本地态问题。
//      云端学习记录不受影响——这是"能放心点"的前提。
//
// 年级偏好只存本机（详见 services/gradeScope.ts 的注释）：是这台设备的使用者读几年级，
// 不是账号级数据，换设备重选一次即可。
import { GRADE_OPTIONS, gradeLabel, gradeOfSemester } from '../../utils/stage';
import { readManualGrade, saveManualGrade } from '../../services/gradeScope';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { semesterRepository } from '../../repositories/semesterRepository';
import { userService } from '../../services/userService';
import { withTimeout } from '../../utils/withTimeout';
import { haptics } from '../../utils/haptics';

// 「跟随册次」的取值：与「未设置」区分开，点它表示清除手动值
const AUTO_GRADE = 0;

// 年级选项最多等这么久：读不到就不限制（见 loadGradeOptions 的兜底说明）
const GRADE_LOAD_WAIT_MS = 4000;

interface GradeOption {
  readonly value: number; // AUTO_GRADE = 跟随册次
  readonly label: string;
}

Page({
  data: {
    textbookName: '',
    semesterName: '',
    subjectName: '', // 「学科 · 教材 · 册次」口径，与学习页/练习页/我的页一致
    // 年级：自动值（册次推导）/ 手动值 / 生效值，三个都要显示，否则用户不知道自己在改哪个
    autoGrade: null as number | null,
    manualGrade: null as number | null,
    effectiveGrade: null as number | null,
    effectiveText: '',
    sourceText: '',
    // 选择器里高亮哪一项：没手动指定时高亮「跟随册次」（AUTO_GRADE）
    activeOption: AUTO_GRADE,
    gradeOptions: [] as GradeOption[],
    pickingGrade: false,
    version: '',
    // 按键触感（震动）：默认开，可关
    hapticOn: true,
  },

  onShow() {
    this.load();
  },

  load() {
    const currentSubjectId = userService.getCurrentSubjectId();
    const preferences =
      (currentSubjectId ? userService.getPreferences(currentSubjectId) : null) ??
      userService.getPreferences();
    const semesterName = preferences?.semesterName ?? '';
    const autoGrade = gradeOfSemester(semesterName);
    const manualGrade = readManualGrade();
    const effectiveGrade = manualGrade ?? autoGrade;
    this.setData({
      textbookName: preferences?.textbookName ?? '',
      semesterName,
      autoGrade,
      manualGrade,
      effectiveGrade,
      effectiveText: effectiveGrade ? gradeLabel(effectiveGrade) : '未设置',
      sourceText: manualGrade
        ? '手动指定'
        : autoGrade
          ? '跟随册次'
          : '册次名解析不出年级，建议手动指定',
      activeOption: manualGrade ?? AUTO_GRADE,
      gradeOptions: [
        { value: AUTO_GRADE, label: '跟随册次' },
        ...GRADE_OPTIONS.map((grade) => ({ value: grade, label: gradeLabel(grade) })),
      ],
      version: this.readVersion(),
      hapticOn: haptics.enabled(),
    });
    // 学科名单独异步补：不把 load 改成 async —— 它有三处同步调用点，改动面不值得
    void this.loadSubjectName(preferences?.semesterId);
    // 年级选项单独异步收窄（见 loadGradeOptions）
    void this.loadGradeOptions(preferences?.textbookId);
  },

  /**
   * 年级选项只给「当前学科真有教材」的年级。
   *
   * 为什么（2026-09-19 Owner 反馈「英语好像改成一年级开始了」）：
   * `GRADE_OPTIONS` 是 1~12 全量，而**英语教材只有 3~9 年级**（人教版 PEP 三起版）。
   * 于是家长能给孩子选「一年级 + 英语」——那个年级根本没有英语教材，
   * 手动年级又会全局生效（冒险岛按一年级出算术、英语专题被过滤空），
   * 看起来就像「英语从一年级开始了」。
   *
   * ⚠️ 两条兜底，缺一不可：
   *   1. 读不到册次（云慢 / 没设教材）→ **不限制**，保持全量。宁可多选，不能选不了。
   *   2. 已经手动选了一个不在可用列表里的年级 → **保留它**，否则 UI 会突然丢状态。
   */
  async loadGradeOptions(textbookId: string | undefined) {
    if (!textbookId) return;
    const semesters = await withTimeout(
      semesterRepository.listByTextbook(textbookId),
      GRADE_LOAD_WAIT_MS,
      '年级选项读取',
    );
    if (!semesters || semesters.length === 0) return;
    const available = new Set<number>();
    for (const item of semesters) {
      const grade = gradeOfSemester(item.name);
      if (grade !== null) available.add(grade);
    }
    if (available.size === 0) return;
    const manual = readManualGrade();
    // 已选项即使不在可用范围也保留（避免悄悄丢掉用户的选择）
    if (manual !== null) available.add(manual);
    this.setData({
      gradeOptions: [
        { value: AUTO_GRADE, label: '跟随册次' },
        ...GRADE_OPTIONS.filter((grade) => available.has(grade)).map((grade) => ({
          value: grade,
          label: gradeLabel(grade),
        })),
      ],
    });
  },

  // 反查学科名：失败或没有册次一律置空 —— 宁可不显示，也不显示错的学科
  async loadSubjectName(semesterId: string | undefined) {
    try {
      const resolved = semesterId ? await resolveSubjectOfSemester(semesterId) : null;
      this.setData({ subjectName: resolved?.subjectName ?? '' });
    } catch (error) {
      console.error('学科反查失败', error);
      this.setData({ subjectName: '' });
    }
  },

  // 版本号：开发版/体验版显示 develop / trial，线上显示正式版本号
  readVersion(): string {
    try {
      const info = wx.getAccountInfoSync();
      const version = info.miniProgram?.version ?? '';
      return version !== '' ? version : (info.miniProgram?.envVersion ?? '');
    } catch {
      return '';
    }
  },

  onToggleGradePicker() {
    this.setData({ pickingGrade: !this.data.pickingGrade });
  },

  // 触感开关：打开时顺手震一下——用户不用退出去试，就知道自己开了什么
  onToggleHaptic() {
    const on = !this.data.hapticOn;
    haptics.setEnabled(on);
    this.setData({ hapticOn: on });
    if (on) haptics.cue('tap');
  },

  onPickGrade(event: WechatMiniprogram.TouchEvent) {
    const { grade } = event.currentTarget.dataset as { grade: number };
    const manual = grade === AUTO_GRADE ? null : grade;
    saveManualGrade(manual);
    this.setData({ pickingGrade: false });
    this.load();
    wx.showToast({
      title: manual ? `已设为${gradeLabel(manual)}` : '已恢复跟随册次',
      icon: 'none',
    });
  },

  // 教材与册次：与「我的」页同一个入口（年级是从册次推出来的，放在设置页才说得通）
  onTapTextbook() {
    const subjectId = userService.getCurrentSubjectId();
    if (!subjectId) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    wx.navigateTo({ url: `/pages/textbook/textbook?subjectId=${subjectId}` });
  },

  // 恢复默认：只清本机偏好，云端学习记录不动（弹窗里必须写清，否则没人敢点）
  onReset() {
    wx.showModal({
      title: '恢复默认设置',
      content: '将清除本机保存的学科与年级偏好，回到「跟随册次」。云端学习记录不受影响。',
      confirmText: '恢复',
      success: (res) => {
        if (!res.confirm) return;
        saveManualGrade(null);
        userService.clearLocalState();
        this.load();
        wx.showToast({ title: '已恢复默认', icon: 'none' });
      },
    });
  },
});
