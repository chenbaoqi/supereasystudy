// 功能开关（配置优先）：所有「预留能力」的可见性集中在这里，
// 禁止在页面中散落 if 判断未上线功能。
export const FEATURE_FLAGS = {
  // 管理员入口（Baseline Spec §5：V1 采用云开发 CMS，小程序内仅预留入口）
  adminEntry: false,
  // 激励广告（RULES §5：V1 仅保留接口与扩展点；广告位 ID 待申请，pending-decisions #6）
  rewardAd: false,
  // AI 辅导（需求第三十八章）。关掉则一律走「程序化提示」，不消耗任何额度。
  // 真实模型地址/密钥在云函数 aiTutor 的环境变量配置，与本开关无关。
  aiTutor: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
