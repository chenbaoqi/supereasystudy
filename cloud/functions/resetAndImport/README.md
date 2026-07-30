# resetAndImport — 教材导入（upsert 模式，2026-07-31 重构）

## 为什么从「全清重导」改为 upsert

全清重导会重新生成所有数据 id，导致偏好/学习记录/复习/收藏的引用全部失效
（「选了册次章节空白」的根因）。upsert 按逻辑键匹配：已存在只更新字段并**保留 id**，
新增才插入，源中消失才删除——**用户数据跨导入存活**。

## 流程

```
CSV（扁平模板）→ scripts/convert_textbook.mjs → data.js → 部署本函数 → 云端测试运行
```

## 步骤

0. **前置（仅首次）**：云控制台 → 云函数 → `resetAndImport` → 配置：
   **执行超时时间调至 60 秒** + **内存 512MB**
1. 准备 CSV（模板见 `scripts/assets/textbook-template.csv`），放项目内任意位置
2. 转换：`node scripts/convert_textbook.mjs <csv路径>`
3. 右键本目录 →「上传并部署：云端安装依赖」
4. 云控制台 → 云函数 → `resetAndImport` →「云端测试」→ 运行
5. 返回 `{ summary: { 各集合: { kept/inserted/updated/deleted } }, durationMs }`

## 语义

| 集合                                                                        | 逻辑键       | 行为                                                   |
| --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------ |
| subjects / learning_paths / textbooks / semesters / chapters / knowledge    | 见函数头注释 | 存在则更新字段保 id；缺失插入；源中消失删除            |
| learning_records / review_records / favorites / memory_game_records / users | —            | **默认保留**；传 `{ "wipeUserData": true }` 可显式重置 |

## 注意

- 教师校对 CSV 后重跑：改动的字段会精确更新（updated），未动的记录保持（kept），id 全部稳定
- 限流调参：并发 10 + 块间 80ms 节流 + 限流退避重试（500ms × 3）
- users 集合不动（登录身份保留）；banners/notices 不动
