// 口算冒险岛配置（关卡定义 / 年级推荐 / 文案）。
//
// 关卡机制与数值口径参考朋友的「口算冒险岛」单文件 HTML 小游戏（已验证过可玩性），
// 这里换成配置化：新增或调整关卡只改本文件，不碰页面与引擎（与 config/games.ts 同范式）。
import type { IslandCfg, IslandLevelDef, IslandOp } from '../core/mathIsland';

// 7 关冒险地图：完成后点亮，未完成锁定（详见 core/mathIsland 的通关判定）。
// need = 固定题量；target = 步数/桥板数；seconds = 火山倒计时；hp = 巨龙血量；passAcc = 通关正确率。
// 不生效的字段统一填 0，避免 undefined 进 setData。
export const ISLAND_LEVELS: readonly IslandLevelDef[] = [
  {
    id: 'village',
    icon: '🏠',
    env: '🏡',
    name: '口算村',
    mode: 'village',
    need: 5,
    target: 0,
    seconds: 0,
    hp: 0,
    passAcc: 0,
    cfg: { ops: ['add', 'sub'], range: 10 },
    reward: { stars: 5, coins: 5 },
    tag: '出发',
    tip: '答对 5 道热身题，就能走出村子',
    rules: ['5 道加减热身题', '答完全部即可通关', '奖励 5⭐ + 5🪙'],
  },
  {
    id: 'carrot',
    icon: '🐰',
    env: '🥕',
    name: '胡萝卜挑战',
    mode: 'carrot',
    need: 10,
    target: 0,
    seconds: 0,
    hp: 0,
    passAcc: 0.8,
    cfg: { ops: ['add', 'sub'], range: 10 },
    reward: { stars: 10, coins: 10 },
    tag: '收集胡萝卜',
    tip: '正确率达到 80% 就能通关',
    rules: ['10 道加减题', '正确率 ≥ 80% 通关', '奖励 10⭐ + 10🪙'],
  },
  {
    id: 'forest',
    icon: '🌲',
    env: '🌳',
    name: '数字森林',
    mode: 'forest',
    need: 0,
    target: 10,
    seconds: 0,
    hp: 0,
    passAcc: 0,
    cfg: { ops: ['add', 'sub'], range: 20 },
    reward: { stars: 10, coins: 10 },
    tag: '走到森林尽头',
    tip: '答对前进 1 步，连对 3 题加速前进 2 步',
    rules: ['答对前进 1 步', '连对 3 题加速：一次前进 2 步', '走到第 10 步就通关'],
  },
  {
    id: 'bridge',
    icon: '🌉',
    env: '🌊',
    name: '口算独木桥',
    mode: 'bridge',
    need: 0,
    target: 10,
    seconds: 0,
    hp: 0,
    passAcc: 0,
    cfg: { ops: ['add', 'sub', 'mul'], range: 20 },
    reward: { stars: 15, coins: 15 },
    tag: '点亮桥板',
    tip: '每答对一题点亮 1 块桥板，10 块全亮就过桥',
    rules: ['桥上一共 10 块板', '每答对 1 题点亮 1 块', '10 块全亮就过桥'],
  },
  {
    id: 'volcano',
    icon: '🌋',
    env: '🔥',
    name: '火山挑战',
    mode: 'volcano',
    need: 0,
    target: 0,
    seconds: 60,
    hp: 0,
    passAcc: 0,
    cfg: { ops: ['add', 'sub', 'mul', 'div'], range: 50 },
    reward: { stars: 20, coins: 20 },
    tag: '60 秒灭火',
    tip: '答对让能量 -10%，答错 +5%，降到 0% 就通关',
    rules: ['60 秒倒计时', '答对能量 -10%', '答错能量 +5%', '能量降到 0% 通关'],
  },
  {
    id: 'dragon',
    icon: '🐉',
    env: '⚔️',
    name: '巨龙决战',
    mode: 'dragon',
    need: 0,
    target: 0,
    seconds: 0,
    hp: 10,
    passAcc: 0,
    cfg: { ops: ['add', 'sub', 'mul', 'div'], range: 100 },
    reward: { stars: 30, coins: 30 },
    tag: '击败巨龙',
    tip: '每答对一击 -1HP，连对 5 次直接必杀',
    rules: [
      '巨龙有 10 HP',
      '答对一击 -1 HP',
      '连对 3 次连续攻击 -2 HP',
      '连对 5 次直接必杀',
      '击败奖励 30⭐ + 30🪙',
    ],
  },
  {
    id: 'castle',
    icon: '🏰',
    env: '👑',
    name: '宝藏城堡',
    mode: 'castle',
    need: 10,
    target: 0,
    seconds: 0,
    hp: 0,
    passAcc: 0,
    cfg: { ops: ['add', 'sub', 'mul', 'div'], range: 100 },
    reward: { stars: 0, coins: 20 },
    tag: '开宝箱',
    tip: '成绩越好，宝箱里的星星越多',
    rules: ['10 道混算题', '正确率 ≥ 90% → ⭐⭐⭐', '正确率 ≥ 70% → ⭐⭐', '其余 → ⭐'],
  },
];

export function findLevel(levelId: string): IslandLevelDef | null {
  return ISLAND_LEVELS.find((l) => l.id === levelId) ?? null;
}

// 年级 → 自由练习默认设置（1-6 年级；初中不走冒险岛，回落到 6 年级口径）。
// 这是冒险岛比独立 H5 更强的一点：小程序知道孩子当前册次，不用家长手工设难度。
export interface IslandGradePreset {
  readonly ops: readonly IslandOp[];
  readonly count: number;
  readonly range: number;
}

const PRESET_1: IslandGradePreset = { ops: ['add', 'sub'], count: 10, range: 10 };
const PRESET_2: IslandGradePreset = { ops: ['add', 'sub', 'mul'], count: 10, range: 20 };
const PRESET_3PLUS: IslandGradePreset = {
  ops: ['mul', 'div', 'add', 'sub'],
  count: 20,
  range: 100,
};

// 解析不出年级（没选册次 / 专题教材）时回落到二年级口径：
// 冒险岛是小学游戏，默认给「加减乘 20 以内」比一上来 100 以内混算更友好。
export function gradePresetOf(grade: number | null): IslandGradePreset {
  if (grade === null) return PRESET_2;
  if (grade <= 1) return PRESET_1;
  if (grade === 2) return PRESET_2;
  return PRESET_3PLUS;
}

// 自由练习可选的题量与数字范围（家长可手改）
export const ISLAND_COUNT_OPTIONS: readonly number[] = [10, 20, 30, 50];
export const ISLAND_RANGE_OPTIONS: readonly number[] = [10, 20, 50, 100];

// 连胜文案（2/3/5/8/10 才有，避免每题都弹）
export function comboWordOf(combo: number): string {
  if (combo === 2) return '🔥 连续 2 题';
  if (combo === 3) return '🔥 连续 3 题';
  if (combo === 5) return '⚡ 5 连胜';
  if (combo === 8) return '💥 超级连击';
  if (combo === 10) return '🏆 完美挑战';
  return '';
}

// 二次答错后的鼓励语（随机取一条，避免每次都一样）
export const ISLAND_ENCOURAGE: readonly string[] = [
  '没关系，错一次记得更牢！',
  '下次一定行，继续加油！',
  '这题有点难，记住它！',
  '再遇到就不会错啦！',
  '慢一点，算得更准！',
];

// ---------------------------------------------------------------- 按年级调难度（L4）
//
// 为什么需要：关卡 cfg 是**固定曲线**（10 以内加减 → 100 以内四则），与孩子读几年级无关。
// 一年级的孩子打到第 5 关会遇到「100 以内除法」——那是三年级下册才学的内容；
// 反过来六年级还在算 10 以内加减，纯属浪费时间。
//
// ⚠️ 引擎的一个约束（别绕过它硬来）：`generateQuestion` 里乘法上限由 range 决定
//    （range ≤ 20 → 小九九 cap 5；否则 cap 9），**无法单独控制乘法位数**。
//    所以「二年级要 100 以内加减 + 表内乘法」这种组合做不到——range 一大乘法就变成大九九。
//    这里的选择是**保小九九**（range ≤ 20），宁可加减简单一点也不给二年级出大九九。
//    真要精确控制，得给 generateQuestion 加独立的 mulCap 参数，那是另一件事。
//
// 另一个刻意决定：初中（7-9 年级）沿用最高档而不是继续加码。
// 冒险岛本质是口算训练，对初中生是「巩固基本功」，把 range 拉到几百只会变成笔算。
// 年级 → 该年级**上限**（ops 白名单 + range 上限），与关卡 cfg 取交集（关卡更简单的听关卡的）
const GRADE_LIMIT: Readonly<Record<number, { ops: readonly IslandOp[]; maxRange: number }>> = {
  1: { ops: ['add', 'sub'], maxRange: 20 },
  2: { ops: ['add', 'sub', 'mul'], maxRange: 20 }, // 二上才学乘法；range 保 20 = 小九九
  3: { ops: ['add', 'sub', 'mul'], maxRange: 50 }, // 三下学除数是一位数的除法，这里先不给 div
  4: { ops: ['add', 'sub', 'mul', 'div'], maxRange: 100 },
  5: { ops: ['add', 'sub', 'mul', 'div'], maxRange: 100 },
  6: { ops: ['add', 'sub', 'mul', 'div'], maxRange: 100 },
  7: { ops: ['add', 'sub', 'mul', 'div'], maxRange: 100 },
  8: { ops: ['add', 'sub', 'mul', 'div'], maxRange: 100 },
  9: { ops: ['add', 'sub', 'mul', 'div'], maxRange: 100 },
};

export function islandCfgWithGrade(base: IslandCfg, grade: number | null): IslandCfg {
  // 年级解析不出（如专题册次叫「全册」、用户没设偏好）→ 原样返回，不猜
  if (grade === null) return base;
  const limit = GRADE_LIMIT[grade];
  if (!limit) return base;
  const ops = base.ops.filter((op) => limit.ops.includes(op));
  return {
    // 交集为空时退回加法：一年级不该被扔进一道题都没有的关卡
    ops: ops.length > 0 ? ops : ['add'],
    range: Math.min(base.range, limit.maxRange),
  };
}
