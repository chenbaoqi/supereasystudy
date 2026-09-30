# ADR-008：新增数学引擎四集合（questions / knowledge_relations / user_mastery / user_wrong_questions）

- 日期：2026-09-08
- 状态：已接受（Owner 明确「需要建集合就肯定要建」）
- 背景：数学学科方案 B 的引擎层（B-3 判题 / B-4 掌握度 / B-5 错因补弱 / B-6 组卷）
  已全部完成并通过单测，但**只有纯算法，没有落库**。引擎要真正跑起来必须持久化。

---

## 决策

新增 4 个集合，一次性建齐：

| 集合 | 粒度 | 用途 | 需求章节 |
| --- | --- | --- | --- |
| `questions` | 题目 | 题库（含题型、难度、错因、分级提示、状态） | 第二十九章 |
| `knowledge_relations` | 知识点×知识点 | 图谱关系：前置 / 相关 / 后继 | 第三十五章 |
| `user_mastery` | 用户×知识点 | 掌握度 0-100 及其原始信号 | 第三十四章 |
| `user_wrong_questions` | 用户×题目 | 错题记录与补弱进度 | 第三十六、三十七章 |

暂不建（用到再说，避免过度设计）：
- `question_sets`：组卷是实时生成的，暂无持久化试卷的需求。
- `learning_events`：学习行为埋点，Phase 8 学习分析再做。

---

## 理由

### 为什么 `user_mastery` 不能用 `learning_records` 代替

`learning_records` 是「用户×章节」粒度。需求第三十四章要的是**每学生每知识点**。
章节级聚合只能用于展示，无法驱动「组卷难度」与「推荐优先级」——这两个才是自适应的核心。
（章节级 `masteryScore` 字段已加在 `learning_records` 上作展示用，两者并存，不冲突。）

### 为什么知识图谱用关系表而不是数组字段

需求第三十五章列的是 `prerequisiteIds / relatedIds / nextIds` 三个数组。
但补弱流程需要**反查**「谁依赖我」（学生卡在 A，要找出 A 的前置 B），
数组字段按 `relatedId` 反查要全表扫描；关系表可以直接 `where({ relatedId })`。
因此落库用关系表，`KnowledgeGraph` 邻接表在内存里构建，对外语义与需求一致。

### 为什么掌握度的衰减在「读取时」算

入库时学生刚练过，间隔为 0，衰减恒等于 1。
只有在隔一段时间后再读，衰减才有意义——这才能破解「学过即掌握」的假象。
所以 `masteryScore` 存的是未衰减值，读取时经 `scoreWithDecay` 施加衰减。

---

## 影响

**新增文件**

- 云侧：`cloud/database/collections.json`（+4 条 + changelog）、
  `cloud/functions/initDatabase/index.js`（COLLECTIONS +4）
- 模型：`core/masteryRecord.ts`、`core/knowledgeRelation.ts`
- 仓储：`repositories/userMasteryRepository.ts`、`knowledgeRelationRepository.ts`、
  `questionRepository.ts`、`wrongQuestionRepository.ts`
- 服务：`services/masteryService.ts`、`services/knowledgeGraphService.ts`
- 测试：`tests/masteryService.test.ts`（14 条）

**未改动**（红线）

- `config/testPaper.ts` 与 `services/testService.ts`：英语组卷逻辑零改动。
- `resetAndImport` 的 upsert 语义不变。
- 英语既有数据（1214 词 + 发音 + 语法题）不受影响。

**部署步骤**

1. 部署 `initDatabase` 云函数（右键 → 上传并部署：云端安装依赖）
2. 云端运行一次 `initDatabase` → 返回 `{ created | skipped }` 逐条结果（幂等，可重复执行）
3. 若此前已跑过 `resetAndImport`，无需重跑；内容集合与本次新增的四个集合互不影响

---

## 风险

- 四个集合当前**无数据**。`questions` 与 `knowledge_relations` 属于内容，需要后续录入或导入；
  在题目入库前，组卷无题可出（`composePaper` 会返回空数组，不会报错）。
- 客户端直连数据库写入（与现有 `favorites` / `review_records` 一致），
  依赖云数据库权限「仅创建者可读写」；若后续需要防作弊，应把写操作收进云函数。
