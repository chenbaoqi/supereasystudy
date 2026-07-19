# 目录结构基线

> **本文是 RULES §3「禁止擅自修改目录结构」的固化基线。**
> 任何目录的新增、改名、删除，必须先提 ADR 获批，并同步更新本文。

## 基线（2026-07-18 确立）

```
supereasystudy/
├── docs/                          # 文档区
│   ├── OPENCODE_RULES.md          #   开发宪法（最高优先级，Owner 维护）
│   ├── SuperEasy-Learning-Design-Bible.md  # 产品 SSOT（Owner 维护）
│   ├── architecture/              #   工程架构文档
│   ├── decisions/                 #   ADR 与待决事项
│   └── guides/                    #   开发指南
├── miniprogram/                   # 小程序端（miniprogramRoot）
│   ├── core/                      #   领域抽象：接口与类型，禁止实现
│   ├── subjects/                  #   学科插件目录
│   ├── pages/                     #   页面层（薄，≤300 行/文件）
│   ├── components/                #   通用组件（≤200 行/文件）
│   ├── services/                  #   业务逻辑（纯 TS）
│   ├── repositories/              #   数据访问（唯一 wx.cloud 封装点）
│   ├── config/                    #   配置（只读数据 + Interface）
│   ├── utils/                     #   纯函数工具
│   ├── app.ts / app.json / app.wxss / sitemap.json
├── cloudfunctions/                # 云函数（每函数独立 package.json）
├── tests/                         # Vitest 单元测试
├── typings/                       # 项目级全局类型
├── .github/workflows/             # CI
├── project.config.json            # 开发者工具配置（含 AppID，勿提交 private 版）
├── package.json / tsconfig.json / eslint.config.mjs / .prettierrc.json
├── commitlint.config.js / .editorconfig / .gitignore
├── README.md / CHANGELOG.md
```

## 各层规则速查

| 目录            | 允许                      | 禁止                                |
| --------------- | ------------------------- | ----------------------------------- |
| `core/`         | interface / type / 常量   | 实现代码、wx API、依赖上层          |
| `subjects/`     | 实现 core 契约的插件      | 被 pages 直接绕过 config 硬编码引用 |
| `pages/`        | 展示、交互、调 Service    | 业务计算、wx.cloud、复杂逻辑        |
| `components/`   | 纯展示组件                | 访问 Service / Repository           |
| `services/`     | 业务逻辑、组合 Repository | wx.cloud、UI API、God Class         |
| `repositories/` | wx.cloud 封装             | 业务判断、泄漏原始 DB 结构          |
| `config/`       | 只读配置 + Interface      | 运行时修改、业务逻辑                |
| `utils/`        | 纯函数                    | 依赖任何上层目录                    |
