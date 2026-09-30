# 归档：数学「速算」（math-drill）

**归档日期**：2026-09-16
**归档原因**：Owner 判断**与「口算冒险岛」功能重复**（同为数学心算小游戏，同一个学科入口下并排两个），
决定下线速算、保留冒险岛。**不是审核原因**，也**不是代码有问题** —— 想放回来随时可以。

> 放在这里而不是删掉：恢复 = 拷回文件 + 回补 4 处配置；如果当初删了，恢复 = 重写一遍。
> 本目录在 `miniprogramRoot`（`miniprogram/`）**之外**，所以不会被打包上传，不占小程序体积。

---

## 1. 目录对应关系（恢复时照抄）

| 归档位置                                                       | 恢复到                                        |
| -------------------------------------------------------------- | --------------------------------------------- |
| `_archive-math-drill/miniprogram/pages/math-drill/`            | `miniprogram/pages/math-drill/`（整目录拷回） |
| `_archive-math-drill/miniprogram/services/mathDrillService.ts` | `miniprogram/services/mathDrillService.ts`    |
| `_archive-math-drill/tests/mathDrillService.test.ts`           | `tests/mathDrillService.test.ts`              |

页面 4 件套齐全：`math-drill.ts / .wxml / .wxss / .json`。

## 2. 被「裁剪」的文件（原稿在 `_originals/`，别直接覆盖现网）

| 现网文件                                           | 裁掉了什么                                                                 | 原稿                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `miniprogram/app.json`                             | `pages` 里删掉 `"pages/math-drill/math-drill"`（**只在第 28 行左右一处**） | `_originals/miniprogram/app.json`                             |
| `miniprogram/config/games.ts`                      | ① `drill` 整条游戏定义；② `GameType` 联合类型里的 `'drill'`；③ 两处注释    | `_originals/miniprogram/config/games.ts`                      |
| `miniprogram/config/gameRules.ts`                  | `DRILL_QUESTION_SECONDS = 8`、`DRILL_TOTAL = 20` 两个常量及其注释块        | `_originals/miniprogram/config/gameRules.ts`                  |
| `miniprogram/core/memoryGame.ts`                   | `MemoryGameType` 联合类型里的 `'drill'`（另加了一行「已归档」注释）        | `_originals/miniprogram/core/memoryGame.ts`                   |
| `miniprogram/repositories/memoryGameRepository.ts` | `MemoryGameRecord.gameType` 联合类型里的 `'drill'`                         | `_originals/miniprogram/repositories/memoryGameRepository.ts` |

⚠️ 恢复时**不要**整份覆盖 `app.json` / `games.ts` —— 原稿是 2026-09-16 的快照，
之后现网可能又加过别的页面/游戏。**只把上表「裁掉了什么」那几项加回去。**

## 3. 只改了注释、功能上不用管的文件

- `miniprogram/core/mathIsland.ts`、`miniprogram/pages/math-island-run/math-island-run.ts`、
  `miniprogram/core/answerInput.ts`：原本都写了「与速算的分工/区别」，已改成只讲冒险岛自身。
  恢复速算后建议把分工一句补回去（尤其 `mathIsland.ts` 里那句「速算按学段两档、
  冒险岛按运算符+数字范围，故独立成引擎」是解释**为什么不共用引擎**的关键上下文）。
- `core/answerInput.ts` 的 `isInputComplete()` 是**两个游戏共用**的判定（2026-09-16 刚加），
  速算归档后它只剩冒险岛在用，但**故意保留在 `core/`** —— 恢复速算时直接可用，不用再搬。

## 4. ⚠️ 恢复后必须处理的一个坑：测试扫描范围

2026-09-16 新增了 `vitest.config.ts`，把测试扫描范围精确限定为 `tests/**/*.test.ts`
（因为归档区里那份测试的依赖链已断，会被 vitest 扫到并报错）。

- 归档期间：归档测试**不会**被跑（符合预期）。
- 恢复后：把 `mathDrillService.test.ts` 拷回 `tests/`，它会自动重新纳入测试，**无需改配置**。
- 如果哪天删掉了 `vitest.config.ts`，记得归档区必须另行排除。

## 5. 数据侧（云端不用动）

- 历史 `memory_game_records` 里 `gameType = 'drill'` 的记录**没有删除**，仍留在云端。
  2026-09-16 已 grep 确认：**没有任何 UI 按 gameType 做名称映射或统计**，
  所以它们只是静静躺着，不影响界面。
- `math_island_progress`（冒险岛存档）与速算无关，不受影响。

## 6. 恢复步骤（按顺序）

1. 拷回：按第 1 节表格把文件/目录拷回原位置。
2. 回补配置：按第 2 节把 4 类内容**逐个加回**（不是覆盖文件）。
3. `app.json` 加回页面后，确认页面 4 件套齐全。
4. 跑门禁：
   - `node node_modules/typescript/bin/tsc --noEmit`
   - `node node_modules/eslint/bin/eslint.js .`
   - `node node_modules/vitest/vitest.mjs run`（恢复后应回到 **523 个用例 / 34 个文件**）
   - `node node_modules/prettier/bin/prettier.cjs --check .`（应只有固定的 7 个历史遗留）
5. 开发者工具重编译，进游戏中心看「数学」下是否出现两个游戏入口。

## 7. 恢复前先想清楚的前提

- **当初下线的理由就是「和冒险岛重复」**。恢复前请先明确两者的新分工，
  否则只是把同一个问题（同一学科下两个心算游戏）再摆回去一次。
  可参考的切分：速算 = 街机限时刷分、**含初中**；冒险岛 = **小学**闯关留存（有生命/连胜/关卡表现）。
- 速算页的键盘修复（`minmax(0,1fr)` + 双类名 `width:100%`，微信内置 `button{width:184px}` 那个雷）
  **在归档版本里是已修状态**，恢复时不要拿更早的版本覆盖。
