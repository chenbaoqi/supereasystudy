# ADR-003：单仓库结构（不采用 pnpm monorepo）

- 状态：**已决策**（2026-07-19）

## 背景

曾评估 pnpm workspace + Turborepo 的 monorepo 方案（apps/packages/plugins 分包）承载插件体系。

## 决策

采用**单仓库单工程**：小程序端一个工程，插件化通过 `miniprogram/core/`（契约）+ `miniprogram/subjects/`（实现）的**模块边界**实现。

## 理由

- RULES §2「不做过度设计」：V1 只有一个端、一个学科，monorepo 的包管理复杂度是纯成本
- 云函数本就要求各自独立 `package.json`（微信平台约束），与 workspace 收益重叠度低
- 插件红线的约束靠 ESLint 依赖规则与 Code Review，而非包隔离

## 后果

- 若未来出现第二个独立应用（如独立 Web 管理端、独立后端服务），重新评估迁移 monorepo，届时新建 ADR 并更新 `architecture/directory-structure.md`
