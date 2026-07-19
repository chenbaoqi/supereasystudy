# repositories/ — Repository 层（唯一的数据访问口）

## 职责

封装一切对云端的访问（`wx.cloud.database()` / `wx.cloud.callFunction()` / 云存储），
对上（Service）只暴露**领域语义化**的方法，例如 `findKnowledgeByChapter()`，
而不是把数据库查询语句泄漏给上层。

## 规则

- 全项目**只有本层允许**出现 wx.cloud 调用（唯一的封装点，未来换后端只改这里）
- 输入输出必须使用 `core/` 定义的 Interface，禁止返回原始数据库记录结构
- 每个集合（表）一个 Repository，命名：`XxxRepository.ts`

## 当前状态（Phase 1）

- `userRepository.ts`：users 集合访问**契约**（接口，Baseline Spec §1 允许骨架）。
  集合基线见 `cloud/database/`（Spec §4）；字段级设计以 Specification 数据模型章节为准。
