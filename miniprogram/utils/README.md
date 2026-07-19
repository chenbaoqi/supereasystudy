# utils/ — 工具函数

## 职责

与业务无关的纯函数（时间格式化、数组处理、节流防抖…）。

## 规则

- 必须是**纯函数**：同样的输入永远同样的输出，无副作用
- 禁止引用 `services/` / `repositories/` / `pages/`（依赖只能向内）
- 任何函数被复制第 2 次 → 必须移入本目录（DRY）

## 当前状态（Phase 2 进行中）

- `date.ts`：addDays / startOfToday / endOfToday（复习排期与「今日」判定共用）
