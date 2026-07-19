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
- `learningService.ts`：Chapter 04 §10 五方法；finishLearning 内置复习任务创建钩子（Chapter 05 §3，经 `ReviewTaskCreator` 端口依赖，服务间不硬耦合）
- `testService.ts`：出题（B 方案英译中四选一）+ 交卷置 REVIEW_DUE（Chapter 05 §6）
- `reviewService.ts`：Chapter 05 §9 四方法 + §3 复习任务创建；排期算法集中（1/3/7/15/30 天，`config/reviewPlan.ts` 可替换）
