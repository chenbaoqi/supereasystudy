// 发音服务（Chapter 09 Q1=甲：微信同声传译插件实时合成）。
// 单点封装音频源。未来切换音频源（如 §16 丙方案）只改本文件。
//
// ⚠️ 2026-09-29 真机排查：knowledge.pronunciation 预录 mp3 从未上传云存储，
//    cloud:// 指向的文件不存在，播放必然失败（表现为「听发音没声音」且静默）。
//    故一律走插件 TTS（Owner 2026-07-20「TTS 常态化，不再依赖数据自带音频」）。
//    等 mp3 真上传后，把 speak 改回「prerecordedUrl 优先」即可恢复预录。
//
// ⚠️ 插件调用本身已收敛到 `utils/tts.ts`（2026-09-18）：低年级读题也要合成，
//    两个调用点各写一遍 requirePlugin 迟早走散；那里也统一做了能力探测与超时兜底。
import { synthesizeSpeech } from '../utils/tts';

export interface PronunciationService {
  // 合成并返回可播放音频地址（失败 reject，由页面按 §13 提示）
  speak(text: string, prerecordedUrl?: string): Promise<string>;
}

export function createPronunciationService(): PronunciationService {
  return {
    speak(text, _prerecordedUrl) {
      // 预录 mp3 尚未上传云存储，直接 TTS；参数保留以兼容未来恢复预录优先。
      return synthesizeSpeech(text, 'en_US');
    },
  };
}

export const pronunciationService = createPronunciationService();
