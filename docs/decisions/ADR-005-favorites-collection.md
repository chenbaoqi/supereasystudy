# ADR-005：收藏建模 —— 新增 favorites 集合

- 状态：**已决策**（2026-07-19，Owner 拍板）

## 背景

Chapter 04 §5 Study Detail 要求「收藏」能力，但 §11 允许的集合清单中无 favorites。
我提出的默认方案 D 为「learning_records 内嵌 favoriteKnowledgeIds」，
Owner 裁决改为：**新增独立 favorites 集合**。

## 决策

- 新增集合 `favorites`：`{ userId, knowledgeId }`（每「用户×知识点」一条）
- 集合名固定（Baseline Spec §4 规则同样适用）；已同步 `collections.json` 与 `initDatabase`
- 配套 `core/favorite.ts` 与 `repositories/favoriteRepository.ts`（add 防重、remove 先查后删）

## 理由（Owner 视角）

收藏是跨章节的全局关系（收藏页需按用户聚合），独立于「用户×章节」的学习记录，
查询与扩展（如未来收藏夹分组）更清晰，避免 learning_records 文档膨胀。

Owner 补充（2026-07-19）：内嵌方案对 V1 可行，但长期会导致——
① 收藏与学习记录耦合；② 收藏无法跨章节；③ 收藏无法跨教材；
④ 收藏无法扩展到数学、语文等其他学科。
本项目定位是全学科 Learning OS（非单一英语单词工具），故当下即独立建集合。

## 后果

- 数据库集合数 14 → 15；需在云端补建 favorites（重跑 initDatabase 或控制台手动创建）
