# components/ — 通用组件

## 职责

跨页面复用的**纯展示/交互**组件（按钮、卡片、弹窗、空状态…）。

## 规则

- 单文件 ≤ 200 行，超过立即拆分
- 组件通过 properties 接收数据，**禁止在组件内访问 Service / Repository**
- 任何 UI 重复超过 2 次 → 必须抽成组件（DRY）
- 业务型组件（如「知识卡」）归属对应 `subjects/<subject>/components/`，不进本目录

## 当前状态

Phase 1：本目录仅有本规范，无任何组件。
