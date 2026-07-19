// 复习计划（Chapter 05 §6 显式定义：1天 3天 7天 15天 30天，共 5 阶段）。
// 配置优先：Chapter 05 §11「算法可替换」——换算法只动本配置与 ReviewService，页面零改动。
export const REVIEW_STAGES_DAYS = [1, 3, 7, 15, 30] as const;

export const REVIEW_STAGE_COUNT = REVIEW_STAGES_DAYS.length;

// 阶段索引 → 天数。索引越界兜底为首阶段（严格模式下元组变量下标返回 T|undefined，单点收口）
export const stageDays = (level: number): number =>
  REVIEW_STAGES_DAYS[level] ?? REVIEW_STAGES_DAYS[0];
