# CHAPTER-07-MEMORY-CHALLENGE

Version: 1.0 Status: Approved Priority: P1 Phase: Phase 3

## 1. Goal

实现 SuperEasy Learning 第一款学习游戏。

目标： 通过游戏强化知识记忆，而不是单纯娱乐。

## 2. Scope

包含： - Memory Match 记忆配对 - 单词与释义匹配 - 计时 - 得分 - 连击 -
游戏结果 - 与学习记录关联

不包含： - 排行榜 - 好友PK - 多人模式 - AI生成关卡

## 3. Entry Flow

章节页面 → Memory Challenge → 开始游戏 → 游戏结束 → 结果页面 → 加入复习

## 4. Game Mode V1

Memory Match：

单词 ↔ 中文释义配对。

示例：

apple ↔ 苹果

computer ↔ 电脑

beautiful ↔ 美丽的

## 5. Game Rules

每局： 默认10个知识点。

来源： 当前Chapter已学习知识。

> 修订（2026-07-19，Owner）：游戏池不再限「已学习知识」——挑战可直接进行。
> 游戏池 = 当前章节全部知识点（≤10 全用，>10 随机抽 10）；
> 开局门槛改为「章节知识点 < 4 提示知识点不足」。
> 玩法定为消消乐：卡片明面，点选「单词+释义」配对消除，全部清空获胜。

时间： 60秒。

得分： 正确 +10 错误 -2 连续正确 Combo 剩余时间 Bonus

## 6. Game State

READY → PLAYING → PAUSED → FINISHED → RESULT

## 7. Game Page

显示： - 倒计时 - 分数 - Combo - 卡片区域

退出需要确认。

## 8. Result Page

显示： - 总分 - 正确数量 - 错误数量 - 用时

分析： - 掌握知识 - 薄弱知识

按钮： - 再来一次 - 返回学习 - 加入复习

## 9. Data

新增：

memory_game_records

字段：

userId chapterId knowledgeIds score correctCount wrongCount duration
createdAt

## 10. Service

新增 MemoryGameService：

- startGame()
- submitMatch()
- finishGame()
- saveResult()

## 11. Repository

新增 MemoryGameRepository：

负责保存和查询游戏记录。

## 12. Learning Integration

错误知识点： 生成 review_records。

正确知识点： 增加 masteryLevel。

## 13. Default Behavior

无数据： 提示先完成学习。

网络失败： 允许重试。

退出： 不保存本局。

## 14. Acceptance Criteria

1.  可以从章节进入游戏。
2.  自动加载当前章节知识。
3.  完成匹配。
4.  实时计算分数。
5.  生成游戏结果。
6.  错误知识进入复习。
7.  保存游戏记录。
8.  不影响学习闭环。

## 15. Principle

Memory Challenge 是学习工具。

所有游戏内容必须来自学习系统。

先完成闭环，再优化动画、美术和音效。
