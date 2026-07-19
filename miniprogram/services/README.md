# services/ — Service 层（全部业务逻辑）

## 职责

所有业务逻辑的唯一归属地。每个 Service 单一职责（禁止 God Class）。

未来 Service 划分（以 Bible 为准）：`UserService` / `LearningService` / `PracticeService` / `ReviewService` / `ProgressService` / `GameService` …

## 规则

- 页面只能调用 Service；Service 之间允许组合，禁止循环依赖
- 数据访问必须经 `repositories/`，**禁止在 Service 中直接调用 wx.cloud / wx.request**
- Service 是纯 TS 模块：**禁止引入 WXML/WXSS 相关 API**，保证可被 Vitest 直接单测
- 函数 ≤ 50 行，超过立即拆分

## 当前状态

Phase 1：本目录仅有本规范，无任何 Service 实现。
