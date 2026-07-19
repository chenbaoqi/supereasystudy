# services/ — Service 层（全部业务逻辑）

## 职责

所有业务逻辑的唯一归属地。每个 Service 单一职责（禁止 God Class）。

## 规则

- 页面只能调用 Service；Service 之间允许组合，禁止循环依赖
- 数据访问必须经 `repositories/`，**禁止在 Service 中直接调用 wx.cloud / wx.request**
- Service 是纯 TS 模块：**禁止引入 WXML/WXSS 相关 API**，保证可被 Vitest 直接单测
- 函数 ≤ 50 行，超过立即拆分
- 需要单测的 Service 用工厂 + 依赖注入（`createXxxService(deps)`），页面用默认单例

## 当前状态（Phase 2 进行中）

- `userService.ts`：登录 / 恢复 / 取当前用户（登录态写入 globalData 的唯一位置）
- `learningService.ts`：Chapter 04 §10 五方法（start/continue/finish/updateProgress/getCurrentKnowledge）
- `testService.ts`：出题（B 方案英译中四选一）+ 交卷置 TESTED
  （Chapter 04 §10 未将其列入 LearningService，按单一职责拆分，Baseline Spec §9 允许）
