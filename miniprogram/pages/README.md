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

## 当前状态（Phase 2 进行中）

- **学习链路 9 页已实现**（Chapter 04 垂直切片，§15 UI 从简）：
  login / learning-path / textbook / semester / chapter / study-detail / test / test-result
- **复习 2 页已实现**（Chapter 05）：review（统计+开始）/ review-detail（认识·不认识自评）
- **首页/收藏/统计已实现**（Chapter 06）：home（Dashboard）/ favorite / statistics
- **游戏 2 页已实现**（Chapter 07）：memory-game（消消乐：点选配对消除）/ memory-result（结果与分析）；章节页含「🎮 挑战」入口
- **subject = 学科入口页**（Owner 2026-07-19 重定位）：开放学科→学习路径，未开放→敬请期待
- `shared/`：列表页脚手架（createListPage + list.wxml/wxss）+ 知识卡共享样式（card.wxss）
- 其余占位：study / practice / settings / coming-soon

页面流程与 UI 规范以 Specification 第十二章（已冻结）为准。
