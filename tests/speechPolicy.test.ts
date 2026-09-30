// 语音能力策略 + 试卷配置单测（2026-09-13：非语言学科取消语音）。
// 背景：数学概念（如「1~5的认识」）被 TTS 以 en_US 朗读是一串乱码，噪音大于价值。
import { describe, expect, it } from 'vitest';
import type { Knowledge } from '../miniprogram/core/knowledge';
import { allowSpeech } from '../miniprogram/services/speechPolicy';
import { getTestPaperConfig, TEST_PAPER_CONFIG } from '../miniprogram/config/testPaper';
import { getSubjectUiConfig } from '../miniprogram/config/subjects';

const make = (type?: Knowledge['type']): Knowledge => ({
  _id: 'k1',
  chapterId: 'c1',
  word: 'hello',
  meaning: '你好',
  order: 1,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...(type ? { type } : {}),
});

describe('allowSpeech（发音按钮是否显示）', () => {
  it('学科开关 false → 一律不显示（即使是单词）', () => {
    expect(allowSpeech(false, make('word'))).toBe(false);
  });

  it('学科开关 true + 单词 → 显示', () => {
    expect(allowSpeech(true, make('word'))).toBe(true);
  });

  it('语法点永远不朗读（即使学科支持语音）', () => {
    expect(allowSpeech(true, make('grammar'))).toBe(false);
  });

  it('学科未知 → 按类型兜底：概念/公式不朗读', () => {
    expect(allowSpeech(null, make('concept'))).toBe(false);
    expect(allowSpeech(null, make('formula'))).toBe(false);
  });

  it('学科未知 → 单词兜底为可读（英语缺 semesterId 时不退化）', () => {
    expect(allowSpeech(null, make('word'))).toBe(true);
  });

  it('无当前条目 → 不显示', () => {
    expect(allowSpeech(true, null)).toBe(false);
  });
});

describe('学科 UI 配置（supportsSpeech）', () => {
  it('英语支持语音，数学不支持', () => {
    expect(getSubjectUiConfig('英语').supportsSpeech).toBe(true);
    expect(getSubjectUiConfig('数学').supportsSpeech).toBe(false);
  });

  it('物理不支持语音（物理概念/规律朗读无意义）', () => {
    expect(getSubjectUiConfig('物理').supportsSpeech).toBe(false);
  });

  it('未知学科回退到默认（英语）配置，不崩', () => {
    expect(getSubjectUiConfig('化学').supportsSpeech).toBe(true);
  });
});

describe('getTestPaperConfig（听力 Section 取舍）', () => {
  it('支持语音 → 听力 2 + 单词 6', () => {
    expect(getTestPaperConfig(true)).toEqual({
      listening: 2,
      word: 6,
      grammar: 2,
      reading: 0,
      total: 10,
    });
  });

  it('不支持语音 → 听力 0，题量补给单词（总题量不变）', () => {
    const config = getTestPaperConfig(false);
    expect(config.listening).toBe(0);
    expect(config.word).toBe(8);
    expect(config.total).toBe(10);
    expect(config.listening + config.word).toBe(
      TEST_PAPER_CONFIG.listening + TEST_PAPER_CONFIG.word,
    );
  });

  it('两种配置的总题量与语法题数保持一致（换学科不换卷面结构）', () => {
    const withSpeech = getTestPaperConfig(true);
    const without = getTestPaperConfig(false);
    expect(without.total).toBe(withSpeech.total);
    expect(without.grammar).toBe(withSpeech.grammar);
  });
});
