# ADR-004：目录结构调和（对齐 Baseline Spec §2，方案乙）

- 状态：**已决策**（2026-07-19，Owner 拍板「乙」）

## 背景

`DEVELOPMENT_BASELINE_SPEC.md` §2 的固定目录与 2026-07-19 已入库的目录基线存在冲突：
spec 要求 `cloud/{functions,database}`、`packages/{ui,utils,types}`、`scripts/`、`docs/archive/`；
已入库基线为 `cloudfunctions/` + `miniprogram/{components,utils,core}` + `typings/`。

## 决策（方案乙）

| spec §2 项         | 处置                                  | 理由                                                                          |
| ------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| `cloud/functions/` | ✅ 采纳（`cloudfunctions/` 迁移而来） | 与 spec 对齐；`cloudfunctionRoot` 已同步修改                                  |
| `cloud/database/`  | ✅ 采纳                               | 承载 Spec §4 的 14 集合基线                                                   |
| `scripts/`         | ✅ 采纳                               | 工程脚本归属（如未来的 init-database）                                        |
| `docs/archive/`    | ✅ 采纳                               | RULES §1 历史文档归档需求                                                     |
| `packages/ui`      | ❌ 不建                               | 原生小程序组件无法跨端复用（ADR-001），`miniprogram/components/` 已是唯一权威 |
| `packages/utils`   | ❌ 不建                               | `miniprogram/utils/` 已是唯一权威，双份违反 One Source of Truth               |
| `packages/types`   | ❌ 不建                               | `miniprogram/core/` 已是领域类型唯一权威                                      |

## 后果

- 已同步修订 `DEVELOPMENT_BASELINE_SPEC.md` §2（附修订记录），保证文档与代码一致
- 若未来出现第二个独立应用（Web 管理端等），重新评估共享包，新建 ADR
