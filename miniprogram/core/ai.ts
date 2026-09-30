// AI 辅导（需求第三十八章 / 第三十九章）。
//
// 设计约束（来自需求，必须遵守）：
// - AI 主要负责「解释」，标准答案由题库/程序决定（第三十九章）。
// - AI 生成题必须经程序二次验证；无法可靠验证的不得进入正式考试题库。
// - 因此本层只定义「请求/响应」契约，不含任何网络调用（分层：只有 Cloud 允许联网）。
//
// 降级约定：AI 未配置或调用失败时，客户端回落到「程序化提示」（题目自带的 hints），
// 保证功能可用而不是报错。见 services/aiTutorService.ts。

// AI 动作（对应需求第三十八章的按钮）。
// explain=我没看懂 / simplify=再简单一点 / example=举个例子 /
// hint=只提示一步 / why=为什么 / similar=给我一道类似题 /
// diagnose=错因解释 / advise=学习建议 / qa=知识点问答 / status=连通性自检
export type AiTutorAction =
  | 'explain'
  | 'simplify'
  | 'example'
  | 'hint'
  | 'why'
  | 'similar'
  | 'diagnose'
  | 'advise'
  | 'qa'
  | 'status';

// 传给 AI 的上下文（需求第三十八章要求 AI 必须读取的 7 项）。
// 全部可选：缺哪项就少给哪项，不阻塞调用。
export interface AiTutorContext {
  readonly stage?: string; // 学段（小学/初中/高中）
  readonly grade?: number; // 年级（1-12）
  readonly subjectName?: string; // 学科（数学/英语）
  readonly knowledgeTitle?: string; // 知识点名称
  readonly stem?: string; // 题干
  // 选择题选项（2026-09-13 补：答错后问 AI 时，AI 不知道四个选项是什么就没法讲
  // 「为什么 B 对、你选的 C 差在哪」——只有题干+答案是不够的）
  readonly options?: readonly string[];
  readonly studentAnswer?: string; // 学生答案
  readonly correctAnswer?: string; // 正确答案（仅用于让 AI 解释，不用于判定）
  readonly wrongStep?: string; // 错误步骤
  readonly hintHistory?: readonly string[]; // 已用过的提示（避免重复）
  readonly masteryScore?: number; // 掌握度 0-100
}

// AI 返回来源：ai=真实大模型 / fallback=程序化提示 / error=调用失败
export type AiTutorSource = 'ai' | 'fallback' | 'error';

export interface AiTutorResult {
  readonly ok: boolean;
  readonly text: string;
  readonly source: AiTutorSource;
  // 机器可读状态：AI_NOT_CONFIGURED（未配置，预期降级）/ AI_TIMEOUT / AI_HTTP_4xx 等
  readonly code?: string;
}

// 降级原因（供 UI 决定是否显示「去配置 AI」入口）
export const AI_NOT_CONFIGURED = 'AI_NOT_CONFIGURED';
export const AI_DISABLED = 'AI_DISABLED';

// 程序化提示分级（无 AI 时的兜底，来自题目自带 hints）
export type HintLevel = 1 | 2 | 3; // 1=轻提示 2=分步提示 3=完整讲解
