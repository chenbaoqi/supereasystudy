// 拼写练习的判定规则（2026-09-21）。
//
// 产出型练习对孩子的容错很关键：打对了但**大小写、多打空格、用了中文标点**
// 就判错的话，练习会从「帮助记忆」变成「惩罚手滑」。这里锁住容错边界。
import { describe, expect, it } from 'vitest';
import { normalizeText } from '../miniprogram/services/questionJudge';

const spelledRight = (input: string, answer: string): boolean =>
  normalizeText(input) === normalizeText(answer);

describe('拼写判定', () => {
  it('完全一致 → 对', () => {
    expect(spelledRight('apple', 'apple')).toBe(true);
  });

  it('⚠️ 大小写不同也算对（孩子常把首字母大写）', () => {
    expect(spelledRight('Apple', 'apple')).toBe(true);
    expect(spelledRight('HELLO', 'hello')).toBe(true);
  });

  it('⚠️ 首尾/中间多打空格也算对', () => {
    expect(spelledRight(' apple ', 'apple')).toBe(true);
    expect(spelledRight('ap ple', 'apple')).toBe(true);
  });

  it('⚠️ 复合词写不写空格都算对（normalizeText 会去掉所有空格——刻意宽容）', () => {
    expect(spelledRight('ice cream', 'icecream')).toBe(true);
    expect(spelledRight('icecream', 'ice cream')).toBe(true);
  });

  it('⚠️ 中文标点/全角输入也算对', () => {
    expect(spelledRight('ｈｅｌｌｏ', 'hello')).toBe(true);
  });

  it('真的拼错 → 不对', () => {
    expect(spelledRight('aple', 'apple')).toBe(false);
    expect(spelledRight('banana', 'apple')).toBe(false);
  });

  it('空输入不算对（不然一进来就判对）', () => {
    expect(normalizeText('')).toBe('');
    expect(spelledRight('   ', 'apple')).toBe(false);
  });
});
