// 加分反馈（2026-09-29）：统一「+N⭐ / 解锁徽章」的即时展示。
//
// 为什么单点：学习/复习/测试/拼写/跟读 5 个加分入口，现在各自写一遍
// 「解锁徽章才 toast」，再加「+N⭐」会变成 5 份更长的重复，迟早走散。
// 把「算什么文案」拆成纯函数 starGainText（可单测），显示是薄薄一层 wx。
import type { BadgeDef } from '../core/growth';

/**
 * 加分反馈要显示的文案。
 * 组合：①有星有徽章 ②只有星 ③只有徽章 ④都没有 → 返回 null（静默）。
 * stars 传 0 = 只报徽章不报星（高频单次加分想静默、但徽章是稀有事件仍要报的场景）。
 */
export function starGainText(stars: number, badges: readonly BadgeDef[]): string | null {
  const badgeName = badges[0]?.name;
  if (stars > 0 && badgeName) return `+${stars}⭐ 解锁「${badgeName}」`;
  if (badgeName) return `🎉 解锁「${badgeName}」`;
  if (stars > 0) return `+${stars}⭐`;
  return null;
}

/** 加分后 toast 一下（没有可报的就静默） */
export function showStarGain(stars: number, badges: readonly BadgeDef[]): void {
  const text = starGainText(stars, badges);
  if (text) wx.showToast({ title: text, icon: 'none' });
}
