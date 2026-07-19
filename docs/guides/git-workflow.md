# Git 提交规范

## 1. 提交信息格式（commitlint 强制）

Conventional Commits：

```
<type>(<scope>): <subject>

<body>
```

**type**：`feat` 新功能 / `fix` 修复 / `docs` 文档 / `refactor` 重构 / `test` 测试 / `chore` 工程杂项 / `perf` 性能

**scope**（可选）：`miniprogram` / `core` / `subjects` / `cloud` / `docs` / `ci` …

## 2. body 必须包含（宪章「Git Commit」五条）

```
- 新增内容: ...
- 修改内容: ...
- 影响模块: ...
- 数据库变更: 无 / 有（说明集合与字段，并注明 Specification 依据）
- API 变更: 无 / 有
```

示例：

```
feat(subjects): 新增英语插件骨架

- 新增内容: subjects/english 目录与插件注册
- 修改内容: config/subjects.ts 增加英语条目
- 影响模块: 首页学科九宫格
- 数据库变更: 无
- API 变更: 无
```

## 3. 分支

- `main`：永远可运行，CI 全绿
- 功能分支：`feat/<主题>` / `fix/<主题>`，完成后合回 main

## 4. 提交前自检（RULES §10 质量清单）

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 无错误
- [ ] `npm run test` 通过
- [ ] 无 any、无重复代码、无未使用代码
- [ ] 文档已同步（docs / README / CHANGELOG）
- [ ] 页面在开发者工具可运行
