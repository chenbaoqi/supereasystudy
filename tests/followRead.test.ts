// 跟读判分单测（2026-09-29）：锁 matchSpoken 的归一化口径。
// 背景：语音识别返回的英文文本天然「脏」——大写、句点、多词、空串，判分必须宽容「脏」但不放过「读错」。
import { describe, expect, it } from 'vitest';
import { matchSpoken } from '../miniprogram/services/followReadService';

describe('matchSpoken（识别文本 vs 目标单词）', () => {
  it('完全一致 → 判对', () => {
    expect(matchSpoken('apple', 'apple')).toBe(true);
  });

  it('首字母大写 → 判对（识别器常见）', () => {
    expect(matchSpoken('Apple', 'apple')).toBe(true);
  });

  it('句尾带标点 → 判对（剥掉句点）', () => {
    expect(matchSpoken('apple.', 'apple')).toBe(true);
    expect(matchSpoken('apple!', 'apple')).toBe(true);
  });

  it('前后空格 → 判对', () => {
    expect(matchSpoken('  apple  ', 'apple')).toBe(true);
  });

  it('连字符 / 空格在词中 → 归一化后判对', () => {
    expect(matchSpoken('ice cream', 'ice-cream')).toBe(true);
  });

  it('撇号词保留撇号 → 判对', () => {
    expect(matchSpoken("don't", "don't")).toBe(true);
  });

  it('多读一个词 → 判错（这是跟读要抓的）', () => {
    expect(matchSpoken('an apple', 'apple')).toBe(false);
  });

  it('读错（漏字母）→ 判错', () => {
    expect(matchSpoken('aple', 'apple')).toBe(false);
  });

  it('识别空串 → 判错（由调用方按「没听清」兜底）', () => {
    expect(matchSpoken('', 'apple')).toBe(false);
    expect(matchSpoken('   ', 'apple')).toBe(false);
  });

  it('目标词空串 → 判错（防御）', () => {
    expect(matchSpoken('apple', '')).toBe(false);
  });
});
