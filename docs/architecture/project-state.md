# 项目结构导出（快照）

> 快照时间：2026-07-19（初版）｜ 阶段：Phase 1 完成 + Phase 2/Phase 3 多章已实现（详见 CHANGELOG，至 2026-07-31 Chapter 15）
> 最近同步：2026-09-13 ｜ 本次：新增 UI v1 设计体系（`miniprogram/styles/`、4 个 Tab 页重做、tabBar 图标），
> 见 ADR-013 与 Specification §12 v2；另补齐 `aiTutor` 云函数（第 8 个）
> 注意：本文件部分计数仍停留在 2026-08-27 快照（如 tests ×62 → 实际 259 / 23 文件），未逐项复核
> 范围：仅已入库文件（不含 `node_modules/`、`.git/`、`project.private.config.json`）
> 维护：模块变更时同步更新；也可随时要求重新导出。

---

## 1. 目录树

```
supereasystudy/
├── .github/workflows/ci.yml         # CI：lint / typecheck / test / format:check
├── .husky/                          # pre-commit(lint-staged) + commit-msg(commitlint)
├── cloud/
│   ├── database/
│   │   ├── collections.json         # ★ 集合基线（17，ADR-005/006/007）
│   │   └── README.md
│   └── functions/                   # cloudfunctionRoot（7 个，均幂等）
│       ├── initDatabase/            # 集合初始化（建 17 集合，幂等）
│       ├── login/                   # ★ 登录（openid 建档/恢复，Chapter 04 §5）
│       ├── seedDatabase/            # ★ 示例种子导入（A1 授权，SAMPLE 待替换）
│       ├── seedBanners/             # 一次性 Banner 初始化（图片绑定当前环境）
│       ├── resetAndImport/          # 教材数据重置 + 导入
│       ├── unzipPronunciations/     # 发音包解压（注意：env 硬编码，见 §6）
│       ├── updateUserPreferences/   # 收口 users.preferences 写权限
│       └── README.md
├── docs/
│   ├── OPENCODE_RULES.md            # 开发宪法（优先级 1）
│   ├── SuperEasy-Learning-Specification.md   # 产品 SSOT（优先级 2）
│   ├── DEVELOPMENT_BASELINE_SPEC.md          # 开发基线（Mandatory）
│   ├── architecture/                # 架构文档 + CHAPTER-04 + 本快照
│   ├── decisions/                   # ADR-001~007 + pending-decisions
│   ├── guides/                      # development / conventions / git-workflow
│   └── archive/
├── miniprogram/
│   ├── app.ts                       # cloud.init + 静默登录 → 学科页/登录页
│   ├── app.json / app.wxss / sitemap.json
│   ├── core/                        # 领域类型 ×10（base/user/learningState/subject/
│   │                                #   learningPath/textbook/semester/chapter/
│   │                                #   knowledge/learningRecord/favorite）
│   ├── subjects/                    # 学科插件目录（规范已立，暂无实现）
│   ├── pages/                       # 28 页（app.json 计数，另有 shared 脚手架）：全部已实现（settings V1 于 2026-09-14 落地）
│   │   └── shared/                  # 列表页共享脚手架（DRY）
│   ├── services/                    # 14 Service + 5 逻辑/引擎辅助（gameResultStore / memoryGameLogic / quizLogic / shooterAudio / shooterEngine）
│   ├── repositories/                # 12 个 Repository（wx.cloud 唯一封装点）
│   ├── config/                      # cloud.ts / features.ts / gameRules.ts / games.ts / reviewPlan.ts / testPaper.ts
│   ├── components/                # keyboard / memory-card / math-number-line / math-fraction / math-coordinate-plane（B-7 前 3 个）/ entitlement-gate
│   ├── styles/                      # ★ UI v1：tokens.wxss（设计令牌）+ components.wxss（通用组件）
│   └── assets/tabbar/               # ★ UI v1：8 张 tabBar 图标（scripts/gen_tabbar_icons.py 生成）
├── scripts/                         # 数据管线脚本 + gen_tabbar_icons.py（见 scripts/README.md）
├── tests/                           # Vitest ×482（32 文件）
├── typings/                         # index.d.ts + app.d.ts（IAppOption）
├── project.config.json              # AppID wxa72b355ef8b198eb
└── 工程配置（package.json/tsconfig/eslint/prettier/commitlint/editorconfig）
```

## 2. 页面清单

**已实现（学习链路 + 游戏 + 我的）**：

- 学习链路（Chapter 04 切片）：`login` → `subject` → `learning-path` → `textbook` → `semester` → `chapter`（三态）→ `study-detail` → `test` → `test-result`
- 首页 Dashboard：`home`（Banner/统计/最近学习/学科入口/教材引导卡）
- 学习 tab：`study`（Chapter 14「我的课程」：单词+语法双分区、教材横条切换）
- 练习 tab：`practice`（**2026-08-27 实现**：当前册次章节列表 → 进入 game-center 选游戏；游戏均按章节锁定知识点）
- 我的 tab：`mine`（**2026-08-27 实现**：当前教材展示 + 教材选择/收藏/统计/设置入口；管理员入口按 FEATURE_FLAGS.adminEntry 预留）
- 复习：`review` / `review-detail`（1/3/7/15/30 天五阶段）
- 收藏：`favorite`；统计：`statistics`；落地页：`coming-soon`（「敬请期待」）
- 游戏：`game-center`（由 `config/games.ts` 配置驱动）+ `memory-game`/`memory-result`/`speed-choice`/`listen-find`/`space-shooter`/`grammar-game`（5 款，均经 game-center 选关；`memory-result` 为共用结果页；语法闯关题源为语法专题包内嵌 quiz）

**占位（0）**：无。最后一个占位页 `settings` 已于 2026-09-14 定义 V1（年级可手动指定 + 恢复默认），
见 Specification §12.5 与 CHANGELOG。

**UI v1.1（2026-09-13，ADR-013）**：`home` / `study` / `practice` / `mine` 四个 Tab 页 +
新增 `ai-tutor`（AI 辅导）已按「清爽蓝·淡色版」重做（**淡蓝头部 + 深色文字 + 彩色状态 chip +
学科色图标 + 竖向功能行**），导航栏白底黑字，tabBar 补齐本地生成的 8 张图标。
其余页面分两批迁移：第二批（2026-09-14）已完成 8 页，见下。
静态预览：`docs/design/ui-v1-preview.html`（18 屏 + AI 辅导入口一览表）。

**第二批迁移（2026-09-14）**：教材 / 册次 / 学习路径（改共享模板 `shared/list.wxml` 一处）+
学科 / 章节 / 收藏 / 学习详情 / 复习详情，共 8 页已改用 `u-*` + tokens。
**`pages/shared/list.wxss` 与 `pages/shared/card.wxss` 已删除**，全项目不再有新旧并存的样式来源。

**第三批迁移（2026-09-14，收口完成）**：测试 / 测试结果 / 复习首页 / 统计 / 登录 /
游戏中心 + 6 个游戏页 / 设置 / 敬请期待 —— **全站 28 页无遗留旧样式**。
新增 `styles/game.wxss`（`g-` 前缀，5 个答题类小游戏共用 HUD/计时条/准备页），
`components.wxss` 补 `.u-option` / `.u-speaker`（测试页与 4 个小游戏共用）。
小蜜蜂的深色街机画面是**有意保留的例外**，色值走 `--game-*` 令牌而非硬编码。

**AI 辅导（2026-09-13，ADR-014）**：`pages/ai-tutor/ai-tutor` —— 需求第三十八/三十九章落地。
入口三个：① 测试页**答错后「✨ 问 AI 为什么」**（带题干/选项/学生答案/正确答案/三级提示）、
② 学习详情页「✨ 问 AI」（带知识点）、③ 我的页 AI 辅导（自由问答）。
上下文有两条通道：长文本与数组走内存交接 `services/aiTutorHandoff.ts`（取走即焚），
URL 短参数作兜底；页面不读数据库。AI 不可用时标注「程序化提示」并保留可用性。
三级提示由 `services/aiTutorQuestion.ts` 从知识点数据反推（`QuizQuestion` 本身无 hints 字段）。
**学科规则（ADR-014 §7.4）**：题目 / 知识点场景的学科由内容本身决定，**用户不能改**；
自由问答**默认「不限」**，由页内 chip 自选（2026-09-13 Owner 反馈：不该默认成当前教材那一科）。

## 3. 数据库 Collection（17 个）

环境 `cloud1-d8g6b7jctd1a3be1c`；字段级依据 Chapter 04 §5/§7 + `miniprogram/core/`。

| 集合                              | 字段（核心）                                                                                             | 数据                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| users                             | openid                                                                                                   | 登录自动建档                         |
| subjects                          | name/open/order                                                                                          | 种子 ×9（英语开放）                  |
| learning_paths                    | subjectId/name/open/order                                                                                | 种子 ×2（词汇 开放 / 语法 敬请期待） |
| textbooks                         | learningPathId/name/order                                                                                | 种子 ×1                              |
| semesters                         | textbookId/name/order                                                                                    | 种子 ×1                              |
| chapters                          | semesterId/title/order                                                                                   | 种子 ×2                              |
| knowledge                         | chapterId/word/ipa/pronunciation?/meaning/partOfSpeech?/example?/translation?/order                      | 种子 ×20                             |
| learning_records                  | userId/chapterId/currentKnowledgeId?/progress/state                                                      | 运行时                               |
| favorites                         | userId/knowledgeId（ADR-005）                                                                            | 运行时                               |
| stages / grades                   | 仅基础字段（待 Specification 第 13 章）                                                                  | —                                    |
| practice_records / review_records | 仅基础字段                                                                                               | —                                    |
| banners / notices                 | 仅基础字段                                                                                               | —                                    |
| memory_game_records               | userId/chapterId/knowledgeIds[]/score/correctCount/wrongCount/duration/gameType/avgResponseMs（ADR-006） | 运行时                               |
| reading_passages                  | chapterId/title/content/questions[{stem,options[4],answerIndex}]（ADR-007，阅读理解素材，二期）          | 空（待教师校对）                     |

## 4. 已实现模块

| 层                | 内容                                                                                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core              | 领域类型 ×10（§3 层级 + §5 显式字段 + §6 状态机 + §7 记录 + ADR-005）                                                                                                                                                      |
| repositories      | 12 个（接口+云实现；learningRecord upsert 用 serverDate）                                                                                                                                                                  |
| services          | 16 个 Service + 5 逻辑/引擎辅助（依赖注入可单测；userService 为登录态唯一写入口；2026-09-13 增 aiTutorHandoff / aiTutorQuestion）                                                                                          |
| pages             | 28 页（4 Tab + 学习链路 + 游戏 + 复习/收藏/统计/结果/落地；含 grammar-game / math-drill / ai-tutor / settings V1）                                                                                                         |
| cloud functions   | 8 个：initDatabase / login / seedDatabase / seedBanners / resetAndImport / unzipPronunciations / updateUserPreferences / **aiTutor**（AI 辅导，DeepSeek，2026-09-13 接通并有页面入口）                                     |
| styles            | ★ UI v1.1：`tokens.wxss`（令牌，含 `--game-*` 深色街机组）+ `components.wxss`（u-* 通用组件）+ `game.wxss`（g-* 小游戏共用），三者由 app.wxss @import；全站 wxss 无硬编码色值                                              |
| tests             | Vitest ×482（32 文件：Service 逻辑 / 题型判题 / 掌握度 / 错因 / 组卷 / 年级过滤 / AI 辅导 / 题目上下文 / 知识图谱 / 数轴 / 分数 / 坐标系 / **权益门禁与激励视频降级**）                                                    |
| 变现（ADR-015）   | P0 已落地：`entitlementService` + `components/entitlement-gate` + `rewardedAdService`；**广告位留空 = 全站门禁自动放行**，会员入口「敬请期待」。新增集合 `user_entitlements` 待建                                          |
| 数学可视化（B-7） | 契约层 `core/visual.ts` + 3 个组件（数轴 / 分数条 / 坐标平面）；题目经 `quiz[].visual` 声明，学习详情页与测试页按 `visualType` 渲染；已挂 13 道带图题（七年级坐标系 9 + 数轴 2 + 分数 2）。**第 4 个 GeometryCanvas 未做** |
| 工程              | TS strict / ESLint（禁 any）/ CI / commitlint / husky                                                                                                                                                                      |

## 5. 待办与后续

- ✅ 云链路联调通过（2026-08-27 用户验证：AppID `wxa72b355ef8b198eb` / 7 个云函数已部署 / 17 集合 + 种子数据已存在 / 功能点击正常）
- ✅ favorites 集合已在 17 集合基线内（initDatabase 幂等建，ADR-005）
- ✅ `knowledge_relations` 已有真实数据（2026-09-14）：`resetAndImport/relations.js` 手写 16 条关系
  （平面直角坐标系簇 + 有理数/数轴簇），导入时按名字解析 `_id`；此前集合建了但**零数据**，
  图谱算法跑的是空集。当前只覆盖七年级这两个簇，其余知识点仍无关系
- 🔴 复习算法（Specification 第 6/8 章，pending #5 仍阻塞）
- 🟡 种子数据为 SAMPLE（A1），上线前由真实教材数据替换 → 见方向 B
- Phase 2 后续（favorite/review 真实页、home tab 规范）均已实现（Chapter 05/06）；
  `settings` 页 V1 已于 2026-09-14 落地（年级可手动指定 + 恢复默认），不再是占位页
