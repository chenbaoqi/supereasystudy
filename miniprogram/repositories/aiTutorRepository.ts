// AI 辅导云函数访问（Repository 层：唯一允许调 wx.cloud.callFunction 的地方）。
// 分层：Page → Service → Repository → Cloud，禁止跨层（RULES §6）。
import type { AiTutorAction, AiTutorContext } from '../core/ai';
import { AI_CONFIG } from '../config/ai';

// 云函数 aiTutor 的原始返回（未做业务加工）
export interface AiTutorRawResult {
  readonly ok: boolean;
  readonly text?: string;
  readonly code?: string;
  readonly model?: string;
  readonly source?: string;
  // status 自检专用
  readonly configured?: boolean;
  readonly enabled?: boolean;
  readonly hasBaseUrl?: boolean;
  readonly hasApiKey?: boolean;
}

export interface AiTutorRepository {
  // 发起一次 AI 请求；失败由云函数返回结构化 code，不抛异常
  ask(action: AiTutorAction, context: AiTutorContext): Promise<AiTutorRawResult>;
  // 连通性/配置自检（不消耗额度）
  status(): Promise<AiTutorRawResult>;
}

export const aiTutorRepository: AiTutorRepository = {
  async ask(action, context) {
    const res = await wx.cloud.callFunction({
      name: AI_CONFIG.cloudFunctionName,
      data: { action, context },
    });
    return res.result as AiTutorRawResult;
  },

  async status() {
    const res = await wx.cloud.callFunction({
      name: AI_CONFIG.cloudFunctionName,
      data: { action: 'status' },
    });
    return res.result as AiTutorRawResult;
  },
};
