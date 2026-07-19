# CHAPTER-05-LEARNING-PROGRESS-AND-REVIEW

Version: 1.0 Status: Approved Priority: P0 Phase: Phase 2

## 1. Goal

实现学习进度与复习系统，形成学习闭环。

## 2. Scope

包含： - 学习进度 - Review 页面 - 自动复习任务 - Review Records -
今日待复习

不包含： - AI - FSRS/SM-2 - 排行榜 - 激励广告

## 3. User Flow

Study Complete → Create Review Task → Review List → Start Review →
Submit → Update Review Record → Generate Next Review Time → Finish

## 4. Pages

### Review

显示： - 今日待复习 - 已完成 - 完成率 - 开始复习

空状态： 今天没有待复习内容。

### Review Detail

显示： - 单词 - 音标 - 发音（有则显示） - 释义 - 例句（有则显示）

按钮： - 认识 - 不认识

## 5. Data

review_records

字段： - userId - knowledgeId - chapterId - reviewCount - masteryLevel -
lastReviewTime - nextReviewTime - status - createdAt - updatedAt

状态： REVIEW_DUE REVIEWING MASTERED

## 6. Rules

学习状态：

NOT_STARTED → LEARNING → COMPLETED → TESTED → REVIEW_DUE → MASTERED

复习计划：

1天 3天 7天 15天 30天

认识： 进入下一阶段。

不认识： 明天再次复习。

## 7. Default

无数据：Empty

无网络：Retry

无音频：隐藏播放按钮

无例句：隐藏例句

## 8. Repository

新增： ReviewRepository

## 9. Service

新增： ReviewService

接口： - getTodayReviews - startReview - submitReview - finishReview

## 10. Acceptance

1.  学习完成自动生成复习任务
2.  今日待复习正确显示
3.  完成复习后更新 review_records
4.  自动生成下一次复习时间
5.  完整流程可运行

## 11. Implementation Principle

优先实现完整闭环，算法可替换。 Repository 不写业务。 Service 不操作 UI。
Page 不直接访问数据库。
