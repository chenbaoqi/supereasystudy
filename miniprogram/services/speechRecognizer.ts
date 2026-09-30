// 录音识别封装（2026-09-29 跟读 POC）：微信同声传译插件 getRecordRecognitionManager。
//
// 为什么单点收敛：requirePlugin 的调用形状、scope.record 授权流程、onStop/onError 回调
// 转 Promise 的桥接、录音时长兜底——这些跟读页面不该自己写，写一遍就够了（同 utils/tts.ts 思路）。
//
// ⚠️ 管理器是**全局单例**：onStop/onError 只能绑一次。本模块导出单例 `speechRecognizer`，
//    页面统一 import 它，别各自 create（否则第二次绑定会覆盖第一次）。
//
// 与 TTS 不同，这里**不是**「静默降级」——跟读的核心就是录音识别，失败了要给用户
// 一个明确的说法（没听清 / 需要权限 / 插件不可用），不能假装成功。
const RECORD_MAX_MS = 8000; // 单次录音上限：读一个单词几秒足够，防孩子走神一直占着麦克风

// 麦克风权限被拒：识别器已弹过「去开启」引导，页面 catch 到它时**别再弹一次**。
export class MicrophonePermissionError extends Error {
  constructor() {
    super('需要麦克风权限才能跟读');
    this.name = 'MicrophonePermissionError';
  }
}

export interface SpeechRecognizer {
  /** 开始录音识别（内部完成插件探测 + 授权引导）。失败 reject。 */
  start(): Promise<void>;
  /** 停止并返回识别文本。返回 '' 表示「没听清」。失败 reject。 */
  stop(): Promise<string>;
  /** 页面卸载清理：停止录音、清空挂起的回调。 */
  dispose(): void;
}

export function createSpeechRecognizer(): SpeechRecognizer {
  let manager: WechatSI.RecordRecognitionManager | null = null;
  let stopResolve: ((text: string) => void) | null = null;
  let stopReject: ((error: Error) => void) | null = null;
  let pendingError: Error | null = null;
  let recording = false;

  function obtain(): WechatSI.RecordRecognitionManager {
    if (manager) return manager;
    let plugin: WechatSI.Plugin;
    try {
      plugin = requirePlugin('WechatSI') as WechatSI.Plugin;
    } catch {
      throw new Error('语音插件不可用');
    }
    if (!plugin || typeof plugin.getRecordRecognitionManager !== 'function') {
      throw new Error('语音插件不支持录音识别');
    }
    manager = plugin.getRecordRecognitionManager();
    manager.onStop = (res) => {
      recording = false;
      const text = (res?.result ?? '').trim();
      if (stopResolve) {
        stopResolve(text);
        stopResolve = null;
        stopReject = null;
      }
    };
    manager.onError = (res) => {
      recording = false;
      const error = new Error(res?.msg || res?.errMsg || '语音识别失败');
      if (stopReject) {
        stopReject(error);
        stopReject = null;
        stopResolve = null;
      } else {
        pendingError = error;
      }
    };
    return manager;
  }

  return {
    async start() {
      if (recording) return;
      const m = obtain(); // 插件探测先做，失败了就别白弹授权
      await ensureRecordPermission();
      if (pendingError) {
        const e = pendingError;
        pendingError = null;
        throw e;
      }
      recording = true;
      m.start({ lang: 'en_US', duration: RECORD_MAX_MS });
    },

    stop() {
      if (!recording) return Promise.resolve('');
      return new Promise<string>((resolve, reject) => {
        if (pendingError) {
          const e = pendingError;
          pendingError = null;
          recording = false;
          reject(e);
          return;
        }
        stopResolve = resolve;
        stopReject = reject;
        try {
          obtain().stop();
        } catch (error) {
          recording = false;
          stopResolve = null;
          stopReject = null;
          reject(error instanceof Error ? error : new Error('录音停止失败'));
        }
      });
    },

    dispose() {
      recording = false;
      stopResolve = null;
      stopReject = null;
      pendingError = null;
      try {
        obtain().stop();
      } catch {
        // 卸载时插件可能已不可用，忽略
      }
    },
  };
}

// 麦克风授权：已授权直接过；未授权先 wx.authorize；拒绝过则弹「去开启」引导。
async function ensureRecordPermission(): Promise<void> {
  const setting = await wx.getSetting();
  if (setting.authSetting['scope.record'] === true) return;
  try {
    await wx.authorize({ scope: 'scope.record' });
    return;
  } catch {
    // 首次拒绝 / 曾拒绝：wx.authorize 会直接 fail，需要引导去设置页手动开
  }
  const modal = await wx.showModal({
    title: '需要麦克风权限',
    content: '跟读练习要听你读单词，请开启麦克风权限',
    confirmText: '去开启',
  });
  if (modal.confirm) {
    await wx.openSetting();
  }
  throw new MicrophonePermissionError();
}

export const speechRecognizer: SpeechRecognizer = createSpeechRecognizer();
