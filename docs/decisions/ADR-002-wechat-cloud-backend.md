# ADR-002：后端形态 —— 微信云开发（CloudBase）

- 状态：**已决策**（依据 RULES §6，非自由选项）
- 决策人：Owner（通过 RULES 固化）

## 背景

RULES §6 规定调用链为 `Page → Service → Repository → Cloud`，即后端采用微信云开发：云数据库 + 云函数 + 云存储 + 微信登录天然打通。

## 决策

后端 = 微信云开发。客户端所有云访问封装在 `miniprogram/repositories/`。

## 理由

- RULES §6 直接规定，且与 V1 目标一致：登录/DB/存储/免运维，上线最快
- Bible 第三章「学习数据云端同步」由云数据库直接支撑
- 管理后台可复用云开发内容管理（CMS）能力起步（见 pending-decisions #3）

## 后果

- 厂商锁定风险：通过 Repository 层单点封装对冲——若未来迁移独立后端，只改 `repositories/` 与 `cloudfunctions/`
- 云环境 ID 尚未提供，见 `pending-decisions.md` #1
