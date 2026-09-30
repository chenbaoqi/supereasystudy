// 读题朗读引擎（低年级识字率不高，题目得念给他听）。
//
// 三条设计约束（都不是可选项）：
//   1. **默认开、可手动关**：Owner 2026-09-18 明确「这个是自动的，可以手动关闭」。
//      存的是「关」标记（`read_aloud_off_v1`），所以升级老用户也是默认开。
//   2. **静默降级是硬要求**：插件没开通 / 当日配额用完 / 文本过长 ⇒ 不朗读、不报错、
//      **不崩**。连续失败若干次（默认 3）就本次会话不再尝试，否则每道题都抛一次。
//   3. **合成结果要缓存**：语音合成有当日配额，同一句话（题干、选项）反复念
//      不该反复花配额；「再读一遍」按钮更是必须命中缓存。
//
// 播放端口与合成端口都可注入，所以整个引擎能脱离 wx 单测（见 tests/readAloud.test.ts）。
import { synthesizeSpeech, type SpeakSegment, type SpeechLang } from './tts';

// 存「关」而不是存「开」：没写过这个 key 的老用户 = 默认开
const OFF_KEY = 'read_aloud_off_v1';
const CACHE_LIMIT = 80;
const MAX_FAILURES = 3;

export interface AudioHandle {
  play(): void;
  stop(): void;
  onEnded(callback: () => void): void;
  onError(callback: (error: unknown) => void): void;
}

export interface ReadAloudDeps {
  readonly synthesize?: (text: string, lang: SpeechLang) => Promise<string>;
  readonly createAudio?: (src: string) => AudioHandle;
  readonly readOffFlag?: () => boolean;
  readonly writeOffFlag?: (off: boolean) => void;
  readonly cacheLimit?: number;
  readonly maxFailures?: number;
}

export interface ReadAloud {
  /** 使用者的偏好（开关 UI 显示这个） */
  enabled(): boolean;
  setEnabled(on: boolean): void;
  /** 偏好开着 **且** 还没有连续失败到认命 —— 页面据它决定要不要等朗读 */
  available(): boolean;
  /** 念一句；被下一次 speak 打断时立即 resolve（页面不会卡住）。关掉时立刻 resolve */
  speak(text: string, lang?: SpeechLang): Promise<void>;
  /** 连着念几段（如「情景卡 → 题干 → 英文选项」），每段可指定自己的语言 */
  speakMany(segments: readonly SpeakSegment[]): Promise<void>;
  stop(): void;
  playing(): boolean;
}

export function createReadAloud(deps: ReadAloudDeps = {}): ReadAloud {
  const synth = deps.synthesize ?? synthesizeSpeech;
  const createAudio = deps.createAudio ?? defaultCreateAudio;
  const readOff =
    deps.readOffFlag ??
    (() => {
      try {
        return wx.getStorageSync(OFF_KEY) === true;
      } catch {
        return false;
      }
    });
  const writeOff =
    deps.writeOffFlag ??
    ((off: boolean) => {
      try {
        if (off) wx.setStorageSync(OFF_KEY, true);
        else wx.removeStorageSync(OFF_KEY);
      } catch (error) {
        console.error('朗读开关写入失败', error);
      }
    });
  const cacheLimit = deps.cacheLimit ?? CACHE_LIMIT;
  const maxFailures = deps.maxFailures ?? MAX_FAILURES;

  const cache = new Map<string, string>();
  let enabled = !readOff();
  let failures = 0;
  // 每次 speak / stop 都会 +1；所有 await 之后都要重新比对，否则被打断的那次会继续往下走
  let runToken = 0;
  let current: AudioHandle | null = null;
  let finishCurrent: (() => void) | null = null;

  function stopCurrent(): void {
    const handle = current;
    const finish = finishCurrent;
    current = null;
    finishCurrent = null;
    if (handle) {
      try {
        handle.stop();
      } catch (error) {
        console.error('朗读停止失败', error);
      }
    }
    // 被打断的那次必须立刻返回，否则页面会一直等一句永远念不完的话
    if (finish) finish();
  }

  async function playText(content: string, lang: SpeechLang, my: number): Promise<void> {
    if (my !== runToken || !content) return;
    stopCurrent();

    const key = `${lang}:${content}`;
    let src = cache.get(key);
    if (src === undefined) {
      try {
        src = await synth(content, lang);
      } catch (error) {
        failures += 1;
        console.error('朗读合成失败（静默降级）', error);
        return;
      }
      if (my !== runToken) return; // 合成期间被新的朗读/停止打断
      cache.set(key, src);
      if (cache.size > cacheLimit) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
    const audioSrc = src;
    if (my !== runToken || !audioSrc) return;

    await new Promise<void>((resolve) => {
      let handle: AudioHandle;
      try {
        handle = createAudio(audioSrc);
      } catch (error) {
        failures += 1;
        console.error('朗读播放器创建失败（静默降级）', error);
        resolve();
        return;
      }
      const done = (): void => {
        if (finishCurrent === done) {
          current = null;
          finishCurrent = null;
        }
        resolve();
      };
      current = handle;
      finishCurrent = done;
      handle.onEnded(done);
      handle.onError((error) => {
        failures += 1;
        console.error('朗读播放失败（静默降级）', error);
        done();
      });
      try {
        handle.play();
      } catch (error) {
        failures += 1;
        console.error('朗读播放失败（静默降级）', error);
        done();
      }
    });
  }

  // 用闭包函数而不是 this.xxx：对象字面量方法里的 this 在本工程 strict 下不好标注
  const isAvailable = (): boolean => enabled && failures < maxFailures;

  return {
    enabled: () => enabled,

    setEnabled(on: boolean) {
      enabled = on;
      if (on)
        failures = 0; // 用户手动打开 = 重新试一次，别记着上次的失败
      else stopCurrent();
      writeOff(!on);
    },

    available: isAvailable,

    speak(text, lang = 'zh_CN') {
      const my = (runToken += 1);
      if (!isAvailable()) return Promise.resolve();
      return playText(text.trim(), lang, my);
    },

    async speakMany(segments) {
      const my = (runToken += 1);
      if (!isAvailable()) return;
      for (const segment of segments) {
        if (my !== runToken) return; // 中途被 stop/新朗读打断，别再念后面几段
        await playText(segment.text.trim(), segment.lang ?? 'zh_CN', my);
      }
    },

    stop() {
      runToken += 1;
      stopCurrent();
    },

    playing: () => current !== null,
  };
}

// 默认播放器：每次播放新建一个 innerAudioContext，播完即销毁。
// ⚠️ 不能全局复用一个：innerAudioContext 的 onEnded 是**追加**监听，
// 复用会让回调越挂越多（每念一句多一次），最后一句结束触发一串旧回调。
function defaultCreateAudio(src: string): AudioHandle {
  const audio = wx.createInnerAudioContext();
  audio.src = src;
  let destroyed = false;
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    try {
      audio.destroy();
    } catch (error) {
      console.error('朗读播放器销毁失败', error);
    }
  };
  return {
    play: () => audio.play(),
    stop: () => {
      try {
        audio.stop();
      } catch (error) {
        console.error('朗读停止失败', error);
      }
      destroy();
    },
    onEnded: (callback) =>
      audio.onEnded(() => {
        callback();
        destroy();
      }),
    onError: (callback) =>
      audio.onError((error) => {
        callback(error);
        destroy();
      }),
  };
}

export const readAloud: ReadAloud = createReadAloud();

// 把一段中文讲解切成 ≤maxLen 字/段的片段，供 speakMany 逐段合成。
// 为什么要有（2026-09-30 全语音讲解）：微信同声传译插件 textToSpeech 的 content
// **单次上限约 50 个汉字**，讲解（explanation）动辄 80~100 字，必须分段。
// 策略：先在句末标点（。；！？）处切句，再在逗号等标点处细分，尽量让每段接近 maxLen。
export function splitForSpeech(text: string, maxLen = 50): string[] {
  const raw = (text || '').trim();
  if (!raw) return [];
  if (raw.length <= maxLen) return [raw];

  // 按标点切成「原子片段」（保留标点，读起来有停顿）
  const atoms: string[] = [];
  let cur = '';
  for (const ch of raw) {
    cur += ch;
    if (/[。；！？，、：]/.test(ch)) {
      atoms.push(cur);
      cur = '';
    }
  }
  if (cur) atoms.push(cur);

  // 贪心合并：每段尽量接近 maxLen 但不超；单个超长原子硬切
  const out: string[] = [];
  let buf = '';
  for (const atom of atoms) {
    if ((buf + atom).length <= maxLen) {
      buf += atom;
    } else {
      if (buf) out.push(buf);
      if (atom.length <= maxLen) {
        buf = atom;
      } else {
        for (let i = 0; i < atom.length; i += maxLen) {
          out.push(atom.slice(i, i + maxLen));
        }
        buf = '';
      }
    }
  }
  if (buf) out.push(buf);
  return out;
}
