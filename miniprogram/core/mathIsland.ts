import { pickIslandKnowledge, type IslandKnowledge } from './islandKnowledge';
// 口算冒险岛（数学学科·小学）——领域模型与纯函数引擎。
//
// 来源：参考朋友的「口算冒险岛」单文件 HTML 小游戏（冒险地图 + 7 关 + 生命/连胜 + 二次作答），
// 适配到本项目的分层约束：
//   1. 这里只放**不依赖 wx 的纯函数**（出题 / 单局推进 / 通关判定 / 奖励结算），可单测；
//      存档与云记录在 services/mathIslandService.ts，关卡定义在 config/mathIsland.ts。
//   2. 美术全部用 emoji（零图片资源，与本工程 tabBar 图标自给自足的做法一致）。
//   3. 数据模型与现有 memoryGame 系列对齐：单局结束后写一条 memory_game_records。
//
// 定位：小学闯关留存（有生命/连胜/关卡表现），不做街机限时刷分。
// 出题口径按「运算符多选 + 数字范围」，与学段两档口径不同，故本文件独立成引擎。
// （原「速算 math-drill」同为数学小游戏，2026-09-16 因功能重复下线归档，
//   见 _archive-math-drill/RESTORE.md，恢复时两者分工要重新谈清楚。）

export type IslandOp = 'add' | 'sub' | 'mul' | 'div';

export const ISLAND_OP_SYMBOL: Record<IslandOp, string> = {
  add: '＋',
  sub: '－',
  mul: '×',
  div: '÷',
};

export const ISLAND_OP_NAME: Record<IslandOp, string> = {
  add: '加法',
  sub: '减法',
  mul: '乘法',
  div: '除法',
};

export const ISLAND_OPS: readonly IslandOp[] = ['add', 'sub', 'mul', 'div'];

// 关卡机制（7 关各一种；'free' 为自由练习，不算关卡）
export type IslandMode =
  'village' | 'carrot' | 'forest' | 'bridge' | 'volcano' | 'dragon' | 'castle' | 'free';

export interface IslandQuestion {
  readonly a: number;
  readonly b: number;
  readonly op: IslandOp;
  readonly answer: number;
  readonly text: string; // 题面（如 "8 × 7"），页面自行追加 " = ?"
  readonly sig: string; // 去重键 "8mul7"
  /**
   * L4：这道题对应的教材知识点（由 createRun 按「运算类型 + 数值范围」匹配出来）。
   * 有它才能把答错回流进错题本；**匹配不到时没有这个字段**（宁可不回流，也不硬猜）。
   */
  readonly knowledgeId?: string;
}

// 一局的难度配置：运算类型 + 数值范围上限。
// 关卡自带一份（level.cfg），调用方也可以按年级算一份覆盖它（L4）。
export interface IslandCfg {
  readonly ops: readonly IslandOp[];
  readonly range: number;
}

export interface IslandLevelDef {
  readonly id: string;
  readonly icon: string;
  readonly env: string; // 地图上的大图标
  readonly name: string;
  readonly mode: IslandMode;
  readonly need: number; // 固定题量关卡的题数（village / carrot / castle / free）
  readonly target: number; // 步数 / 桥板数（forest / bridge）
  readonly seconds: number; // 火山倒计时
  readonly hp: number; // 巨龙初始血量
  readonly passAcc: number; // 通关正确率（carrot，0~1）
  readonly cfg: { readonly ops: readonly IslandOp[]; readonly range: number };
  readonly reward: { readonly stars: number; readonly coins: number };
  readonly tag: string;
  readonly tip: string;
  readonly rules: readonly string[];
}

// ---------------------------------------------------------------- 出题

const rnd = (min: number, max: number, random: () => number): number =>
  Math.floor(random() * (max - min + 1)) + min;

// 生成一道题。约束（与儿童口算难度一致）：
//   - 加法：和 ≤ range
//   - 减法：不出现负数（先定被减数再定减数）
//   - 乘法：因数 ≤ cap（range≤20 用 5，否则 9），积 ≤ range，排除 1×1
//   - 除法：先定除数与商再反推被除数，保证整除
// 找不到返回 null（调用方重试），**不退化成随便出一个数**——题目必须准确。
export function generateQuestion(
  op: IslandOp,
  range: number,
  random: () => number = Math.random,
): IslandQuestion | null {
  const cap = range <= 20 ? 5 : 9;
  for (let t = 0; t < 200; t += 1) {
    let a = 0;
    let b = 0;
    let answer = 0;
    if (op === 'add') {
      const hi = Math.max(2, range);
      a = rnd(1, hi - 1, random);
      b = rnd(1, hi - a, random);
      answer = a + b;
    } else if (op === 'sub') {
      a = rnd(2, Math.max(3, range), random);
      b = rnd(1, a - 1, random);
      answer = a - b;
    } else if (op === 'mul') {
      a = rnd(1, cap, random);
      b = rnd(1, cap, random);
      if (a === 1 && b === 1) continue;
      answer = a * b;
      if (answer > range) continue;
    } else {
      b = rnd(2, cap, random);
      answer = rnd(2, cap, random);
      a = b * answer;
      if (a > range) continue;
    }
    if (answer < 0 || a < 0 || b < 0) continue;
    return {
      a,
      b,
      op,
      answer,
      text: `${a} ${ISLAND_OP_SYMBOL[op]} ${b}`,
      sig: `${a}${op}${b}`,
    };
  }
  return null;
}

// 生成一池题：尽量不重复；题目空间不足时允许少量重复（否则会凑不满 n 导致关卡提前结束）。
export function generateSet(
  ops: readonly IslandOp[],
  range: number,
  n: number,
  random: () => number = Math.random,
): IslandQuestion[] {
  if (ops.length === 0 || n <= 0) return [];
  const out: IslandQuestion[] = [];
  const bag = new Set<string>();
  let guard = 0;
  while (out.length < n && guard < n * 60 + 400) {
    guard += 1;
    const op = ops[Math.floor(random() * ops.length)] ?? 'add';
    const q = generateQuestion(op, range, random);
    if (!q) continue;
    // 后 20 道才允许重复，前面尽量出新题
    if (bag.has(q.sig) && out.length + 20 < n) continue;
    bag.add(q.sig);
    out.push(q);
  }
  return out;
}

// ---------------------------------------------------------------- 单局运行态

export const ISLAND_MAX_LIVES = 3;

export interface IslandRunState {
  readonly levelId: string;
  readonly mode: IslandMode;
  readonly ops: readonly IslandOp[];
  readonly range: number;
  readonly need: number;
  readonly target: number;
  readonly passAcc: number;
  readonly questions: readonly IslandQuestion[];
  readonly idx: number;
  readonly attempts: number; // 当前题已答错次数：0 / 1（还有一次机会）/ 2（已公布答案）
  readonly lives: number;
  readonly combo: number;
  readonly maxCombo: number;
  readonly correct: number;
  readonly wrong: number; // 只统计「两次都答错」的题（第一次错允许重答，不算错）
  readonly gainStars: number;
  readonly gainCoins: number;
  readonly steps: number; // forest
  readonly planks: number; // bridge
  readonly energy: number; // volcano（降到 0 通关）
  readonly hp: number; // dragon（降到 0 通关）
  readonly finished: boolean;
  readonly success: boolean;
  readonly reason: string; // 失败原因文案（生命用完 / 时间到）
}

// 有限题量的关卡题池 = need；开放式关卡（森林/桥/火山/巨龙）给 30 道，不够就提前结束。
const POOL_FOR_OPEN_MODE = 30;

export function createRun(
  level: IslandLevelDef,
  random: () => number = Math.random,
  /**
   * L4：覆盖关卡的难度配置（运算类型 + 数值范围），由调用方按年级算好传进来。
   * 不传 = 用关卡自带的曲线。
   * ⚠️ 这里只收数据、不自己按年级算：core 层不依赖 config（全项目无此先例），
   *    年级 → 难度的规则表在 config/mathIsland.ts，由页面组装后传进来。
   */
  cfgOverride?: IslandCfg,
  /**
   * L4：当前章节的知识点（页面按 chapterId 查来）。传了就给每题绑定对应知识点，
   * 答错才能回流错题本；不传 = 老行为（只玩，不回流）。
   */
  knowledgeList: readonly IslandKnowledge[] = [],
): IslandRunState {
  const openMode =
    level.mode === 'forest' ||
    level.mode === 'bridge' ||
    level.mode === 'volcano' ||
    level.mode === 'dragon';
  const pool = openMode ? POOL_FOR_OPEN_MODE : Math.max(1, level.need);
  const cfg = cfgOverride ?? level.cfg;
  // 同一种运算共享一个知识点，按 op 缓存，不必每题都匹配一遍
  const knowledgeByOp = new Map<IslandOp, string | null>();
  const questions = generateSet(cfg.ops, cfg.range, pool, random).map((question) => {
    if (knowledgeList.length === 0) return question;
    if (!knowledgeByOp.has(question.op)) {
      knowledgeByOp.set(question.op, pickIslandKnowledge(knowledgeList, question.op, cfg.range));
    }
    const knowledgeId = knowledgeByOp.get(question.op) ?? null;
    return knowledgeId ? { ...question, knowledgeId } : question;
  });
  return {
    levelId: level.id,
    mode: level.mode,
    ops: cfg.ops,
    range: cfg.range,
    need: level.need,
    target: level.target,
    passAcc: level.passAcc,
    questions,
    idx: 0,
    attempts: 0,
    lives: ISLAND_MAX_LIVES,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    wrong: 0,
    gainStars: 0,
    gainCoins: 0,
    steps: 0,
    planks: 0,
    energy: 100,
    hp: level.hp,
    finished: false,
    success: false,
    reason: '',
  };
}

// 自由练习的伪关卡：不进地图，按年级推荐生成。
export function freeLevel(ops: readonly IslandOp[], range: number, count: number): IslandLevelDef {
  return {
    id: 'free',
    icon: '🎯',
    env: '🎯',
    name: '自由练习',
    mode: 'free',
    need: count,
    target: 0,
    seconds: 0,
    hp: 0,
    passAcc: 0,
    cfg: { ops, range },
    reward: { stars: 0, coins: 0 },
    tag: '自由练习',
    tip: '按你当前册次推荐难度，可以随时改',
    rules: [],
  };
}

// 当前题（越界返回 null）
export function currentQuestion(run: IslandRunState): IslandQuestion | null {
  return run.questions[run.idx] ?? null;
}

// 答对：连胜 +1、答题得星；连对 3 题回 1 血；按关卡机制推进进度。
export function applyCorrect(run: IslandRunState): IslandRunState {
  const combo = run.combo + 1;
  const heal = combo % 3 === 0 && run.lives < ISLAND_MAX_LIVES;
  let steps = run.steps;
  let planks = run.planks;
  let energy = run.energy;
  let hp = run.hp;

  if (run.mode === 'forest') {
    steps = Math.min(run.target, steps + (combo >= 3 ? 2 : 1)); // 连对 3 题起加速前进 2 步
  } else if (run.mode === 'bridge') {
    planks = Math.min(run.target, planks + 1);
  } else if (run.mode === 'volcano') {
    energy = Math.max(0, energy - 10); // 灭火 -10%
  } else if (run.mode === 'dragon') {
    const damage = combo >= 5 ? hp : combo >= 3 ? 2 : 1; // 连对 5 次必杀
    hp = Math.max(0, hp - damage);
  }

  return evaluateProgress({
    ...run,
    idx: run.idx + 1,
    attempts: 0,
    combo,
    maxCombo: Math.max(run.maxCombo, combo),
    correct: run.correct + 1,
    lives: heal ? run.lives + 1 : run.lives,
    gainStars: run.gainStars + 1,
    gainCoins: run.gainCoins + 1,
    steps,
    planks,
    energy,
    hp,
  });
}

// 第一次答错：扣 1 生命、断连胜，**不公布答案**，允许再答一次。
export function applyWrongFirst(run: IslandRunState): IslandRunState {
  return evaluateProgress({ ...run, attempts: 1, combo: 0, lives: run.lives - 1 });
}

// 第二次答错：计入错题、火山能量 +5%，公布答案后进入下一题。
export function applyWrongSecond(run: IslandRunState): IslandRunState {
  const energy = run.mode === 'volcano' ? Math.min(100, run.energy + 5) : run.energy;
  return evaluateProgress({
    ...run,
    attempts: 2,
    combo: 0,
    wrong: run.wrong + 1,
    idx: run.idx + 1,
    energy,
  });
}

// 火山倒计时归零（未灭火则失败）
export function timeoutRun(run: IslandRunState): IslandRunState {
  if (run.finished) return run;
  return { ...run, finished: true, success: false, reason: '时间到啦！' };
}

// 每步之后判定是否结束
export function evaluateProgress(run: IslandRunState): IslandRunState {
  if (run.finished) return run;
  if (run.lives <= 0) return { ...run, finished: true, success: false, reason: '生命用完啦' };
  if (run.mode === 'forest' && run.steps >= run.target)
    return { ...run, finished: true, success: true };
  if (run.mode === 'bridge' && run.planks >= run.target)
    return { ...run, finished: true, success: true };
  if (run.mode === 'volcano' && run.energy <= 0) return { ...run, finished: true, success: true };
  if (run.mode === 'dragon' && run.hp <= 0) return { ...run, finished: true, success: true };
  if (run.idx >= run.need && run.need > 0) return { ...run, finished: true, success: true };
  if (run.idx >= run.questions.length) return { ...run, finished: true, success: true };
  return run;
}

// ---------------------------------------------------------------- 存档（按账号）
//
// ⚠️ 进度是**账号级**数据（系统需要注册），权威副本在云端 math_island_progress 集合，
// 本机只留一份按 userId 分开的镜像，用于云不可用时的离线兜底。
// 换设备跟着账号走；同一台设备换账号不会串（镜像 key 带 userId）。

export interface IslandLevelState {
  readonly done: boolean;
  readonly steps: number; // 数字森林已走步数（未通关也保留）
  readonly planks: number; // 独木桥已点亮桥板
  readonly castleStars: number; // 宝藏城堡评级 1~3
}

export interface IslandProgress {
  readonly v: number;
  // 存档版本号：每次写档 +1，**镜像与云端写同一份值**。
  // 为什么必须存在：写云是异步的（不 await，失败也不打断游戏），玩家一打完就点
  // 「回冒险地图」，地图页立刻读云时云端很可能还停在旧值——表现为「刚通关的关卡
  // 又暗回去、星星变少」。读档时按 rev 取大的一份，即可消除这个窗口。
  readonly rev: number;
  readonly stars: number;
  readonly coins: number;
  readonly levels: Record<string, IslandLevelState>;
  readonly totalQ: number; // 累计答题
  readonly totalC: number; // 累计答对
  // ⚠️ 星星/金币**只作为「历史遗留」保留**：全站钱包上线（2026-09-16 L1）后，
  // 结算一律入账到 user_game_profile，这里不再累加、也不再展示。
  // 之所以还留着字段：老存档里的星星要靠它一次性并入钱包（mergeIslandWallet），
  // 并完之后这两个字段就纯粹是化石数据。
}

export const ISLAND_PROGRESS_V = 1;

export function emptyLevelState(): IslandLevelState {
  return { done: false, steps: 0, planks: 0, castleStars: 0 };
}

export function initialProgress(): IslandProgress {
  return {
    v: ISLAND_PROGRESS_V,
    rev: 0,
    stars: 0,
    coins: 0,
    levels: {},
    totalQ: 0,
    totalC: 0,
  };
}

// 已通关关卡数（徽章与「全部通关」判定共用，避免各页面各写一遍 filter）
export function clearedCountOf(progress: IslandProgress): number {
  return Object.values(progress.levels).filter((s) => s.done).length;
}

// 宝藏城堡历史最好评级（徽章「城堡王者」用）
export function castleBestOf(progress: IslandProgress, castleId = 'castle'): number {
  return progress.levels[castleId]?.castleStars ?? 0;
}

// 兜底解析：云端/本机都是弱类型存储（可能被别的版本写进脏值），
// 任何字段缺失或类型不对都按初始值回落，绝不把脏数据直接喂给页面。
export function parseProgress(raw: unknown): IslandProgress {
  const base = initialProgress();
  if (typeof raw !== 'object' || raw === null) return base;
  const d = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const levels: Record<string, IslandLevelState> = {};
  const rawLevels = (d.levels ?? {}) as Record<string, unknown>;
  for (const [id, one] of Object.entries(rawLevels)) {
    if (typeof one !== 'object' || one === null) continue;
    const s = one as Record<string, unknown>;
    levels[id] = {
      done: s.done === true,
      steps: num(s.steps),
      planks: num(s.planks),
      castleStars: num(s.castleStars),
    };
  }
  // 成长字段（daily/badges/chest）曾短暂存在过 v2 存档里，现在归全站钱包管；
  // parseProgress 直接忽略它们即可——parseProfile 那边才是它们的家。
  return {
    v: ISLAND_PROGRESS_V,
    rev: num(d.rev), // 旧版本存档没有 rev → 0，永远被认为「更旧」，安全
    stars: num(d.stars),
    coins: num(d.coins),
    levels,
    totalQ: num(d.totalQ),
    totalC: num(d.totalC),
  };
}

// 结算时用：合并单局结果到旧进度（纯函数，可单测）
export function mergeProgress(
  prev: IslandProgress,
  levelId: string,
  nextState: IslandLevelState,
  gain: { stars: number; coins: number; totalQ: number; totalC: number },
): IslandProgress {
  return {
    ...prev,
    stars: prev.stars + gain.stars,
    coins: prev.coins + gain.coins,
    totalQ: prev.totalQ + gain.totalQ,
    totalC: prev.totalC + gain.totalC,
    levels: { ...prev.levels, [levelId]: nextState },
  };
}

// ---------------------------------------------------------------- 结算

// 正确率：分母只算「两次都错」的题，第一次错允许重答不计入（与二次作答机制配套）。
export function accuracyOf(run: IslandRunState): number {
  const answered = Math.max(1, run.correct + run.wrong);
  return Math.round((run.correct / answered) * 100);
}

// 宝藏城堡评级：≥90% 三星、≥70% 二星、其余一星
export function castleStarsOf(run: IslandRunState): number {
  const acc = accuracyOf(run);
  if (acc >= 90) return 3;
  if (acc >= 70) return 2;
  return 1;
}

// 关卡是否真正通关（「打完了」不等于「通关」：
// 胡萝卜看正确率、森林看步数、桥看桥板、火山看能量、巨龙看血量）。
export function isLevelCleared(level: IslandLevelDef, run: IslandRunState): boolean {
  if (!run.finished || !run.success) return false;
  if (level.mode === 'carrot') return accuracyOf(run) >= Math.round(level.passAcc * 100);
  if (level.mode === 'forest') return run.steps >= level.target;
  if (level.mode === 'bridge') return run.planks >= level.target;
  if (level.mode === 'volcano') return run.energy <= 0;
  if (level.mode === 'dragon') return run.hp <= 0;
  return true;
}

export interface IslandReward {
  readonly stars: number;
  readonly coins: number;
  readonly castleStars: number; // 宝藏城堡评级（1~3），非城堡关为 0
}

// 奖励结算：答题所得恒给（未通关也保留，避免白打）；通关才发关卡奖励。
// 宝藏城堡额外按评级发 10/20/30 星（Phase 1 不引入宝石 / 徽章碎片，宝箱池留到 Phase 2）。
export function rewardOf(
  level: IslandLevelDef,
  run: IslandRunState,
  cleared: boolean,
): IslandReward {
  const castleStars = level.mode === 'castle' && cleared ? castleStarsOf(run) : 0;
  const castleBonus = castleStars * 10;
  return {
    stars: run.gainStars + (cleared ? level.reward.stars + castleBonus : 0),
    coins: Math.floor(run.correct / 2) + run.gainCoins + (cleared ? level.reward.coins : 0),
    castleStars,
  };
}
