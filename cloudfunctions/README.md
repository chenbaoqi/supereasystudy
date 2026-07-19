# cloudfunctions/ — 微信云函数

## 职责

存放微信云开发（CloudBase）云函数，每个函数一个独立子目录（含独立 `package.json`）。

## 规则

- 云函数是 Repository 层的云端对端：小程序端 `repositories/` ↔ 本目录函数
- 涉及数据库写操作、权限校验的逻辑优先放云函数（客户端不可信）
- 数据库集合结构以 Design Bible 第 13 章（待补写）为准

## 当前状态

Phase 1：空目录。云环境 ID 尚未提供，见 `docs/decisions/pending-decisions.md`。
Phase 2：完成云开发配置后初始化首批函数（登录、学习记录等，以 Bible 为准）。
