# ADR-009：教材偏好按学科维度存储

- 日期：2026-09-08
- 状态：已实施（Owner 在方案 A/B 中选择 B）
- 影响集合：`users`（新增可选字段，不删改已有字段）

## 背景

数学学科导入完成后，首页「数学」入口正常显示（不再是"敬请期待"），但点击进去仍然展示英语内容。

排查结论：**不是数据问题**。`data.js` 中数学 `open:true`、学习路径 `知识点/公式`、人教版覆盖 1–9 年级共 367 条知识，云端导入 1581 条全部正确。

真正原因在路由层：

1. `pages/home/home.ts` 的 `onTapSubject`：只要 `userService.getPreferences()` 存在（用户此前选过英语教材），点击**任何**学科卡都执行 `wx.switchTab('/pages/study/study')`，`subjectId` 被丢弃。
2. `pages/study/study.ts`：只从 `preferences.semesterId` 反查学科，恒为英语。

该"已设偏好 → 直达学习页"的捷径当初为消除 Owner 反馈的"选过教材还要再选"而加，未考虑第二个学科。

## 关键约束

`wx.switchTab` **不支持 URL 参数**，学习 tab 无法通过 query 得知"用户点的是哪个学科"，必须借助额外状态传递。

## 决策

教材偏好由「全局单科」升级为「按学科维度」，并引入「当前学科」概念。

### 数据（只增不删，遵守 §7）

`users` 文档新增可选字段：

```ts
preferencesBySubject?: Readonly<Record<string, UserPreferences>>; // key = subjectId
```

旧字段 `preferences` **保留**，语义收敛为「最近一次选择 / 未传学科时的兼容回退」。

### 传递机制

「当前学科」用 `wx.setStorageSync('currentSubjectId')` 同步读写。

- 同步是硬要求：跳转前必须写完，异步会读到旧值。
- 读写均 try/catch 兜底，存储异常降级为空串，不阻断跳转。

### 调用约定

- `getPreferences()`（无参）→ 旧字段，向后兼容既有调用点。
- `getPreferences(subjectId)` → 该学科册次；**未选过返回 `null`，不回退**（这是"点数学不会误命中英语"的关键）。
- `savePreferences(prefs, subjectId?)` → 云端在既有文档上 merge，其它学科的册次不受影响。

页面取值统一为：按当前学科取 → 取不到回退旧字段 → 都没有则显示引导卡。

## 影响面

| 文件                                                                                       | 变更                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `core/user.ts`                                                                             | 新增 `PreferencesBySubject` 类型 + `preferencesBySubject?` 字段                                   |
| `repositories/userRepository.ts`                                                           | `updatePreferences` 增加可选 `subjectId` 入参                                                     |
| `cloud/functions/updateUserPreferences/index.js`                                           | 带 `subjectId` 时并入 `preferencesBySubject`                                                      |
| `services/userService.ts`                                                                  | `getPreferences(subjectId?)` / `savePreferences(prefs, subjectId?)` / `get·setCurrentSubjectId()` |
| `pages/home/home.ts`                                                                       | 按点击的学科分别判断，不再一刀切                                                                  |
| `pages/subject/subject.ts`                                                                 | onLoad 记住学科                                                                                   |
| `pages/semester/semester.ts`                                                               | 由册次反查学科后分科保存                                                                          |
| `pages/study/study.ts`                                                                     | 按当前学科取偏好；自愈保存带学科；学科以册次实际归属为准回写                                      |
| `pages/practice/practice.ts`、`pages/mine/mine.ts`、`pages/learning-path/learning-path.ts` | 同样按当前学科取偏好                                                                              |

顺带修复：`services/grammarPackService.ts` 中 `stage === 'senior'` 时学段标签为空串，拼出的教材名永远匹配不上（高中数据接入后必然踩坑），改为完整 `STAGE_LABEL` 映射。

## 验收

- `tsc --noEmit` 通过
- `eslint miniprogram/ tests/` 通过（仓库剩余 11 条报错为 `scripts/inject_pronunciation.js` 与 `unzipPronunciations` 的历史遗留，本次未动）
- `vitest run` 209 passed（19 文件），新增 `tests/userService.test.ts` 12 用例

## 部署注意

**`updateUserPreferences` 云函数必须重新「上传并部署」**，否则新字段不会写入，分科偏好不生效。
