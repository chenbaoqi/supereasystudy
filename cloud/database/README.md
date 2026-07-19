# cloud/database/ — 数据库基线

## 依据

Baseline Spec §4（Mandatory）：必须创建的 Collection 清单见 `collections.json`
（14 个基线 + `favorites`（ADR-005）+ `memory_game_records`（ADR-006）= 16 个）。

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

## 快速创建（推荐）：initDatabase 云函数

已提供一次性云函数 `cloud/functions/initDatabase/`（幂等，已存在则跳过），
部署与调用步骤见该目录 README。

## 权限矩阵（新环境必做，否则客户端读不到管理端写入的内容）

云数据库集合默认「仅创建者可读写」。种子/CMS 录入的内容属管理端所有，
客户端（普通用户）读不到——内容集合必须改权限：

| 集合                                                                                         | 权限                           | 理由                            |
| -------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------- |
| subjects / learning_paths / textbooks / semesters / chapters / knowledge / banners / notices | **所有用户可读，仅创建者可写** | 内容只读，管理端维护            |
| learning_records / favorites / practice_records / review_records                             | 仅创建者可读写（默认）         | 用户只碰自己的记录              |
| users                                                                                        | 仅创建者可读写（默认）         | 客户端不直连，仅经 login 云函数 |

设置路径：云控制台 → 数据库 → 选中集合 → 权限设置。

> ⚠️ **云存储是另一套独立权限**（存图片/音频用）：控制台 → 存储 → 权限设置 →
> 「所有用户可读，仅创建者可写」。否则管理端上传的文件在小程序端加载失败
> （症状：控制台可预览、客户端 500）。

## 后续规划

可在 `scripts/` 补充校验脚本（自动比对线上集合与本清单）。按需开发，不做提前实现。
