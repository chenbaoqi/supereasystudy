# 教材骨架说明（方案 A：AI 生成 + 人工校对）

## ⚠️ 数据性质（使用前必读）

本目录 `textbook-draft-pep-*.csv` 为 **人教版 PEP 英语教材词汇骨架（小学三年级 → 初中九年级，全 13 册，97 单元，1190 词）**，由 AI 生成：

- **单元结构**：贴近人教版 PEP 各册实际单元（三上/七上贴近 2024 新版，其余为现行版主题）
- **词汇**：按单元主题编写的各年级课标常见词（**非教材原词表**，每单元取 12–18 个核心词）
- **例句/翻译**：AI 为练习编写的简单句（非教材原句，无版权问题）
- **音标**：常见词典标注（DJ 音标）

**红线：本数据是「待校对草稿」，不是真实教材词表。**
必须由教师/您对照实体教材完成校对（增、删、改）后，方可作为正式数据导入。

## 文件清单

| 文件                         | 册                      | 单元 | 词数 |
| ---------------------------- | ----------------------- | ---- | ---- |
| `textbook-draft-pep-03a.csv` | 三年级上册（2024 新版） | 6    | 72   |
| `textbook-draft-pep-03b.csv` | 三年级下册              | 6    | 72   |
| `textbook-draft-pep-04a.csv` | 四年级上册              | 6    | 72   |
| `textbook-draft-pep-04b.csv` | 四年级下册              | 6    | 72   |
| `textbook-draft-pep-05a.csv` | 五年级上册              | 6    | 72   |
| `textbook-draft-pep-05b.csv` | 五年级下册              | 6    | 72   |
| `textbook-draft-pep-06a.csv` | 六年级上册              | 6    | 72   |
| `textbook-draft-pep-06b.csv` | 六年级下册              | 4    | 48   |
| `textbook-draft-pep-7a.csv`  | 七年级上册（2024 新版） | 5    | 86   |
| `textbook-draft-pep-07b.csv` | 七年级下册              | 12   | 144  |
| `textbook-draft-pep-08a.csv` | 八年级上册              | 10   | 120  |
| `textbook-draft-pep-08b.csv` | 八年级下册              | 10   | 120  |
| `textbook-draft-pep-09.csv`  | 九年级全册              | 14   | 168  |

## 校对与导入流程

1. 用 Excel/WPS 打开 CSV 逐册校对（可直接增删行、改词）
2. 校对完成 → 执行合并转换（**注意：文件顺序即册次顺序，勿调**）：

```bash
node scripts/convert_textbook.mjs \
  scripts/assets/textbook-draft-pep-03a.csv \
  scripts/assets/textbook-draft-pep-03b.csv \
  scripts/assets/textbook-draft-pep-04a.csv \
  scripts/assets/textbook-draft-pep-04b.csv \
  scripts/assets/textbook-draft-pep-05a.csv \
  scripts/assets/textbook-draft-pep-05b.csv \
  scripts/assets/textbook-draft-pep-06a.csv \
  scripts/assets/textbook-draft-pep-06b.csv \
  scripts/assets/textbook-draft-pep-7a.csv \
  scripts/assets/textbook-draft-pep-07b.csv \
  scripts/assets/textbook-draft-pep-08a.csv \
  scripts/assets/textbook-draft-pep-08b.csv \
  scripts/assets/textbook-draft-pep-09.csv
```

3. 部署并运行 `resetAndImport`（清库 A + 导入，⚠️ 会清空现有内容与测试期用户记录）
4. 真机全链路走查

## 新增版本

告诉我「版本 + 年级/册次」（如：外研版 七年级上册），我按同结构生成骨架文件，
合并转换时按年级插在对应顺序位置即可。
