// 学段 / 年级推断（需求第四章：数据库必须支持 stage grade semester curriculumVersion）。
//
// 2026-09-08 修订（B-1 数据模型升级）：
// 1) 修 bug：原实现 `return /[三四五六]年级/.test(name) ? 'primary' : 'junior'`
//    会把「一年级 / 二年级」误判为 junior（初中）。现有英语数据只有 3–6 年级所以一直没暴露，
//    一旦补小学 1–2 年级或加高中就会出错。
// 2) 新增 senior（高中）学段，支持 1–12 年级。
// 3) 权威来源改为 semesters.stage / semesters.grade 显式字段（数据驱动）；
//    本文件的字符串解析只作为「历史数据缺字段时」的兜底，不再作为唯一真相。

export type SemesterStage = 'primary' | 'junior' | 'senior';

export const STAGE_LABEL: Record<SemesterStage, string> = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
};

const CN_DIGIT: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

// 年级 → 学段：1-6 小学，7-9 初中，10-12 高中
export function stageOfGrade(grade: number): SemesterStage {
  if (grade <= 6) return 'primary';
  if (grade <= 9) return 'junior';
  return 'senior';
}

// 从册次名解析年级：支持「一年级上册」「七年级下册」「高一上册」三种写法。
// 解析不出返回 null（调用方应回落到显式字段或安全默认值）。
export function gradeOfSemester(semesterName: string): number | null {
  const name = semesterName || '';

  // 高中：高一 / 高二 / 高三 → 10 / 11 / 12
  const senior = /^高([一二三])/.exec(name);
  if (senior) {
    const d = CN_DIGIT[senior[1] ?? ''];
    return d ? 9 + d : null;
  }

  // 小学 / 初中：一 ~ 九年级
  const normal = /^([一二三四五六七八九])年级/.exec(name);
  if (normal) {
    return CN_DIGIT[normal[1] ?? ''] ?? null;
  }

  return null;
}

// 年级 → 中文名（给设置页的年级选择器与展示文案用，避免每个页面各拼一套）。
// 1-6 小学 / 7-9 初中 / 10-12 高中，与 gradeOfSemester 的解析口径一致（可互相印证）。
const GRADE_LABELS: readonly string[] = [
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '七年级',
  '八年级',
  '九年级',
  '高一',
  '高二',
  '高三',
];

export function gradeLabel(grade: number): string {
  return GRADE_LABELS[grade - 1] ?? `${grade}年级`;
}

// 设置页可选的年级（1~12，含高中）。
// ⚠️ 高中（10-12）显示与否仍由设置页 loadGradeOptions 的「当前学科有没有对应教材」过滤：
//    没有高中册次的学科，高中年级不会出现在选择器里（宁可少选，不能选了没内容）。
export const GRADE_OPTIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * 册次的排序键：年级 × 10 + 册次（上=1 / 下=2 / 全册=3）。
 *
 * ⚠️ 为什么展示层要自己排（2026-09-21 Owner 反馈「排序乱糟糟」）：
 *    数据里英语「七年级上册」的 order 是 13，排在「九年级全册」后面——
 *    册次列表直接按数据顺序渲染，七年级上册就掉到了最后。
 *    不依赖数据顺序、也不依赖 order 字段，按册次名算出来最稳。
 *
 * 解析不出年级的（如专题包的「全册」）排到最后。
 */
export function semesterSortKey(semesterName: string): number {
  const grade = gradeOfSemester(semesterName);
  if (grade === null) return Number.MAX_SAFE_INTEGER;
  const term = semesterName.includes('上') ? 1 : semesterName.includes('下') ? 2 : 3;
  return grade * 10 + term;
}

/** 册次名的排序比较器（同年级按 上→下→全 排） */
export function compareSemesterNames(a: string, b: string): number {
  const diff = semesterSortKey(a) - semesterSortKey(b);
  return diff !== 0 ? diff : a.localeCompare(b, 'zh');
}

// 兜底推断：优先按年级算，解析不出时回落到「非小学即初中」的旧行为。
// 注意：新增数据请务必写入 semesters.grade，不要依赖本函数的字符串猜测。
export function stageOfSemester(semesterName: string): SemesterStage {
  const grade = gradeOfSemester(semesterName);
  if (grade !== null) return stageOfGrade(grade);
  // 历史兜底（保持旧行为，避免老数据回归）
  return /[三四五六]年级/.test(semesterName || '') ? 'primary' : 'junior';
}

// 专题教材（如「小学公式专题」「初中语法专题」）的册次是「全册」，跨年级无单一 grade，
// 但学段可从教材名判定——这样专题也能按学段筛选。
// 注意：逻辑需与 scripts/convert_textbook.mjs 的 stageOfTextbook 保持一致。
export function stageOfTextbook(textbookName: string): SemesterStage | null {
  const name = textbookName || '';
  if (name.includes('高中')) return 'senior';
  if (name.includes('初中')) return 'junior';
  if (name.includes('小学')) return 'primary';
  return null;
}

// 学段判定（教材名优先，册次名兜底）——**页面算学段一律用这个**，别直接调 stageOfSemester。
//
// 为什么必须有这一层（2026-09-19 实测事故）：专题教材（小学公式专题 / 初中公式专题）的
// 册次统一叫「全册」，`gradeOfSemester('全册')` 解析不出年级，于是 `stageOfSemester` 走到
// 「非小学即初中」的历史兜底 → **一律判成 junior**。结果：学习页的公式分区按 junior 去拼
// 教材名，永远解析到「初中公式专题」，小学生看到的也是初中那一份公式 ——
// 用户反馈的「小学公式和初中公式内容好像是一样的」就是这么来的。
//
// 教材名（如「小学公式专题」「初中公式专题」）本身带着学段词，判定可靠且**零额外云读**；
// 普通教材（「人教版」）不含学段词 → 返回 null → 回落旧的册次名解析，现有场景零回归。
export function stageOfSemesterWith(semesterName: string, textbookName: string): SemesterStage {
  return stageOfTextbook(textbookName) ?? stageOfSemester(semesterName);
}

export function stageLabel(stage: SemesterStage): string {
  return STAGE_LABEL[stage];
}

// 教材版本（curriculumVersion）：需求第四章要求「教材版本不要写死」，
// 预留 通用 / 人教版 / 北师大版 / 苏教版 等。
const CURRICULUM_VERSIONS = ['人教版', '北师大版', '苏教版', '沪教版', '外研版', '通用'] as const;

export type CurriculumVersion = (typeof CURRICULUM_VERSIONS)[number];

export function curriculumVersionOfTextbook(textbookName: string): string | null {
  const name = textbookName || '';
  for (const v of CURRICULUM_VERSIONS) {
    if (name.includes(v)) return v;
  }
  return null;
}
