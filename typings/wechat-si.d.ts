// 微信同声传译插件类型声明（Chapter 09 Q1=甲：官方 TTS 插件）。
// 官方 miniprogram-api-typings 未含插件 API，此处按插件公开接口最小声明。
declare namespace WechatSI {
  interface TextToSpeechResult {
    filename: string; // 合成后的本地临时音频路径（可直接用于 InnerAudioContext.src）
  }

  interface TextToSpeechOptions {
    lang: string; // 'en_US' | 'zh_CN'
    tts: boolean;
    content: string;
    success: (res: TextToSpeechResult) => void;
    fail: (error: unknown) => void;
  }

  interface Plugin {
    textToSpeech(options: TextToSpeechOptions): void;
  }
}
