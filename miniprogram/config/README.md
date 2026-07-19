# config/ — 配置优先

## 职责

一切「会变的产品决策」放这里，以纯数据（typed object）形式存在：

- 学科列表与上线状态（首页九宫格的数据源）
- 学习路径 / 教材 / 能力 / 难度配置
- 功能开关（预留能力的统一可见性）

## 规则

- 配置必须有对应的 TypeScript Interface（禁止裸 object）
- 配置是**只读数据**：禁止在运行时被修改
- 业务代码读配置，**禁止在业务代码中硬编码**配置内容

## 当前状态（Phase 1）

- `cloud.ts`：云环境 ID（占位 `todo-cloud-env`，Baseline Spec §6；全局唯一读取点）
- `features.ts`：功能开关（`adminEntry` 管理员入口预留 / `rewardAd` 激励广告预留）

学科配置将在 Specification 页面规范确认后录入。
