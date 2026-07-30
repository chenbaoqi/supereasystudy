// 小蜜蜂音频服务（Chapter 15 Q4）。
// URL 默认为空（V1 静音）；上传音效后替换为 cloud:// File ID 即可激活。
// InnerAudioContext 支持 cloud:// 路径，无需 getTempFileURL（与 banner 不同）。

const SFX: Record<string, string | null> = {
  hit: 'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/audio/sfx_hit.wav',
  shoot:
    'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/audio/sfx_shoot.wav',
  explode:
    'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/audio/sfx_explode.wav',
  miss: 'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/audio/sfx_miss.wav',
  bgm: 'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/audio/bgm_loop.wav',
};

export interface ShooterAudio {
  playSfx(name: 'hit' | 'shoot' | 'explode' | 'miss'): void;
  startBgm(): void;
  stopBgm(): void;
}

let bgmContext: WechatMiniprogram.InnerAudioContext | null = null;

export const shooterAudio: ShooterAudio = {
  playSfx(name) {
    const url = SFX[name];
    if (!url) return;
    const audio = wx.createInnerAudioContext();
    audio.src = url;
    audio.play();
    audio.onEnded(() => audio.destroy());
  },

  startBgm() {
    const url = SFX.bgm;
    if (!url) return;
    if (!bgmContext) {
      bgmContext = wx.createInnerAudioContext();
      bgmContext.loop = true;
    }
    bgmContext.src = url;
    bgmContext.play();
  },

  stopBgm() {
    bgmContext?.stop();
    bgmContext?.destroy();
    bgmContext = null;
  },
};

// 音频 URL 配置入口（上传后替换为 cloud://  File ID）
export function configureShooterAudio(urls: Record<string, string>) {
  Object.assign(SFX, urls);
}
