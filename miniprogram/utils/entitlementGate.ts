// 门禁 UI 的纯逻辑层（ADR-015）。
//
// 与组件文件分开的理由同 utils/numberLine.ts：组件文件导入即执行 Component({...})，
// 逻辑塞进去就没法在 Node 侧单测。这里只做「判定结果 → 界面状态」的映射，不碰 wx。
import type { EntitlementDecision } from '../core/entitlement';
import { FEATURES, type EntitlementFeature } from '../config/entitlements';

export type GateState =
  | 'checking' // 还在查权益，先什么都不显示（避免门框闪一下）
  | 'open' // 放行：展示 slot 里的真实内容
  | 'gated'; // 拦住：展示解锁卡

export interface GateView {
  readonly state: GateState;
  readonly title: string;
  readonly desc: string;
  readonly buttonText: string;
  // 会员入口 P1 才开，这段时间只承诺、不引导下单
  readonly memberText: string;
}

const MEMBER_TEXT = '会员可免观看，开通入口敬请期待';

const OPEN_VIEW: GateView = {
  state: 'open',
  title: '',
  desc: '',
  buttonText: '',
  memberText: '',
};

const CHECKING_VIEW: GateView = { ...OPEN_VIEW, state: 'checking' };

export interface GateInput {
  readonly checking: boolean;
  // null = 还没拿到结果
  readonly decision: EntitlementDecision | null;
  // null = wxml 里写的 feature 名对不上清单。识别不了的功能点一律不设门禁
  readonly feature: EntitlementFeature | null;
  // 广告位是否可用。不可用 → 一律放行（见 rewardedAdService 的说明）
  readonly adAvailable: boolean;
}

export function resolveGate(input: GateInput): GateView {
  if (input.checking) return CHECKING_VIEW;
  const decision = input.decision;
  // 判定都没拿到（未登录等）也放行：宁可少收一次广告，不能把人卡在门外
  if (!decision || decision.allowed) return OPEN_VIEW;
  if (!input.adAvailable) return OPEN_VIEW;
  const def = input.feature ? FEATURES[input.feature] : null;
  if (!def) return OPEN_VIEW;
  return {
    state: 'gated',
    title: def.title,
    desc: def.desc,
    buttonText: def.buttonText,
    memberText: MEMBER_TEXT,
  };
}
