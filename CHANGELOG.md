# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### Added - 2026-07-19（规范冻结 + Chapter 06：首页/收藏/统计）

- **Specification 第 12 章（UI/UX 规范）与第 13 章（数据模型）正式冻结**（Owner 逐项确认 Q1-Q7）
- 首页 Dashboard（Specification §12.5）：Banner 轮播（无数据隐藏）/ 统计条（今日复习+连续天数）/ 最近学习（前 3，点击续学）/ 学科入口；`homeService` 聚合
- 收藏页真实化：按收藏时间倒序（favorites join knowledge），点击进所属章节学习详情（Q5）
- 学习统计页（pages/statistics）：今日复习/今日学习章节/累计知识点/连续天数；入口在「我的」tab（Q6）
- `statisticsService`（§13.3 口径：连续天数两表日期去重实时计算，Q2-A 零新字段）+ `favoriteService` + `utils/date.countStreakDays`
- `core/banner.ts` + `bannerRepository`（§13.2 冻结字段）；`learningRecordRepository.listByUser`、`chapterRepository.listByIds`、`reviewRepository.listByUser` 扩展
- 单测 +7（statisticsService 口径 + countStreakDays 边界：断档/今日无活动/空）

### Changed - 2026-07-19（Chapter 06 配套）

- 应用入口与登录成功跳转：学科页 → 首页 Dashboard（home tab 正式启用）
- 收藏列表按 createdAt 倒序（§12.5）
- subject 页重定位为「学科入口页」（Owner 2026-07-19）：开放学科→学习路径、未开放→本页敬请期待；首页学科点击统一走该页

### Added - 2026-07-19（Banner 资产）

- `scripts/generate_sample_banners.py` + `scripts/assets/banners/`（2 张 SAMPLE Banner 图，正式图待替换）与上线步骤 README
- `cloud/functions/seedBanners/`：一次性 Banner 记录初始化（幂等，图片 File ID 绑定当前环境）

### Added - 2026-07-19（Phase 2：复习系统，Chapter 05）

- `core/reviewStatus.ts` + `core/reviewRecord.ts`（§5 显式字段）；`learningState` 追加 `REVIEW_DUE`（§6，向后兼容）
- `repositories/reviewRepository.ts`（§8）；`knowledgeRepository` 增加 `listByIds`（复习卡片 join）
- `services/reviewService.ts`（§9 四方法 + §3 任务创建；排期算法集中，Repository 无业务）
- `config/reviewPlan.ts`（§6 复习计划 1/3/7/15/30 天，配置优先、算法可替换）；`utils/date.ts`（首个工具函数）
- 复习双页：`review`（今日待复习/已完成/完成率/开始复习，§4 空状态）+ `review-detail`（认识/不认识自评）
- 接线：`finishLearning` 自动创建复习任务（Q1）；`submitTest` 后状态 TESTED→REVIEW_DUE（Q1）；测试结果页加「去复习」入口（Q5）
- 单测 +9：reviewService ×8（固定时钟注入）、finishLearning 钩子 ×1；testService 期望更新为 REVIEW_DUE

### Changed - 2026-07-19（Chapter 05 配套）

- 卡片样式抽取 `pages/shared/card.wxss`（study-detail 与 review-detail 共享，DRY）
- 测试页交互（Owner 要求）：答对自动进下一题（500ms 反馈延时），答错停留手动继续
- 修复（Owner 反馈）：已完成章节再次进入直接停在最后一条 → 改为从第一条重新浏览（仅 LEARNING 状态恢复位置，记录不重置）

### Added - 2026-07-19（Phase 2：学习链路垂直切片，Chapter 04）

- core 领域类型 ×10：`learningState`（§6 状态机）/ `subject` / `learningPath` / `textbook` / `semester` / `chapter` / `knowledge`（§5 显式字段）/ `learningRecord`（§7）/ `favorite`（ADR-005）/ `user`（+openid）
- Repository ×8（接口+云实现，wx.cloud 唯一封装点）：subject / learningPath / textbook / semester / chapter / knowledge / learningRecord / favorite；`userRepository` 改为 login 云函数通道
- Service ×3：`userService`（login / restoreSession / getCurrentUser，登录态唯一写入口）、`learningService`（§10 五方法，依赖注入可单测）、`testService`（B 方案英译中四选一 + 交卷置 TESTED；§10 未列入 LearningService，按单一职责拆分）
- 9 个切片页面由占位变真实：login / subject / learning-path / textbook / semester / chapter / study-detail / test / test-result（§15 UI 从简）；四列表页共享脚手架 `pages/shared/`（createListPage + list.wxml/wxss，DRY）
- 云函数 ×2：`login`（openid 建档/恢复，幂等）、`seedDatabase`（A1 示例种子：9 学科 / Vocabulary / 1 教材 / 1 册 / 2 章 / 20 词，幂等可重复）
- 单元测试 ×13（learningService 7 + testService 6），冒烟测试按约定移除
- `favorites` 集合（ADR-005，Owner 决策），`collections.json` 与 `initDatabase` 同步
- `typings/app.d.ts`（IAppOption 全局类型）；入口接线：静默登录 → 学科页 / 登录页（Chapter 04 §3）

### Changed - 2026-07-19（Phase 2 切片配套）

- `app.ts`：入口路由策略（恢复登录态后 reLaunch 学科页 / 登录页）
- ESLint：`no-unused-vars` 支持下划线前缀「刻意未使用」约定
- UI 文本中文化：Coming Soon →「敬请期待」（列表标签 + 落地页，Owner 要求）
- 种子数据中文化：学习路径 Vocabulary/Grammar →「词汇/语法」（Owner 要求；库内已有记录需同步改名）
- 学科/列表页采用纵向列表布局（非九宫格），Owner 确认保留

### Added - 2026-07-19（Phase 1：页面路由 / 云初始化 / 骨架）

- 新增文档 `DEVELOPMENT_BASELINE_SPEC.md`（Owner 提供，Mandatory）并据此推进 Phase 1
- 产品 SSOT 统一更名：`SuperEasy-Learning-Design-Bible.md` → `SuperEasy-Learning-Specification.md`（含全仓引用与 OPENCODE_RULES §1/§11 同步）
- 17 个空页面 + 路由（Baseline Spec §3）：TabBar（首页/学习/练习/我的，纯文字）+ 13 个普通页；占位样式统一 `app.wxss` 的 `.page-placeholder`
- 云开发初始化：`config/cloud.ts`（占位环境 `todo-cloud-env`，§6）+ `app.ts` 的 `wx.cloud.init`
- 数据库集合基线（§4）：`cloud/database/`（14 集合清单 + 创建说明）
- 骨架代码（接口/类型，无业务逻辑，§1/§7）：`core/base.ts`（BaseEntity）、`core/user.ts`、`services/userService.ts`（登录框架契约）、`repositories/userRepository.ts`、`app.ts` 全局状态、`config/features.ts`（管理员入口/激励广告预留，§5）
- `scripts/`、`docs/archive/` 目录；ADR-004（目录调和，方案乙）

### Added - 2026-07-19（云环境接入）

- 真实云开发环境 ID `cloud1-d8g6b7jctd1a3be1c` 接入 `config/cloud.ts`（替换占位值 `todo-cloud-env`）；`pending-decisions` #1 转 🟢
- 一次性云函数 `cloud/functions/initDatabase/`：批量创建 14 个基线集合（幂等可重复，`wx-server-sdk` v4）；ESLint 增加云函数 Node 环境适配

### Changed - 2026-07-19

- 目录调和（ADR-004）：`cloudfunctions/` → `cloud/functions/`（`project.config.json` 的 `cloudfunctionRoot` 同步更新）；`DEVELOPMENT_BASELINE_SPEC.md` §2 修订（不建 `packages/`，职责映射见 ADR-004）
- commitlint：关闭 `body-max-line-length`（CJK 文本无自然换行点，100 字符行宽对中文误伤率高）

### Added - 2026-07-19（Phase 1：工程基座）

- 工程初始化：Git 仓库（main）、package.json、TS strict（含 `noUncheckedIndexedAccess`）、ESLint flat config（禁 any）、Prettier、EditorConfig
- 提交规范：husky + lint-staged + commitlint（Conventional Commits，body 五要素见 `docs/guides/git-workflow.md`）
- CI：GitHub Actions（lint / typecheck / test / format:check）
- 小程序骨架：`project.config.json`（AppID wxa72b355ef8b198eb，原生 TS 编译）、`app.ts/json/wxss`、`sitemap.json`
- 分层目录基线：`core/ subjects/ pages/ components/ services/ repositories/ config/ utils/`，每层含 README 规范
- `typings/`、`tests/` 占位（含 Vitest 冒烟测试）
- docs 体系：architecture×4、ADR×3（原生+TS / 云开发 / 单仓库）、pending-decisions、guides×3

### Notes

- 无业务逻辑实现（Baseline Spec §1 红线）；数据库无实际集合创建（待真实云环境 ID，pending #1）
