// 掌握度（需求第三十四章）。
//
// 设计说明（重要，别照抄需求）：
// 需求列了「学习完成 / 首次正确率 / 练习表现 / 测试表现 / 难度 / 提示次数 / 错题 /
// 重测 / 近期表现 / 间隔复习」共 10 个影响因素，但**没有给权重、也没有验证方法**。
// 直接把 10 个因素揉进一个公式 = 无法解释、无法调参、无法验证的玄学。
//
// 因此 V1 只取 4 个最强信号，权重固定且可解释：
//   mastery = 100 × (0.5×首次正确率 + 0.3×近期正确率 + 0.1×(1-提示使用率) + 0.1×错题修复率)
// 另外两道护栏：
//   1) 样本不足（<3 次练习）时封顶 60——3 次全对不足以判定「已掌握」。
//   2) 长期未练（>30 天）线性衰减，下限 70%，避免「学过即掌握」的假象。
// 待真实数据积累后（Phase 8）再用回归验证并调权重，届时在此文件注释记录依据。

// 掌握度分档（需求第三十四章：0-39 未掌握 / 40-59 薄弱 / 60-79 学习中 / 80-94 已掌握 / 95-100 熟练）
export type MasteryBand = 'unmastered' | 'weak' | 'learning' | 'mastered' | 'fluent';

export const MASTERY_BAND_LABEL: Record<MasteryBand, string> = {
  unmastered: '未掌握',
  weak: '薄弱',
  learning: '学习中',
  mastered: '已掌握',
  fluent: '熟练',
};

// 样本不足阈值：少于此练习次数时封顶，避免小样本误判
export const MIN_SAMPLES = 3;
export const SMALL_SAMPLE_CAP = 60;
// 遗忘衰减：超过此天数开始衰减
export const DECAY_AFTER_DAYS = 30;
export const DECAY_FLOOR = 0.7; // 最多衰减到 70%

export interface MasteryInput {
  readonly practiceCount: number; // 练习次数（0 表示未学习）
  readonly firstTryCorrectRate: number; // 首次正确率 0-1
  readonly recentCorrectRate: number; // 近期表现 0-1
  readonly hintUsedRate?: number; // 提示使用率 0-1，缺省 0
  readonly wrongFixedRate?: number; // 错题修复率 0-1，缺省 0
  readonly daysSinceLastPractice?: number; // 距上次练习天数，缺省 0
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// 计算掌握度 0-100（整数）
export function computeMastery(input: MasteryInput): number {
  const count = Math.max(0, Math.floor(input.practiceCount));
  if (count === 0) return 0; // 没练过 = 未掌握，而非 50 分

  const first = clamp01(input.firstTryCorrectRate);
  const recent = clamp01(input.recentCorrectRate);
  const hint = clamp01(input.hintUsedRate ?? 0);
  const fixed = clamp01(input.wrongFixedRate ?? 0);

  let score = 100 * (0.5 * first + 0.3 * recent + 0.1 * (1 - hint) + 0.1 * fixed);

  // 护栏 1：样本不足封顶
  if (count < MIN_SAMPLES) score = Math.min(score, SMALL_SAMPLE_CAP);

  // 护栏 2：长期未练衰减
  const days = Math.max(0, input.daysSinceLastPractice ?? 0);
  if (days > DECAY_AFTER_DAYS) {
    const decay = Math.max(DECAY_FLOOR, 1 - (days - DECAY_AFTER_DAYS) / 180);
    score *= decay;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function bandOf(score: number): MasteryBand {
  if (score < 40) return 'unmastered';
  if (score < 60) return 'weak';
  if (score < 80) return 'learning';
  if (score < 95) return 'mastered';
  return 'fluent';
}

export function bandLabel(band: MasteryBand): string {
  return MASTERY_BAND_LABEL[band];
}
