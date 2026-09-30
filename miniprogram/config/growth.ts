// 口算冒险岛 · 成长系统配置（等级 / 徽章 / 每日打卡 / 宝箱）。
//
// 这里**只放数据**：等级门槛、徽章条件、奖励数值、宝箱奖池。
// 判定与计算都在 core/growth.ts（纯函数，可单测）——
// 想调数值改这里就行，改判定逻辑去 core。
import type { BadgeDef, RankDef, ChestPrizeDef, RewardTier } from '../core/growth';

// ---------------------------------------------------------------- 结算换算（冒险岛以外的游戏）
// 冒险岛每关自带奖励档（config/mathIsland.ts），星币由 core/mathIsland 自己算，不走这里；
// 其余游戏（消消乐 / 极速选择 / 听音找词 / 小蜜蜂 / 语法闯关）共用下面这条统一口径：
//   1. 每答对 1 题 = 1 星 + 1 币 —— 与冒险岛「每题 +1」同量级，孩子不用重新学一套数；
//   2. 再按**答对率**给一档「评价奖励」，全对额外加星加币，鼓励一次做对。
// ⚠️ REWARD_RATE_BONUS 必须按 rate **降序**排列：core 取第一个满足「实际率 >= rate」的档位。
//    最后一档 rate 必须是 0（兜底，保证一定命中）。
export const REWARD_STAR_PER_CORRECT = 1;
export const REWARD_COIN_PER_CORRECT = 1;
export const REWARD_RATE_BONUS: readonly RewardTier[] = [
  { rate: 1, stars: 5, coins: 10 }, // 全对
  { rate: 0.8, stars: 2, coins: 5 },
  { rate: 0, stars: 0, coins: 0 },
];

// ---------------------------------------------------------------- 等级
// 由**累计星星**推导（不另设经验值：孩子看得懂的就是星星）。
// min = 进入该等级所需的累计星星；表按 min 升序，最后一级 next 为 null（满级）。
// ⚠️ 等级名原来是全套「口算」（口算新手…口算之王）——因为经验值只从口算游戏来。
//    2026-09-20 起学习/复习/测试也给经验值，而等级是**全站**的，
//    学英语的孩子升到满级头顶写着「口算之王」说不过去，改成学科中性的成长意象。
export const RANKS: readonly RankDef[] = [
  { min: 0, icon: '🌱', title: '新手上路' },
  { min: 30, icon: '🐣', title: '小试身手' },
  { min: 80, icon: '📚', title: '渐入佳境' },
  { min: 160, icon: '🎯', title: '稳步前进' },
  { min: 300, icon: '🔥', title: '热情高涨' },
  { min: 500, icon: '🏆', title: '学有小成' },
  { min: 800, icon: '👑', title: '学富五车' },
];

// ---------------------------------------------------------------- 每日打卡
// 每天首次进冒险岛自动打卡。奖励 = 基础 + 命中的**最高一档**连续奖励。
export const DAILY_BASE_COINS = 5;
// ⚠️ 必须按 days **降序**排列：core 取第一个满足 streak >= days 的档位。
export const DAILY_STREAK_BONUS: readonly { days: number; coins: number; keys: number }[] = [
  { days: 7, coins: 15, keys: 1 },
  { days: 3, coins: 5, keys: 0 },
];

// ---------------------------------------------------------------- 宝箱
// 钥匙来源：通关**新**关卡 +1；连续打卡 7 天 +1（见 DAILY_STREAK_BONUS）。
// 开一次消耗 1 把钥匙；奖池按 weight 加权随机（weight 是相对份数，不必归一化）。
export const CHEST_POOL: readonly ChestPrizeDef[] = [
  { kind: 'coins', value: 30, weight: 4, text: '30 🪙' },
  { kind: 'stars', value: 20, weight: 3, text: '20 ⭐' },
  { kind: 'key', value: 1, weight: 2, text: '🔑 ×1（再来一次）' },
  { kind: 'stars', value: 50, weight: 1, text: '50 ⭐ 大奖！' },
];

// ---------------------------------------------------------------- 徽章
// kind 决定用哪个字段判定（判定逻辑在 core，这里只写「要什么、要多少」）：
//   clearedCount 累计通关关卡数 / clearedLevel 通关指定关卡（param=关卡 id）
//   castleThree  宝藏城堡最好评级 ≥ value / stars 累计星星
//   totalQ 累计答题 / combo 单局最大连对
//   checkinDays 累计打卡 / chestOpened 累计开箱
export const BADGES: readonly BadgeDef[] = [
  {
    id: 'first_clear',
    icon: '🌱',
    name: '初次出发',
    desc: '通关任意 1 个关卡',
    kind: 'clearedCount',
    value: 1,
  },
  {
    id: 'village',
    icon: '🏡',
    name: '走出村子',
    desc: '通过口算村',
    kind: 'clearedLevel',
    param: 'village',
    value: 1,
  },
  {
    id: 'carrot',
    icon: '🥕',
    name: '胡萝卜达人',
    desc: '通过胡萝卜挑战',
    kind: 'clearedLevel',
    param: 'carrot',
    value: 1,
  },
  {
    id: 'forest',
    icon: '🌳',
    name: '森林漫游者',
    desc: '走出数字森林',
    kind: 'clearedLevel',
    param: 'forest',
    value: 1,
  },
  {
    id: 'bridge',
    icon: '🌉',
    name: '过桥勇者',
    desc: '点亮全部桥板',
    kind: 'clearedLevel',
    param: 'bridge',
    value: 1,
  },
  {
    id: 'volcano',
    icon: '🔥',
    name: '灭火英雄',
    desc: '60 秒内扑灭火山',
    kind: 'clearedLevel',
    param: 'volcano',
    value: 1,
  },
  {
    id: 'dragon',
    icon: '⚔️',
    name: '屠龙勇士',
    desc: '击败巨龙',
    kind: 'clearedLevel',
    param: 'dragon',
    value: 1,
  },
  {
    id: 'castle3',
    icon: '👑',
    name: '城堡王者',
    desc: '宝藏城堡拿到 ⭐⭐⭐',
    kind: 'castleThree',
    value: 3,
  },
  {
    id: 'all_clear',
    icon: '🏆',
    name: '全岛征服',
    desc: '通关全部 7 个关卡',
    kind: 'clearedCount',
    value: 7,
  },
  { id: 'q100', icon: '💯', name: '百题斩', desc: '累计答对 100 题', kind: 'totalQ', value: 100 },
  {
    id: 'combo10',
    icon: '⚡',
    name: '十连击',
    desc: '单局连对 10 题',
    kind: 'combo',
    value: 10,
  },
  {
    id: 'checkin7',
    icon: '📅',
    name: '七日之约',
    desc: '累计打卡 7 天',
    kind: 'checkinDays',
    value: 7,
  },
  {
    id: 'chest5',
    icon: '🎁',
    name: '开箱达人',
    desc: '累计开出 5 个宝箱',
    kind: 'chestOpened',
    value: 5,
  },
  // ---------------------------------------------------------------- 游戏环节（2026-09-20）
  // 原来 12 枚里 9 枚都是冒险岛的，其余 6 款游戏一枚都没有——玩消消乐的孩子攒不到任何勋章。
  // 这里给每款游戏配两枚：**入门**（玩 1 局，鼓励第一次尝试）+ **进阶**（玩 10 局）。
  //
  // ⚠️ gameId 必须与 config/games.ts 的 id 一致，否则永远判不到（判定见 core/growth 的 'plays'）。
  {
    id: 'play_memory_1',
    icon: '🧩',
    name: '配对手',
    desc: '玩 1 局消消乐',
    kind: 'plays',
    param: 'memory',
    value: 1,
  },
  {
    id: 'play_memory_10',
    icon: '🧠',
    name: '记忆大师',
    desc: '玩 10 局消消乐',
    kind: 'plays',
    param: 'memory',
    value: 10,
  },
  {
    id: 'play_speed_1',
    icon: '👆',
    name: '眼明手快',
    desc: '玩 1 局极速选择',
    kind: 'plays',
    param: 'speed',
    value: 1,
  },
  {
    id: 'play_speed_10',
    icon: '🚀',
    name: '快如闪电',
    desc: '玩 10 局极速选择',
    kind: 'plays',
    param: 'speed',
    value: 10,
  },
  {
    id: 'play_listen_1',
    icon: '🎧',
    name: '顺风耳',
    desc: '玩 1 局听音找词',
    kind: 'plays',
    param: 'listen',
    value: 1,
  },
  {
    id: 'play_listen_10',
    icon: '🦻',
    name: '听音辨词',
    desc: '玩 10 局听音找词',
    kind: 'plays',
    param: 'listen',
    value: 10,
  },
  {
    id: 'play_shooter_1',
    icon: '🐝',
    name: '初出蜂巢',
    desc: '玩 1 局小蜜蜂',
    kind: 'plays',
    param: 'shooter',
    value: 1,
  },
  {
    id: 'play_shooter_10',
    icon: '🎯',
    name: '百发百中',
    desc: '玩 10 局小蜜蜂',
    kind: 'plays',
    param: 'shooter',
    value: 10,
  },
  {
    id: 'play_grammar_1',
    icon: '📖',
    name: '语法新手',
    desc: '玩 1 局语法闯关',
    kind: 'plays',
    param: 'grammar',
    value: 1,
  },
  {
    id: 'play_grammar_10',
    icon: '✍️',
    name: '语法小能手',
    desc: '玩 10 局语法闯关',
    kind: 'plays',
    param: 'grammar',
    value: 10,
  },
  {
    id: 'play_scene_1',
    icon: '🎭',
    name: '初次登场',
    desc: '玩 1 局情景闯关',
    kind: 'plays',
    param: 'scene',
    value: 1,
  },
  {
    id: 'play_scene_10',
    icon: '🗣️',
    name: '对答如流',
    desc: '玩 10 局情景闯关',
    kind: 'plays',
    param: 'scene',
    value: 10,
  },

  // ---------------------------------------------------------------- 跨游戏
  // ⚠️ 「百题斩」(q100) 上面已经有了（单行格式那条，容易看漏——2026-09-20 我就漏了，
  //    结果加出两条同名勋章）。这里只补真正缺的。
  {
    id: 'q500',
    icon: '🏵️',
    name: '五百题斩',
    desc: '累计答对 500 题',
    kind: 'totalQ',
    value: 500,
  },
  {
    id: 'allrounder',
    icon: '🌈',
    name: '全能玩家',
    desc: '6 个游戏都玩过',
    kind: 'gameKinds',
    value: 6,
  },
  // ---------------------------------------------------------------- 等级勋章（2026-09-20）
  // 'stars' 这个 kind 判定早就支持，但从没配过勋章——经验值涨了却没有对应的成就感。
  // 有了这几枚，「经验值 ↑ → 等级 ↑ → 解锁勋章」这条链才算通。
  {
    id: 'rank_160',
    icon: '🎯',
    name: '稳步前进',
    desc: '经验值达到 160（Lv.4）',
    kind: 'stars',
    value: 160,
  },
  {
    id: 'rank_500',
    icon: '🏆',
    name: '学有小成',
    desc: '经验值达到 500（Lv.6）',
    kind: 'stars',
    value: 500,
  },
  {
    id: 'rank_800',
    icon: '👑',
    name: '学富五车',
    desc: '经验值达到 800（满级）',
    kind: 'stars',
    value: 800,
  },
];
