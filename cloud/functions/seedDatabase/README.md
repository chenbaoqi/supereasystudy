# seedDatabase — 示例种子数据导入（A1 授权）

⚠️ **SAMPLE**：`data.js` 为示例数据（9 学科 / 词汇·语法 路径 / 1 教材 / 1 册 / 2 章节 / 20 单词），
仅用于开发联调，**上线前必须由真实教材数据替换**。

## 使用

1. 右键本目录 →「上传并部署：云端安装依赖（不上传 node_modules）」
2. 云开发控制台 →「云函数」→ `seedDatabase` →「云端测试」→ 运行
3. 返回 `{ created: n, skipped: n }`（重复执行幂等：已存在记 skipped）
4. 「数据库」面板抽查 subjects → knowledge 各集合

## 注意

- 数据唯一来源是同目录 `data.js`（部署包无法引用包外文件，故不在 `cloud/database/seed/`）
- 防重逻辑键：subjects=name；learning_paths=subjectId+name；textbooks=learningPathId+name；
  semesters=textbookId+name；chapters=semesterId+title；knowledge=chapterId+word
- 真实数据到位后：在控制台清空相关集合 → 用正式导入流程替换（后续 Phase 提供）
