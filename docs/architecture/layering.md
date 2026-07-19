# 分层规范

> 依据：RULES §6。`Page → Service → Repository → Cloud`，禁止跨层调用。

## 1. 调用链

```
┌──────┐   ┌─────────┐   ┌────────────┐   ┌───────────────────────┐
│ Page │ → │ Service │ → │ Repository │ → │ Cloud（云函数/DB/存储）│
└──────┘   └─────────┘   └────────────┘   └───────────────────────┘
   │            │              │
 展示/交互    业务逻辑       数据访问
 ≤300行      纯TS可单测    唯一 wx.cloud 点
```

## 2. 各层契约

### Page（`miniprogram/pages/`）

- **能做**：渲染、事件绑定、调用 Service、页面跳转
- **不能做**：业务计算、直接访问 Repository / wx.cloud、超过 50 行的函数
- **为什么**：页面越薄，UI 改版成本越低；业务沉淀在可单测的 Service

### Service（`miniprogram/services/`）

- **能做**：编排业务流程、组合多个 Repository、数据转换
- **不能做**：碰 wx.cloud / wx.request、碰 UI API、单 Service 多职责
- **为什么**：Service 是纯 TS，是 Vitest 单测的主要对象；云能力被隔离在 Repository

### Repository（`miniprogram/repositories/`）

- **能做**：`wx.cloud.database()` / `callFunction()` / 云存储的封装
- **不能做**：业务判断、向上返回原始 DB 记录（必须映射为 `core/` 的 Interface）
- **为什么**：全项目只有一个云访问封装点——换后端、加缓存、加 mock 都只动这一层

### Cloud（`cloudfunctions/`）

- **能做**：数据库写操作、权限/身份校验、聚合计算
- **不能做**：依赖客户端上下文（云函数无登录态以外的客户端信息）
- **为什么**：客户端代码可被反编译，所有不可信操作必须在云端收口

## 3. 反模式清单（Code Review 必查）

| 反模式                                          | 违反     | 后果                  |
| ----------------------------------------------- | -------- | --------------------- |
| Page 里写 `wx.cloud.database()`                 | 跨两层   | 云访问失控，无法 mock |
| Service 返回 `any`                              | 类型安全 | 运行时错误后移        |
| Repository 里写「如果 VIP 则…」                 | 职责错位 | 业务逻辑泄漏到数据层  |
| `subjects/english` 被 import 到 `subjects/math` | 插件耦合 | 新增学科要改旧学科    |
