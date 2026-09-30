// 游戏音频服务（Chapter 15 Q4）。
//
// 2026-09-17 重写：**不再依赖任何音频文件**。
// 原来这里指着 5 个 `cloud://.../audio/*.wav`，那些文件其实从没上传过——
// 也就是说小蜜蜂一直是静音的，而「上传素材」这条路要维护云存储、还要占包体。
// 现在改成走 utils/synthAudio：**用振荡器实时合成**，零素材、零体积、随时可改音色。
//
// 接口保持原样（playSfx / startBgm / stopBgm / duckBgm / restoreBgm），
// 页面一行都不用改。
import { sfx, type SfxEngine } from '../utils/synthAudio';

const MUTE_KEY = 'game_audio_muted_v1';

export type ShooterSfxName = 'hit' | 'shoot' | 'explode' | 'miss';

// 游戏语义 → 合成音效（语义与音色分开，以后想换音色只改这张表）
const SFX_MAP: Record<ShooterSfxName, Parameters<SfxEngine['play']>[0]> = {
  hit: 'hit',
  shoot: 'shoot',
  explode: 'explode',
  miss: 'wrong',
};

export interface ShooterAudio {
  playSfx(name: ShooterSfxName): void;
  startBgm(): void;
  stopBgm(): void;
  duckBgm(): void;
  restoreBgm(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

const BGM_FULL = 0.16;
const BGM_DUCKED = 0.04; // 有发音/爆炸时把 BGM 压下去，别盖住主要声音

const readMuted = (): boolean => {
  try {
    return wx.getStorageSync(MUTE_KEY) === true;
  } catch {
    return false;
  }
};

const writeMuted = (muted: boolean): void => {
  try {
    wx.setStorageSync(MUTE_KEY, muted);
  } catch {
    // 存不下就不持久化，本次会话内仍然生效
  }
};

export function createShooterAudio(engine: SfxEngine): ShooterAudio {
  let ducked = false;
  return {
    playSfx(name) {
      engine.play(SFX_MAP[name]);
    },
    startBgm() {
      engine.setBgmVolume(ducked ? BGM_DUCKED : BGM_FULL);
      engine.startBgm();
    },
    stopBgm() {
      engine.stopBgm();
    },
    duckBgm() {
      ducked = true;
      engine.setBgmVolume(BGM_DUCKED);
    },
    restoreBgm() {
      ducked = false;
      engine.setBgmVolume(BGM_FULL);
    },
    setMuted(muted) {
      engine.setMuted(muted);
      writeMuted(muted);
    },
    isMuted() {
      return engine.isMuted();
    },
  };
}

export const shooterAudio: ShooterAudio = createShooterAudio(sfx);

// 进游戏前把上次的静音选择读回来（孩子自己关掉的，别每次进来又响）
export function restoreShooterAudioPreference(): void {
  sfx.setMuted(readMuted());
}
