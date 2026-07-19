# 工程架构总览

> 产品依据：`../SuperEasy-Learning-Design-Bible.md`（SSOT）
> 行为准则：`../OPENCODE_RULES.md`（优先级最高）

## 1. 产品定位对工程的要求

| Bible 要求                 | 工程对策                                            |
| -------------------------- | --------------------------------------------------- |
| V1 微信小程序 + 英语学习   | 原生小程序 + TS（ADR-001），`subjects/english` 插件 |
| V2 多学科、排行榜、勋章    | Subject Plugin 体系，学科零硬编码                   |
| V3 Learning OS             | `core/` 领域抽象层，一切皆是 Knowledge              |
| 游戏化（Memory Challenge） | 统一 Game 接口 + 统一评分体系（扩展点预留）         |
| 激励广告变现               | 配置化广告位（`config/`，接口预留）                 |

## 2. 仓库全景

```
supereasystudy/
├── docs/                # SSOT 文档区（RULES + Bible + 架构 + ADR + 指南）
├── miniprogram/         # 微信小程序端（原生 + TypeScript）
│   ├── core/            #   领域抽象（接口/类型，零实现，零运行时依赖）
│   ├── subjects/        #   学科插件（V1: english）
│   ├── pages/           #   页面层（薄）
│   ├── components/      #   通用展示组件
│   ├── services/        #   业务逻辑层（纯 TS，可单测）
│   ├── repositories/    #   数据访问层（唯一 wx.cloud 封装点）
│   ├── config/          #   配置（学科/学习路径/功能开关）
│   └── utils/           #   纯函数工具
├── cloudfunctions/      # 微信云函数（每个函数独立 package.json）
├── tests/               # 单元测试（Vitest）
├── typings/             # 项目级全局类型
└── .github/workflows/   # CI：lint + typecheck + test + format
```

## 3. 分层调用（RULES §6，不可违背）

```
Page → Service → Repository → Cloud（云函数 / 云数据库 / 云存储）
```

- 只允许**逐层向下**调用，禁止跨层、禁止反向依赖
- 依赖方向：`pages → services → repositories → core`（`core` 不依赖任何人）
- 详见 `layering.md`

## 4. 文档地图

| 文档                                  | 内容                             |
| ------------------------------------- | -------------------------------- |
| `architecture/overview.md`            | 本文：工程全景                   |
| `architecture/directory-structure.md` | 目录结构基线（修改需 ADR）       |
| `architecture/layering.md`            | 分层规范细则                     |
| `architecture/subject-plugin.md`      | 学科插件体系设计                 |
| `decisions/`                          | ADR 决策记录 + 待决事项          |
| `guides/`                             | 开发环境、编码规范、Git 提交规范 |
