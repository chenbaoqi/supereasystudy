# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### Added - 2026-07-18（Phase 1：工程基座）

- 工程初始化：Git 仓库（main）、package.json、TS strict（含 `noUncheckedIndexedAccess`）、ESLint flat config（禁 any）、Prettier、EditorConfig
- 提交规范：husky + lint-staged + commitlint（Conventional Commits，body 五要素见 `docs/guides/git-workflow.md`）
- CI：GitHub Actions（lint / typecheck / test / format:check）
- 小程序骨架：`project.config.json`（AppID wxa72b355ef8b198eb，原生 TS 编译）、`app.ts/json/wxss`、`sitemap.json`
- 分层目录基线：`core/ subjects/ pages/ components/ services/ repositories/ config/ utils/`，每层含 README 规范
- `cloudfunctions/`、`typings/`、`tests/` 占位（含 Vitest 冒烟测试）
- docs 体系：architecture×4、ADR×3（原生+TS / 云开发 / 单仓库）、pending-decisions、guides×3

### Notes

- 无业务代码、无页面、无数据库变更（Phase 1 范围限定）
- 数据库结构等待 Design Bible 第 13 章（见 `docs/decisions/pending-decisions.md`）
