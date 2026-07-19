# repositories/ — Repository 层（唯一的数据访问口）

## 职责

封装一切对云端的访问（`wx.cloud.database()` / `wx.cloud.callFunction()` / 云存储），
对上（Service）只暴露**领域语义化**的方法，例如 `findKnowledgeByChapter()`，
而不是把数据库查询语句泄漏给上层。

## 规则

- 全项目**只有本层允许**出现 wx.cloud 调用（唯一的封装点，未来换后端只改这里）
- 输入输出必须使用 `core/` 定义的 Interface，禁止返回原始数据库记录结构
- 每个集合（表）一个 Repository，命名：`XxxRepository.ts`

## 当前状态（Phase 2 进行中）

| Repository                 | 集合                            | 关键方法                                                                        |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `subjectRepository`        | subjects                        | listAll                                                                         |
| `learningPathRepository`   | learning_paths                  | listBySubject                                                                   |
| `textbookRepository`       | textbooks                       | listByLearningPath                                                              |
| `semesterRepository`       | semesters                       | listByTextbook                                                                  |
| `chapterRepository`        | chapters                        | listBySemester                                                                  |
| `knowledgeRepository`      | knowledge                       | listByChapter（V1 单章 ≤100 条）                                                |
| `learningRecordRepository` | learning_records                | find/upsert/updateState/listByUserAndChapters                                   |
| `favoriteRepository`       | favorites（ADR-005）            | listByUser / add（防重）/ remove                                                |
| `userRepository`           | users（经 login 云函数）        | fetchCurrent                                                                    |
| `reviewRepository`         | review_records（Chapter 05 §8） | listDueByUser / createMany / update / countReviewedSince / resetReviewingByUser |

字段级设计依据：Chapter 04 §5/§7 + `miniprogram/core/`；`cloud/database/collections.json`。
