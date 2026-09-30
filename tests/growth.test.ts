// 成长系统（等级 / 每日打卡 / 宝箱 / 徽章）单元测试 —— **全站**账户 user_game_profile。
//
// 全部是纯函数 + 可注入随机源 / 可注入「今天」，所以断言稳定可复现——
// 打卡这类「跨天」逻辑**不能靠真实时间测**，必须注入 today。
import { describe, expect, it } from 'vitest';
import {
  badgeProgress,
  checkInOf,
  emptyChest,
  emptyDaily,
  evaluateBadges,
  initialProfile,
  mergeIslandWallet,
  openChestOf,
  parseProfile,
  rankInfoOf,
  starsForTest,
  rewardOfRun,
  type BadgeContext,
  type BadgeDef,
  type ChestPrizeDef,
} from '../miniprogram/core/growth';
import { parseProgress } from '../miniprogram/core/mathIsland';
import { createGameProfileService } from '../miniprogram/services/gameProfileService';
import type { GameProfileRepository } from '../miniprogram/repositories/gameProfileRepository';
import {
  DAILY_BASE_COINS,
  DAILY_STREAK_BONUS,
  BADGES,
  REWARD_COIN_PER_CORRECT,
  REWARD_RATE_BONUS,
  REWARD_STAR_PER_CORRECT,
} from '../miniprogram/config/growth';

const RANKS = [
  { min: 0, icon: '🌱', title: '新手' },
  { min: 30, icon: '🐣', title: '学徒' },
  { min: 80, icon: '🚶', title: '旅人' },
];

describe('rankInfoOf（等级）', () => {
  it('按累计星星落档，门槛上取到下一级', () => {
    expect(rankInfoOf(0, RANKS).level).toBe(1);
    expect(rankInfoOf(29, RANKS).level).toBe(1);
    expect(rankInfoOf(30, RANKS).level).toBe(2); // 正好到门槛就算进级
    expect(rankInfoOf(79, RANKS).level).toBe(2);
    expect(rankInfoOf(80, RANKS).level).toBe(3);
  });

  it('满级：next=null、percent=100，不出现 NaN', () => {
    const info = rankInfoOf(9999, RANKS);
    expect(info.next).toBeNull();
    expect(info.percent).toBe(100);
    expect(info.toNext).toBe(0);
  });

  it('级内进度与「还差多少」自洽', () => {
    const info = rankInfoOf(50, RANKS); // 30~80 之间，跨度 50，走到 20
    expect(info.toNext).toBe(30);
    expect(info.percent).toBe(40);
  });

  it('脏值/空表兜底，不返回 undefined 让页面炸掉', () => {
    expect(rankInfoOf(Number.NaN, RANKS).level).toBe(1);
    expect(rankInfoOf(-5, RANKS).level).toBe(1);
    expect(rankInfoOf(10, []).level).toBe(1);
  });
});

describe('checkInOf（每日打卡）', () => {
  it('首次打卡：streak=1、发基础奖励', () => {
    const res = checkInOf(emptyDaily(), DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-09-16');
    expect(res.checked).toBe(true);
    expect(res.daily).toEqual({ lastDate: '2026-09-16', streak: 1, totalDays: 1 });
    expect(res.coins).toBe(5);
    expect(res.keys).toBe(0);
  });

  it('同一天重复打卡不再发奖（幂等）', () => {
    const first = checkInOf(emptyDaily(), DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-09-16');
    const again = checkInOf(first.daily, DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-09-16');
    expect(again.checked).toBe(false);
    expect(again.coins).toBe(0);
    expect(again.daily.totalDays).toBe(1); // 天数不会被重复累加
  });

  it('连续打卡：昨天打过则 streak+1', () => {
    const prev = { lastDate: '2026-09-15', streak: 2, totalDays: 2 };
    const res = checkInOf(prev, DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-09-16');
    expect(res.daily.streak).toBe(3);
    expect(res.daily.totalDays).toBe(3);
    expect(res.coins).toBe(5 + 5); // 连续 3 天命中 +5 档
  });

  it('断签：隔了一天就重新从 1 开始，累计天数仍 +1', () => {
    const prev = { lastDate: '2026-09-10', streak: 9, totalDays: 20 };
    const res = checkInOf(prev, DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-09-16');
    expect(res.daily.streak).toBe(1);
    expect(res.daily.totalDays).toBe(21);
  });

  it('连续 7 天：命中最高档，给 1 把钥匙', () => {
    const prev = { lastDate: '2026-09-15', streak: 6, totalDays: 6 };
    const res = checkInOf(prev, DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-09-16');
    expect(res.coins).toBe(5 + 15);
    expect(res.keys).toBe(1);
  });

  it('跨月跨年也认「昨天」（日键移位，不是字符串减一）', () => {
    const prev = { lastDate: '2026-03-31', streak: 4, totalDays: 4 };
    const res = checkInOf(prev, DAILY_BASE_COINS, DAILY_STREAK_BONUS, '2026-04-01');
    expect(res.daily.streak).toBe(5);
  });
});

const ctx = (patch: Partial<BadgeContext> = {}): BadgeContext => ({
  clearedCount: 0,
  cleared: {},
  castleBest: 0,
  stars: 0,
  totalQ: 0,
  checkinDays: 0,
  chestOpened: 0,
  ...patch,
});

describe('evaluateBadges（徽章）', () => {
  it('达成条件才发：通关 1 关 → 初次出发', () => {
    const defs = BADGES;
    expect(evaluateBadges([], ctx({ clearedCount: 0 }), defs)).toEqual([]);
    expect(evaluateBadges([], ctx({ clearedCount: 1 }), defs)).toContain('first_clear');
  });

  it('指定关卡徽章：只认 param 那一关', () => {
    const defs: BadgeDef[] = [
      {
        id: 'b',
        icon: '🏡',
        name: 'v',
        desc: '',
        kind: 'clearedLevel',
        param: 'village',
        value: 1,
      },
    ];
    expect(evaluateBadges([], ctx({ cleared: { carrot: true } }), defs)).toEqual([]);
    expect(evaluateBadges([], ctx({ cleared: { village: true } }), defs)).toEqual(['b']);
  });

  it('已拥有的不重复发', () => {
    const defs: BadgeDef[] = [
      { id: 'b', icon: '⭐', name: 's', desc: '', kind: 'stars', value: 10 },
    ];
    expect(evaluateBadges(['b'], ctx({ stars: 999 }), defs)).toEqual([]);
  });

  it('combo 徽章：打卡这类「不在单局里」的场景不给 maxCombo，就不会误发', () => {
    const defs: BadgeDef[] = [
      { id: 'c', icon: '⚡', name: 'c', desc: '', kind: 'combo', value: 10 },
    ];
    expect(evaluateBadges([], ctx(), defs)).toEqual([]); // 没打过局 → 0，不该达成
    expect(evaluateBadges([], ctx({ maxCombo: 9 }), defs)).toEqual([]);
    expect(evaluateBadges([], ctx({ maxCombo: 10 }), defs)).toEqual(['c']);
  });

  it('未知 kind 宁可不发，也不乱发', () => {
    const defs = [
      { id: 'x', icon: '❓', name: 'x', desc: '', kind: 'nonsense', value: 1 },
    ] as unknown as BadgeDef[];
    expect(evaluateBadges([], ctx(), defs)).toEqual([]);
  });

  it('城堡王者看历史最好评级，不是本局', () => {
    const defs: BadgeDef[] = [
      { id: 'k', icon: '👑', name: 'k', desc: '', kind: 'castleThree', value: 3 },
    ];
    expect(evaluateBadges([], ctx({ castleBest: 2 }), defs)).toEqual([]);
    expect(evaluateBadges([], ctx({ castleBest: 3 }), defs)).toEqual(['k']);
  });
});

describe('badgeProgress（勋章进度条）', () => {
  it('累计型：返回当前值与目标值', () => {
    const def: BadgeDef = { id: 's', icon: '⭐', name: 's', desc: '', kind: 'stars', value: 100 };
    expect(badgeProgress(def, ctx({ stars: 40 }))).toEqual({ current: 40, goal: 100 });
  });

  it('二元型（通关指定关卡）：current 只取 0/1，goal 恒 1', () => {
    const def: BadgeDef = {
      id: 'b',
      icon: '🏡',
      name: 'v',
      desc: '',
      kind: 'clearedLevel',
      param: 'village',
      value: 1,
    };
    expect(badgeProgress(def, ctx({ cleared: { village: true } }))).toEqual({
      current: 1,
      goal: 1,
    });
    expect(badgeProgress(def, ctx({ cleared: { carrot: true } }))).toEqual({ current: 0, goal: 1 });
  });

  it('plays 用 param 找对应游戏的局数', () => {
    const def: BadgeDef = {
      id: 'm10',
      icon: '🧠',
      name: 'm',
      desc: '',
      kind: 'plays',
      param: 'memory',
      value: 10,
    };
    expect(badgeProgress(def, ctx({ plays: { memory: 3 } }))).toEqual({ current: 3, goal: 10 });
    expect(badgeProgress(def, ctx({ plays: { speed: 3 } }))).toEqual({ current: 0, goal: 10 });
  });

  it('gameKinds 按玩过几种游戏计', () => {
    const def: BadgeDef = { id: 'g', icon: '🌈', name: 'g', desc: '', kind: 'gameKinds', value: 6 };
    expect(badgeProgress(def, ctx({ plays: { memory: 1, speed: 1, listen: 1 } }))).toEqual({
      current: 3,
      goal: 6,
    });
  });

  it('未知 kind：current 0、goal 照给，不崩', () => {
    const def = {
      id: 'x',
      icon: '❓',
      name: 'x',
      desc: '',
      kind: 'nonsense',
      value: 5,
    } as unknown as BadgeDef;
    expect(badgeProgress(def, ctx())).toEqual({ current: 0, goal: 5 });
  });
});

describe('openChestOf（宝箱）', () => {
  const pool: ChestPrizeDef[] = [
    { kind: 'coins', value: 30, weight: 4, text: '30 🪙' },
    { kind: 'stars', value: 20, weight: 3, text: '20 ⭐' },
    { kind: 'key', value: 1, weight: 2, text: '🔑 ×1' },
    { kind: 'stars', value: 50, weight: 1, text: '50 ⭐ 大奖！' },
  ];

  it('没钥匙不开箱，并给出孩子看得懂的原因', () => {
    const res = openChestOf(emptyChest(), pool);
    expect(res.prize).toBeNull();
    expect(res.reason).toContain('钥匙');
    expect(res.chest.opened).toBe(0);
  });

  it('开箱消耗 1 把钥匙，次数 +1', () => {
    const res = openChestOf({ keys: 2, opened: 0 }, pool, () => 0.99); // 命中最后一项（50⭐）
    expect(res.chest.keys).toBe(1);
    expect(res.chest.opened).toBe(1);
    expect(res.prize?.value).toBe(50);
  });

  it('抽到「钥匙」时净消耗为 0（返还抵掉花费）', () => {
    // 权重 4/3/2/1 = 总 10；roll=0.75 → 落在第三项（key）
    const res = openChestOf({ keys: 1, opened: 0 }, pool, () => 0.75);
    expect(res.prize?.kind).toBe('key');
    expect(res.chest.keys).toBe(1);
    expect(res.chest.opened).toBe(1);
  });

  it('奖池为空（配置写错）也不吞钥匙', () => {
    const res = openChestOf({ keys: 3, opened: 0 }, [], () => 0.1);
    expect(res.prize).toBeNull();
    expect(res.chest.keys).toBe(3);
    expect(res.chest.opened).toBe(1);
  });
});

describe('全站成长账户（user_game_profile）', () => {
  const stubProfileRepo = (): GameProfileRepository => ({
    async getByUser() {
      return null;
    },
    async upsert() {
      return undefined;
    },
  });
  const fakeStorage = () => {
    const data = new Map<string, unknown>();
    return {
      data,
      read: (k: string) => data.get(k) ?? null,
      write: (k: string, v: unknown) => void data.set(k, v),
      remove: (k: string) => void data.delete(k),
    };
  };
  const service = () =>
    createGameProfileService({
      gameProfileRepository: stubProfileRepo(),
      storage: fakeStorage(),
    });

  it('成长账户：脏值一律回落，页面拿不到 NaN', () => {
    const p = parseProfile({
      stars: 'x',
      daily: { lastDate: 123, streak: 'x' },
      badges: ['ok', 5, null],
      chest: { keys: 'many' },
      plays: { island: 3, bad: 'x' },
    });
    expect(p.stars).toBe(0);
    expect(p.daily).toEqual(emptyDaily());
    expect(p.badges).toEqual(['ok']);
    expect(p.chest).toEqual(emptyChest());
    expect(p.plays).toEqual({ island: 3 }); // 非数字项丢弃
  });

  it('岛屿旧存档（带成长字段）解析后不再带成长数据——成长已归钱包', () => {
    const old = {
      v: 2,
      rev: 3,
      stars: 10,
      coins: 2,
      levels: {},
      totalQ: 5,
      totalC: 4,
      daily: { lastDate: '2026-09-16', streak: 2, totalDays: 2 },
      badges: ['village'],
      chest: { keys: 1, opened: 0 },
    };
    const p = parseProgress(old);
    expect(p.stars).toBe(10); // 星星保留，供一次性并入钱包
    expect(p).not.toHaveProperty('daily');
  });

  it('一次性并入冒险岛旧星星：只并一次（幂等）', () => {
    const p0 = initialProfile();
    const merged = mergeIslandWallet(p0, { stars: 42, coins: 7 });
    expect(merged.stars).toBe(42);
    expect(merged.mergedIsland).toBe(true);
    const again = mergeIslandWallet(merged, { stars: 42, coins: 7 });
    expect(again).toBe(merged); // 同一对象，不重复加
  });

  it('reward：星币入账、局数 +1、累计答对累加', () => {
    const s = service();
    const res = s.reward({
      userId: 'u1',
      profile: initialProfile(),
      stars: 12,
      coins: 5,
      correct: 9,
      gameId: 'island',
    });
    expect(res.profile.stars).toBe(12);
    expect(res.profile.coins).toBe(5);
    expect(res.profile.totalCorrect).toBe(9);
    expect(res.profile.plays.island).toBe(1);
  });

  it('reward：冒险岛通关信息能触发本域徽章（初次出发）', () => {
    const s = service();
    const res = s.reward({
      userId: 'u1',
      profile: initialProfile(),
      stars: 1,
      coins: 1,
      gameId: 'island',
      badge: { clearedCount: 1, cleared: { village: true }, castleBest: 0, maxCombo: 0 },
    });
    expect(res.newBadges.map((b) => b.id)).toContain('first_clear');
    expect(res.profile.badges).toContain('first_clear');
  });

  it('打卡：加币、写日键，同一天第二次不再加', () => {
    const s = service();
    const first = s.checkIn({ userId: 'u1', profile: initialProfile() });
    expect(first.result.checked).toBe(true);
    expect(first.profile.coins).toBeGreaterThan(0);
    const second = s.checkIn({ userId: 'u1', profile: first.profile });
    expect(second.result.checked).toBe(false);
    expect(second.profile.coins).toBe(first.profile.coins);
  });

  it('开箱：扣钥匙、次数 +1，且一定拿到点东西', () => {
    const s = service();
    const p0 = { ...initialProfile(), chest: { keys: 1, opened: 0 } };
    const res = s.openChest({ userId: 'u1', profile: p0 });
    expect(res.profile.chest.opened).toBe(1);
    const gained =
      res.profile.stars - p0.stars + (res.profile.coins - p0.coins) + res.profile.chest.keys;
    expect(gained).toBeGreaterThan(0);
  });

  it('growthView：徽章墙返回全部徽章 + 是否已获得', () => {
    const s = service();
    const view = s.growthView(initialProfile());
    expect(view.badges.length).toBe(view.badgeTotal);
    expect(view.badgeOwned).toBe(0);
    expect(view.rank.level).toBe(1);
  });
});

// 冒险岛以外的游戏（消消乐 / 极速选择 / 听音找词 / 小蜜蜂 / 语法闯关）共用这条换算
describe('rewardOfRun（单局结算换算）', () => {
  const cfg = {
    starPerCorrect: REWARD_STAR_PER_CORRECT,
    coinPerCorrect: REWARD_COIN_PER_CORRECT,
    tiers: REWARD_RATE_BONUS,
  };

  it('全对：每题 1 星 1 币 + 全对档奖励（rate=1 那档）', () => {
    const full = REWARD_RATE_BONUS.find((t) => t.rate === 1);
    expect(rewardOfRun({ correct: 10, total: 10 }, cfg)).toEqual({
      stars: 10 * cfg.starPerCorrect + (full?.stars ?? 0),
      coins: 10 * cfg.coinPerCorrect + (full?.coins ?? 0),
    });
  });

  it('八成对：命中 0.8 档，不拿全对奖励', () => {
    const res = rewardOfRun({ correct: 8, total: 10 }, cfg);
    const tier = REWARD_RATE_BONUS.find((t) => t.rate === 0.8);
    expect(res.stars).toBe(8 * cfg.starPerCorrect + (tier?.stars ?? 0));
    expect(res.coins).toBe(8 * cfg.coinPerCorrect + (tier?.coins ?? 0));
  });

  it('一题没对：落在兜底档，星币都是 0（结果页据此隐藏入账块）', () => {
    expect(rewardOfRun({ correct: 0, total: 10 }, cfg)).toEqual({ stars: 0, coins: 0 });
  });

  it('脏值兜底：NaN / 负数 / 题没生成出来（total=0）都不出 NaN、不为负', () => {
    expect(rewardOfRun({ correct: Number.NaN, total: 10 }, cfg)).toEqual({ stars: 0, coins: 0 });
    expect(rewardOfRun({ correct: -3, total: 10 }, cfg)).toEqual({ stars: 0, coins: 0 });
    // total=0（题目没生成出来）时率记 0，只可能命中 rate:0 兜底档——不会误判成「全对」
    // 但按题给的那部分照给：答对了就是答对了，不该因为 total 缺失被抹掉
    const noTotal = rewardOfRun({ correct: 5, total: 0 }, cfg);
    const allRight = rewardOfRun({ correct: 5, total: 5 }, cfg);
    expect(noTotal.stars).toBe(5 * cfg.starPerCorrect);
    expect(noTotal.stars).toBeLessThan(allRight.stars);
  });

  it('配置自身要成立：档位按 rate 降序，且最后一档 rate=0（否则可能一档都不命中）', () => {
    for (let i = 1; i < REWARD_RATE_BONUS.length; i += 1) {
      expect(REWARD_RATE_BONUS[i - 1]!.rate).toBeGreaterThan(REWARD_RATE_BONUS[i]!.rate);
    }
    expect(REWARD_RATE_BONUS[REWARD_RATE_BONUS.length - 1]?.rate).toBe(0);
  });
});

// 游戏环节徽章（2026-09-20）。
// 背景：原来 12 枚里 9 枚都是冒险岛的，玩消消乐的孩子一枚都拿不到。
// 新增的 plays / gameKinds 两类判定必须**只对真正玩过的游戏发**。
describe('游戏环节徽章判定（plays / gameKinds）', () => {
  const ctx = (plays: Record<string, number>, extra: Partial<BadgeContext> = {}): BadgeContext => ({
    clearedCount: 0,
    cleared: {},
    castleBest: 0,
    stars: 0,
    totalQ: 0,
    checkinDays: 0,
    chestOpened: 0,
    plays,
    ...extra,
  });

  const playBadge = (id: string, param: string, value: number): BadgeDef => ({
    id,
    icon: '🧩',
    name: '测试勋章',
    desc: '玩够局数',
    kind: 'plays',
    param,
    value,
  });

  it('该游戏玩够局数 → 发', () => {
    const ids = evaluateBadges([], ctx({ memory: 10 }), [playBadge('m10', 'memory', 10)]);
    expect(ids).toEqual(['m10']);
  });

  it('没玩够 → 不发（差一局也不行）', () => {
    const ids = evaluateBadges([], ctx({ memory: 9 }), [playBadge('m10', 'memory', 10)]);
    expect(ids).toEqual([]);
  });

  it('⚠️ 玩的是别的游戏 → 不发（消消乐的勋章不能靠极速选择的局数拿到）', () => {
    const ids = evaluateBadges([], ctx({ speed: 99 }), [playBadge('m10', 'memory', 1)]);
    expect(ids).toEqual([]);
  });

  it('⚠️ param 缺失 → 不发（宁可不发，也不要乱发）', () => {
    const noParam: BadgeDef = {
      id: 'x',
      icon: '🧩',
      name: 'x',
      desc: 'x',
      kind: 'plays',
      value: 1,
    };
    expect(evaluateBadges([], ctx({ memory: 99 }), [noParam])).toEqual([]);
  });

  it('⚠️ ctx 没有 plays 时一律不发（老调用方不受影响，也不会误发）', () => {
    const legacy: BadgeContext = {
      clearedCount: 0,
      cleared: {},
      castleBest: 0,
      stars: 0,
      totalQ: 0,
      checkinDays: 0,
      chestOpened: 0,
    };
    expect(evaluateBadges([], legacy, [playBadge('m1', 'memory', 1)])).toEqual([]);
  });

  it('gameKinds：玩过几种游戏', () => {
    const def: BadgeDef = {
      id: 'all',
      icon: '🌈',
      name: '全能',
      desc: '6 个游戏都玩过',
      kind: 'gameKinds',
      value: 6,
    };
    expect(evaluateBadges([], ctx({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 }), [def])).toEqual(['all']);
    expect(evaluateBadges([], ctx({ a: 1, b: 1, c: 1 }), [def])).toEqual([]);
  });

  it('已拥有的不重复发', () => {
    const ids = evaluateBadges(['m10'], ctx({ memory: 50 }), [playBadge('m10', 'memory', 10)]);
    expect(ids).toEqual([]);
  });
});

// 学分经验值（2026-09-20）：学习是主行为，却一分经验都不给——这里补上规则。
describe('starsForTest（测试学分）', () => {
  it('满分 → 10 分', () => {
    expect(starsForTest(10, 10)).toBe(10);
  });

  it('≥80% → 5 分', () => {
    expect(starsForTest(8, 10)).toBe(5);
    expect(starsForTest(4, 5)).toBe(5);
  });

  it('≥60% → 2 分', () => {
    expect(starsForTest(6, 10)).toBe(2);
  });

  it('⚠️ 做得差也有 1 分（鼓励做完，不能让孩子白考一场）', () => {
    expect(starsForTest(1, 10)).toBe(1);
    expect(starsForTest(0, 10)).toBe(1);
  });

  it('总题数为 0 → 不给（避免脏数据刷分）', () => {
    expect(starsForTest(0, 0)).toBe(0);
  });
});
