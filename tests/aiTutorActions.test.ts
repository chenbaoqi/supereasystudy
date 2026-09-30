// AI 辅导「场景 → 快捷按钮」规则单测（需求第三十八章）。
// 重点不是文案好不好听，而是：场景判定正确、按钮不丢、按钮不重复。
import { describe, expect, it } from 'vitest';
import {
  AI_ACTION_LABEL,
  buildQuickActions,
  greetingText,
  sceneOf,
  type AiScene,
} from '../miniprogram/services/aiTutorActions';

const SCENES: readonly AiScene[] = ['question', 'knowledge', 'free'];

describe('sceneOf（场景判定）', () => {
  it('有题干优先判为 question（哪怕同时带知识点）', () => {
    expect(sceneOf(true, true)).toBe('question');
    expect(sceneOf(true, false)).toBe('question');
  });

  it('只有知识点判为 knowledge', () => {
    expect(sceneOf(false, true)).toBe('knowledge');
  });

  it('两者都没有判为 free', () => {
    expect(sceneOf(false, false)).toBe('free');
  });
});

describe('buildQuickActions', () => {
  it('答错场景给错因与类似题（这是问 AI 的主场景）', () => {
    const actions = buildQuickActions('question').map((item) => item.action);
    expect(actions).toContain('diagnose');
    expect(actions).toContain('similar');
    expect(actions).toContain('hint');
  });

  it('看知识点场景给举例与学习建议', () => {
    const actions = buildQuickActions('knowledge').map((item) => item.action);
    expect(actions).toContain('example');
    expect(actions).toContain('advise');
  });

  it('自由问答只留学习建议，其余靠输入框', () => {
    expect(buildQuickActions('free')).toHaveLength(1);
    expect(buildQuickActions('free')[0]?.action).toBe('advise');
  });

  it('每个按钮都带得出文案（漏配文案会静默丢按钮，这里守住）', () => {
    for (const scene of SCENES) {
      const actions = buildQuickActions(scene);
      expect(actions.length).toBeGreaterThan(0);
      for (const item of actions) {
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('同一场景内按钮不重复', () => {
    for (const scene of SCENES) {
      const keys = buildQuickActions(scene).map((item) => item.action);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('status 与 qa 不出现在快捷栏（status 是内部自检，qa 走输入框）', () => {
    for (const scene of SCENES) {
      const keys = buildQuickActions(scene).map((item) => item.action);
      expect(keys).not.toContain('status');
      expect(keys).not.toContain('qa');
    }
  });
});

describe('greetingText', () => {
  it('三种场景开场白各不相同，且都不为空', () => {
    const texts = SCENES.map((scene) => greetingText(scene));
    for (const text of texts) expect(text.length).toBeGreaterThan(0);
    expect(new Set(texts).size).toBe(SCENES.length);
  });
});

describe('AI_ACTION_LABEL', () => {
  it('快捷栏用到的动作都必须有文案', () => {
    for (const scene of SCENES) {
      for (const item of buildQuickActions(scene)) {
        expect(AI_ACTION_LABEL[item.action]).toBe(item.label);
      }
    }
  });
});
