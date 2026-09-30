// AI 辅导的「场景 → 快捷按钮」映射（需求第三十八章）。
//
// 为什么单独抽出来：这层决定的是**产品规则**（用户在什么场景能看到哪些按钮、
// 开场白说什么），不是样式细节。抽成纯函数才能单测，也避免规则散落在 wxml 里。
// 页面（pages/ai-tutor）只负责把结果渲染出来。
import type { AiTutorAction } from '../core/ai';

export interface AiQuickAction {
  readonly action: AiTutorAction;
  readonly label: string;
}

// 按钮文案（第三十八章列出的动作）。qa 走输入框、status 是内部自检，都不出现在快捷栏。
export const AI_ACTION_LABEL: Partial<Record<AiTutorAction, string>> = {
  explain: '我没看懂',
  simplify: '再简单一点',
  example: '举个例子',
  hint: '只提示一步',
  why: '为什么',
  similar: '给我一道类似题',
  diagnose: '错因在哪',
  advise: '学习建议',
};

// 三种进入场景：
// - question ：带着题干进来（测试/练习答错后问 AI）→ 优先错因与类似题
// - knowledge：只带知识点进来（学习详情页「问 AI」）→ 优先举例与建议
// - free     ：什么都不带（我的 → AI 辅导）→ 只留建议 + 输入框
export type AiScene = 'question' | 'knowledge' | 'free';

export function sceneOf(hasStem: boolean, hasKnowledge: boolean): AiScene {
  if (hasStem) return 'question';
  if (hasKnowledge) return 'knowledge';
  return 'free';
}

const SCENE_ACTIONS: Record<AiScene, readonly AiTutorAction[]> = {
  question: ['explain', 'simplify', 'hint', 'why', 'diagnose', 'similar'],
  knowledge: ['explain', 'simplify', 'example', 'hint', 'why', 'advise'],
  free: ['advise'],
};

export function buildQuickActions(scene: AiScene): AiQuickAction[] {
  return SCENE_ACTIONS[scene].flatMap((action) => {
    const label = AI_ACTION_LABEL[action];
    return label ? [{ action, label }] : [];
  });
}

export function greetingText(scene: AiScene): string {
  if (scene === 'question') return '题目我看到了。是想先弄懂题意，还是想知道为什么选这个答案？';
  if (scene === 'knowledge') {
    return '关于这个知识点，你可以问我「为什么」「举个例子」，或者让我换个更简单的说法。';
  }
  return '我是你的 AI 助教。哪里卡住了，直接问我。';
}
