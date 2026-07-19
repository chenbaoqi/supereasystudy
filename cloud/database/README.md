# cloud/database/ — 数据库基线

## 依据

Baseline Spec §4（Mandatory）：必须创建 14 个 Collection，清单见 `collections.json`。

## 规则（Spec §4 原文约束）

- **不允许修改集合名称**
- 字段未知时仅保留 `_id` / `createdAt` / `updatedAt`（对应 `miniprogram/core/base.ts` 的 `BaseEntity`）
- 后续**允许扩展字段**，新增字段必须在提交信息中说明原因（RULES §7）
- 字段级设计以 Specification 数据模型章节（待补写）为准

## 如何创建集合（手动流程）

云数据库集合需在微信开发者工具中创建：

```
开发者工具 → 云开发控制台（选择环境 cloud1-d8g6b7jctd1a3be1c）
→ 数据库 → 添加集合 → 按 collections.json 逐个创建（共 14 个）
```

✅ 环境已就绪（2026-07-19 接入真实环境 ID），可随时执行上述步骤。

## 后续规划

如需在新环境重复建集合，可在 `cloud/functions/` 增加一次性 `initDatabase`
云函数（`wx-server-sdk` 的 `db.createCollection()` 批量创建），或在 `scripts/`
补充校验脚本（自动比对线上集合与本清单）。按需开发，不做提前实现。
