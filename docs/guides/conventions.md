# 编码规范

> 本文件将 OPENCODE_RULES 与项目宪章转化为可检查的工程规则。
> 能被工具强制的（已配置进 ESLint / TS / CI）优先于口头约定。

## 1. TypeScript

- `strict: true` 且开启 `noUncheckedIndexedAccess`（已由 tsconfig 强制）
- **禁止 `any`**（ESLint error 级）。确需未知类型用 `unknown` 并收窄
- 所有跨层数据结构必须定义 Interface，集中在 `core/`；DTO 必须显式定义
- 禁止「拼音命名」「无意义命名」（temp / aaa / newData / test1）

## 2. 规模红线（宪章）

| 单位      | 上限   | 超出处理                    |
| --------- | ------ | --------------------------- |
| Page 文件 | 300 行 | 拆组件 / 下沉逻辑到 Service |
| Component | 200 行 | 拆子组件                    |
| Function  | 50 行  | 拆函数                      |

## 3. 注释

- 注释解释**为什么这样设计**，不复述代码在做什么
- 每个目录的 `README.md` 是该目录的规范，新增文件前先读它

## 4. DRY 与 SSOT

- 同一逻辑出现第 2 次 → 抽函数 / 组件 / Service
- 同一份数据只允许一个权威来源（Knowledge 字段不得复制到教材/课程冗余存储）

## 5. 禁止事项速查（RULES §3）

- 擅自新增功能、删除预留能力
- 擅自修改数据库结构、目录结构、产品流程
- 用假数据替代真实实现（明确要求的 Mock 除外）

## 6. 需求缺失时（RULES §4）

停止该部分开发 → 输出 **Missing Decisions**（缺失内容 / 为何无法继续 / 建议方案）→ 等确认。
登记到 `docs/decisions/pending-decisions.md`。
