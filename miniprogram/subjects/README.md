# subjects/ — Subject Plugin 目录

## 职责

每个学科一个子目录，实现 `core/` 定义的 `SubjectPlugin` 契约。

```
subjects/
├── english/      # V1.0 唯一开发的学科（Bible 第二章）
├── math/         # V2（Coming Soon）
└── ...
```

## 规则

- **禁止**在插件目录之外出现 `if (subject === 'english')` / `switch (subject)` 之类的学科判断
- 学科差异（知识卡字段、学习模板、小游戏适配）只能存在于插件内部
- 首页九宫格的学科列表与上线状态来自 `config/` 的配置，**不是硬编码**

## 当前状态

Phase 1：本目录仅有本规范，不包含任何学科实现（包括 english）。
英语插件将在 Bible 数据模型章节（第 13 章）确认后开发。
