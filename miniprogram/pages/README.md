# pages/ — 页面层（薄）

## 职责

只负责：展示、交互、动画。

## 规则（宪章「页面原则」）

| 禁止                           | 必须                      |
| ------------------------------ | ------------------------- |
| 业务计算                       | 调用 `services/` 获取数据 |
| 直接访问数据库 / 调用 wx.cloud | 通过 Service 间接获取     |
| 复杂逻辑（超过 50 行的函数）   | 下沉到 Service 或抽组件   |
| 单文件超过 300 行              | 立即拆分                  |

## 当前状态（Phase 1）

已按 Baseline Spec §3 创建 **17 个空页面**（仅路由与布局占位，无任何业务逻辑）：

- **TabBar（4）**：`home` 首页、`study` 学习、`practice` 练习、`mine` 我的
- **普通页（13）**：`login` 登录、`subject` 学科、`learning-path` 学习路径、
  `textbook` 教材、`semester` 册次、`chapter` 章节、`study-detail` 学习详情、
  `test` 测试、`test-result` 测试结果、`review` 复习、`favorite` 收藏、
  `settings` 设置、`coming-soon` Coming Soon

页面流程与 UI 规范以 Specification 第十二章（待补写）为准；占位样式统一为
`app.wxss` 的 `.page-placeholder`（DRY，UI 规范落地后随占位页移除）。
