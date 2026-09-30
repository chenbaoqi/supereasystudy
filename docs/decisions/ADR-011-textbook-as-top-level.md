# ADR-011：以教材为最顶层选择项

- 日期：2026-09-13
- 状态：已实施
- 触发：Owner 反馈「不是，我们还是要按照教材为先啊，以教材为最顶层选择项，毕竟用户都还是在上学的」

## 背景：原 IA 把内容组织维度当成了导航维度

改之前的三级选择是：

```
学科 → 学习路径（知识点 / 公式）→ 教材（人教版 / 小学公式专题）→ 册次 → 章节
```

问题在于第二级。「知识点 / 公式」是**内容的组织方式**，不是学生选书的维度。
真实用户是在校学生，心智模型是：

> 我上**人教版**、**一年级上册** → 开始学

没有人会说「我在上小学公式专题」。要求用户先回答「你今天要学知识点还是公式」，
等于让他们先理解我们的数据结构，再选自己要的东西——顺序反了。

## 决策

**教材是最顶层选择项**，学习路径这一级对普通用户隐藏。

```
学科 → 教材（人教版）→ 册次（一年级上册）→ 学习
                                          └─ 专题分区由学段自动带出
```

### 专题包怎么办

专题包（小学公式专题 / 初中公式专题）在数据上同样是 `textbooks` 里的文档，
但它不是教材，因此**不进一级入口**。

用户并不会因此失去专题：选完册次后，学习页会按学段
（`grammarPackService.resolveSemesterIdByPath`）自动把对应的专题包
作为「公式 / 语法」分区带出来。也就是说专题从"要用户去选"变成"跟着教材自动给"。

### 判据：用数据里已有的字段，不新增结构

真正的教材带 `curriculumVersion`（人教版）；专题包不带，且名称形如「小学公式专题」。

判据实现为 `isTopicPack()`，**两条独立条件各自成立即判为专题包**：

1. 没有 `curriculumVersion` → 专题包
2. 名称含「专题」 → 专题包（双保险，防将来数据录入给专题包也填了 `curriculumVersion`）

之所以要双保险，是因为 Owner 明确「后面会上很多教材」——数据会持续变多、来源变杂，
判据不能只依赖单一字段的正确性。

| 学科 | 教材（进一级入口） | 专题包（隐藏） |
| --- | --- | --- |
| 数学 | 人教版（18 个册次） | 小学公式专题、初中公式专题 |
| 英语 | 人教版 PEP（13 个册次） | 小学语法专题、初中语法专题 |

兜底：若某学科过滤后一本教材都没有（只有专题），则原样返回全部，避免学科下出现空页。

## 实现

| 文件 | 改动 |
| --- | --- |
| `services/textbookPicker.ts` | **新增**。按学科汇总各 `learning_path` 下的教材，过滤专题包，跨路径合并后排序 |
| `pages/textbook/textbook.ts` | 支持 `subjectId` 入参（新模式）；保留 `learningPathId` 旧入口兼容 |
| `pages/subject/subject.ts` | 已开放学科 → `redirectTo('/pages/textbook/textbook?subjectId=…')`（原为 learning-path） |
| `pages/study/study.ts` `onTapSwitch` | 换教材 → `textbook?subjectId=`（原为 learning-path） |
| `pages/mine/mine.ts` `onTapTextbook` | 同上 |
| `pages/learning-path/learning-path.ts` | **降级为无入口页面，文件保留未删** |

分层遵守 RULES §6：汇总逻辑放在 service（`textbookPicker`），repository 之间不互相依赖。

### 关于 learning-path 页

IA 调整后它不再有任何路由指向（仅剩 `app.json` 注册）。
按「不得删除有效代码」的红线**保留页面未删**，并在文件头注明现状。
若要彻底下线，需同时从 `app.json` 的 `pages` 中移除——本次未做。

## 数据是否需要改动？

**不需要。** 判据用的是已有字段，集合结构与 `data.js` 全部保持原样，无需重新导入。

## 验收

- `tsc --noEmit` ✅
- `eslint miniprogram/ tests/` ✅
- `prettier --check miniprogram tests` ✅
- `vitest run` **234 passed（22 文件）** ✅
  - 新增 `tests/textbookPicker.test.ts`（5 用例：过滤专题、跨路径汇总、排序、空兜底、无路径）

## 补充决策：不做「只有一本教材时自动跳过」

当前数学 / 英语都只有一本教材，理论上可以做「仅一本则自动进册次页」让流程变两步。

**Owner 2026-09-13 明确否决**：「顶层必须是教材，因为后面会上很多教材」。

即教材层是**长期的一级导航**，不是"当前数据刚好只有一项"的临时层级。
因此不做任何按数量跳过的优化，教材层恒定展示。

### 多教材场景已核对的容量

| 环节 | 现状 | 结论 |
| --- | --- | --- |
| `learningPathRepository.listBySubject` | `limit(100)` | 学科下路径远少于 100，够 |
| `textbookRepository.listByLearningPath` | `limit(100)` | 单路径教材数量级为个位数，够 |
| `semesterRepository.listByTextbook` | `limit(100)` | 单教材册次最多 18，够 |
| 列表滚动 | 页面级默认滚动（非 `scroll-view`） | 教材变多可正常滚 |
| 跨教材同名册次 | 偏好存 `textbookId` + `semesterId`，自愈按 `textbookId` 反查 | 不会串到别的版本 |
| 学习页顶部展示 | `{{textbookName}} · {{semesterName}}` | 多版本下能明确区分 |

## 新增教材时的操作清单

1. 在 `data.js` 对应学科的 `learningPaths[].textbooks[]` 里追加，务必带 `curriculumVersion`
2. 跑 `resetAndImport`（upsert 保 id，用户偏好不丢）
3. 前端**无需改代码**：`textbookPicker` 会自动汇总并按 `order` 排序
