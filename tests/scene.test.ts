// 情景闯关的纯逻辑（core/scene.ts）。
//
// 重点测三条：
//   1. **第一次错不公布答案**（与冒险岛同口径）——这决定了孩子有没有第二次机会；
//   2. 二次错才推进，并且结算的题数不会被「一次错后重选」重复计数；
//   3. 空题组 / 0 分不假装全对（0/0 记 0 不记 100）。
import { describe, expect, it } from 'vitest';
import {
  createSceneRun,
  currentSceneQuestion,
  findSceneQuest,
  findSceneQuestWithPack,
  sceneFeedbackSpeak,
  sceneQuestionSpeak,
  sceneQuestionViewOf,
  sceneStorySpeak,
  sceneSummaryOf,
  submitSceneAnswer,
  type SceneQuest,
} from '../miniprogram/core/scene';

function makeQuest(count = 2): SceneQuest {
  const questions = Array.from({ length: count }, (_, i) => ({
    stem: `第 ${i + 1} 问`,
    options: ['A 项', 'B 项', 'C 项', 'D 项'],
    answerIndex: 1,
    hint: `提示 ${i + 1}`,
    explain: `讲解 ${i + 1}`,
  }));
  return { id: 'q1', name: '测试组', story: '故事', grade: 1, questions };
}

describe('submitSceneAnswer', () => {
  it('答对：推进到下一问，答对数 +1', () => {
    const quest = makeQuest();
    const res = submitSceneAnswer(quest, createSceneRun(quest), 1);
    expect(res.kind).toBe('correct');
    expect(res.right).toBe(true);
    expect(res.run.idx).toBe(1);
    expect(res.run.correct).toBe(1);
    expect(res.run.answered).toBe(1);
    expect(res.run.finished).toBe(false);
  });

  it('第一次错：给 hint，停在原题，不公布答案', () => {
    const quest = makeQuest();
    const res = submitSceneAnswer(quest, createSceneRun(quest), 0);
    expect(res.kind).toBe('hint');
    expect(res.run.idx).toBe(0); // 不推进——还有一次机会
    expect(res.run.attempts).toBe(1);
    expect(res.run.answered).toBe(0); // 还没结束，不能计入「已答」
  });

  it('第二次错：给 reveal，推进到下一问', () => {
    const quest = makeQuest();
    const first = submitSceneAnswer(quest, createSceneRun(quest), 0);
    const second = submitSceneAnswer(quest, first.run, 2);
    expect(second.kind).toBe('reveal');
    expect(second.run.idx).toBe(1);
    expect(second.run.answered).toBe(1);
    expect(second.run.correct).toBe(0);
    expect(second.run.attempts).toBe(0); // 新题的错题数要清零
  });

  it('一次错后改对：算答对，且只计一次', () => {
    const quest = makeQuest();
    const first = submitSceneAnswer(quest, createSceneRun(quest), 0);
    const second = submitSceneAnswer(quest, first.run, 1);
    expect(second.kind).toBe('correct');
    expect(second.run.correct).toBe(1);
    expect(second.run.answered).toBe(1); // hint 那次没有重复计数
  });

  it('最后一问答完就 finished，再提交也不动', () => {
    const quest = makeQuest(1);
    const res = submitSceneAnswer(quest, createSceneRun(quest), 1);
    expect(res.run.finished).toBe(true);
    const again = submitSceneAnswer(quest, res.run, 0);
    expect(again.run).toEqual(res.run);
  });
});

describe('sceneSummaryOf', () => {
  it('全对：100% 且通关', () => {
    const quest = makeQuest(4);
    let run = createSceneRun(quest);
    for (let i = 0; i < 4; i += 1) run = submitSceneAnswer(quest, run, 1).run;
    expect(run.finished).toBe(true);
    const s = sceneSummaryOf(quest, run);
    expect(s).toEqual({ total: 4, correct: 4, accuracy: 100, passed: true });
  });

  it('对一半：50% 通关（通关线是答对一半，不卡孩子）', () => {
    const quest = makeQuest(4);
    let run = createSceneRun(quest);
    run = submitSceneAnswer(quest, run, 1).run; // 对
    run = submitSceneAnswer(quest, run, 0).run; // 一次错
    run = submitSceneAnswer(quest, run, 0).run; // 二次错 → 结束
    run = submitSceneAnswer(quest, run, 1).run; // 对
    run = submitSceneAnswer(quest, run, 0).run;
    run = submitSceneAnswer(quest, run, 0).run;
    const s = sceneSummaryOf(quest, run);
    expect(s.correct).toBe(2);
    expect(s.accuracy).toBe(50);
    expect(s.passed).toBe(true);
  });

  it('全错：0% 不通关', () => {
    const quest = makeQuest(2);
    let run = createSceneRun(quest);
    for (let i = 0; i < 2; i += 1) {
      run = submitSceneAnswer(quest, run, 0).run;
      run = submitSceneAnswer(quest, run, 0).run;
    }
    const s = sceneSummaryOf(quest, run);
    expect(s.accuracy).toBe(0);
    expect(s.passed).toBe(false);
  });

  it('空题组：0% 不通关，不假装全对（0/0 记 0 不记 100）', () => {
    const quest = makeQuest(0);
    const s = sceneSummaryOf(quest, createSceneRun(quest));
    expect(s).toEqual({ total: 0, correct: 0, accuracy: 0, passed: false });
  });
});

describe('渲染视图', () => {
  it('选项标签是 A/B/C/D（WXML 算不了数组下标）', () => {
    const quest = makeQuest();
    const view = sceneQuestionViewOf(quest, createSceneRun(quest), -1, false);
    expect(view?.options.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(view?.no).toBe(1);
    expect(view?.total).toBe(2);
  });

  it('未公布答案时不标正确项；公布后才标', () => {
    const quest = makeQuest();
    const before = sceneQuestionViewOf(quest, createSceneRun(quest), 0, false);
    expect(before?.options.every((o) => !o.right)).toBe(true);
    expect(before?.options[0]?.picked).toBe(true);
    const after = sceneQuestionViewOf(quest, createSceneRun(quest), 0, true);
    expect(after?.options[1]?.right).toBe(true); // answerIndex = 1
  });

  it('走完最后一问后 view 为 null', () => {
    const quest = makeQuest(1);
    const run = submitSceneAnswer(quest, createSceneRun(quest), 1).run;
    expect(sceneQuestionViewOf(quest, run, -1, false)).toBeNull();
    expect(currentSceneQuestion(quest, run)).toBeNull();
  });
});

describe('findSceneQuest', () => {
  it('跨包按 id 找得到', () => {
    const packs = [
      { id: 'p1', subject: '数学' as const, name: '', icon: '', desc: '', quests: [makeQuest()] },
    ];
    expect(findSceneQuest(packs, 'q1')?.id).toBe('q1');
    expect(findSceneQuest(packs, '不存在')).toBeUndefined();
  });

  it('带场景包一起找（答题页要靠 pack.subject 决定朗读语言）', () => {
    const packs = [
      { id: 'p1', subject: '英语' as const, name: '', icon: '', desc: '', quests: [makeQuest()] },
    ];
    const hit = findSceneQuestWithPack(packs, 'q1');
    expect(hit?.pack.subject).toBe('英语');
    expect(hit?.quest.id).toBe('q1');
    expect(findSceneQuestWithPack(packs, '不存在')).toBeUndefined();
  });
});

describe('朗读脚本（低年级识字率不高）', () => {
  it('数学：情景卡念中文；题干和选项拼成一段中文', () => {
    const quest = makeQuest();
    const run = createSceneRun(quest);
    expect(sceneStorySpeak(quest, '数学')).toEqual([{ text: '故事', lang: 'zh_CN' }]);
    const segs = sceneQuestionSpeak(quest, run, '数学');
    expect(segs).toHaveLength(1);
    expect(segs[0]?.lang).toBe('zh_CN');
    expect(segs[0]?.text).toContain('第 1 问');
    expect(segs[0]?.text).toContain('选项：');
    expect(segs[0]?.text).toContain('A、A 项');
    expect(segs[0]?.text).toContain('D、D 项');
  });

  it('英语：情景卡本身就是英文；题干中文 + 选项英文必须分成两段换声音', () => {
    const quest = makeQuest();
    const run = createSceneRun(quest);
    expect(sceneStorySpeak(quest, '英语')).toEqual([{ text: '故事', lang: 'en_US' }]);
    const segs = sceneQuestionSpeak(quest, run, '英语');
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: '第 1 问', lang: 'zh_CN' });
    expect(segs[1]?.lang).toBe('en_US');
    expect(segs[1]?.text).toContain('B. B 项');
  });

  it('反馈（提示 / 讲解）拼成一段中文；空文案不产生朗读段', () => {
    expect(sceneFeedbackSpeak('🤔 再想一想', '先把三样加起来')).toEqual([
      { text: '🤔 再想一想，先把三样加起来', lang: 'zh_CN' },
    ]);
    expect(sceneFeedbackSpeak('', '')).toEqual([]);
    expect(sceneFeedbackSpeak('只有标题', '')).toEqual([{ text: '只有标题', lang: 'zh_CN' }]);
  });

  it('走完最后一问后没有可朗读的内容', () => {
    const quest = makeQuest(1);
    const run = submitSceneAnswer(quest, createSceneRun(quest), 1).run;
    expect(sceneQuestionSpeak(quest, run, '数学')).toEqual([]);
  });
});
