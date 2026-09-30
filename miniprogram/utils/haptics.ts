// 触感反馈（震动）。
//
// 为什么视觉按下态之外还要这一层：hover-class（见 styles/components.wxss 的 .u-tap 三档）
// 只解决「看得出来我按到了」；**答对 / 答错 / 通关**这些结果，身体也该收到一下。
// 反过来，普通翻页、切 tab 一律不震 —— 15ms 的震动点哪儿都来一下会很吵，也费电。
//
// 三条约束（都不是可选项）：
//   1. **默认开、可手动关**（设置页「按键触感」）。存的是「关」标记，没写过的老用户 = 开。
//      口径与 utils/readAloud.ts 一致，别一个存开一个存关。
//   2. **静默失败是硬要求**：wx.vibrateShort 仅在 iPhone 7 / 7 Plus 以上与 Android 生效，
//      设备不支持时 fail 回 `style is not support`；用户在系统里关掉触感同样是失败。
//      ⇒ 震不了就当没这回事，**绝不报错、绝不弹窗**。
//   3. **调用方只写语义**（'correct' / 'wrong' / 'finish'），强度映射收在这里；
//      不要在页面里散落 'light' / 'heavy' 这种跟手感强耦合的字面量。
//
// 震动端口与开关存储都可注入，所以整个模块能脱离 wx 单测（见 tests/haptics.test.ts）。

export type HapticKind = 'light' | 'medium' | 'heavy';

/** 语义化提示：页面只认这四个 */
export type HapticCue = 'tap' | 'correct' | 'wrong' | 'finish';

// 存「关」而不是存「开」：没写过这个 key 的老用户 = 默认开
const OFF_KEY = 'haptic_off_v1';

/** 语义 → 强度。想调手感改这一张表就够了 */
const CUE_LEVEL: Readonly<Record<HapticCue, HapticKind>> = {
  tap: 'light',
  correct: 'light',
  wrong: 'heavy', // 错要给得出来：答错是少数事件，重一点才拦得住注意力
  finish: 'medium',
};

export interface HapticsDeps {
  readonly vibrate?: (kind: HapticKind) => void;
  readonly readOffFlag?: () => boolean;
  readonly writeOffFlag?: (off: boolean) => void;
}

export interface Haptics {
  /** 使用者的偏好（开关 UI 显示这个） */
  enabled(): boolean;
  setEnabled(on: boolean): void;
  /** 按语义震一下。关掉 / 设备不支持时什么都不做，也不抛错 */
  cue(cue: HapticCue): void;
}

export function createHaptics(deps: HapticsDeps = {}): Haptics {
  const vibrate = deps.vibrate ?? defaultVibrate;
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
        console.error('触感开关写入失败', error);
      }
    });

  return {
    enabled() {
      return !readOff();
    },

    setEnabled(on) {
      writeOff(!on);
    },

    cue(cue) {
      if (readOff()) return;
      // 再兜一层：震动是「锦上添花」，任何环节出问题都不许冒泡到页面。
      // 缺省端口（defaultVibrate）自己已经 try 过，这里是防注入端口 / 未来改动。
      try {
        vibrate(CUE_LEVEL[cue]);
      } catch (error) {
        console.error('触感反馈失败', error);
      }
    },
  };
}

// 真实震动端口：失败只记日志（⚠️ 大部分「失败」其实是设备/系统不支持，不是 bug）
function defaultVibrate(kind: HapticKind): void {
  try {
    wx.vibrateShort({
      type: kind,
      fail: (error: { errMsg?: string }) => {
        // 只在真·异常时才值得看一眼；`style is not support` 是设备不支持，属于正常
        const msg = error?.errMsg ?? '';
        if (!msg.includes('is not support')) console.error('触感反馈失败', msg);
      },
    });
  } catch (error) {
    console.error('触感反馈调用失败', error);
  }
}

export const haptics: Haptics = createHaptics();
