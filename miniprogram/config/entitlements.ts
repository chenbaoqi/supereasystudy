// 变现门禁的功能点清单（ADR-015）。新增门禁点只改这里，不散落到页面里。
//
// ⚠️ 红线：**学习主链路永远免费**。学习 / 复习 / 单词卡 / 小游戏一律不设门禁，
// 广告只压在「AI 讲解」与「测试分析」这两块增值内容上——不能挡住孩子背书。
export type EntitlementFeature = 'ai-tutor' | 'test-result';

export interface FeatureDef {
  readonly id: EntitlementFeature;
  readonly title: string; // 解锁卡标题
  readonly desc: string; // 解锁卡说明（讲清能拿到什么，不提「广告」二字）
  readonly buttonText: string; // 统一「观看视频」，措辞全站一致
  // 解锁有效期：AI 当天可反复问；测试结果当天可回看。跨天重新解锁，避免一次解锁永久生效
  readonly ttlMs: number;
}

const DAY = 24 * 60 * 60 * 1000;

export const FEATURES: Readonly<Record<EntitlementFeature, FeatureDef>> = {
  'ai-tutor': {
    id: 'ai-tutor',
    title: 'AI 辅导',
    desc: '观看一段短视频即可解锁，当天可无限次向 AI 提问',
    buttonText: '观看视频解锁',
    ttlMs: DAY,
  },
  'test-result': {
    id: 'test-result',
    title: '本次测试分析',
    desc: '观看一段短视频即可解锁本次测试的正确率与薄弱点分析',
    buttonText: '观看视频解锁本次分析',
    ttlMs: DAY,
  },
};

// wxml 里的 feature 是字符串，这里做一次收口：名字对不上清单 → 返回 null（不设门禁）。
// 宁可门禁失效，也不能因为拼错一个字把用户锁在门外。
export function featureOf(value: string | undefined): EntitlementFeature | null {
  return value && value in FEATURES ? (value as EntitlementFeature) : null;
}

// 解锁键：带业务标识 + 日期。
// - 带业务标识 → 解锁「本次」而不是整类（Owner 2026-09-14 明确要求按次）
// - 带日期 → TTL 的自然实现：跨天就是另一个 key，旧 key 自动失效，不用清数据
export function unlockKeyOf(feature: EntitlementFeature, scope: string, now: number): string {
  return `${feature}:${scope}:${dayKey(now)}`;
}

// 本地日期键（YYYY-MM-DD）。用本地时间而不是 UTC：
// 用户理解的「当天」是自己手机上的当天，用 UTC 会在晚上 8 点就翻篇。
export function dayKey(now: number): string {
  const d = new Date(now);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// 会员/解锁的到期时间（ISO）。到期时间比「解锁时刻 + ttl」更直观，也便于云侧直接比较
export function expireAtOf(now: number, ttlMs: number): string {
  return new Date(now + ttlMs).toISOString();
}
