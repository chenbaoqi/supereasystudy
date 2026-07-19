# DEVELOPMENT_BASELINE_SPEC.md

# Development Baseline Specification（开发基线规范）

Project: SuperEasy Learning Version: 1.0 Status: Mandatory

> 本文档用于消除开发阻塞，任何 AI
> 在项目初始化阶段不得因未定义细节而停止开发。

---

# 1. 初始化允许原则

在 Version 1.0 第一阶段（Phase 1），允许开发以下内容，无需等待业务细节：

- 工程初始化
- 微信小程序配置
- TypeScript 配置
- 云开发初始化
- 页面目录
- TabBar
- 空页面
- Repository
- Service
- Cloud
- 通用组件
- 登录框架
- 数据模型基础结构
- CMS 接口预留
- 路由
- 全局状态

禁止实现具体业务逻辑。

---

# 2. 默认目录（固定）

    supereasy-learning/
    ├── docs/
    │   ├── SuperEasy-Learning-Specification.md
    │   ├── OPENCODE_RULES.md
    │   └── archive/
    ├── miniprogram/
    ├── cloud/
    │   ├── functions/
    │   └── database/
    ├── packages/
    │   ├── ui/
    │   ├── utils/
    │   └── types/
    └── scripts/

未经确认不得修改。

---

# 3. 页面基线（必须创建）

TabBar：

- 首页
- 学习
- 练习
- 我的

普通页面：

- 登录
- 学科
- 学习路径
- 教材
- 册次
- 章节
- 学习详情
- 测试
- 测试结果
- 复习
- 收藏
- 设置
- Coming Soon

以上页面允许为空页面，仅完成路由与布局。

---

# 4. 数据库基线

必须创建以下 Collection：

- users
- subjects
- learning_paths
- stages
- grades
- textbooks
- semesters
- chapters
- knowledge
- learning_records
- practice_records
- review_records
- banners
- notices

字段未知时，仅保留：

- \_id
- createdAt
- updatedAt

后续允许扩展字段，不允许修改集合名称。

---

# 5. 后台基线

V1 统一采用：

微信云开发 CMS。

无需开发独立后台。

管理员入口预留即可。

---

# 6. AppID 与环境

允许使用占位：

AppID：touristappid

CloudEnv：todo-cloud-env

发布前替换。

不得阻塞开发。

---

# 7. 缺失需求处理

若业务规则未定义：

允许：

- 创建接口
- 创建类型
- 创建页面
- 创建占位组件

禁止：

- 自行设计产品逻辑
- 自行修改学习流程

---

# 8. Phase 划分

Phase 1： 基础工程

Phase 2： 学习系统

Phase 3： 游戏玩法

Phase 4： AI 与商业化

不得跨阶段提前开发。

---

# 9. AI 决策规则

AI 可以自行决定：

- 文件拆分
- 代码重构
- 命名优化
- 性能优化

AI 不可以自行决定：

- 产品功能
- 数据结构名称
- 页面流程
- 广告策略
- 商业规则

---

# 10. 开发原则

如果文档未描述某个业务细节：

不要停止整个项目。

继续完成所有不依赖该细节的基础工作，并输出《待确认事项》列表。

只有真正阻塞当前任务时，才暂停对应模块。
