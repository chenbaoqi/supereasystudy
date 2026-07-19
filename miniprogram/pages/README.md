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
  login / subject / learning-path / textbook / semester / chapter / study-detail / test / test-result
- `shared/`：四个列表页（subject/learning-path/textbook/semester）的共享脚手架
  （`createListPage.ts` + `list.wxml` + `list.wxss`），同构页面禁止复制粘贴（DRY）
- 其余 8 页仍为占位：home / study / practice / mine（TabBar）+ favorite / review / settings / coming-soon

页面流程与 UI 规范以 Specification 第十二章（待补写）为准。
