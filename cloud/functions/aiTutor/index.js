// AI 辅导云函数（需求第三十八章 / 第三十九章）。
//
// 设计原则：
// 1) 可插拔：只要接口是 OpenAI 兼容的 /chat/completions，就能接。
//    DeepSeek / 通义千问 / 智谱 / Kimi /  moonshot / 本地 Ollama / 自建中转 均可。
// 2) 零依赖：只用 Node 内置 https/http，不装任何 npm 包（避免云端安装依赖失败）。
// 3) 安全：API Key 只存在于云函数环境变量，永不返回给客户端。
// 4) 降级友好：未配置 / 超时 / 报错 都返回结构化 code，客户端回落「程序化提示」。
//
// 环境变量（在云开发控制台 → 云函数 aiTutor → 函数配置 → 环境变量 中填写）：
//   AI_BASE_URL      必填，如 https://api.deepseek.com
//                    （若已包含 /chat/completions 则不再自动拼接）
//   AI_API_KEY       必填
//   AI_MODEL         选填，默认 deepseek-flash（DeepSeek 当前模型 ID，见下方 2026-09-13 说明）
//   AI_THINKING      选填，默认 disabled；enabled=开思考；omit=完全不传该字段（非 DeepSeek 厂商用）
//   AI_TEMPERATURE   选填，默认 0.3（数学解释要稳定，不要发散）
//   AI_MAX_TOKENS    选填，默认 800
//   AI_TIMEOUT_MS    选填，默认 20000
//   AI_ENABLED       选填，默认 true；填 false 可一键关闭（不消耗额度）
//
// 2026-09-13 修正（对照 DeepSeek 官方最新文档，原实现有两处会直接导致功能不可用）：
//   1) 模型 ID 过期：deepseek-chat / deepseek-reasoner 已于 2026-07-24 停用，
//      deepseek-v4-flash 于 2026-09-10 退役。当前只有两个 ID：deepseek-flash / deepseek-v4-pro。
//      原默认值 deepseek-chat 会让请求返回 400 Model Not Exist。
//   2) 思考模式默认开启：DeepSeek V4 系列 thinking **默认 enabled**，思维链 token 计入输出并
//      抢占 max_tokens，最终答案可能压根不回填到 message.content（表现为「AI 不说话」）。
//      学生辅导要的是短平快解释，不需要思维链，故默认显式关闭。
//      注意：thinking 是 DeepSeek 扩展字段，换通义/智谱/Kimi 等厂商请把 AI_THINKING 设为 omit。
const https = require('https');
const http = require('http');
const { URL } = require('url');

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AI_BASE_URL = (process.env.AI_BASE_URL || '').trim();
const AI_API_KEY = (process.env.AI_API_KEY || '').trim();
const AI_MODEL = (process.env.AI_MODEL || 'deepseek-flash').trim();
const AI_ENABLED = (process.env.AI_ENABLED || 'true').trim().toLowerCase() !== 'false';
// disabled（默认）/ enabled / omit —— 语义见文件头说明
const AI_THINKING = (process.env.AI_THINKING || 'disabled').trim().toLowerCase();
const AI_TEMPERATURE = Number(process.env.AI_TEMPERATURE || 0.3);
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 800);
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);

const MAX_CONTEXT_CHARS = 4000; // 防止超长题干打爆 token
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']; // 选项标号，超过 6 个退化为数字

function isConfigured() {
  return AI_ENABLED && AI_BASE_URL.length > 0 && AI_API_KEY.length > 0;
}

// 学科角色（2026-09-13）：原来是写死的「数学辅导老师」，英语题问「为什么选这个单词」
// 也会被当成数学题讲——答错后问 AI 的场景一上来就是英语题，必须按学科换角色。
const SUBJECT_ROLE = {
  数学: '你是一位严谨的中小学数学辅导老师。',
  英语: '你是一位耐心的中小学英语辅导老师。讲解时中英文并用：英文术语、单词、例句保留原文，再用中文解释。',
  语文: '你是一位中小学语文辅导老师。讲解要落到具体的字词、句法和文本语境上，不讲空泛的套话。',
};
const DEFAULT_ROLE = '你是一位严谨的中小学全科辅导老师，按学生所给学科讲解。';

function roleLineOf(subjectName) {
  const subject = String(subjectName || '').trim();
  for (const key of Object.keys(SUBJECT_ROLE)) {
    if (subject.includes(key)) return SUBJECT_ROLE[key];
  }
  return DEFAULT_ROLE;
}

// 系统提示：把需求第三十九章的「AI 正确性约束」写进 prompt。
function systemPromptOf(subjectName) {
  return [
    roleLineOf(subjectName),
    '硬性规则：',
    '1. 只做解释、提示、举例、错因分析、学习建议；不负责判定答案对错（对错由程序判定）。',
    '2. 除非用户明确要求给最终答案，否则不要直接给出最终答案，而是给思路或下一步。',
    '3. 学科内容必须正确。不确定时明说「这个点我需要你核对教材」，严禁编造公式、定理、单词释义或步骤。',
    '4. 按学生年级调整语言：小学要具体、生活化、短句；初中要讲清原理；高中要专业、可迁移。',
    '5. 输出用简体中文，纯文本，不要用 Markdown 标题符号，控制在 300 字以内。',
  ].join('\n');
}

const ACTION_INSTRUCTION = {
  explain: '学生没看懂。请换一种完全不同的讲法重新解释这个知识点（不要重复原来的表述）。',
  simplify: '学生觉得太难。请把解释再降低一个难度，用更基础、更生活化的例子。',
  example: '请举一个具体的、学生这个年级熟悉的生活/课本例子帮助理解。',
  hint: '只给下一步的提示，不要给答案，不要给完整过程。一句话即可。',
  why: '请解释「为什么是这样」，讲清背后的原理或定理依据。',
  similar: '请出一道同类但数字/情境不同的练习题，并给出答案与简要解析。',
  diagnose:
    '学生做错了。请分析最可能的错因（概念不清/计算失误/公式记错/审题偏差/步骤遗漏等），并给出针对性的纠正建议。',
  advise: '请根据学生的掌握度与错题情况，给出下一段学习的建议（学什么、练什么、注意什么）。',
  qa: '请回答学生关于这个知识点的问题。',
  status: '请只回复两个字：正常',
};

// 组装用户消息（需求第三十八章：AI 必须读取年级/知识点/题目/学生答案/错误步骤/提示历史/掌握度）
function buildUserMessage(action, ctx) {
  const c = ctx || {};
  const lines = [];
  lines.push(ACTION_INSTRUCTION[action] || ACTION_INSTRUCTION.qa);
  lines.push('');
  lines.push('【上下文】');
  if (c.subjectName) lines.push(`学科：${c.subjectName}`);
  if (c.stage) lines.push(`学段：${c.stage}`);
  if (c.grade) lines.push(`年级：${c.grade} 年级`);
  if (c.knowledgeTitle) lines.push(`知识点：${c.knowledgeTitle}`);
  if (c.stem) lines.push(`题目：${c.stem}`);
  // 选择题必须给选项：不知道四个选项是什么，就没法讲清「为什么这个对、那个错」
  if (Array.isArray(c.options) && c.options.length > 0) {
    lines.push(
      `选项：${c.options.map((text, i) => `${OPTION_LETTERS[i] || i + 1}. ${text}`).join('  ')}`,
    );
  }
  if (c.studentAnswer) lines.push(`学生答案：${c.studentAnswer}`);
  if (c.correctAnswer) lines.push(`正确答案（仅供你参考，不要直接复述）：${c.correctAnswer}`);
  // 学生答错时明确点出来，否则模型容易无视两者差异、泛泛而谈
  if (c.studentAnswer && c.correctAnswer && c.studentAnswer !== c.correctAnswer) {
    lines.push('（学生答错了：请围绕「学生答案」与「正确答案」的差异讲解，不要复述整道题。）');
  }
  if (c.wrongStep) lines.push(`错误步骤：${c.wrongStep}`);
  if (typeof c.masteryScore === 'number') lines.push(`该知识点掌握度：${c.masteryScore}/100`);
  if (Array.isArray(c.hintHistory) && c.hintHistory.length > 0) {
    lines.push(`已给过的提示（请勿重复）：${c.hintHistory.join(' | ')}`);
  }
  const text = lines.join('\n');
  return text.length > MAX_CONTEXT_CHARS
    ? `${text.slice(0, MAX_CONTEXT_CHARS)}\n…（已截断）`
    : text;
}

// 零依赖 POST JSON
function postJson(urlStr, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch {
      reject(new Error('AI_BASE_URL_INVALID'));
      return;
    }
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const payload = Buffer.from(JSON.stringify(body), 'utf8');
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json', 'Content-Length': payload.length },
          headers,
        ),
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`AI_HTTP_${res.statusCode}:${String(data).slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('AI_BAD_JSON'));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('AI_TIMEOUT')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function chat(messages) {
  const base = AI_BASE_URL.replace(/\/+$/, '');
  const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;

  const body = {
    model: AI_MODEL,
    messages,
    temperature: Number.isFinite(AI_TEMPERATURE) ? AI_TEMPERATURE : 0.3,
    max_tokens: Number.isFinite(AI_MAX_TOKENS) ? AI_MAX_TOKENS : 800,
    stream: false,
  };
  // 只在明确 disabled/enabled 时下发该字段：omit 是为了兼容非 DeepSeek 厂商
  // （严格校验 request body 的服务端会因未知字段直接 400）
  if (AI_THINKING === 'disabled' || AI_THINKING === 'enabled') {
    body.thinking = { type: AI_THINKING };
  }

  const res = await postJson(
    url,
    { Authorization: `Bearer ${AI_API_KEY}` },
    body,
    Number.isFinite(AI_TIMEOUT_MS) ? AI_TIMEOUT_MS : 20000,
  );

  const choice = res && res.choices && res.choices[0];
  const message = (choice && choice.message) || {};
  const text = typeof message.content === 'string' ? message.content.trim() : '';
  if (!text) {
    // 区分三种「空回答」，便于在云函数日志里一眼定位，而不是笼统的 AI_EMPTY_RESPONSE：
    //   AI_ONLY_REASONING：思考模式把答案写进了 reasoning_content，content 为空 → 关掉 AI_THINKING
    //   AI_TRUNCATED    ：max_tokens 被思考 token 吃光 → 调大 AI_MAX_TOKENS 或关掉思考
    const reasoning =
      typeof message.reasoning_content === 'string' ? message.reasoning_content.trim() : '';
    if (reasoning) throw new Error('AI_ONLY_REASONING');
    if (choice && choice.finish_reason === 'length') throw new Error('AI_TRUNCATED');
    throw new Error('AI_EMPTY_RESPONSE');
  }
  return text;
}

exports.main = async (event) => {
  const ev = event || {};
  const action = ev.action || 'qa';
  const ctx = ev.context || {};

  // 自检：不消耗额度（除非用户主动让模型回「正常」，这里直接本地返回）
  if (action === 'status') {
    return {
      ok: isConfigured(),
      configured: isConfigured(),
      enabled: AI_ENABLED,
      hasBaseUrl: AI_BASE_URL.length > 0,
      hasApiKey: AI_API_KEY.length > 0,
      model: AI_MODEL,
      thinking: AI_THINKING,
      baseUrlHost: (() => {
        try {
          return new URL(AI_BASE_URL).host;
        } catch {
          return '';
        }
      })(),
      code: isConfigured() ? undefined : 'AI_NOT_CONFIGURED',
    };
  }

  if (!AI_ENABLED) {
    return { ok: false, code: 'AI_DISABLED', text: '', model: AI_MODEL };
  }
  if (!isConfigured()) {
    return { ok: false, code: 'AI_NOT_CONFIGURED', text: '', model: AI_MODEL };
  }
  if (!ACTION_INSTRUCTION[action]) {
    return { ok: false, code: 'AI_UNKNOWN_ACTION', text: '', model: AI_MODEL };
  }

  const messages = [
    { role: 'system', content: systemPromptOf(ctx.subjectName) },
    { role: 'user', content: buildUserMessage(action, ctx) },
  ];

  try {
    const text = await chat(messages);
    return { ok: true, text, model: AI_MODEL, source: 'ai' };
  } catch (err) {
    const code = (err && err.message) || 'AI_ERROR';
    return { ok: false, code: String(code).split(':')[0], text: '', model: AI_MODEL };
  }
};
