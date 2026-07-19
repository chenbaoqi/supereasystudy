# cloud/functions/ — 微信云函数

## 职责

存放微信云开发（CloudBase）云函数，每个函数一个独立子目录（含独立 `package.json`）。
对应 `project.config.json` 的 `cloudfunctionRoot: "cloud/functions/"`。

## 规则

- 云函数是 Repository 层的云端对端：小程序端 `repositories/` ↔ 本目录函数
- 涉及数据库写操作、权限校验的逻辑优先放云函数（客户端不可信）
- 数据库集合基线见 `cloud/database/`（Baseline Spec §4），字段以 Specification 数据模型章节为准

## 当前状态

Phase 1：空目录。云环境已接入真实 ID（`cloud1-d8g6b7jctd1a3be1c`，见 `config/cloud.ts`）。
Phase 2：初始化首批函数（登录、学习记录等，以 Specification 为准）。
