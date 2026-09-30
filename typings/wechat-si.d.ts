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

  // 语音识别结果（onRecognize 中间结果 / onStop 最终结果共用同一形状）
  interface RecognitionResult {
    result?: string; // 识别出的文本（用户没说话 / 说话太短时为 ''）
    tempFilePath?: string; // 录音临时文件路径
    duration?: number; // 录音时长（ms）
  }

  // 识别错误：retcode -1 = 插件不可用，-2 = 用户未授权录音，其余以插件返回为准
  interface RecognitionError {
    retcode?: number;
    msg?: string;
    errMsg?: string;
  }

  // 录音识别管理器（getRecordRecognitionManager 返回，全局单例）
  interface RecordRecognitionManager {
    start(options: { lang: string; duration?: number }): void;
    stop(): void;
    onStart?: () => void;
    onRecognize?: (res: RecognitionResult) => void;
    onStop?: (res: RecognitionResult) => void;
    onError?: (res: RecognitionError) => void;
  }

  interface Plugin {
    textToSpeech(options: TextToSpeechOptions): void;
    getRecordRecognitionManager(): RecordRecognitionManager;
  }
}
