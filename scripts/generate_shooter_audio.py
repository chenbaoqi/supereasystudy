#!/usr/bin/env python3
"""小蜜蜂音效合成器（Chapter 15 Q4）。
生成 4 个短音效 WAV + 1 个 BGM loop，无需任何外部素材。
输出到 scripts/assets/audio/（同 banner 流程：手动上传云存储）。
"""
import math
import os
import struct
import wave

SAMPLE_RATE = 22050
OUTPUT = os.path.join(os.path.dirname(__file__), "assets", "audio")
os.makedirs(OUTPUT, exist_ok=True)


def make_wav(filename, samples_fn, seconds):
    """生成 16-bit mono WAV"""
    count = int(SAMPLE_RATE * seconds)
    data = samples_fn(count)
    max_val = max(abs(v) for v in data)
    scale = 32000 / max_val if max_val > 0 else 1
    path = os.path.join(OUTPUT, filename)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        for sample in data:
            wf.writeframes(struct.pack("<h", int(sample * scale)))
    print(f"  {filename}  {os.path.getsize(path)} bytes")


def adsr(count, attack, decay, sustain, release):
    """ADSR 包络: 返回每个采样点的增益系数"""
    env = []
    for i in range(count):
        t = i / count
        if t < attack:
            env.append(t / attack)
        elif t < attack + decay:
            env.append(1 - (1 - sustain) * (t - attack) / decay)
        elif t < 1 - release:
            env.append(sustain)
        else:
            env.append(sustain * (1 - (t - (1 - release)) / release))
    return env


print("生成小蜜蜂音效…")

# ① 命中音（高→低扫频，欢快）
def hit_samples(count):
    env = adsr(count, 0.01, 0.1, 0.5, 0.2)
    return [env[i] * math.sin(2 * math.pi * (800 - 500 * i / count) * i / SAMPLE_RATE) for i in range(count)]

make_wav("sfx_hit.wav", hit_samples, 0.25)

# ② 发射音（快速上升，尖锐）
def shoot_samples(count):
    env = adsr(count, 0.02, 0.05, 0.3, 0.1)
    return [env[i] * math.sin(2 * math.pi * (300 + 600 * i / count) * i / SAMPLE_RATE) for i in range(count)]

make_wav("sfx_shoot.wav", shoot_samples, 0.15)

# ③ 爆炸/方块消失音（噪声爆破）
def explode_samples(count):
    env = adsr(count, 0.01, 0.15, 0.3, 0.3)
    return [env[i] * (math.sin(2 * math.pi * (120 + 400 * (i % 17) / 17) * i / SAMPLE_RATE) * 0.7
                      + math.sin(2 * math.pi * (80 + 200 * (i % 13) / 13) * i / SAMPLE_RATE) * 0.3)
            for i in range(count)]

make_wav("sfx_explode.wav", explode_samples, 0.4)

# ④ 失败音（低音下沉，Game Over）
def miss_samples(count):
    env = adsr(count, 0.02, 0.1, 0.6, 0.4)
    return [env[i] * math.sin(2 * math.pi * (300 - 200 * i / count) * i / SAMPLE_RATE) * 0.5 for i in range(count)]

make_wav("sfx_miss.wav", miss_samples, 0.5)

# ⑤ BGM（简单琶音循环，约 30 秒）
def bgm_samples(count):
    notes = [262, 330, 392, 330, 294, 349, 440, 349, 330, 392, 523, 392, 294, 349, 440, 349]
    note_len = count // (len(notes) * 4)
    output = []
    for n in range(len(notes) * 4):
        freq = notes[n // 4] * (1 if n % 2 == 0 else 1.06)
        for i in range(note_len):
            t = i / SAMPLE_RATE
            arp = freq * (1 + 0.003 * math.sin(2 * math.pi * 4 * t))
            output.append(0.15 * math.sin(2 * math.pi * arp * t) + 0.05 * math.sin(2 * math.pi * arp * 2 * t))
    return output

make_wav("bgm_loop.wav", bgm_samples, 32)

print(f"\n完成 → {OUTPUT}/")
for f in sorted(os.listdir(OUTPUT)):
    if f.endswith(".wav"):
        print(f"  scripts/assets/audio/{f}")
print("\n下一步：手动上传 5 个 WAV 到云存储 'audio/' 文件夹 → 复制 File ID → 告诉我即可")
