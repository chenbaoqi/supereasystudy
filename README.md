# SuperEasy Learning（超easy学习）

基于微信小程序的游戏化学习平台。V1 聚焦英语学习，演进目标为 Learning OS（Specification 第二章）。

## 文档阅读顺序（优先级递减）

1. [`docs/OPENCODE_RULES.md`](docs/OPENCODE_RULES.md) — 开发宪法（最高优先级）
2. [`docs/SuperEasy-Learning-Specification.md`](docs/SuperEasy-Learning-Specification.md) — 产品唯一依据（SSOT）
3. [`docs/DEVELOPMENT_BASELINE_SPEC.md`](docs/DEVELOPMENT_BASELINE_SPEC.md) — 开发基线规范（Mandatory）
4. [`docs/architecture/overview.md`](docs/architecture/overview.md) — 工程架构总览
5. [`docs/guides/development.md`](docs/guides/development.md) — 环境搭建与常用命令
6. [`docs/decisions/pending-decisions.md`](docs/decisions/pending-decisions.md) — 待决事项（阻塞清单）

## 快速开始

```bash
npm install          # 安装工具链（Node ≥ 20）
```

然后用微信开发者工具导入本目录即可（AppID 已配置）。
详见 [`docs/guides/development.md`](docs/guides/development.md)。

## 质量命令

```bash
npm run lint         # ESLint
npm run typecheck    # TS 严格检查
npm run test         # Vitest
```

## 当前状态

**Phase 1 完成 ✅ ｜ Phase 2/3 多章已实现（至 Chapter 15），云链路已联调通过（2026-08-27 用户验证）**

- ✅ 工程基座（TS strict / ESLint 禁 any / CI / 提交规范）
- ✅ 学习闭环「登录→学科→路径→教材→册次→章节→学习详情→测试→结果」全链路代码
- ✅ 首页 Dashboard + 学习 tab「我的课程」+ 练习/我的 Tab 页（2026-08-27 补完 `practice`/`mine`）
- ✅ 5 款游戏（消消乐/极速选择/听音找词/小蜜蜂/语法闯关）+ 配置驱动的游戏中心（`config/games.ts`）+ 复习/收藏/统计
- ✅ 云环境接入（AppID `wxa72b355ef8b198eb`）+ 17 集合基线 + 7 个云函数（login / seedDatabase / initDatabase / seedBanners / resetAndImport / unzipPronunciations / updateUserPreferences）+ 单元测试
- ✅ 云链路联调通过：AppID / 函数部署 / 数据集 / 功能点击均验证 OK
- ✅ 真实教材数据已导入（方向 B 完成，2026-08-27）：CSV→`resetAndImport`→数据库，音频上云

后续：阅读题二期（方向 C 扩展）→ Phase 4 AI 与商业化。
