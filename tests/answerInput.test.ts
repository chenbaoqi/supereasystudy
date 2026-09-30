// 数字键盘答题的输入规则单测（口算冒险岛 / 速算共用）。
import { describe, expect, it } from 'vitest';
import { isInputComplete } from '../miniprogram/core/answerInput';

describe('isInputComplete（填完即判定）', () => {
  it('输入正好等于答案 → 自动判定', () => {
    expect(isInputComplete('10', 10)).toBe(true);
    expect(isInputComplete('0', 0)).toBe(true);
    expect(isInputComplete('7', 7)).toBe(true);
    expect(isInputComplete('100', 100)).toBe(true);
  });

  it('没填完 / 填错都不自动判定（要按确定）', () => {
    expect(isInputComplete('', 10)).toBe(false);
    expect(isInputComplete('1', 10)).toBe(false);
    expect(isInputComplete('12', 10)).toBe(false);
  });

  // 这条是防回归的关键：按「输入长度」自动判定会把答案 5、孩子想写 15 的情况判错
  it('答案是 5 时，输入 1 不判（孩子可能正要写 15）', () => {
    expect(isInputComplete('1', 5)).toBe(false);
    expect(isInputComplete('15', 5)).toBe(false); // 15 ≠ 5，仍要按确定才算答完
    expect(isInputComplete('5', 5)).toBe(true);
  });

  it('前导零不影响判定（05 = 5 就是答对）', () => {
    expect(isInputComplete('05', 5)).toBe(true);
  });
});
