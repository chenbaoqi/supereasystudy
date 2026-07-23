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

## 当前状态（Phase 2 进行中）

- `cloud.ts`：云环境 ID（全局唯一读取点）
- `features.ts`：功能开关（`adminEntry` 管理员入口预留 / `rewardAd` 激励广告预留）
- `reviewPlan.ts`：复习计划 1/3/7/15/30 天（Chapter 05 §6；§11「算法可替换」的替换点）
- `gameRules.ts`：极速选择参数（每题 5 秒、速度奖励 ×2；Chapter 08 Q3）

学科配置将在 Specification 页面规范确认后录入。
