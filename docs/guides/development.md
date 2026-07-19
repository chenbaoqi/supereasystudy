# 开发指南

## 1. 环境要求

| 工具           | 版本       | 说明                                                      |
| -------------- | ---------- | --------------------------------------------------------- |
| 微信开发者工具 | 最新稳定版 | 导入本仓库根目录 `supereasystudy/`                        |
| Node.js        | ≥ 20       | 仅用于工程工具链（lint/test），小程序编译由开发者工具完成 |
| npm            | ≥ 10       | 随 Node 自带                                              |

## 2. 首次设置

```bash
npm install        # 安装工具链依赖，并自动安装 husky 钩子
```

然后用微信开发者工具「导入项目」选择本目录（AppID 已写入 `project.config.json`）。

> 当前为 Phase 1 骨架：17 个页面均为 Baseline Spec §3 允许的空占位页（仅路由与布局），
> 业务逻辑自 Phase 2 起按 Specification 逐步实现。

## 3. 常用命令

| 命令                   | 作用                                |
| ---------------------- | ----------------------------------- |
| `npm run lint`         | ESLint 检查（提交前必须通过）       |
| `npm run lint:fix`     | 自动修复可修复项                    |
| `npm run typecheck`    | TS 严格类型检查（不允许有任何错误） |
| `npm run test`         | Vitest 单元测试                     |
| `npm run format`       | Prettier 格式化全部                 |
| `npm run format:check` | 格式校验（CI 用）                   |

提交代码时 husky 自动执行：lint-staged（pre-commit）+ commitlint（commit-msg）。

## 4. 测试约定

- 测试文件放 `tests/`，命名 `xxx.test.ts`
- Service / utils 是纯 TS，必须可单测；Page / Repository 不强求（依赖 wx 运行时）
- 禁止用 `any` 绕过测试中的类型问题

## 5. 文档义务（宪章「文档同步」）

每完成一个模块，同步检查：`docs/`、根 `README.md`、`CHANGELOG.md` 是否需要更新。
