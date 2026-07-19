# ADR-006：新增 memory_game_records 集合

- 状态：**已决策**（2026-07-19，依据 Chapter 07 §9，Approved）

## 背景

Chapter 07（Memory Challenge）要求保存每局游戏记录。
Baseline Spec §4 的 14 集合基线中无对应集合；ADP-005 已确立「Owner 批准可新增集合」的先例。

## 决策

新增第 16 个集合 `memory_game_records`，字段以 Chapter 07 §9 为准：
`userId / chapterId / knowledgeIds[] / score / correctCount / wrongCount / duration`
（+ BaseEntity 基础字段）。

- 权限：**仅创建者可读写**（默认，用户只碰自己的记录，无需调整）
- 已同步：`cloud/database/collections.json` 与 `initDatabase`（重跑即可补建）

## 后果

- 集合数 15 → 16；游戏历史展示等后续能力可直接基于本集合（Phase 3 后续章节）
