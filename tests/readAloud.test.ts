// 读题朗读引擎（低年级识字率不高，题目得念给他听）。
//
// 这里测的是引擎自己的责任，四条都不能少：
//   1. **默认开、可手动关**，关掉之后一句都不该合成（省配额，也尊重家长）；
//   2. 合成结果要**缓存**——同一句反复念不该反复花当日配额；
//   3. **静默降级**：合成/播放失败不抛给页面，且连续失败若干次后本次会话不再试；
//   4. **被打断要立刻返回**——否则页面 await 一句永远念不完的话，卡死在答完题的那一刻。
import { describe, expect, it } from 'vitest';
import { createReadAloud, splitForSpeech, type AudioHandle } from '../miniprogram/utils/readAloud';

interface AudioRecord {
  readonly src: string;
  played: boolean;
  stopped: boolean;
  ended?: () => void;
  failed?: (error: unknown) => void;
}

interface Harness {
  engine: ReturnType<typeof createReadAloud>;
  audios: AudioRecord[];
  synthesized: string[];
  offWrites: boolean[];
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function makeHarness(
  options: {
    off?: boolean;
    failSynth?: boolean;
    texts?: string[];
  } = {},
): Harness {
  const audios: AudioRecord[] = [];
  const synthesized: string[] = [];
  const offWrites: boolean[] = [];
  const engine = createReadAloud({
    synthesize: async (text) => {
      synthesized.push(text);
      if (options.failSynth) throw new Error('配额用完了');
      return `tts://${text}`;
    },
    createAudio: (src): AudioHandle => {
      const record: AudioRecord = { src, played: false, stopped: false };
      audios.push(record);
      return {
        play: () => {
          record.played = true;
        },
        stop: () => {
          record.stopped = true;
        },
        onEnded: (cb) => {
          record.ended = cb;
        },
        onError: (cb) => {
          record.failed = cb;
        },
      };
    },
    readOffFlag: () => options.off === true,
    writeOffFlag: (off) => offWrites.push(off),
  });
  return { engine, audios, synthesized, offWrites };
}

describe('开关', () => {
  it('默认开；存储里写了「关」才是关', () => {
    expect(makeHarness().engine.enabled()).toBe(true);
    expect(makeHarness({ off: true }).engine.enabled()).toBe(false);
  });

  it('关掉后 speak 立刻返回，且一句都不合成', async () => {
    const h = makeHarness();
    h.engine.setEnabled(false);
    await h.engine.speak('这不该被念出来');
    expect(h.synthesized).toEqual([]);
    expect(h.audios).toEqual([]);
    expect(h.offWrites).toEqual([true]);
  });

  it('打开会写入「不关」，并清掉之前的失败计数', async () => {
    const h = makeHarness({ off: true });
    h.engine.setEnabled(true);
    expect(h.engine.available()).toBe(true);
    expect(h.offWrites).toEqual([false]);
  });
});

describe('合成与播放', () => {
  it('合成 → 播放 → 播完 resolve', async () => {
    const h = makeHarness();
    const done = h.engine.speak('树上有 2 只小鸟');
    await tick();
    expect(h.synthesized).toEqual(['树上有 2 只小鸟']);
    expect(h.audios[0]?.played).toBe(true);
    expect(h.engine.playing()).toBe(true);
    h.audios[0]?.ended?.();
    await done;
    expect(h.engine.playing()).toBe(false);
  });

  it('同一句第二次走缓存，不再花配额', async () => {
    const h = makeHarness();
    const first = h.engine.speak('一样的题目');
    await tick();
    h.audios[0]?.ended?.();
    await first;
    const second = h.engine.speak('一样的题目');
    await tick();
    h.audios[1]?.ended?.();
    await second;
    expect(h.synthesized).toEqual(['一样的题目']);
    expect(h.audios).toHaveLength(2); // 还是要播，但不重新合成
  });

  it('speakMany 按顺序念完每段，语言跟着段走', async () => {
    const h = makeHarness();
    const done = h.engine.speakMany([
      { text: '题干', lang: 'zh_CN' },
      { text: 'A. I would like a hamburger.', lang: 'en_US' },
    ]);
    await tick();
    expect(h.synthesized).toEqual(['题干']);
    h.audios[0]?.ended?.();
    await tick();
    expect(h.synthesized).toEqual(['题干', 'A. I would like a hamburger.']);
    h.audios[1]?.ended?.();
    await done;
    expect(h.audios).toHaveLength(2);
  });

  it('被下一次朗读打断时立即返回（页面不会卡住）', async () => {
    const h = makeHarness();
    const first = h.engine.speak('第一句');
    await tick();
    const second = h.engine.speak('第二句');
    await expect(first).resolves.toBeUndefined(); // 没有被 ended 也返回了
    expect(h.audios[0]?.stopped).toBe(true);
    await tick();
    h.audios[1]?.ended?.();
    await second;
  });

  it('stop 也会让在途的朗读立刻返回', async () => {
    const h = makeHarness();
    const done = h.engine.speak('念到一半');
    await tick();
    h.engine.stop();
    await expect(done).resolves.toBeUndefined();
    expect(h.engine.playing()).toBe(false);
  });
});

describe('静默降级', () => {
  it('合成失败不抛异常，页面照常往下走', async () => {
    const h = makeHarness({ failSynth: true });
    await expect(h.engine.speak('念不出来')).resolves.toBeUndefined();
    expect(h.audios).toEqual([]);
  });

  it('连续失败到上限后不再尝试合成（否则每道题都抛一次）', async () => {
    const h = makeHarness({ failSynth: true });
    for (let i = 0; i < 3; i += 1) await h.engine.speak(`第 ${i} 句`);
    expect(h.engine.enabled()).toBe(true); // 用户偏好没被改掉
    expect(h.engine.available()).toBe(false); // 但本次会话不再试
    await h.engine.speak('第四句');
    expect(h.synthesized).toHaveLength(3);
  });

  it('用户重新打开开关 = 重新给一次机会', async () => {
    const h = makeHarness({ failSynth: true });
    for (let i = 0; i < 3; i += 1) await h.engine.speak(`第 ${i} 句`);
    expect(h.engine.available()).toBe(false);
    h.engine.setEnabled(false);
    h.engine.setEnabled(true);
    expect(h.engine.available()).toBe(true);
  });

  it('播放器创建失败也不抛', async () => {
    const engine = createReadAloud({
      synthesize: async () => 'tts://x',
      createAudio: () => {
        throw new Error('没有音频设备');
      },
      readOffFlag: () => false,
      writeOffFlag: () => undefined,
    });
    await expect(engine.speak('念不出来')).resolves.toBeUndefined();
  });
});

describe('splitForSpeech（讲解分段，微信 TTS 单次上限约 50 字）', () => {
  it('短文本原样返回', () => {
    expect(splitForSpeech('密度等于质量除以体积')).toEqual(['密度等于质量除以体积']);
  });

  it('空文本返回空数组', () => {
    expect(splitForSpeech('')).toEqual([]);
    expect(splitForSpeech('   ')).toEqual([]);
  });

  it('超长文本在句末标点处切分，每段不超过 maxLen', () => {
    const text =
      '速度是描述物体运动快慢的物理量。速度等于路程除以时间，单位是米每秒，常用千米每小时。';
    const parts = splitForSpeech(text, 30);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(30);
    expect(parts.join('')).toBe(text);
  });

  it('拼接后与原文一致（不丢字、不重复）', () => {
    const text =
      '压强等于压力除以受力面积，单位是帕斯卡。增大压强可以减小受力面积，减小压强可以增大受力面积。';
    expect(splitForSpeech(text, 40).join('')).toBe(text);
  });

  it('单个超长无标点片段也会被硬切到 maxLen', () => {
    const long = 'A'.repeat(120);
    const parts = splitForSpeech(long, 50);
    expect(parts.length).toBe(3);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(50);
  });
});
