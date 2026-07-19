import type { BaseEntity } from './base';
import type { ReviewStatus } from './reviewStatus';

// 复习记录（review_records 集合，Chapter 05 §5 显式字段，RULES §7 的字段依据）。
// 每「用户×知识点」一条；学习完成时按章节批量创建（Q1 推荐方案）。
export interface ReviewRecord extends BaseEntity {
  readonly userId: string; // 关联 users._id
  readonly knowledgeId: string; // 关联 knowledge._id
  readonly chapterId: string; // 冗余章节外键：复习页按章节聚合查询免 join
  readonly reviewCount: number; // 已复习次数（Q3：每次提交 +1）
  readonly masteryLevel: number; // 复习阶段索引 0-4（Q3：对应 1/3/7/15/30 天）
  readonly lastReviewTime?: Date; // 最近复习时间（首次排期时无）
  readonly nextReviewTime: Date; // 下次复习时间（今日待复习的判定依据，Q4）
  readonly status: ReviewStatus; // §5 状态枚举
}
