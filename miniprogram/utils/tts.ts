// 语音合成的**唯一调用点**（微信同声传译插件 WechatSI，app.json 已声明 0.3.5）。
//
// 为什么要单独一个文件：调用方已经有两处（英语单词发音、低年级读题），
// 以后还会更多。`requirePlugin` 的调用形状、能力探测、失败包装各写一份必走散。
//
// ⚠️ 插件在以下情况会 reject，**调用方必须静默降级**（没声音可以，崩了不行）：
//   - 开发者工具未登录 / 插件未在 MP 后台开通
//   - 合成次数超出当日配额
//   - 文本过长
export type SpeechLang = 'en_US' | 'zh_CN';

// 一段待朗读的文本。带 lang 是因为**中英混排的题目没法用同一个声音念**：
// 英语情景题的题干是中文（问「这句话怎么说」），选项却是要考的英文句子。
export interface SpeakSegment {
  readonly text: string;
  readonly lang?: SpeechLang;
}

// 单次合成的最长等待：插件在异常时会既不 success 也不 fail，把调用方吊死。
const SYNTH_TIMEOUT_MS = 6000;

export interface TextToSpeechResult {
  readonly filename: string;
}

// 插件返回结构（只声明我们用得到的那部分，避免被大 typings 绑死）
interface TtsPlugin {
  textToSpeech?(options: {
    lang: string;
    tts: boolean;
    content: string;
    success: (res: TextToSpeechResult) => void;
    fail: (error: unknown) => void;
  }): void;
}

export function synthesizeSpeech(content: string, lang: SpeechLang = 'en_US'): Promise<string> {
  const text = content.trim();
  if (!text) return Promise.reject(new Error('朗读内容为空'));
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      done(() => reject(new Error('语音合成超时')));
    }, SYNTH_TIMEOUT_MS);

    let plugin: TtsPlugin | null = null;
    try {
      plugin = requirePlugin('WechatSI') as TtsPlugin;
    } catch (error) {
      done(() => reject(error instanceof Error ? error : new Error('语音插件不可用')));
      return;
    }
    if (!plugin || typeof plugin.textToSpeech !== 'function') {
      done(() => reject(new Error('语音插件不支持合成')));
      return;
    }
    plugin.textToSpeech({
      lang,
      tts: true,
      content: text,
      success: (res) => {
        const filename = res?.filename ?? '';
        done(() => (filename ? resolve(filename) : reject(new Error('语音合成没有返回音频地址'))));
      },
      fail: (error) => {
        done(() =>
          reject(
            error instanceof Error ? error : new Error(`语音合成失败：${String(error ?? '')}`),
          ),
        );
      },
    });
  });
}
