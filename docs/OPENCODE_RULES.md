# OPENCODE_RULES.md

# OpenCode Development Constitution

Project: SuperEasy Learning Version: 1.0.0

---

## Purpose

本文件用于规范 OpenCode 在本项目中的开发行为。

所有开发必须遵循本文件。

---

# 1. Single Source of Truth

唯一产品文档：

**SuperEasy-Learning-Specification.md**

其它历史文档仅供参考。

如有冲突，以 Specification 为准。

---

# 2. Development Principles

必须遵守：

- 架构优先
- 文档优先
- 类型安全
- 可维护优先
- 不做过度设计

---

# 3. Forbidden

禁止：

- 擅自新增功能
- 擅自删除预留能力
- 擅自修改数据库结构
- 擅自修改目录结构
- 擅自更改产品流程
- 用假数据替代真实实现（除明确要求的 Mock）

---

# 4. If Requirements Are Missing

当文档没有定义时：

停止开发该部分。

输出：

## Missing Decisions

列出：

- 缺失内容
- 为什么无法继续
- 建议方案（可提供多个）

等待确认后继续。

禁止自行决定产品逻辑。

---

# 5. Version 1.0 Scope

仅开发：

- 微信登录
- 首页
- 英语学习
- Memory Challenge 基础玩法
- 单元测试
- 自动复习
- 后台管理
- Banner
- 激励广告

其余能力仅保留接口与扩展点。

---

# 6. Code Structure

严格采用：

Page → Service → Repository → Cloud

禁止跨层调用。

---

# 7. Database

严格按照 Specification。

新增字段必须说明原因。

不得删除已有字段。

---

# 8. UI Rules

- 保持统一风格
- 优先可用性
- 不随意增加动画
- 不修改交互流程

---

# 9. Deliverables

每次完成任务必须提供：

1.  修改文件列表
2.  新增文件列表
3.  数据库变更
4.  风险说明
5.  后续建议

---

# 10. Quality Checklist

提交前确认：

- 编译通过
- TypeScript 无错误
- 无 any 滥用
- 无重复代码
- 无未使用代码
- 文档同步
- 页面可运行

---

# 11. Priority Order

1.  OPENCODE_RULES.md
2.  SuperEasy-Learning-Specification.md
3.  当前任务(Task)
4.  项目源码

若存在冲突，按以上优先级执行。

---

# 12. Initial Task

首次开发目标：

仅完成 Version 1.0 基础工程。

包括：

- 工程初始化
- 页面框架
- 云开发配置
- Repository / Service
- 数据库初始化
- 通用组件
- 后台框架

暂不实现复杂业务逻辑。

---

# 13. Final Rule

如果存在疑问：

**先提问，再编码。**

不要猜测产品需求。
