# ADR-007：新增 reading_passages 集合

- 状态：**已决策**（2026-07-30，Owner 按推荐批准，Chapter 13 Q3）

## 背景

Chapter 13 单元测试四维化需要「阅读理解」题型。短文不属于 Knowledge
（知识点是原子学习单位，短文是测评素材），词表/语法集合均无法承载。

## 决策

新增第 17 个集合 `reading_passages`：

```
{ chapterId, title, content, questions: [{ stem, options: string[4], answerIndex }] }
```

- 权限：所有用户可读，仅创建者可写（与其他内容集合一致）
- 内容来源：AI 骨架 + 教师校对（同词汇/语法流程），按单元（chapterId）挂载
- 已同步 `cloud/database/collections.json` 与 `initDatabase`

## 后果

- 集合数 16 → 17；二期阅读题按配比（1 篇 2 题/卷）入卷
