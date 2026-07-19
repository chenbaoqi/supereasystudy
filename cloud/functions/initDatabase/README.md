# initDatabase — 一次性集合初始化云函数

按 `cloud/database/collections.json` 基线批量创建 14 个集合（Baseline Spec §4）。
**幂等**：已存在的集合记为 `skipped`，可安全重复执行。

## 使用步骤（微信开发者工具）

1. **部署**：左侧目录树找到 `cloud/functions/initDatabase` → 右键
   →「上传并部署：云端安装依赖（不上传 node_modules）」
2. **调用**：云开发控制台 →「云函数」→ `initDatabase` →「云端测试」→ 运行
3. **验证**：返回 `collections` 数组（14 项，`created` 或 `skipped`）；
   再到「数据库」面板确认 14 个集合已出现

## 注意事项

- 集合清单硬编码于 `index.js`，与 `cloud/database/collections.json` 保持一致
  （云函数部署包独立，无法引用包外文件；基线变更时两处同步）
- 执行完成后本函数**可删除**；保留则可用于未来新环境的快速初始化
- 建议不要对小程序端开放调用（在云控制台函数权限中保持默认/仅管理端即可）
