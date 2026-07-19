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

**Phase 1 完成 ✅ ｜ Phase 2 学习链路切片已实现（Chapter 04，待云端部署联调）**

- ✅ 工程基座（TS strict / ESLint / CI / 提交规范）
- ✅ 学习闭环「登录→学科→路径→教材→册次→章节→学习详情→测试→结果」全链路代码
- ✅ 云环境接入 + 15 集合基线 + login / seedDatabase 云函数 + 单元测试 ×13
- ⏳ 待云端部署 login / seedDatabase 并联调验收（Chapter 04 §14 八条）

后续：Phase 2 余量（favorite/review 真实页）→ Phase 3 游戏玩法 → Phase 4 AI 与商业化。
