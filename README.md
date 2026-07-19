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

**Phase 1 基础工程**（Baseline Spec §8）：

- ✅ 工程基座（TS strict / ESLint / CI / 提交规范）
- ✅ 17 个空页面 + TabBar 路由（Baseline Spec §3）
- ✅ 云开发初始化（真实环境 `cloud1-d8g6b7jctd1a3be1c`）与数据库集合基线（§4）
- ✅ 登录框架 / 全局状态 / 功能开关骨架（接口，无业务逻辑）
- ⏳ 14 个集合待在微信开发者工具云控制台创建（`cloud/database/README.md`）

后续阶段：Phase 2 学习系统 → Phase 3 游戏玩法 → Phase 4 AI 与商业化（不得跨阶段提前开发）。
