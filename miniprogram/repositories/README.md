# repositories/ — Repository 层（唯一的数据访问口）

## 职责

封装一切对云端的访问（`wx.cloud.database()` / `wx.cloud.callFunction()` / 云存储），
对上（Service）只暴露**领域语义化**的方法，例如 `findKnowledgeByChapter()`，
而不是把数据库查询语句泄漏给上层。

## 规则

- 全项目**只有本层允许**出现 wx.cloud 调用（唯一的封装点，未来换后端只改这里）
- 输入输出必须使用 `core/` 定义的 Interface，禁止返回原始数据库记录结构
- 每个集合（表）一个 Repository，命名：`XxxRepository.ts`

## 当前状态

Phase 1：本目录仅有本规范。
数据库集合结构以 Design Bible 第 13 章（待补写）为准，确认前不创建任何 Repository。
