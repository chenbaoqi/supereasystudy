# 项目结构导出（快照）

> 快照时间：2026-07-19 ｜ 阶段：Phase 1 完成，**Phase 2 学习链路切片已实现（待云端部署联调）**
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
│   │   ├── collections.json         # ★ 集合基线（14 + favorites=15，ADR-005）
│   │   └── README.md
│   └── functions/                   # cloudfunctionRoot
│       ├── initDatabase/            # 集合初始化（幂等，已执行）
│       ├── login/                   # ★ 登录（openid 建档/恢复，Chapter 04 §5）
│       ├── seedDatabase/            # ★ 示例种子导入（A1 授权，SAMPLE 待替换）
│       └── README.md
├── docs/
│   ├── OPENCODE_RULES.md            # 开发宪法（优先级 1）
│   ├── SuperEasy-Learning-Specification.md   # 产品 SSOT（优先级 2）
│   ├── DEVELOPMENT_BASELINE_SPEC.md          # 开发基线（Mandatory）
│   ├── architecture/                # 架构文档 + CHAPTER-04 + 本快照
│   ├── decisions/                   # ADR-001~005 + pending-decisions
│   ├── guides/                      # development / conventions / git-workflow
│   └── archive/
├── miniprogram/
│   ├── app.ts                       # cloud.init + 静默登录 → 学科页/登录页
│   ├── app.json / app.wxss / sitemap.json
│   ├── core/                        # 领域类型 ×10（base/user/learningState/subject/
│   │                                #   learningPath/textbook/semester/chapter/
│   │                                #   knowledge/learningRecord/favorite）
│   ├── subjects/                    # 学科插件目录（规范已立，暂无实现）
│   ├── pages/                       # 17 页：9 页已实现（学习链路切片）+ 8 占位
│   │   └── shared/                  # 列表页共享脚手架（DRY）
│   ├── services/                    # userService / learningService / testService
│   ├── repositories/                # 9 个 Repository（wx.cloud 唯一封装点）
│   ├── config/                      # cloud.ts + features.ts
│   ├── components/  └── utils/      # （README 规范，暂无）
├── scripts/                         # （README，暂无）
├── tests/                           # learningService ×7 + testService ×6
├── typings/                         # index.d.ts + app.d.ts（IAppOption）
├── project.config.json              # AppID wxa72b355ef8b198eb
└── 工程配置（package.json/tsconfig/eslint/prettier/commitlint/editorconfig）
```

## 2. 页面清单

**已实现（Chapter 04 切片，§15 UI 从简）**：
`login` 登录 → `subject` 学科 → `learning-path` 学习路径 → `textbook` 教材 →
`semester` 册次 → `chapter` 章节（三态）→ `study-detail` 学习详情（知识卡/收藏/进度）
→ `test` 测试（英译中四选一）→ `test-result` 测试结果（正确率/耗时/重新学习）

**占位（8）**：TabBar `home`/`study`/`practice`/`mine` + `favorite`/`review`/`settings`/`coming-soon`

## 3. 数据库 Collection（15 个）

环境 `cloud1-d8g6b7jctd1a3be1c`；字段级依据 Chapter 04 §5/§7 + `miniprogram/core/`。

| 集合                              | 字段（核心）                                                                        | 数据                       |
| --------------------------------- | ----------------------------------------------------------------------------------- | -------------------------- |
| users                             | openid                                                                              | 登录自动建档               |
| subjects                          | name/open/order                                                                     | 种子 ×9（英语开放）        |
| learning_paths                    | subjectId/name/open/order                                                           | 种子 ×2（Vocabulary 开放） |
| textbooks                         | learningPathId/name/order                                                           | 种子 ×1                    |
| semesters                         | textbookId/name/order                                                               | 种子 ×1                    |
| chapters                          | semesterId/title/order                                                              | 种子 ×2                    |
| knowledge                         | chapterId/word/ipa/pronunciation?/meaning/partOfSpeech?/example?/translation?/order | 种子 ×20                   |
| learning_records                  | userId/chapterId/currentKnowledgeId?/progress/state                                 | 运行时                     |
| favorites                         | userId/knowledgeId（ADR-005）                                                       | 运行时                     |
| stages / grades                   | 仅基础字段（待 Specification 第 13 章）                                             | —                          |
| practice_records / review_records | 仅基础字段                                                                          | —                          |
| banners / notices                 | 仅基础字段                                                                          | —                          |

## 4. 已实现模块

| 层              | 内容                                                                  |
| --------------- | --------------------------------------------------------------------- |
| core            | 领域类型 ×10（§3 层级 + §5 显式字段 + §6 状态机 + §7 记录 + ADR-005） |
| repositories    | 9 个（接口+云实现；learningRecord upsert 用 serverDate）              |
| services        | 3 个（依赖注入可单测；userService 为登录态唯一写入口）                |
| pages           | 学习链路 9 页 + 列表共享脚手架                                        |
| cloud functions | initDatabase / login / seedDatabase（均幂等）                         |
| tests           | Vitest ×13（learningService 状态机 + testService 出题/交卷）          |
| 工程            | TS strict / ESLint（禁 any）/ CI / commitlint / husky                 |

## 5. 待办与后续

- ⏳ 云端部署 login + seedDatabase 并执行种子（见交付报告部署清单）
- ⏳ favorites 集合补建（重跑 initDatabase 或控制台手动）
- 🔴 复习算法（Specification 第 6/8 章，pending #5）
- 🟡 种子数据为 SAMPLE（A1），上线前由真实教材数据替换
- Phase 2 后续：favorite/review 真实页、home tab 规范（Specification 第 12 章）
