// 零素材音效引擎（utils/synthAudio）单元测试。
// 用**假音频上下文**断言「有没有真的起振 / 什么时候停 / 静音时是否一声不出」，
// 不依赖 wx、也不依赖真实声卡——这类代码最容易出的错是「以为播了其实没有」。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSfxEngine,
  type SynthBuffer,
  type SynthContext,
  type SynthGain,
  type SynthNode,
  type SynthOscillator,
  type SynthParam,
} from '../miniprogram/utils/synthAudio';
import { createShooterAudio } from '../miniprogram/services/shooterAudio';

interface Log {
  oscillators: Array<{ freq: number; type: string; start: number; stop: number }>;
  noises: Array<{ start: number; stop: number; length: number }>;
  envelopes: number[][]; // 每个音的包络被写入的目标值序列
}

function makeParam(): SynthParam {
  const written: number[] = [];
  const param: SynthParam = {
    value: 1,
    setValueAtTime(v: number) {
      written.push(v);
    },
    linearRampToValueAtTime(v: number) {
      written.push(v);
    },
    exponentialRampToValueAtTime(v: number) {
      written.push(v);
    },
  };
  // 把写入序列挂到对象上供断言
  (param as unknown as { written: number[] }).written = written;
  return param;
}

function makeFakeContext(log: Log, opts: { withEnvelope?: boolean } = {}): SynthContext {
  const withEnvelope = opts.withEnvelope !== false;
  let now = 0;
  const destination: SynthNode = { connect() {} };
  const ctx: SynthContext = {
    get currentTime() {
      return now;
    },
    sampleRate: 8000,
    destination,
    state: 'running',
    createOscillator(): SynthOscillator {
      const frequency = makeParam();
      const item = { freq: 0, type: '', start: -1, stop: -1 };
      const osc: SynthOscillator = {
        get type() {
          return item.type;
        },
        set type(v: string) {
          item.type = v;
        },
        frequency,
        connect() {},
        start(t?: number) {
          item.start = t ?? 0;
          item.freq = frequency.value;
          log.oscillators.push({ ...item });
        },
        stop(t?: number) {
          item.stop = t ?? 0;
          const last = log.oscillators[log.oscillators.length - 1];
          if (last) last.stop = t ?? 0;
        },
      };
      return osc;
    },
    createGain(): SynthGain {
      const gain = withEnvelope ? makeParam() : { value: 1 };
      log.envelopes.push((gain as unknown as { written?: number[] }).written ?? []);
      return { gain, connect() {} };
    },
    createBuffer(_channels: number, length: number): SynthBuffer {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
    createBufferSource() {
      const item = { start: -1, stop: -1, length: 0 };
      return {
        buffer: null,
        connect() {},
        start(t?: number) {
          item.start = t ?? 0;
          item.length = 1;
          log.noises.push({ ...item });
        },
        stop(t?: number) {
          const last = log.noises[log.noises.length - 1];
          if (last) last.stop = t ?? 0;
        },
      };
    },
  };
  Object.defineProperty(ctx, 'advance', { value: (sec: number) => (now += sec) });
  return ctx;
}

const emptyLog = (): Log => ({ oscillators: [], noises: [], envelopes: [] });

describe('createSfxEngine（合成音效）', () => {
  it('播一个音效会真的起振，且安排了停止时间（不会一直响）', () => {
    const log = emptyLog();
    const engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
    engine.play('correct');
    expect(log.oscillators.length).toBeGreaterThan(0);
    for (const osc of log.oscillators) {
      expect(osc.start).toBeGreaterThanOrEqual(0);
      expect(osc.stop).toBeGreaterThan(osc.start);
    }
  });

  it('上行「答对」是两音、下滑「答错」带滑音（音色语义别写反）', () => {
    const log = emptyLog();
    const engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
    engine.play('correct');
    const freqs = log.oscillators.map((o) => o.freq);
    expect(freqs).toHaveLength(2);
    expect(freqs[1]!).toBeGreaterThan(freqs[0]!); // 越听越高 = 对了

    const log2 = emptyLog();
    const e2 = createSfxEngine({ createContext: () => makeFakeContext(log2) });
    e2.play('wrong');
    expect(log2.oscillators).toHaveLength(1);
    expect(log2.noises).toHaveLength(1); // 错音带一点噪声，但不刺耳
  });

  it('静音后一声不出，取消静音后恢复', () => {
    const log = emptyLog();
    const engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
    engine.setMuted(true);
    engine.play('hit');
    engine.startBgm();
    expect(log.oscillators).toHaveLength(0);
    engine.setMuted(false);
    engine.play('hit');
    expect(log.oscillators.length).toBeGreaterThan(0);
  });

  it('环境不支持（没有 wx.createWebAudioContext）→ 静默降级，不抛错', () => {
    const engine = createSfxEngine({ createContext: () => null });
    expect(() => {
      engine.play('shoot');
      engine.startBgm();
      engine.stopBgm();
    }).not.toThrow();
  });

  it('上下文创建抛异常也吞掉，且**不再反复重试**（broken 标记）', () => {
    const factory = vi.fn(() => {
      throw new Error('boom');
    });
    const engine = createSfxEngine({ createContext: factory });
    expect(() => {
      engine.play('click');
      engine.play('click');
      engine.play('click');
    }).not.toThrow();
    expect(factory).toHaveBeenCalledTimes(1); // 失败一次就认命，别每次点击都抛
  });

  it('没有自动化方法（老实现）时退化成直给音量，照样出声不崩', () => {
    const log = emptyLog();
    const engine = createSfxEngine({
      createContext: () => makeFakeContext(log, { withEnvelope: false }),
    });
    expect(() => engine.play('explode')).not.toThrow();
    expect(log.noises.length + log.oscillators.length).toBeGreaterThan(0);
  });

  it('包络是「淡入→衰减」：先升到峰值再降到近 0（防爆音）', () => {
    const log = emptyLog();
    const engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
    engine.play('pop');
    const written = log.envelopes[1] ?? []; // [0]=master gain，[1]=第一个音
    expect(written.length).toBeGreaterThanOrEqual(2);
    expect(written[0]).toBeLessThan(0.01); // 从近乎 0 起
    expect(Math.max(...written)).toBeGreaterThan(0.05); // 中间到峰值
    expect(written[written.length - 1]).toBeLessThan(0.01); // 末尾收回去
  });

  it('BGM 会连续排期多个音，stopBgm 后停掉定时器', () => {
    vi.useFakeTimers();
    try {
      const log = emptyLog();
      const engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
      engine.startBgm();
      const afterStart = log.oscillators.length;
      expect(afterStart).toBeGreaterThan(1);
      engine.stopBgm();
      vi.advanceTimersByTime(1000);
      expect(log.oscillators.length).toBe(afterStart); // 停了就不再排
    } finally {
      vi.useRealTimers();
    }
  });

  it('未知音效名：宁可不出声，也不乱出声', () => {
    const log = emptyLog();
    const engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine.play('nope' as any);
    expect(log.oscillators).toHaveLength(0);
    expect(log.noises).toHaveLength(0);
  });
});

describe('shooterAudio（游戏侧封装）', () => {
  let log: Log;
  let engine: ReturnType<typeof createSfxEngine>;
  let audio: ReturnType<typeof createShooterAudio>;

  beforeEach(() => {
    log = emptyLog();
    engine = createSfxEngine({ createContext: () => makeFakeContext(log) });
    audio = createShooterAudio(engine);
  });

  it('四个游戏音效都有对应的合成音（不再是空的 cloud:// 路径）', () => {
    audio.playSfx('shoot');
    audio.playSfx('hit');
    audio.playSfx('explode');
    audio.playSfx('miss');
    expect(log.oscillators.length + log.noises.length).toBeGreaterThanOrEqual(4);
  });

  it('duck/restore 只改 BGM 音量，不影响音效本身', () => {
    audio.duckBgm();
    audio.playSfx('hit');
    expect(log.oscillators.length).toBeGreaterThan(0);
    expect(() => audio.restoreBgm()).not.toThrow();
  });

  it('setMuted 之后音效与 BGM 都不出声（页面上那个开关要真的管用）', () => {
    audio.setMuted(true);
    audio.playSfx('hit');
    audio.startBgm();
    expect(log.oscillators).toHaveLength(0);
  });
});
