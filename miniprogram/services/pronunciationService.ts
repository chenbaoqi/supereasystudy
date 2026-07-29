// 发音服务（Chapter 09 Q1=甲：微信同声传译插件实时合成）。
// 单点封装音频源：knowledge.pronunciation 预录制 URL 优先（未来资产升级路径），
// 否则走插件 TTS。未来切换音频源（如 §16 丙方案）只改本文件。
export interface PronunciationService {
  // 合成并返回可播放音频地址（失败 reject，由页面按 §13 提示）
  speak(text: string, prerecordedUrl?: string): Promise<string>;
}

const synthesize = (content: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const plugin = requirePlugin('WechatSI') as WechatSI.Plugin;
    plugin.textToSpeech({
      lang: 'en_US',
      tts: true,
      content,
      success: (res) => resolve(res.filename),
      fail: (error) => reject(error instanceof Error ? error : new Error('TTS 合成失败')),
    });
  });

export function createPronunciationService(): PronunciationService {
  return {
    speak(text, prerecordedUrl) {
      // 预录制资产优先（knowledge.pronunciation，Chapter 04 §5 预留字段的未来用途）
      if (prerecordedUrl) return Promise.resolve(prerecordedUrl);
      return synthesize(text);
    },
  };
}

export const pronunciationService = createPronunciationService();
