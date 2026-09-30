# aiTutor — AI 辅导云函数（可插拔，未配置自动降级）

需求依据：第三十八章（AI 数学老师）、第三十九章（AI 正确性约束）。

## 设计要点

- **可插拔**：只要接口是 OpenAI 兼容的 `/chat/completions`，就能接。换供应商只改环境变量，不改代码。
- **零依赖**：只用 Node 内置 `https`，不装任何 npm 包（避免云端安装依赖失败）。
- **密钥只在云端**：API Key 存在云函数环境变量，永不返回客户端。
- **自动降级**：未配置 / 超时 / 报错 → 返回结构化 `code`，客户端回落「题目自带的程序化提示」，按钮永远有反应，不会白屏或报错。
- **成本可控**：不想花钱就把 `AI_ENABLED` 填 `false`，或干脆不填 Key。

## 配置步骤

1. 微信开发者工具 → 云开发 → 云函数 → 新建/选中 `aiTutor`
2. 右键 → **上传并部署：云端安装依赖**
3. 云函数详情 → **配置** → 环境变量，添加：

| 变量             | 必填 | 说明                                  | DeepSeek 示例              |
| ---------------- | ---- | ------------------------------------- | -------------------------- |
| `AI_BASE_URL`    | ✅   | 接口地址                              | `https://api.deepseek.com` |
| `AI_API_KEY`     | ✅   | 密钥                                  | `sk-xxxxxx`                |
| `AI_MODEL`       | 选填 | 默认 `deepseek-flash`                 | `deepseek-flash`           |
| `AI_THINKING`    | 选填 | 默认 `disabled`（见下节「思考模式」） | `disabled`                 |
| `AI_TEMPERATURE` | 选填 | 默认 `0.3`（数学解释要稳定，别发散）  | `0.3`                      |
| `AI_MAX_TOKENS`  | 选填 | 默认 `800`                            | `800`                      |
| `AI_TIMEOUT_MS`  | 选填 | 默认 `20000`                          | `15000`                    |
| `AI_ENABLED`     | 选填 | 填 `false` 一键关闭，不消耗额度       | `true`                     |

> ⚠️ 同一个「函数配置」页里把**执行超时时间调到 60 秒**。云函数默认 20 秒，
> 与 `AI_TIMEOUT_MS` 默认 20 秒撞在一起，会先被云函数掐断，报一个看不懂的超时错。

## 各厂商配置示例

都是 OpenAI 兼容协议，只换三行：

| 厂商                           | AI_BASE_URL                                         | AI_MODEL                              | AI_THINKING |
| ------------------------------ | --------------------------------------------------- | ------------------------------------- | ----------- |
| DeepSeek                       | `https://api.deepseek.com`                          | `deepseek-flash` 或 `deepseek-v4-pro` | `disabled`  |
| 通义千问（DashScope 兼容模式） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus`                           | `omit`      |
| 智谱 GLM                       | `https://open.bigmodel.cn/api/paas/v4`              | `glm-4-flash`                         | `omit`      |
| Moonshot / Kimi                | `https://api.moonshot.cn/v1`                        | `moonshot-v1-8k`                      | `omit`      |
| 本地 Ollama（需公网可达）      | `https://你的域名/v1`                               | `qwen2.5:7b`                          | `omit`      |

- `AI_THINKING=omit` 表示**完全不发送** `thinking` 这个字段。它是 DeepSeek 的扩展字段，
  严格校验请求体的服务端会因未知字段直接返回 400，所以换厂商务必改成 `omit`。
- 如果地址本身已以 `/chat/completions` 结尾，函数不会再重复拼接。
- **核实口径**：表中 **DeepSeek 一行已于 2026-09-13 对照官方文档逐项核实**；
  其余厂商的**模型 ID 变化较快**（各家都在频繁改名/下线），接入前请核对各家官方文档的
  「模型列表」页，不要照抄本表。base_url 这类固定兼容路径相对稳定。

## 思考模式（DeepSeek 专属，默认关闭）

**DeepSeek V4 系列默认开启思考**（thinking enabled）。对本场景有两个坏处：

1. **可能拿不到回答**：思维链 token 计入输出并抢占 `max_tokens`，最终答案可能压根不回填到
   `message.content` —— 表现为「AI 不说话」。函数会返回 `AI_ONLY_REASONING` 或 `AI_TRUNCATED`。
2. **又慢又贵**：学生辅导要的是两三句话的短平快解释，不需要思维链。

| `AI_THINKING`      | 请求体                             | 用途                                         |
| ------------------ | ---------------------------------- | -------------------------------------------- |
| `disabled`（默认） | `{"thinking":{"type":"disabled"}}` | DeepSeek 推荐值                              |
| `enabled`          | `{"thinking":{"type":"enabled"}}`  | 想用思维链时（记得同时调大 `AI_MAX_TOKENS`） |
| `omit`             | 不带该字段                         | 非 DeepSeek 厂商                             |

## 🕐 2026-09-13 修正（旧配置会直接失效）

对照 DeepSeek 官方最新文档，发现两处**会导致功能不可用**的问题，已修：

| 问题                | 旧值（已失效）                | 现值                           |
| ------------------- | ----------------------------- | ------------------------------ |
| base_url 多了 `/v1` | `https://api.deepseek.com/v1` | **`https://api.deepseek.com`** |
| 模型 ID 已停用      | `deepseek-chat`               | **`deepseek-flash`**           |

- `deepseek-chat` / `deepseek-reasoner` 已于 **2026-07-24** 停用；
  `deepseek-v4-flash` 已于 **2026-09-10** 退役。
  当前官方只有两个 ID：`deepseek-flash`（V4.1-Flash，支持文本+图片）、`deepseek-v4-pro`。
- 网上大量教程仍在传 `https://api.deepseek.com/v1` + `deepseek-chat`，那是过期信息，别照抄。
- **接入前请以官方文档为准**：<https://api-docs.deepseek.com>（本文件的值核实于 2026-09-13）。

## 自检

调用云函数测试（不消耗额度）：

```json
{ "action": "status" }
```

返回 `{ "ok": true, "configured": true, "hasBaseUrl": true, "hasApiKey": true, "model": "...", "thinking": "disabled", "baseUrlHost": "api.deepseek.com" }` 即配置成功。

对着 `model` 和 `baseUrlHost` 眼校一遍：`model` 必须是该厂商**当前有效**的 ID，
`baseUrlHost` 必须是你要接的那家。填错模型名会得到 400 `Model Not Exist`。

想确认端到端连通（会消耗少量额度），用：

```json
{
  "action": "qa",
  "context": { "grade": 7, "subjectName": "数学", "knowledgeTitle": "一元一次方程" }
}
```

## 支持的动作（action）

| action     | 对应按钮               |
| ---------- | ---------------------- |
| `explain`  | 我没看懂               |
| `simplify` | 再简单一点             |
| `example`  | 举个例子               |
| `hint`     | 只提示一步             |
| `why`      | 为什么？               |
| `similar`  | 给我一道类似题         |
| `diagnose` | 错因解释               |
| `advise`   | 学习建议               |
| `qa`       | 知识点问答             |
| `status`   | 配置自检（不消耗额度） |

## AI 正确性约束（已写进 system prompt）

1. AI 只做解释、提示、举例、错因分析、建议；**对错由程序判定**。
2. 除非明确要求，不直接给最终答案。
3. 数学内容必须正确，不确定时明说，严禁编造公式/定理/步骤。
4. 按年级调整语言（小学具体生活化 / 初中讲原理 / 高中专业可迁移）。
5. 300 字以内，纯文本。

## 错误码

| code                          | 含义                                         | 客户端行为                                 |
| ----------------------------- | -------------------------------------------- | ------------------------------------------ |
| `AI_NOT_CONFIGURED`           | 未填地址或密钥                               | 降级到程序化提示                           |
| `AI_DISABLED`                 | `AI_ENABLED=false`                           | 降级                                       |
| `AI_TIMEOUT`                  | 超时                                         | 降级                                       |
| `AI_HTTP_4xx` / `AI_HTTP_5xx` | 上游报错                                     | 降级（401 通常是 Key 错）                  |
| `AI_BAD_JSON`                 | 响应不是合法 JSON（地址填错常见）            | 降级                                       |
| `AI_UNKNOWN_ACTION`           | action 不存在                                | 降级                                       |
| `AI_ONLY_REASONING`           | 开了思考模式，答案只落在 `reasoning_content` | 降级（应把 `AI_THINKING` 设为 `disabled`） |
| `AI_TRUNCATED`                | `max_tokens` 被思考 token 吃光               | 降级（关思考或调大 `AI_MAX_TOKENS`）       |

## 注意

- 本函数**不写数据库**（`ai_tutor_sessions` 留待后续按需新增，避免擅自改库结构）。
- `AI_BASE_URL_INVALID` 表示地址不是合法 URL，检查是否漏了 `https://`。
- 401 请优先检查 Key 是否与 `AI_BASE_URL` 的厂商匹配（DeepSeek 的 Key 不能发给通义）。
- 环境变量改完有时不会立刻注入，**改完回开发者工具再上传部署一次**再测，别急着下结论。
- `AI_ONLY_REASONING` / `AI_TRUNCATED` 几乎一定是思考模式没关干净，先查 `AI_THINKING`。
