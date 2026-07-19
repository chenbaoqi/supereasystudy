import type { BaseEntity } from './base';

// 学科（subjects 集合）。§5 Subject：V1 仅开放 English，其余进 Coming Soon——
// 「是否开放」是数据（可在 CMS 改），不是代码 if（Subject Plugin 红线）。
export interface Subject extends BaseEntity {
  readonly name: string; // 学科名（英语/数学/…）
  readonly open: boolean; // true=已上线；false=点击进 Coming Soon 页
  readonly order: number; // 九宫格排序
}
