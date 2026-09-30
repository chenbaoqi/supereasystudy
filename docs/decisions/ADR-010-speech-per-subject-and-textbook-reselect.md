# ADR-010：语音能力按学科开关 + 教材可重选

- 日期：2026-09-13
- 状态：已实施
- 触发：数学学科上线后 Owner 反馈两个问题
  1. 第一次选了教材之后，再想换另一本教材选不了
  2. 除了语言学科，不需要语音功能

---

## 问题二：语音能力按学科关闭

### 背景

原实现里所有学科共用一套语音链路：学习详情有「🔊 发音」按钮、测试卷固定含 2 道听力题、TTS 通过微信同声传译插件合成。

问题在于 `pronunciationService` 的 TTS **固定 `lang: 'en_US'`**，而数学的 TTS 入参是中文概念名（「1~5的认识」「加法」）。用英文合成器念中文数字只会得到一串无意义音节——噪音大于价值。

另外，原发音按钮的判据是 `current.type !== 'grammar'`，而数学数据在导入时**没有 `type` 字段**（`undefined !== 'grammar'` 为真），所以数学每个知识点都会显示发音按钮。

### 决策

把「是否需要语音」做成**学科能力开关**，而不是在每个页面各写一遍 `if`。

`config/subjects.ts` 的 `SubjectUiConfig` 新增：

```ts
readonly supportsSpeech: boolean; // 英语 true / 数学 false
```

判定逻辑单点收敛到 `services/speechPolicy.ts` 的 `allowSpeech()`，优先级：

1. 学科能力开关（权威判据）
2. 学科未知（`semesterId` 缺失或反查失败）→ 按知识点类型兜底：`concept` / `formula` 不朗读
3. 语法点永不朗读（沿用 Owner 2026-07-30 确认）

试卷侧：`config/testPaper.ts` 改为工厂函数 `getTestPaperConfig(supportsSpeech)`；不支持语音时 `listening: 0`，原听力题量补给 `word`（6 → 8），**`total` 恒为 10**，换学科不换卷面结构。

### 影响面

| 位置 | 处理 |
| --- | --- |
| `pages/study-detail` 发音按钮 | 改按 `showSpeech`（学科开关 + 类型兜底）显示 |
| `services/testService.buildPaper` | 新增第三参 `supportsSpeech`，默认 `true`（零回归） |
| `pages/test` | 由 `semesterId` 反查学科后传入 |
| `pages/review-detail` 发音喇叭 | 本来就是数据驱动（`wx:if="{{knowledge.pronunciation}}"`），数学无该字段自动隐藏，无需改 |
| 听音找词 / 小蜜蜂 / 语法闯关 | `config/games.ts` 已按 `subjects: ['英语']` 过滤，`game-center` 已实现该过滤，无需改 |
| 飞机音效 / BGM（`shooterAudio`） | 属游戏音效，不由学科决定，保留 |

---

## 问题一：教材无法重选（死循环）

### 背景

`home.onTapSubject` 在该学科已有偏好时会 `wx.switchTab` 直达学习页（这是 9/8 为消除「选过教材还要再选」加的捷径）。而学习页顶部「教材选择 ▾」和「我的 → 教材选择」两个入口当时的实现都是 `wx.switchTab('/pages/home/home')`。

于是形成闭环：

```
学习页点「教材选择」 → 首页 → 点该学科（有偏好） → 直接回学习页 ⟲
```

结果：一旦选过教材，就永远进不到 `textbook` / `semester` 选择流。

### 决策

「切换教材」入口必须**直接进当前学科的选择流**，而不是绕道首页：

```ts
wx.navigateTo({ url: `/pages/learning-path/learning-path?subjectId=${subjectId}` });
```

`subjectId` 取自上一次 ADR-009 引入的「当前学科」本地状态；为空时才回首页让用户先选学科。

改的两处：`pages/study/study.ts` 的 `onTapSwitch`、`pages/mine/mine.ts` 的 `onTapTextbook`。

`pages/practice` 的同款分支保留回首页——它只在**未设偏好**时出现，此时回首页选学科是正确行为，不存在死循环。

---

## 验收

- `tsc --noEmit` ✅
- `eslint miniprogram/ tests/` ✅
- `prettier --check miniprogram tests`（顺手统一了 18 个历史文件的排版，纯格式无逻辑改动）✅
- `vitest run` **229 passed（21 文件）** ✅
  - 新增 `tests/speechPolicy.test.ts`（11 用例）
  - `tests/testService.test.ts` 增补 3 个 `supportsSpeech` 用例

## 部署

本次改动**全部在前端**，无云函数变更，**重新编译即可**。
（ADR-009 遗留的 `updateUserPreferences` 云函数若尚未上传部署，仍需单独上传。）
