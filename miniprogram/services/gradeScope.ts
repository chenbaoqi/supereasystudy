// 年级作用域（ADR-012）：跨年级专题包按「当前年级」过滤超纲内容。
//
// 背景（2026-09-13 用户反馈）：选了「小学一年级上册」，学习页的公式分区仍然列出
// 「图形与几何」「统计与概率」——因为「小学公式专题」是整学段词典，只有一个「全册」册次，
// 1~6 年级的公式全在里面，没有任何年级维度。需求原话：「教材没有的内容，分类，就隐藏起来」。
//
// 规则（三条，缺一不可）：
//   1. 知识点未标 grade（undefined）→ 不限年级，恒显示。保证旧数据零回归。
//   2. 知识点标了 grade → 仅当 grade <= 当前年级 才显示。
//      低年级不超纲，高年级仍能看到前面学过的（复习场景需要累积，不能只给「本年级新增」）。
//   3. 当前年级解析不出来（册次名不是「X年级Y册」、或用户没设偏好）→ 一律不过滤。
//      宁可多显示，也不能因为解析失败把内容整片藏掉。
//
// 年级来源（两条，手动优先）：
//   1. **设置页手动指定**（本机偏好）——册次名解析不出年级（如专题册次叫「全册」）、
//      或用户就在读某年级但册次名不规范时，由用户自己敲定。
//   2. 用户**当前册次偏好**（不是章节所属册次）。
//      因为专题册次叫「全册」，从它反推不出年级，只能取用户真正在读的那一册。
import type { UserPreferences } from '../core/user';
import type { UserService } from './userService';
import { gradeOfSemester } from '../utils/stage';
import { userService } from './userService';

// 只依赖 UserService 中本服务用到的两个方法（最小接口，便于测试注入）。
// getManualGrade 可选：不传即关闭「手动年级」通道（旧行为，单测可直接构造）。
export type GradeScopeDeps = Pick<UserService, 'getPreferences' | 'getCurrentSubjectId'> & {
  readonly getManualGrade?: () => number | null;
};

export interface GradeScope {
  currentGrade(): number | null;
}

export function createGradeScope(deps: GradeScopeDeps): GradeScope {
  return {
    currentGrade() {
      // 手动年级优先：用户显式指定过的，不该被册次推导悄悄改回去。
      // >0 才认：本机存储是弱类型（可能被别的版本写进脏值），脏值一律当没设，
      // 否则会把「0 年级」这种非法值传进 withinGrade，整包内容被清空。
      const manual = deps.getManualGrade?.() ?? null;
      if (manual !== null && manual > 0) return manual;
      // 与 study.ts 一致：优先当前学科的分科偏好，回退旧字段
      const subjectId = deps.getCurrentSubjectId();
      const preferences: UserPreferences | null =
        (subjectId ? deps.getPreferences(subjectId) : null) ?? deps.getPreferences();
      return preferences ? gradeOfSemester(preferences.semesterName) : null;
    },
  };
}

// —— 手动年级的本机存储 ——
// 只存本机：这是「这台手机的使用者读几年级」，不是账号级数据，
// 不需要上云（客户端能做的绝不上云），换设备重新选一次即可。
const MANUAL_GRADE_KEY = 'manualGrade';

export function readManualGrade(): number | null {
  try {
    const raw = wx.getStorageSync<number | string>(MANUAL_GRADE_KEY);
    const value = typeof raw === 'string' ? Number(raw) : raw;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

// 传 null = 清除（回到「跟随册次」）
export function saveManualGrade(grade: number | null): void {
  try {
    if (grade === null) wx.removeStorageSync(MANUAL_GRADE_KEY);
    else wx.setStorageSync(MANUAL_GRADE_KEY, grade);
  } catch (error) {
    console.error('保存年级偏好失败', error);
  }
}

export const gradeScope: GradeScope = createGradeScope({
  getPreferences: (subjectId?: string) => userService.getPreferences(subjectId),
  getCurrentSubjectId: () => userService.getCurrentSubjectId(),
  getManualGrade: readManualGrade,
});

// 纯过滤函数（可单测）：grade=null 表示「不限」，原样返回。
export function withinGrade<T extends { readonly grade?: number }>(
  list: readonly T[],
  grade: number | null,
): T[] {
  if (grade === null) return [...list];
  return list.filter((item) => item.grade === undefined || item.grade <= grade);
}
