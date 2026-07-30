# CHAPTER-13-UNIT-TEST

Version: 1.0 Status: Approved Priority: P0 Phase: Phase 2（测评升级）

> 2026-07-30 Owner 确认（一期先行，Q1-Q5 全部按推荐）：
> 单元测试升级为四维综合测评——听力/单词/语法/阅读，全部选择题形式。

## 1. Goal

单元测试从「单词小测」升级为「综合测评卷」：
听力理解 + 词汇运用 + 语法知识 + 阅读理解，统一选择题。

## 2. Scope 与分期

**一期（现有数据）**：听力 2 + 单词 8 = 10 题（语法/阅读位由单词题填充）
**二期（数据就绪）**：听力 2 + 单词 4 + 语法 2 + 阅读 1 篇（2 题）= 10 题（Q1 定稿）

不包含：填空/拼写/口语评测；试卷难度分级（后续）。

## 3. 试卷规则

- 试卷固定 10 题；构成按 `config/testPaper.ts` 阶段化配置（Q1，可调）
- 出题顺序：听力部分在前，单词/语法/阅读随后（Section 化展示题型标签）
- 听力题（Q4）：TTS 自动播放单词（可重播），题干为发音，选项为中文释义
- 单词题：word → meaning 四选一（既有引擎）
- 语法题（二期）：语法 Knowledge 内嵌 `quiz` 字段（Q2：题干+4 选项+答案下标，AI 骨架待校对）
- 阅读题（二期）：`reading_passages` 集合（Q3/ADR-007：chapterId/title/content/questions[]，AI 骨架待校对）
- 交卷：正确率/用时（既有结果页）；状态机 REVIEW_DUE（既有）；语法点不进单词题（与 Chapter 12 §7 修订一致）

## 4. Data（二期字段预告）

- `knowledge.quiz?: { stem: string; options: string[]; answerIndex: number }[]`（type='grammar' 时；字段只增不改，RULES §7）
- `reading_passages`（ADR-007 特批第 17 集合）：`{ chapterId, title, content, questions: [{ stem, options, answerIndex }] }`

## 5. Acceptance

一期：

1. 测试页出现「听力题」Section（自动播放发音，可重播）
2. 试卷 = 听力 2 + 单词 8，题型标签正确
3. 交卷出正确率/用时；状态 REVIEW_DUE
4. 语法章节测试页显示「暂无题目」（语法点不进单词题）

二期：5. 语法题与阅读篇按配比入卷

## 6. Principle

测评是学习闭环的收口，数据边界清晰：
听力/单词用现有资产，语法/阅读先骨架后转正，不臆造正式数据。
