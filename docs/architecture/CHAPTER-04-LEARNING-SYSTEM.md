# Chapter 04 - Learning System Specification

Version: 1.0 Status: Approved Priority: P0 Phase: Phase 2

## 1. Goal

实现 SuperEasy Learning 第一条完整学习链路（Vertical Slice）。

- 登录→学习→测试→结果完整跑通
- 暂不实现 AI、小游戏、会员、激励广告
- UI 可简单，流程必须完整

## 2. Scope

包含： - 登录 - 学科 - 学习路径 - 教材 - 册次 - 章节 - 学习详情 - 测试 -
测试结果

## 3. User Flow

Login → Subject → Learning Path → Textbook → Semester → Chapter → Study
Detail → Test → Test Result

## 4. Routes

/login /subject /learning-path /textbook /semester /chapter
/study-detail /test /test-result

## 5. Pages

### Login

- 自动检测登录
- 微信登录
- 恢复用户

### Subject

V1 仅开放 English，其它进入 Coming Soon。

### Learning Path

Vocabulary 开放，其余 Coming Soon。

### Textbook

读取 textbooks。

### Semester

读取 semesters。

### Chapter

读取 chapters，显示 Not Started / Learning / Completed。

### Study Detail

显示： Word、IPA、Pronunciation、Meaning、Part Of
Speech、Example、Translation、Favorite、Progress、Previous、Next、Finish。

隐藏： AI、图片、记忆法。

### Test

每个知识点一道题。

### Test Result

显示正确率、耗时，并支持重新学习。

## 6. Learning State

NOT_STARTED → LEARNING → COMPLETED → TESTED → MASTERED

## 7. Learning Record

Next 后立即更新 learning_records： - currentKnowledgeId - progress -
updatedAt

## 8. Default

无网络 Retry；无数据 Empty；无例句/图片则隐藏。

## 9. Repository

SubjectRepository TextbookRepository SemesterRepository
ChapterRepository KnowledgeRepository LearningRecordRepository

## 10. Service

LearningService： startLearning continueLearning finishLearning
updateProgress getCurrentKnowledge

## 11. Database

仅允许： subjects learning_paths textbooks semesters chapters knowledge
learning_records

禁止修改 Collection 名称。

## 12. Coding Rules

- TS Strict
- 禁 any
- Page 不直接访问数据库
- Repository Pattern
- Service 不操作 UI

## 13. Deliverables

完成登录→学习→测试→结果闭环。

## 14. Acceptance

1.  登录成功
2.  教材选择
3.  章节选择
4.  浏览知识点
5.  自动保存进度
6.  完成测试
7.  显示结果
8.  恢复学习状态

## 15. Implementation Principle

优先完成完整学习闭环，不优先美化 UI。
