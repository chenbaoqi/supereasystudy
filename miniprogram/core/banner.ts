import type { BaseEntity } from './base';

// Banner（banners 集合）。字段依据 Specification 第十三章 §13.2（已冻结，Q3 确认）。
// 图片存云存储，CMS/控制台维护；open=false 不上线（数据驱动，禁止硬编码）。
export interface Banner extends BaseEntity {
  readonly imageUrl: string; // 云存储图片地址
  readonly title?: string; // 标题（预留展示位）
  readonly linkUrl?: string; // 点击跳转（预留）
  readonly order: number; // 轮播排序
  readonly open: boolean; // 是否上线
}
