// 广告位配置（ADR-015）。
//
// 用法：在微信公众平台「流量主 → 广告位」创建**激励视频**广告位，把 adUnitId 填到下面。
// 留空 = 广告不可用 → 权益服务按「不可用即放行」处理（见 entitlementService），
// 页面不会崩、用户不会被卡住，只是暂时不解锁直接放行。
//
// 注意：激励视频在开发者工具里拉不到真实广告（会走失败分支），真机才有。
export const REWARDED_AD = {
  adUnitId: '',
};

export function rewardedAdUnitId(): string {
  return REWARDED_AD.adUnitId.trim();
}
