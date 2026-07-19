# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

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
