// 「一道题 → AI 辅导上下文」单测。
// 这些断言守的是**答错后问 AI 能不能真的带上题**：
//   题干、选项、学生答案、正确答案缺一项，AI 就只能泛泛而谈，等于白接。
import { describe, expect, it } from 'vitest';
import {
  buildQuestionHandoff,
  canAskAi,
  contextMetaLines,
  hintsFor,
  mergeContext,
  optionText,
  stemOf,
  type AiQuestionInput,
  type QuestionForAi,
} from '../miniprogram/services/aiTutorQuestion';
import { createAiTutorHandoff } from '../miniprogram/services/aiTutorHandoff';

const WORD_Q: QuestionForAi = {
  prompt: 'apple',
  options: ['香蕉', '苹果', '橙子', '梨'],
  correctIndex: 1,
  kind: 'word',
  word: 'apple',
};

const WORD_K = {
  word: 'apple',
  meaning: '苹果',
  ipa: '/ˈæpl/',
  partOfSpeech: 'n.',
  example: 'I eat an apple every day.',
  translation: '我每天吃一个苹果。',
  type: 'word',
};

function inputOf(overrides: Partial<AiQuestionInput> = {}): AiQuestionInput {
  return { question: WORD_Q, knowledge: WORD_K, selectedIndex: 0, ...overrides };
}

describe('optionText', () => {
  it('下标越界返回空串，不抛异常', () => {
    expect(optionText(['a'], 0)).toBe('a');
    expect(optionText(['a'], -1)).toBe('');
    expect(optionText(['a'], 9)).toBe('');
  });
});

describe('stemOf', () => {
  it('普通题直接用题干', () => {
    expect(stemOf(WORD_Q)).toBe('apple');
  });

  it('听力题把被朗读的词写进题干（AI 听不到音频）', () => {
    expect(stemOf({ ...WORD_Q, kind: 'listening', audioWord: 'apple' })).toBe('听音选词：apple');
  });
});

describe('hintsFor（三级提示）', () => {
  it('单词题：释义 → 例句 → 讲解，三级都不空', () => {
    const hints = hintsFor(inputOf());
    expect(hints).toHaveLength(3);
    expect(hints[0]).toContain('苹果');
    expect(hints[1]).toContain('I eat an apple');
    expect(hints[2]).toContain('苹果');
    for (const h of hints) expect(h.trim().length).toBeGreaterThan(0);
  });

  it('语法题走语法分支：简述 → 讲解 → 讲解+答案', () => {
    const hints = hintsFor(
      inputOf({
        question: { ...WORD_Q, kind: 'grammar', prompt: 'He ___ to school.' },
        knowledge: {
          word: '一般现在时',
          meaning: '表示经常发生的动作',
          explanation: '主语三单 + 动词 s',
          type: 'grammar',
        },
      }),
    );
    expect(hints[0]).toContain('一般现在时');
    expect(hints[2]).toContain('主语三单');
  });

  it('没有知识点时也必须给出可用提示（按钮永远有反应）', () => {
    const hints = hintsFor(inputOf({ knowledge: null }));
    expect(hints).toHaveLength(3);
    expect(hints[1]).toContain('苹果'); // 正确答案落在第 2 级
    for (const h of hints) expect(h.trim().length).toBeGreaterThan(0);
  });

  it('知识点缺例句也不产生空提示', () => {
    const hints = hintsFor(inputOf({ knowledge: { word: 'apple', meaning: '苹果' } }));
    for (const h of hints) expect(h.trim().length).toBeGreaterThan(0);
  });
});

describe('buildQuestionHandoff', () => {
  it('题干/选项/学生答案/正确答案全部带上', () => {
    const { context, hints } = buildQuestionHandoff(inputOf({ selectedIndex: 0 }));
    expect(context.stem).toBe('apple');
    expect(context.options).toEqual(['香蕉', '苹果', '橙子', '梨']);
    expect(context.studentAnswer).toBe('香蕉'); // 学生选的是 A
    expect(context.correctAnswer).toBe('苹果'); // 正确答案是 B
    expect(hints).toHaveLength(3);
  });

  it('学科与年级带上（AI 要按年级调讲法）', () => {
    const { context } = buildQuestionHandoff(inputOf({ subjectName: '英语', grade: 3 }));
    expect(context.subjectName).toBe('英语');
    expect(context.grade).toBe(3);
    expect(context.stage).toBe('primary');
  });

  it('没选过（selectedIndex=-1）时学生答案为空，不塞脏数据', () => {
    const { context } = buildQuestionHandoff(inputOf({ selectedIndex: -1 }));
    expect(context.studentAnswer).toBeUndefined();
    expect(context.correctAnswer).toBe('苹果');
  });

  it('知识点名回退到 question.word（知识点查不到时也要有标题）', () => {
    const { context } = buildQuestionHandoff(inputOf({ knowledge: null }));
    expect(context.knowledgeTitle).toBe('apple');
  });
});

describe('canAskAi', () => {
  it('没题目或没选项都不能问', () => {
    expect(canAskAi(WORD_Q)).toBe(true);
    expect(canAskAi(null)).toBe(false);
    expect(canAskAi({ ...WORD_Q, options: [] })).toBe(false);
  });
});

describe('mergeContext', () => {
  it('交接里显式 undefined 的字段不会把 URL 参数抹掉', () => {
    const merged = mergeContext(
      { subjectName: '数学', stem: '1+1=?' },
      { subjectName: undefined, stem: undefined, grade: 2 },
    );
    expect(merged.subjectName).toBe('数学');
    expect(merged.stem).toBe('1+1=?');
    expect(merged.grade).toBe(2);
  });

  it('有值的字段正常覆盖', () => {
    expect(mergeContext({ stem: '旧题' }, { stem: '新题' }).stem).toBe('新题');
  });

  it('没有交接时原样返回', () => {
    expect(mergeContext({ stem: 'a' }, null)).toEqual({ stem: 'a' });
  });
});

describe('contextMetaLines', () => {
  it('答错进来要显示选项 / 你选了 / 正确答案三条', () => {
    const lines = contextMetaLines({
      stem: 'apple',
      options: ['香蕉', '苹果'],
      studentAnswer: '香蕉',
      correctAnswer: '苹果',
    });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('A. 香蕉');
    expect(lines[0]).toContain('B. 苹果');
    expect(lines[1]).toContain('香蕉');
    expect(lines[2]).toContain('苹果');
  });

  it('没有题目上下文时不产生任何行', () => {
    expect(contextMetaLines({})).toHaveLength(0);
  });
});

describe('aiTutorHandoff 交接区', () => {
  it('set 后取一次拿到，再取为空（一次性，不留脏数据）', () => {
    const store = createAiTutorHandoff();
    const payload = buildQuestionHandoff(inputOf());
    store.set(payload);
    expect(store.take()).toEqual(payload);
    expect(store.take()).toBeNull();
  });

  it('clear 后取不到', () => {
    const store = createAiTutorHandoff();
    store.set(buildQuestionHandoff(inputOf()));
    store.clear();
    expect(store.take()).toBeNull();
  });

  it('新的交接覆盖旧的（连续答错两题不会串题）', () => {
    const store = createAiTutorHandoff();
    store.set(buildQuestionHandoff(inputOf()));
    store.set(buildQuestionHandoff(inputOf({ question: { ...WORD_Q, prompt: 'banana' } })));
    expect(store.take()?.context.stem).toBe('banana');
  });
});
