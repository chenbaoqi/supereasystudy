# 小蜜蜂音效（Chapter 15 Q4，SAMPLE 级别）

`scripts/generate_shooter_audio.py` 合成的 8-bit 风格音效（程序波表，无外部依赖）。

## 文件

| 文件              | 用途                      | 时长  |
| ----------------- | ------------------------- | ----- |
| `sfx_hit.wav`     | 命中目标                  | 0.25s |
| `sfx_shoot.wav`   | 按键匹配发射              | 0.15s |
| `sfx_explode.wav` | 方块爆炸                  | 0.4s  |
| `sfx_miss.wav`    | Game Over                 | 0.5s  |
| `bgm_loop.wav`    | 背景循环（chiptune 琶音） | 32s   |

## 上线步骤（5 分钟）

1. **上传到云存储**：云开发控制台 →「存储」→ 新建文件夹 `audio/` →
   上传本目录 **5 个 WAV**
2. **复制 File ID**：点每个文件 → 复制 `cloud://...` 格式的 File ID
3. **告诉我 5 个 File ID**（或自己替换 `miniprogram/services/shooterAudio.ts` 里的 `SFX` 字典值）
4. 小程序编译 → 小蜜蜂游戏即有音效 + BGM

## 替换方法

`shooterAudio.ts` 第 6 行附近：

```ts
const SFX: Record<string, string | null> = {
  hit: null, // ← 替换为 sfx_hit.wav 的 File ID
  shoot: null, // ← sfx_shoot.wav
  explode: null, // ← sfx_explode.wav
  miss: null, // ← sfx_miss.wav
  bgm: null, // ← bgm_loop.wav
};
```

> ⚠️ 云存储权限：`audios/` 文件夹需设为「所有用户可读」（与 banner 同坑，`scripts/assets/banners/README.md` 有前车之鉴）
