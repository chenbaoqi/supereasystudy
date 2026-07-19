# 学科插件体系（Subject Plugin）

> 依据：宪章「Everything is Knowledge」「禁止 if(subject==...)」；Specification 第二章（V2 多学科）。

## 1. 设计目标

- V1 只有英语，但**任何代码不得假设只有英语**
- V2 新增数学 = 新增 `subjects/math/` 目录 + 在 `config/` 注册，**已有代码零改动**

## 2. 核心概念（契约草案，最终以 Specification 第 13/14 章为准）

```
SubjectPlugin（学科插件）
  ├── meta          学科元信息：id、名称、图标、上线状态
  ├── knowledgeType 该学科 Knowledge 的字段扩展（英语=单词卡，数学=公式…）
  ├── templates     学习模板：决定 学习→练习→测试→复习 的页面流
  └── gameAdapters  Memory Challenge 小游戏的数据适配器
```

- **Knowledge**：一切学习内容的统一抽象。学科差异是 Knowledge 的 **type 参数**，不是新系统
- **LearningTemplate**：学习流程由模板驱动，不是代码写死（Template First）
- **统一评分**：每个小游戏实现统一 Game 接口，学科只提供数据（Specification 第五章「统一评分体系」）

## 3. 装配机制

```
config/subjects.ts（纯数据配置）
        │  注册
        ▼
subjects/english/  subjects/math/ …（插件实现 core 契约）
        │
        ▼
pages/ 通过 PluginRegistry 按 id 取插件 → 渲染对应学习流
```

- 首页九宫格渲染的是 `config` 里的学科列表（含 Coming Soon 状态），**不是 if 出来的**
- 页面通过插件 id 获取模板与数据，不认识任何具体学科

## 4. 红线

| 禁止                         | 替代方案                |
| ---------------------------- | ----------------------- |
| `if (subject === 'english')` | 插件契约的方法/配置     |
| 在公共组件写英语专属样式     | 插件内部组件 + 主题变量 |
| 复制一份英语代码改成数学     | 抽象进 core/ 或公共层   |

## 5. 当前状态

Phase 1：契约代码尚未编写（等 Specification 数据模型章节）。本文仅固化设计意图与红线。
