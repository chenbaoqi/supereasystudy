// 零素材音效引擎：**用振荡器实时合成**，工程里一个音频文件都不需要。
//
// 为什么这么干：`services/shooterAudio` 原本指向 5 个 `cloud://.../audio/*.wav`，
// 那些文件从未上传过 ⇒ 小蜜蜂一直是**静音**的。与其去维护一堆音频素材（要上传、要占
// 云存储、包体还涨），不如让手机自己把声音算出来——代价是几 KB 代码。
//
// 依据：`wx.createWebAudioContext()` 基础库 **2.19.0** 起支持（官方 API 已核）。
// ⚠️ 微信的 typings 里 `AudioParam` 只暴露了 `value`，**没写** `setValueAtTime` /
// `exponentialRampToValueAtTime`，但运行时是支持的（社区小程序节拍器就这么用）。
// 所以这里走**运行时探测**：有自动化方法就走 ADSR 包络（不爆音），没有就退化成直给音量。
//
// 设计取舍：
//   1. 上下文**懒创建**：音频上下文必须在用户手势之后才有意义，且创建失败（老基础库/
//      模拟器不支持）必须静默降级——**没声音可以，崩了不行**。
//   2. 工厂可注入：单测用假上下文断言「有没有真的起振」，不必依赖 wx。
//   3. 音量统一压在 0.35 以下：学习类应用突然一声响会吓到孩子。

export type SfxName =
  'click' | 'pop' | 'correct' | 'wrong' | 'shoot' | 'hit' | 'explode' | 'coin' | 'levelup';

// ---- 极简端口：只声明我们用得到的部分，避免被微信那套大 typings 绑死 ----
export interface SynthParam {
  value: number;
  setValueAtTime?(value: number, time: number): void;
  linearRampToValueAtTime?(value: number, time: number): void;
  exponentialRampToValueAtTime?(value: number, time: number): void;
}

export interface SynthNode {
  connect(dest: SynthNode): void;
}

export interface SynthOscillator extends SynthNode {
  type: string;
  frequency: SynthParam;
  start(time?: number): void;
  stop(time?: number): void;
}

export interface SynthGain extends SynthNode {
  gain: SynthParam;
}

export interface SynthBuffer {
  getChannelData(channel: number): Float32Array;
}

export interface SynthBufferSource extends SynthNode {
  buffer: SynthBuffer | null;
  start(time?: number): void;
  stop(time?: number): void;
}

export interface SynthContext {
  currentTime: number;
  sampleRate: number;
  destination: SynthNode;
  state?: string;
  resume?(): void | Promise<void>;
  close?(): void | Promise<void>;
  createOscillator(): SynthOscillator;
  createGain(): SynthGain;
  createBuffer(channels: number, length: number, sampleRate: number): SynthBuffer;
  createBufferSource(): SynthBufferSource;
}

export interface SfxEngine {
  play(name: SfxName): void;
  startBgm(): void;
  stopBgm(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setBgmVolume(volume: number): void;
  dispose(): void;
}

export interface SfxEngineDeps {
  createContext?: () => SynthContext | null;
  masterVolume?: number; // 总音量上限（学习类应用别太吵）
  now?: () => number; // 仅供测试固定时钟
}

const MASTER_VOLUME = 0.28;
const BGM_VOLUME = 0.16; // BGM 再压一档，给读音和反馈音留空间

// 五声音阶（C 大调宫调式）：随便挑几个音叠在一起也不难听，适合随机 BGM
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0];
const BGM_STEP_SECONDS = 0.26;
const BGM_LOOKAHEAD_SECONDS = 0.6;
const BGM_TICK_MS = 120;

// 包络：起振 8ms 淡入（防爆音），然后指数衰减到近乎无声
function envelopeOf(param: SynthParam, start: number, peak: number, dur: number): void {
  if (typeof param.setValueAtTime === 'function') {
    param.setValueAtTime(0.0001, start);
    if (typeof param.linearRampToValueAtTime === 'function') {
      param.linearRampToValueAtTime(peak, start + 0.008);
    }
    if (typeof param.exponentialRampToValueAtTime === 'function') {
      param.exponentialRampToValueAtTime(0.0001, start + dur);
    }
    return;
  }
  // 退化路径：没有自动化方法就直接给值（会有轻微爆音，但总比没声音好）
  param.value = peak;
}

export function createSfxEngine(deps: SfxEngineDeps = {}): SfxEngine {
  const createContext =
    deps.createContext ??
    ((): SynthContext | null => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wxAny = typeof wx === 'undefined' ? undefined : (wx as any);
        if (!wxAny || typeof wxAny.createWebAudioContext !== 'function') return null;
        return wxAny.createWebAudioContext() as SynthContext;
      } catch {
        return null; // 老基础库/不支持的环境：静默降级
      }
    });
  const masterVolume = deps.masterVolume ?? MASTER_VOLUME;

  let ctx: SynthContext | null = null;
  let master: SynthGain | null = null;
  let muted = false;
  let broken = false; // 创建过一次失败就不再重试（避免每次点击都抛异常）
  let bgmTimer: ReturnType<typeof setInterval> | null = null;
  let bgmNextAt = 0;
  let bgmStep = 0;
  let bgmVolume = BGM_VOLUME;

  const ensureContext = (): SynthContext | null => {
    if (broken) return null;
    if (ctx) {
      // iOS 上切后台回来会 suspended，播之前恢复一次
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') void ctx.resume();
      return ctx;
    }
    // ⚠️ 工厂本身也可能抛（老基础库里 wx.createWebAudioContext 存在但一调用就炸）。
    //    这一层必须兜住：音效可以有可以无，**绝不能把游戏页面带崩**。
    let created: SynthContext | null = null;
    try {
      created = createContext();
    } catch {
      created = null;
    }
    if (!created) {
      broken = true;
      return null;
    }
    ctx = created;
    try {
      master = created.createGain();
      master.gain.value = masterVolume;
      master.connect(created.destination);
    } catch {
      broken = true;
      ctx = null;
      return null;
    }
    if (created.state === 'suspended' && typeof created.resume === 'function') {
      void created.resume();
    }
    return ctx;
  };

  // 单个音：freq → freqEnd 可做滑音（射击/错误音靠这个才有「动感」）
  const tone = (
    freq: number,
    dur: number,
    peak: number,
    type: string,
    at: number,
    freqEnd?: number,
  ): void => {
    const c = ctx;
    if (!c || !master) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      if (freqEnd != null && typeof osc.frequency.setValueAtTime === 'function') {
        osc.frequency.setValueAtTime(freq, at);
        if (typeof osc.frequency.linearRampToValueAtTime === 'function') {
          osc.frequency.linearRampToValueAtTime(freqEnd, at + dur);
        }
      }
      envelopeOf(gain.gain, at, peak, dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + dur + 0.03);
    } catch {
      // 单个音失败不影响后续播放
    }
  };

  // 噪声：爆炸/打偏这类「无音高」的音效靠它
  const noise = (dur: number, peak: number, at: number): void => {
    const c = ctx;
    if (!c || !master) return;
    try {
      const length = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, length, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        // 越靠后越小 ⇒ 天然的衰减，比再叠一层包络更省事
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const src = c.createBufferSource();
      const gain = c.createGain();
      src.buffer = buffer;
      envelopeOf(gain.gain, at, peak, dur);
      src.connect(gain);
      gain.connect(master);
      src.start(at);
      src.stop(at + dur + 0.02);
    } catch {
      // 同上：吞掉
    }
  };

  const scheduleBgm = (): void => {
    const c = ctx;
    if (!c) return;
    const until = c.currentTime + BGM_LOOKAHEAD_SECONDS;
    while (bgmNextAt < until) {
      // 走一个固定的上下行序列，比纯随机更像「音乐」，且不会跑调
      const idx = bgmStep % (PENTATONIC.length * 2);
      const note = idx < PENTATONIC.length ? idx : PENTATONIC.length * 2 - 1 - idx;
      const freq = PENTATONIC[note] ?? PENTATONIC[0]!;
      // 每 8 步落一次低八度当「根音」
      const finalFreq = bgmStep % 8 === 0 ? freq / 2 : freq;
      tone(finalFreq, BGM_STEP_SECONDS * 0.9, bgmVolume, 'triangle', bgmNextAt);
      bgmNextAt += BGM_STEP_SECONDS;
      bgmStep += 1;
    }
  };

  return {
    play(name) {
      if (muted) return;
      const c = ensureContext();
      if (!c) return;
      const t = c.currentTime + 0.01;
      switch (name) {
        case 'click':
          tone(880, 0.05, 0.18, 'triangle', t);
          break;
        case 'pop':
          tone(660, 0.07, 0.2, 'sine', t);
          break;
        case 'correct': // 上行两音：一听就知道对了
          tone(659.25, 0.09, 0.22, 'triangle', t);
          tone(987.77, 0.14, 0.22, 'triangle', t + 0.09);
          break;
        case 'wrong': // 下滑 + 一点噪声：明显但不刺耳
          tone(330, 0.22, 0.2, 'triangle', t, 196);
          noise(0.12, 0.05, t);
          break;
        case 'shoot':
          tone(1200, 0.08, 0.14, 'square', t, 420);
          break;
        case 'hit':
          tone(523.25, 0.08, 0.2, 'sine', t);
          noise(0.06, 0.1, t);
          break;
        case 'explode':
          noise(0.36, 0.24, t);
          tone(110, 0.3, 0.16, 'sine', t, 55);
          break;
        case 'coin':
          tone(987.77, 0.07, 0.18, 'square', t);
          tone(1318.51, 0.16, 0.18, 'square', t + 0.07);
          break;
        case 'levelup': {
          // 四音琶音：升级要给「成就感」
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((f, i) => tone(f, 0.16, 0.2, 'triangle', t + i * 0.1));
          break;
        }
        default:
          break; // 未知音效：宁可不出声，也别乱出声
      }
    },

    startBgm() {
      if (muted) return;
      const c = ensureContext();
      if (!c) return;
      if (bgmTimer) return; // 已在播
      bgmNextAt = c.currentTime + 0.05;
      bgmStep = 0;
      scheduleBgm();
      bgmTimer = setInterval(scheduleBgm, BGM_TICK_MS);
    },

    stopBgm() {
      if (bgmTimer) {
        clearInterval(bgmTimer);
        bgmTimer = null;
      }
    },

    setMuted(next) {
      muted = next === true;
      if (muted) this.stopBgm();
    },

    isMuted() {
      return muted;
    },

    setBgmVolume(volume) {
      bgmVolume = Math.max(0, Math.min(1, volume));
    },

    dispose() {
      this.stopBgm();
      if (ctx && typeof ctx.close === 'function') {
        try {
          void ctx.close();
        } catch {
          // 关不掉就算了
        }
      }
      ctx = null;
      master = null;
    },
  };
}

// 全局单例：页面直接用它，不用各自建上下文（一个小程序只该有一个音频上下文）
export const sfx = createSfxEngine();
