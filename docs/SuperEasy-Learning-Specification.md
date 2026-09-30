# SuperEasy Learning Specification（产品规格说明书）

> 原《SuperEasy Learning Design Bible》，2026-07-19 起统一更名为 SuperEasy-Learning-Specification.md，仍为项目唯一 SSOT。

> Single Source of Truth (SSOT)

Version: 1.0.0 (Draft) Status: In Progress

---

# 前言

本文档是 **SuperEasy Learning（超easy学习）** 唯一产品设计文档。

所有开发、设计、AI（OpenCode、Claude Code、Cursor
等）均以本文件为唯一依据。

旧版 PRD、数据库、架构等文档，在本文件完成后统一归档，不再作为开发依据。

---

# 目录

1.  产品愿景
2.  产品定位
3.  用户体系
4.  学习体系
5.  游戏化学习体系
6.  记忆体系
7.  考核体系
8.  复习体系
9.  教材与内容体系
10. 后台管理
11. 商业化体系
12. UI/UX 规范
13. 数据模型
14. 技术架构
15. 开发规范
16. Roadmap

---

# 第一章 产品愿景

打造一款让用户愿意每天主动打开的游戏化学习平台。

目标不是「背单词」，而是帮助用户形成长期学习习惯。

核心理念：

学习 → 理解 → 游戏练习 → 考核 → 复习 → 长期记忆

---

# 第二章 产品定位

## V1

- 微信小程序
- 英语学习
- 教材同步
- 游戏化练习
- 自动复习
- 激励广告变现

## V2

- AI 学习助手
- 多学科
- 学习排行榜
- 勋章系统

## V3

Learning OS（学习操作系统）

---

# 第三章 用户体系（草案）

角色：

- 游客
- 登录用户
- VIP（预留）
- 管理员

登录方式：

- 微信登录

学习数据云端同步。

---

# 第四章 学习体系（草案）

学习路径：

教材 → 章节 → 知识点 → 学习 → 练习 → 测试 → 复习

知识卡字段：

- 单词
- 音标
- 真人发音
- 词性
- 中文释义
- 常见搭配
- 英文例句
- 中文翻译
- 收藏
- 重点词
- 记忆法

支持：

- 默认教材学习
- 自定义每日数量
- 指定章节学习

---

# 第五章 游戏化学习体系（草案）

Memory Challenge：

- 消消乐
- 翻牌配对
- 打地鼠
- 极速选择
- 拼单词
- 听音找词
- 看图猜词
- 中译英
- 英译中
- Boss 挑战

每个小游戏均采用统一评分体系，便于未来扩展。

---

# 后续章节

将在下一版本继续补充：

- 完整记忆系统
- 艾宾浩斯算法
- 后台设计
- 工程架构
- 商业化
- AI 学习助手
- API 规范
- 异常流程
- 页面状态
- V1/V2/V3 Roadmap

> 注：第十二章（UI/UX 规范）与第十三章（数据模型）已于 2026-07-19 补充，
> 并经 Owner 逐项确认（Q1-Q7），**已正式冻结**。

---

# 第十二章 UI/UX 规范（v1 冻结于 2026-07-19；v2 视觉体系 2026-09-13，见 ADR-013）

> 来源：Chapter 04/05 已实现界面 + Owner 已决事项（2026-07-19）。
> 原则：本章只冻结「已实现的现实」与「已确认的决策」，新增内容必须经 Owner 确认。
> **v2 修订（2026-09-13）**：§12.2 令牌表已按 Owner 选定的「清爽蓝」更新；
> §12.1 的两条硬约束（纵向列表、文案中文）与 §12.5 首页区块顺序**未变**；
> §12.3 状态规范**未变**。设计决策全文见 `docs/decisions/ADR-013-ui-v1-design-system.md`。

## 12.1 设计原则

- UI 从简优先（Chapter 04 §15）：V1 采用简洁列表风格，正式视觉体系后续版本细化
- 统一风格、可用性优先、不随意增加动画、不随意修改交互流程（RULES §8）
- **界面文案一律中文**（Owner 2026-07-19：Coming Soon →「敬请期待」）
- **纵向列表布局**（Owner 2026-07-19 确认，替代九宫格）
- **视觉体系 v2 已落地（2026-09-13，ADR-013）**：「UI 从简」的占位下限由
  `miniprogram/styles/tokens.wxss`（令牌）+ `miniprogram/styles/components.wxss`（通用组件）
  取代——色值、字号、间距、圆角自此有单一来源，页面不得再就地硬编码色值。

## 12.2 设计令牌（v1.1 淡色版，2026-09-13；实现见 `miniprogram/styles/tokens.wxss`）

> v1.1 修订缘由：Owner 反馈「配色再淡一点，不伤眼睛最好」。**大面积底色全部淡化，
> 但需要被读取的文字/数字/按钮对比度反而提高一档**——淡色不等于低对比，低对比才伤眼。
> 决策全文见 `docs/decisions/ADR-013-ui-v1-design-system.md` §5。

| 令牌             | v1.1 值                                                                    | v1（2026-07-19）  | 用途                                            |
| ---------------- | -------------------------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| 主色（视觉）     | `#5a85e0`（`--brand-500`）                                                 | `#07c160`         | 图标、chip 文字、TabBar 选中概念                |
| 主色（承载白字） | `#3f6bc4`（`--brand-600`）                                                 | —                 | 实心按钮、强调数字（白字对比度约 4.8:1）        |
| 深档强调         | `#2f5296`（`--brand-700`）                                                 | —                 | 淡底上的大数字（如首页统计）                    |
| 品牌色阶         | `--brand-50/100/200/300/400/500/600/700`                                   | —（无）           | 浅底、描边、禁用、按压态                        |
| 警示/危险        | `#d99a3c` / `#dd655d`                                                      | `#fa5151`         | 引导提示 / 答错、「不认识」                     |
| 成功             | `#2fa06b`（`--success`）                                                   | —（无独立令牌）   | 答对反馈、已完成状态                            |
| 页面背景         | `#f5f7fa`（`--bg-page`）                                                   | `#f6f7f9`         | 全局 page                                       |
| 卡片背景         | `#ffffff`（`--bg-card`）                                                   | `#ffffff`         | 列表项、知识卡、统计卡                          |
| 主/副文本        | `--ink-1 #2a3444` / `--ink-2 #5d6779`                                      | `#000` / —        | 标题正文 / 副标题（比近黑柔和）                 |
| 辅助文本         | `--ink-3 #9aa3b4`、`--ink-4 #c8ceda`                                       | `#999999`         | 音标、进度、提示、占位、禁用                    |
| 描边             | `--line #eaeff6`                                                           | —（无）           | 行分隔线、卡片描边                              |
| 学习三态         | 未开始 `--ink-3` / 学习中 `--brand-600` / 已完成 `--success`（各带浅色底） | 全为 `#999999`    | 章节状态 chip                                   |
| 学科色           | 英语 `#5a85e0` / 数学 `#dd9d63` / 语文 `#3fb294` / 兜底 `#8b7cd8`          | —（无）           | 学科入口图标底色（映射见 `config/subjects.ts`） |
| 圆角             | `--r-sm 12rpx` / `--r-md 20rpx` / `--r-lg 28rpx` / `--r-pill 999rpx`       | `16rpx`           | 卡片、chip、按钮                                |
| 间距             | `--sp-1…6` = 8/12/16/24/32/48rpx；页边距 `--gutter 24rpx`                  | `20-40rpx 30rpx`  | 统一节奏                                        |
| 字号             | `22/24/28/30/34/40/52rpx` 七级                                             | 24/28/30/34/48rpx | 辅助→正文→标题→大数字                           |
| 阴影             | `--shadow-card` / `--shadow-float` / `--shadow-brand`（v1.1 各削弱一档）   | —（无）           | 卡片、浮层、主按钮                              |
| 头部渐变         | `--grad-hero` = `linear-gradient(180deg,#eaf2fe,#dde9fb)`                  | —（无）           | **页面头部专用**（极淡蓝 + 深色文字）           |
| 按钮渐变         | `--grad-brand` = `linear-gradient(180deg,#5a85e0,#3f6bc4)`                 | —（无）           | **仅实心按钮/强调块**（需要承载白字）           |
| 导航栏           | 白底黑字                                                                   | 白底黑字          | `app.json` window（常驻元素，深色底最累眼）     |

> 两个渐变必须分开用：**头部一律 `--grad-hero`，只有需要白字对比度的按钮用 `--grad-brand`。**
> 取 `180deg`（自上而下）是为了让头部顶边与导航栏衔接自然，不出现横向接缝。

## 12.3 通用状态规范（Chapter 04 §8 / Chapter 05 §7 冻结）

| 状态        | 文案/行为                                                 |
| ----------- | --------------------------------------------------------- |
| 加载中      | 「加载中…」                                               |
| 无网络/失败 | 「加载失败，请检查网络」+「重试」按钮                     |
| 无数据      | 「暂无数据」（复习页专用：「今天没有待复习内容」）        |
| 字段缺失    | 隐藏对应区块（音标/例句/翻译/发音按钮，有则显示无则隐藏） |
| 未上线功能  | 标签「敬请期待」，点击进敬请期待页                        |

## 12.4 页面清单与状态（v1 冻结时为 18 页，现 28 页；下表列出全部路由，标 ★ 的为本轮 UI v1.1 重做）

| 页面     | 路由                              | 状态      | 说明                                                         |
| -------- | --------------------------------- | --------- | ------------------------------------------------------------ |
| 首页     | pages/home/home                   | ✅ 已实现 | Chapter 06；UI v2 重做（见 12.5）                            |
| 学习     | pages/study/study                 | ✅ 已实现 | TabBar；Chapter 14 §4 课程统一视图；UI v2 重做               |
| 练习     | pages/practice/practice           | ✅ 已实现 | TabBar；游戏入口（落到章节再选游戏）；UI v2 重做             |
| 我的     | pages/mine/mine                   | ✅ 已实现 | TabBar，含管理员入口预留；UI v2 重做                         |
| AI 辅导  | pages/ai-tutor/ai-tutor           | ✅ 已实现 | **2026-09-13 新增**（第三十八章）；页面契约见 ADR-014        |
| 登录     | pages/login/login                 | ✅ 已实现 | Chapter 04                                                   |
| 学科     | pages/subject/subject             | ✅ 已实现 | 纵向列表                                                     |
| 学习路径 | pages/learning-path/learning-path | ✅ 已实现 | —                                                            |
| 教材     | pages/textbook/textbook           | ✅ 已实现 | —                                                            |
| 册次     | pages/semester/semester           | ✅ 已实现 | —                                                            |
| 章节     | pages/chapter/chapter             | ✅ 已实现 | 三态显示                                                     |
| 学习详情 | pages/study-detail/study-detail   | ✅ 已实现 | 知识卡                                                       |
| 测试     | pages/test/test                   | ✅ 已实现 | 答对自动跳题（Owner 2026-07-19）                             |
| 测试结果 | pages/test-result/test-result     | ✅ 已实现 | —                                                            |
| 复习     | pages/review/review               | ✅ 已实现 | Chapter 05                                                   |
| 复习详情 | pages/review-detail/review-detail | ✅ 已实现 | Chapter 05                                                   |
| 收藏     | pages/favorite/favorite           | ✅ 已实现 | Chapter 06（2026-08-27 落地，见 12.5）                       |
| 设置     | pages/settings/settings           | ✅ 已实现 | V1 于 2026-09-14 定义：年级（可手动指定）+ 恢复默认，见 12.5 |
| 敬请期待 | pages/coming-soon/coming-soon     | ✅ 已实现 | 统一落地页                                                   |

## 12.5 Chapter 06 页面 UI（已定稿，2026-07-19 Owner 确认 Q5/Q6/Q7）

### 首页 Dashboard（pages/home/home，自上而下）

1. **Banner 轮播**：顶部 swiper（数据源：banners 集合；无数据则隐藏本区块）
2. **学习统计条**：今日复习知识点 / 连续学习天数
   （V1 不追踪学习时长，Q1 确认方案 C；「今日新学知识点」精确口径待 daily_stats）
3. **最近学习**：最近学习章节卡片（learning_records 按 updatedAt 倒序取前 3），点击续学
4. **学科入口**：纵向列表（复用列表页模式）

> **UI v2（2026-09-13）**：以上 1-4 的**顺序与信息项均未变**，只升级了视觉——
> 统计条做成蓝色渐变卡（含问候语与「继续上次学习 / 开始学习」主按钮），
> 学科入口的每行加了学科色圆形图标、副标题（如「单词 · 语法」）与状态 chip。
> 另在统计条下方新增「教材偏好引导条」（Chapter 14 §4 要求，未设偏好时才出现）。
> 静态预览见 `docs/design/ui-v1-preview.html`。

### 学习 / 练习 / 我的（UI v2）

- **学习**：蓝色头部显示「当前教材 · 册次」+「切换教材」胶囊；下方为按学科动态渲染的分区卡
  （英语=单词/语法，数学=概念/公式），默认收起，展开后是章节行。
  章节行状态为彩色 chip：未开始（灰）/ 学习中（蓝）/ 已完成（绿）。
- **练习**：同一套头部与章节行，只保留「挑战」入口，隐藏「测试」按钮。
- **我的**：蓝色头部（头像 + 当前教材）+ 带图标与副标题的功能行（教材选择 / 我的收藏 /
  学习统计 / 设置 / 管理员预留）。

### 收藏页（pages/favorite/favorite）

- 收藏列表：单词 + 释义，按收藏时间倒序（favorites join knowledge）
- 空状态：「暂无数据」
- 点击行为：**进入该知识点所属章节的学习详情**（Q5 确认方案 A）

### 学习统计页（pages/statistics/statistics，已定稿）

- 位置：独立页面，入口在「我的」tab（Q6 确认）
- 指标：今日复习知识点 / 今日学习章节 / 累计知识点 / 连续学习天数
  （测试正确率暂缓：practice_records 暂不启用，Q4 确认）

### 设置页（pages/settings/settings，V1：2026-09-14 定义）

> 原为「占位 · 待定义」。V1 只定义有明确痛点的两项，其余（提醒 / 音效 / 隐私）等需求明确后再加。

1. **当前教材**：展示教材 + 册次，点击进入换教材流程（与「我的」页同一入口）
2. **年级**：展示**生效值 + 来源**（跟随册次 / 手动指定），可手动指定 1-9 年级
   - **手动年级优先级高于册次推导**。原因：年级原本只能由册次名解析（`gradeOfSemester`），
     专题册次叫「全册」或命名不规范时解析不出 → 学习/测试整片不过滤，超纲内容照样出现
     （2026-09-13 用户反馈的根因之一，见 ADR-012）
   - 只存本机：`wx.setStorageSync('manualGrade')`。这是「这台设备的使用者读几年级」，
     不是账号级数据（客户端能做的绝不上云），换设备重选一次即可
   - 脏值（0 / 负数 / NaN）一律当没设，防止把内容整片清空
3. **版本**：`wx.getAccountInfoSync()` 读取（开发版显示 develop / trial）
4. **恢复默认设置**：清除本机的学科与年级偏好，**云端学习记录不受影响**（弹窗须写明，否则没人敢点）

**年级生效口径**（`services/gradeScope.ts`）：手动年级 → 册次推导 → `null`（不过滤，宁可多显示）。

---

# 第十三章 数据模型（v1 已冻结，2026-07-19 Owner 确认）

## 13.0 总则

- 集合名称锁定，禁止修改；只允许新增字段；新增字段必须注明依据（Baseline Spec §4 / RULES §7）
- 时间字段一律由云端 `serverDate()` 写入
- 枚举值集中在 `miniprogram/core/` 定义，禁止散落

## 13.1 已冻结集合（10 个，Chapter 04/05 + ADR-005 已落地）

### users

| 字段   | 类型   | 说明                             |
| ------ | ------ | -------------------------------- |
| openid | string | 微信登录标识（login 云函数写入） |

### subjects

| 字段  | 类型    | 说明                         |
| ----- | ------- | ---------------------------- |
| name  | string  | 学科名                       |
| open  | boolean | 是否上线（false → 敬请期待） |
| order | number  | 排序                         |

### learning_paths

| 字段      | 类型    | 说明     |
| --------- | ------- | -------- |
| subjectId | string  | 所属学科 |
| name      | string  | 路径名   |
| open      | boolean | 是否开放 |
| order     | number  | 排序     |

### textbooks

| 字段           | 类型   | 说明         |
| -------------- | ------ | ------------ |
| learningPathId | string | 所属学习路径 |
| name           | string | 教材名       |
| order          | number | 排序         |

### semesters

| 字段       | 类型   | 说明     |
| ---------- | ------ | -------- |
| textbookId | string | 所属教材 |
| name       | string | 册次名   |
| order      | number | 排序     |

### chapters

| 字段       | 类型   | 说明     |
| ---------- | ------ | -------- |
| semesterId | string | 所属册次 |
| title      | string | 章节名   |
| order      | number | 排序     |

### knowledge

| 字段           | 类型   | 说明                 |
| -------------- | ------ | -------------------- |
| chapterId      | string | 所属章节             |
| word           | string | 单词                 |
| ipa?           | string | 音标                 |
| pronunciation? | string | 发音音频 URL（预留） |
| meaning        | string | 中文释义             |
| partOfSpeech?  | string | 词性                 |
| example?       | string | 英文例句             |
| translation?   | string | 例句翻译             |
| order          | number | 章内排序             |

### learning_records（每「用户×章节」一条）

| 字段                | 类型   | 说明                                                      |
| ------------------- | ------ | --------------------------------------------------------- |
| userId              | string | 用户                                                      |
| chapterId           | string | 章节                                                      |
| currentKnowledgeId? | string | 当前学习位置                                              |
| progress            | number | 已学知识点数量                                            |
| state               | enum   | NOT_STARTED/LEARNING/COMPLETED/TESTED/REVIEW_DUE/MASTERED |

### review_records（每「用户×知识点」一条，Chapter 05 §5）

| 字段                             | 类型   | 说明                           |
| -------------------------------- | ------ | ------------------------------ |
| userId / knowledgeId / chapterId | string | 关联键                         |
| reviewCount                      | number | 已复习次数                     |
| masteryLevel                     | number | 阶段索引 0-4（1/3/7/15/30 天） |
| lastReviewTime?                  | Date   | 最近复习时间                   |
| nextReviewTime                   | Date   | 下次复习时间                   |
| status                           | enum   | REVIEW_DUE/REVIEWING/MASTERED  |

### favorites（每「用户×知识点」一条，ADR-005）

| 字段        | 类型   | 说明   |
| ----------- | ------ | ------ |
| userId      | string | 用户   |
| knowledgeId | string | 知识点 |

> 全部集合另有基础字段 `_id / createdAt / updatedAt`（BaseEntity）。

## 13.2 未启用集合字段（已定稿，2026-07-19 Owner 确认 Q3/Q4）

### stages（学段，预留）

`{ name: string, order: number }`（如：小学/初中/高中）

### grades（年级，预留）

`{ stageId: string, name: string, order: number }`

### banners（首页 Banner，Chapter 06 启用）

`{ imageUrl: string, title?: string, linkUrl?: string, order: number, open: boolean }`
图片存储：**云存储**（经云控制台/CMS 上传）

### notices（公告）

`{ title: string, content?: string, order: number, open: boolean, publishedAt?: Date }`

### practice_records（练习记录）

**暂缓启用**（Chapter 04 测试结果不入库的现状维持；
若学习统计需要正确率指标，再定义字段并回填）

## 13.3 Chapter 06 统计口径（已定稿，2026-07-19 Owner 确认 Q1/Q2）

### 学习时长

**方案 C（已确认）**：V1 不追踪时长，统计条只显示「今日复习知识点 + 连续天数」。
（「今日新学知识点」精确口径需 daily 粒度集合，后续单独立项）

### 连续学习天数

**方案 A（已确认）**：实时计算（learning_records.updatedAt 与 review_records.lastReviewTime
按日期去重，从今日/昨日向前连续计数），无新增字段。
