# CHAPTER-08-SPEED-CHOICE

Version: 1.0 Status: Approved Priority: P1 Phase: Phase 3

> 2026-07-20 Owner 审核通过：Q1 游戏中心页 / Q2 复用 memory_game_records+gameType /
> Q3 参数入 config/gameRules.ts / Q4 英译中方向。

## 1. Goal

实现 SuperEasy Learning 第二款学习游戏：极速选择。

目标：通过限时快速作答强化知识熟练度（反应速度是记忆熟练度的外显），
而不是单纯追求手速。

## 2. Scope

包含：

- Speed Choice 极速选择模式
- 每题独立限时、连续作答、速度+准确率双维度计分
- 游戏结果、掌握/薄弱分析、复习集成

不包含：

- 排行榜、好友 PK、多人模式、AI 生成题目
- 与消消乐（Memory Match）玩法合并（两款游戏独立存在）

## 3. Entry Flow

章节页面（或首页最近学习）→ 游戏中心 → 极速选择 → 游戏结束 → 结果页面 → 加入复习

> 模式入口说明：随着游戏增多，入口由「游戏中心」承载（见 §16 Q1）。

## 4. Game Mode V1

Speed Choice：题干为英文单词，选项为 4 个中文释义
（1 正确 + 3 个同章节干扰项），每题独立倒计时，快速点选。

示例：

```
apple
A. 苹果   B. 电脑   C. 美丽   D. 学校      （限时 5 秒）
```

## 5. Game Rules

每局：默认 10 题（当前章节全部知识点；>10 随机抽 10，与 Chapter 07 修订一致）。

来源：当前 Chapter 知识点（不要求已学习，挑战可直接进行）。

时间：每题 5 秒；超时按答错处理并自动进入下一题。

得分：

- 答对：+10 基础分 + 速度奖励（该题剩余秒数 × 2）
- 连击加成：+2 × 当前连击数（与 Chapter 07 同一规则）
- 答错/超时：-2（总分下限 0）且连击清零

> 参数（每题秒数、奖励系数）入 `config/gameRules.ts`，不写死（配置优先）。

## 6. Game State

READY → PLAYING → PAUSED → FINISHED → RESULT
（与 Chapter 07 状态机一致）

## 7. Game Page

显示：

- 每题倒计时（进度条或数字）
- 当前进度（第 x/10 题）
- 分数、Combo
- 题干（英文单词）、4 个选项按钮

退出需要确认。切后台自动暂停（同 Chapter 07 Q5）。

## 8. Result Page

显示：

- 总分、正确数量、错误数量、用时、**平均反应时间**
- 分析：掌握知识 / 薄弱知识（答错 + 超时的知识点）
- 按钮：再来一次 / 返回学习 / 加入复习

## 9. Data

复用：`memory_game_records`（Memory Challenge 系列游戏统一记录）

新增字段（待 Owner 确认，RULES §7）：

- `gameType: string` —— 'match' 消消乐 / 'speed' 极速选择；历史记录默认 'match'
- `avgResponseMs?: number` —— 平均反应时间（毫秒，极速选择专用）

理由：两款（未来十款）游戏记录字段形状完全一致，统一一张表避免集合膨胀。

## 10. Service

新增 SpeedChoiceService：

- startGame()
- submitAnswer()
- finishGame()
- saveResult()

实现说明（重构，Baseline §9 允许）：四选一题目生成从 testService 抽取为
共享纯逻辑 `quizLogic`，testService 与本服务共同引用，行为不变（DRY）。

## 11. Repository

复用 MemoryGameRepository（写入时带 gameType）。

## 12. Learning Integration

与 Chapter 07 §12 完全一致：

- 答错/超时知识点：生成或更新 review_records（明天复习）
- 答对知识点：masteryLevel + 1
- 触发时机：结果页「加入复习」按钮（已确认模式，复用 reviewService.applyGameResults）

## 13. Default Behavior

- 章节知识点 < 4：提示「本章节知识点不足，敬请期待」
- 网络失败：允许重试
- 退出：不保存本局

## 14. Acceptance Criteria

1. 可以从游戏中心进入极速选择
2. 自动加载当前章节知识并生成四选一题目
3. 每题 5 秒倒计时，超时自动判错并进入下一题
4. 实时显示分数、连击、进度
5. 生成游戏结果（含平均反应时间）
6. 答错/超时知识可加入复习
7. 保存游戏记录（gameType='speed'）
8. 不影响学习闭环与消消乐

## 15. Principle

极速选择是熟练度训练工具，不是反应力游戏。
所有题目必须来自学习系统（knowledge 集合，单一来源）。
先完成闭环，再优化动画、音效。

## 16. 待确认事项（Owner 审核时拍板）

| #   | 事项                                   | 建议方案                                                      |
| --- | -------------------------------------- | ------------------------------------------------------------- |
| Q1  | 双游戏入口形态：章节 🎮 目前直达消消乐 | **游戏中心页**（列出已上线游戏卡片，扩展性好）                |
| Q2  | 记录表方案                             | **复用 memory_game_records + gameType**（避免十款游戏十张表） |
| Q3  | 每题限时与奖励系数（5 秒、×2/秒）      | 可调，入 `config/gameRules.ts`                                |
| Q4  | 题干方向 V1                            | 英→中（中→英留给 Bible 独立游戏「中译英」）                   |
