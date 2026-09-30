// 触感反馈（震动）。
//
// 测的是这个模块自己的责任，不是微信的震动 API：
//   1. **默认开、可手动关**（与读题同一个口径：存「关」，老用户升级也是开）；
//   2. 关掉之后一次都不该震；
//   3. **语义 → 强度**的映射收在模块里，页面不该写 'light' / 'heavy'；
//   4. 设备不支持 / 系统关了触感 ⇒ 静默，不抛错。
import { describe, expect, it } from 'vitest';
import { createHaptics, type HapticKind } from '../miniprogram/utils/haptics';

interface Harness {
  haptics: ReturnType<typeof createHaptics>;
  vibrated: HapticKind[];
  offWrites: boolean[];
}

function makeHarness(options: { off?: boolean } = {}): Harness {
  const vibrated: HapticKind[] = [];
  const offWrites: boolean[] = [];
  const haptics = createHaptics({
    vibrate: (kind) => {
      vibrated.push(kind);
    },
    readOffFlag: () => options.off === true,
    writeOffFlag: (off) => {
      offWrites.push(off);
    },
  });
  return { haptics, vibrated, offWrites };
}

describe('触感反馈', () => {
  it('默认开：没写过开关就震', () => {
    const { haptics, vibrated } = makeHarness();
    expect(haptics.enabled()).toBe(true);
    haptics.cue('correct');
    expect(vibrated).toEqual(['light']);
  });

  it('关掉之后一次都不震', () => {
    const { haptics, vibrated } = makeHarness({ off: true });
    expect(haptics.enabled()).toBe(false);
    haptics.cue('correct');
    haptics.cue('wrong');
    haptics.cue('finish');
    expect(vibrated).toEqual([]);
  });

  it('setEnabled(false) 写「关」、setEnabled(true) 清掉标记', () => {
    const { haptics, offWrites } = makeHarness();
    haptics.setEnabled(false);
    haptics.setEnabled(true);
    expect(offWrites).toEqual([true, false]);
  });

  it('语义映射：答错最重，通关居中，其余轻', () => {
    const { haptics, vibrated } = makeHarness();
    haptics.cue('tap');
    haptics.cue('correct');
    haptics.cue('wrong');
    haptics.cue('finish');
    expect(vibrated).toEqual(['light', 'light', 'heavy', 'medium']);
  });

  it('震动端口抛错时不冒泡到页面', () => {
    const haptics = createHaptics({
      vibrate: () => {
        throw new Error('设备不支持');
      },
      readOffFlag: () => false,
      writeOffFlag: () => undefined,
    });
    expect(() => haptics.cue('wrong')).not.toThrow();
  });
});
