# SuperEasy Learning（超easy学习）

基于微信小程序的游戏化学习平台。V1 聚焦英语学习，演进目标为 Learning OS（Bible 第二章）。

## 文档阅读顺序（优先级递减）

1. [`docs/OPENCODE_RULES.md`](docs/OPENCODE_RULES.md) — 开发宪法（最高优先级）
2. [`docs/SuperEasy-Learning-Design-Bible.md`](docs/SuperEasy-Learning-Design-Bible.md) — 产品唯一依据（SSOT）
3. [`docs/architecture/overview.md`](docs/architecture/overview.md) — 工程架构总览
4. [`docs/guides/development.md`](docs/guides/development.md) — 环境搭建与常用命令
5. [`docs/decisions/pending-decisions.md`](docs/decisions/pending-decisions.md) — 待决事项（阻塞清单）

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

**Phase 1：工程基座**（无业务代码、无页面、无数据库）。
后续阶段见 `docs/decisions/pending-decisions.md` 的阻塞项解除情况。
