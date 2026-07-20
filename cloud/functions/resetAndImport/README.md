# resetAndImport — 清库 + 教材导入（危险操作，仅开发期使用）

## 流程

```
CSV（扁平模板）→ scripts/convert_textbook.mjs → data.js → 部署本函数 → 云端测试运行
```

## 步骤

0. **前置（仅首次）**：云控制台 → 云函数 → `resetAndImport` → 配置：
   **执行超时时间调至 60 秒**（默认 3 秒必超时）+ **内存调至 512MB**
   （25 路并发写库需要，小内存可能崩溃；全量导入约需 20-40 秒）
1. 准备 CSV（模板见 `scripts/assets/textbook-template.csv`），放项目内任意位置
2. 转换：`node scripts/convert_textbook.mjs <csv路径>`（生成/覆盖同目录 `data.js`）
3. 右键本目录 →「上传并部署：云端安装依赖」
4. 云控制台 → 云函数 → `resetAndImport` →「云端测试」→ 运行
5. 返回 `{ cleared: [...], imported: {...} }`（清点数 + 导入数）

## ⚠️ 清库范围（Owner 确认方案 A）

- 内容集合：subjects / learning_paths / textbooks / semesters / chapters / knowledge
- 测试期用户数据：learning_records / review_records / favorites / memory_game_records
- **不可恢复**，执行前确认无需保留

## 注意

- 学科基线内置在函数中（9 学科：英语 open + 8 Coming Soon），随导入自动重建——
  教材 CSV 不含学科，避免导入后九宫格丢失
- 采用分层并行插入（块大小 25）：1190 条约 20-40 秒完成；若仍超时，分批转换导入
- users 集合不动（登录身份保留）；banners/notices 不动
- 导入后内容集合权限保持「所有用户可读，仅创建者可写」
