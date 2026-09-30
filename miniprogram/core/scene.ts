// 情景应用闯关（数学 + 英语）· 纯逻辑（无 IO、可完整单测）。
//
// 为什么它是独立模块、不进 `knowledge.quiz[]`：
//   `testService.buildPaper` 按章节**随机抽题**组卷，一组共享故事的多问塞进去会被打散
//   （第 3 问落到第 2 题、第 1 问落到第 17 题）→ 第 2 问的前提不见了。
//   所以情景闯关有自己的入口、自己的数据（config/*Scenes.ts）、自己的判定。
//
// 判定不经过 `services/questionJudge`：场景题是自带 answerIndex 的 4 选 1，
// 没必要绕 Question 那层。**题型仍然是 0 个新增**（core/question.ts 一行没动）。
//
// 年级过滤不在这里做：走 `services/gradeScope.withinGrade`（ADR-012 唯一口径），
// 由页面把「当前年级」传进去。这里的 grade 语义是「学到这个年级才会做」的下限。

import type { SpeakSegment } from '../utils/tts';

export type SceneSubject = '数学' | '英语';

export interface SceneQuestion {
  readonly stem: string; // 题干：自带解答本题所需的全部数据
  readonly options: readonly string[]; // 4 选 1
  readonly answerIndex: number;
  readonly hint: string; // 第一次错给的一步到位提示（**不给答案**）
  readonly explain: string; // 第二次错 / 答完后给的讲解
}

export interface SceneQuest {
  readonly id: string;
  readonly name: string;
  readonly story: string; // 情景卡文字，整组共享
  // 「学到这个年级才会做」的下限；undefined = 不限。走 withinGrade 过滤。
  readonly grade?: number;
  readonly questions: readonly SceneQuestion[];
}

export interface ScenePack {
  readonly id: string;
  readonly subject: SceneSubject;
  readonly name: string;
  readonly icon: string;
  readonly desc: string;
  readonly quests: readonly SceneQuest[]; // 按 grade 升序
}

// 通关线：答对一半。学习类关卡不卡孩子——卡住了只会让他关掉小程序。
export const SCENE_PASS_ACC = 0.5;

// 选项标签 A/B/C/D 的起始字符码（WXML 里做不了数组下标，只能在 TS 层给好）
const OPTION_A_CODE = 65;

// ---------- 运行态 ----------

export interface SceneRunState {
  readonly questId: string;
  readonly idx: number; // 当前第几问（0 基）
  readonly attempts: number; // 当前这一问已经错几次（0/1）
  readonly correct: number;
  readonly answered: number; // 已结束（对或二次错）的题数
  readonly finished: boolean;
}

export function createSceneRun(quest: SceneQuest): SceneRunState {
  return { questId: quest.id, idx: 0, attempts: 0, correct: 0, answered: 0, finished: false };
}

export function sceneTotalOf(quest: SceneQuest): number {
  return quest.questions.length;
}

export function currentSceneQuestion(quest: SceneQuest, run: SceneRunState): SceneQuestion | null {
  return quest.questions[run.idx] ?? null;
}

// ---------- 判定 ----------

export type SceneAnswerKind =
  | 'correct' // 答对
  | 'hint' // 第一次错：给提示，不公布答案，留在本题
  | 'reveal'; // 第二次错：公布答案 + 讲解，进入下一问

export interface SceneAnswerResult {
  readonly run: SceneRunState;
  readonly kind: SceneAnswerKind;
  readonly right: boolean;
  readonly answerIndex: number;
}

export function submitSceneAnswer(
  quest: SceneQuest,
  run: SceneRunState,
  optionIndex: number,
): SceneAnswerResult {
  const q = currentSceneQuestion(quest, run);
  if (!q || run.finished) {
    return { run, kind: 'hint', right: false, answerIndex: -1 };
  }
  if (optionIndex === q.answerIndex) {
    const answered = run.answered + 1;
    const idx = run.idx + 1;
    return {
      run: {
        questId: run.questId,
        idx,
        attempts: 0,
        correct: run.correct + 1,
        answered,
        finished: idx >= quest.questions.length,
      },
      kind: 'correct',
      right: true,
      answerIndex: q.answerIndex,
    };
  }
  if (run.attempts === 0) {
    // 第一次错：不公布答案，给一次机会（与冒险岛同口径）
    return {
      run: { ...run, attempts: 1 },
      kind: 'hint',
      right: false,
      answerIndex: q.answerIndex,
    };
  }
  const answered = run.answered + 1;
  const idx = run.idx + 1;
  return {
    run: {
      questId: run.questId,
      idx,
      attempts: 0,
      correct: run.correct,
      answered,
      finished: idx >= quest.questions.length,
    },
    kind: 'reveal',
    right: false,
    answerIndex: q.answerIndex,
  };
}

// ---------- 结算 ----------

export interface SceneSummary {
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number; // 0~100 的整数
  readonly passed: boolean;
}

export function sceneSummaryOf(quest: SceneQuest, run: SceneRunState): SceneSummary {
  const total = quest.questions.length;
  const correct = Math.min(run.correct, total);
  // 0 题时记 0，不记 100（0/0 别假装全对）
  const rate = total === 0 ? 0 : correct / total;
  return {
    total,
    correct,
    accuracy: Math.round(rate * 100),
    passed: total > 0 && rate >= SCENE_PASS_ACC,
  };
}

// ---------- 渲染视图 ----------

export interface SceneOptionView {
  readonly key: string; // wx:key
  readonly label: string; // A / B / C / D——WXML 里算不了 ['A','B'][index]，只能在 TS 层给好
  readonly text: string;
  readonly picked: boolean; // 孩子选了这一项
  readonly right: boolean; // 公布答案时高亮正确项
}

export interface SceneQuestionView {
  readonly key: string;
  readonly no: number;
  readonly total: number;
  readonly stem: string;
  readonly options: readonly SceneOptionView[];
}

export function sceneQuestionViewOf(
  quest: SceneQuest,
  run: SceneRunState,
  picked: number, // -1 = 还没选
  revealed: boolean, // 是否公布答案
): SceneQuestionView | null {
  const q = currentSceneQuestion(quest, run);
  if (!q) return null;
  return {
    key: `${quest.id}-${run.idx}`,
    no: run.idx + 1,
    total: quest.questions.length,
    stem: q.stem,
    options: q.options.map((text, i) => ({
      key: `${quest.id}-${run.idx}-${i}`,
      label: String.fromCharCode(OPTION_A_CODE + i),
      text,
      picked: i === picked,
      right: revealed && i === q.answerIndex,
    })),
  };
}

// ---------- 朗读脚本（低年级识字率不高，得念给他听） ----------
//
// 放在 core 里而不是页面里：一是纯函数好测（哪一段用哪个语言是可以断言的），
// 二是「题干中文 / 选项英文」这种中英混排的切分规则只该有一份。

// 情景卡：数学题是中文，英语题本身就是英文句子 → 语言跟着走
export function sceneStorySpeak(quest: SceneQuest, subject: SceneSubject): SpeakSegment[] {
  const story = quest.story.trim();
  if (!story) return [];
  return [{ text: story, lang: subject === '英语' ? 'en_US' : 'zh_CN' }];
}

// 题干 + 选项
export function sceneQuestionSpeak(
  quest: SceneQuest,
  run: SceneRunState,
  subject: SceneSubject,
): SpeakSegment[] {
  const q = currentSceneQuestion(quest, run);
  if (!q) return [];
  const label = (i: number): string => String.fromCharCode(OPTION_A_CODE + i);
  if (subject === '英语') {
    // 英语题的题干是中文（在问「这句话该怎么说」），四个选项才是要考的英文句子。
    // 用中文声音念英文选项会把孩子带偏，所以**必须分段换语言**。
    const options = q.options.map((text, i) => `${label(i)}. ${text}`).join('  ');
    return [
      { text: q.stem, lang: 'zh_CN' },
      { text: options, lang: 'en_US' },
    ];
  }
  const options = q.options.map((text, i) => `${label(i)}、${text}`).join('；');
  return [{ text: `${q.stem}。选项：${options}。`, lang: 'zh_CN' }];
}

// 反馈（提示 / 讲解）：两种学科的反馈文案都是中文
export function sceneFeedbackSpeak(title: string, body: string): SpeakSegment[] {
  const text = [title, body]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('，');
  return text ? [{ text, lang: 'zh_CN' }] : [];
}

// ---------- 列表辅助 ----------

export function scenePacksOf(
  packs: readonly ScenePack[],
  subject: SceneSubject,
): readonly ScenePack[] {
  return packs.filter((p) => p.subject === subject);
}

export interface SceneQuestHit {
  readonly pack: ScenePack;
  readonly quest: SceneQuest;
}

// 带着所属场景包一起找：答题页需要知道**学科**（决定朗读用中文还是英文），
// 而 SceneQuest 自己不带学科。
export function findSceneQuestWithPack(
  packs: readonly ScenePack[],
  questId: string,
): SceneQuestHit | undefined {
  for (const pack of packs) {
    const quest = pack.quests.find((q) => q.id === questId);
    if (quest) return { pack, quest };
  }
  return undefined;
}

export function findSceneQuest(
  packs: readonly ScenePack[],
  questId: string,
): SceneQuest | undefined {
  return findSceneQuestWithPack(packs, questId)?.quest;
}

// 一个场景包里「当前年级能做」的组数，用来在列表页显示「3 组 / 已完成 1 组」。
export function sceneQuestCountOf(pack: ScenePack): number {
  return pack.quests.length;
}
