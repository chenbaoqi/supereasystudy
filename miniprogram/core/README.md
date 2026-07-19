# core/ — 领域抽象层（框架无关）

## 职责

存放 Learning OS 的核心抽象：**只放接口（Interface）与类型，禁止放业务实现**。

未来包括（以 Specification 补齐章节为准）：

- `Knowledge` 抽象：一切学习内容（单词/公式/古诗…）的统一类型
- `SubjectPlugin` 契约：学科插件必须实现的接口
- `LearningTemplate` / `LearningCapability`：学习流程与学习行为的抽象
- `Game` 统一评分接口：Memory Challenge 各小游戏的扩展点（Specification 第五章）

## 规则

| 允许                             | 禁止                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| interface / type / 常量枚举      | 任何实现代码（函数体、类方法）                              |
| 被 `subjects/`、`services/` 引用 | 引用 `pages/`、`services/`、`repositories/`（依赖只能向内） |
| 纯类型，零运行时依赖             | 引入 wx API、npm 包                                         |

## 为什么

宪章「Everything is Knowledge」与「Subject Plugin」的物理载体。
V2 新增学科 = 在 `subjects/` 新增一个实现 `SubjectPlugin` 的目录，**本层不需要任何修改**。

## 当前状态（Phase 2 进行中）

- `base.ts`：`BaseEntity`（`_id/createdAt/updatedAt`，Baseline Spec §4 的基础字段单点定义）
- `user.ts`：`User`（users 集合；openid 为登录凭据，Chapter 04 §5）
- `learningState.ts`：学习状态机（§6 显式定义）
- `subject.ts` / `learningPath.ts` / `textbook.ts` / `semester.ts` / `chapter.ts` / `knowledge.ts`：
  学习链路六层（§3 层级 + §5 显式字段）
- `learningRecord.ts`：学习记录（§7，每用户×章节一条）
