// 口算冒险岛单元测试（数学学科·小学）。
// 覆盖三块：出题引擎的准确性约束、7 关各自的推进与通关判定、存档与结算服务。
// 出题是纯函数 + 可注入随机源，故断言稳定可复现。
import { describe, expect, it } from 'vitest';
import {
  accuracyOf,
  applyCorrect,
  applyWrongFirst,
  applyWrongSecond,
  castleStarsOf,
  createRun,
  currentQuestion,
  freeLevel,
  generateQuestion,
  generateSet,
  initialProgress,
  isLevelCleared,
  parseProgress,
  rewardOf,
  ISLAND_MAX_LIVES,
  ISLAND_OPS,
  type IslandOp,
  type IslandProgress,
  type IslandRunState,
} from '../miniprogram/core/mathIsland';
import { findLevel, gradePresetOf } from '../miniprogram/config/mathIsland';
import {
  createMathIslandService,
  type IslandStoragePort,
} from '../miniprogram/services/mathIslandService';
import type {
  MemoryGameRecordCreate,
  MemoryGameRepository,
} from '../miniprogram/repositories/memoryGameRepository';
import type {
  IslandProgressUpsert,
  MathIslandRepository,
} from '../miniprogram/repositories/mathIslandRepository';

// 可复现随机源（mulberry32）
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const level = (id: string) => {
  const l = findLevel(id);
  if (!l) throw new Error(`missing level ${id}`);
  return l;
};

describe('generateQuestion', () => {
  it('四种运算符：答案准确、非负整数', () => {
    const random = seeded(11);
    for (const op of ISLAND_OPS) {
      for (const range of [10, 20, 50, 100]) {
        for (let i = 0; i < 120; i += 1) {
          const q = generateQuestion(op, range, random);
          if (!q) continue; // 题目空间不足时允许返回 null
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          if (op === 'add') expect(q.a + q.b).toBe(q.answer);
          if (op === 'sub') expect(q.a - q.b).toBe(q.answer);
          if (op === 'mul') expect(q.a * q.b).toBe(q.answer);
          if (op === 'div') expect(q.a / q.b).toBe(q.answer);
        }
      }
    }
  });

  it('减法不出现负数，除法保证整除', () => {
    const random = seeded(23);
    for (let i = 0; i < 400; i += 1) {
      const sub = generateQuestion('sub', 20, random);
      if (sub) expect(sub.a).toBeGreaterThanOrEqual(sub.b);
      const div = generateQuestion('div', 100, random);
      if (div) expect(div.a % div.b).toBe(0);
    }
  });

  it('加法结果不超过数字范围（否则孩子会觉得超纲）', () => {
    const random = seeded(37);
    for (const range of [10, 20, 50, 100]) {
      for (let i = 0; i < 200; i += 1) {
        const q = generateQuestion('add', range, random);
        if (q) expect(q.answer).toBeLessThanOrEqual(range);
      }
    }
  });

  it('小范围时乘法因子不超过 5，大范围不超过 9', () => {
    const random = seeded(41);
    for (let i = 0; i < 300; i += 1) {
      const small = generateQuestion('mul', 20, random);
      if (small) expect(Math.max(small.a, small.b)).toBeLessThanOrEqual(5);
      const big = generateQuestion('mul', 100, random);
      if (big) expect(Math.max(big.a, big.b)).toBeLessThanOrEqual(9);
    }
  });

  it('相同随机源产出可复现', () => {
    expect(generateQuestion('mul', 50, seeded(7))).toEqual(generateQuestion('mul', 50, seeded(7)));
  });
});

describe('generateSet', () => {
  it('产出指定题量且运算符都在允许名单内', () => {
    const ops: IslandOp[] = ['add', 'sub'];
    const set = generateSet(ops, 20, 10, seeded(5));
    expect(set).toHaveLength(10);
    for (const q of set) expect(ops).toContain(q.op);
  });

  it('运算符为空时返回空数组（不退化成随便出题）', () => {
    expect(generateSet([], 20, 10)).toEqual([]);
  });
});

describe('单局推进：生命与连胜', () => {
  it('初始 3 生命；第一次答错扣 1 生命但先不计错题', () => {
    const run = createRun(level('village'), seeded(1));
    expect(run.lives).toBe(ISLAND_MAX_LIVES);
    const after = applyWrongFirst(run);
    expect(after.lives).toBe(2);
    expect(after.wrong).toBe(0); // 还有一次机会，不算错
    expect(after.attempts).toBe(1);
    expect(after.combo).toBe(0);
    expect(currentQuestion(after)).toEqual(currentQuestion(run)); // 还是同一题
  });

  it('第二次答错才计入错题并进入下一题', () => {
    const run = createRun(level('village'), seeded(1));
    const second = applyWrongSecond(applyWrongFirst(run));
    expect(second.wrong).toBe(1);
    expect(second.idx).toBe(1);
  });

  it('连对 3 题恢复 1 颗生命（上限 3）', () => {
    let run = createRun(level('village'), seeded(2));
    run = { ...run, lives: 1 };
    for (let i = 0; i < 3; i += 1) run = applyCorrect(run);
    expect(run.combo).toBe(3);
    expect(run.lives).toBe(2);
  });

  it('生命耗尽即失败，且给出原因文案', () => {
    let run = createRun(level('village'), seeded(3));
    run = applyWrongFirst(run);
    run = applyWrongFirst(run);
    expect(run.finished).toBe(false);
    run = applyWrongFirst(run);
    expect(run.finished).toBe(true);
    expect(run.success).toBe(false);
    expect(run.reason).toBe('生命用完啦');
  });
});

describe('各关卡通关判定', () => {
  it('口算村：答完 5 题即通关', () => {
    let run = createRun(level('village'), seeded(4));
    for (let i = 0; i < 5; i += 1) run = applyCorrect(run);
    expect(run.finished).toBe(true);
    expect(isLevelCleared(level('village'), run)).toBe(true);
  });

  // 注：3 颗生命意味着最多只能「二次答错」2 题（第 3 次一次错就掉光生命），
  // 所以 10 题关卡的正确率下限是 80% —— 胡萝卜的 80% 门槛与「别掉光生命」等价，
  // 真正让它不通关的是生命耗尽，不是正确率。测试如实反映这一点。
  it('胡萝卜：错 2 题仍有 80%，可通关', () => {
    let run = createRun(level('carrot'), seeded(6));
    run = applyWrongSecond(applyWrongFirst(run));
    run = applyWrongSecond(applyWrongFirst(run));
    while (!run.finished) run = applyCorrect(run);
    expect(accuracyOf(run)).toBe(80);
    expect(isLevelCleared(level('carrot'), run)).toBe(true);
  });

  it('胡萝卜：生命耗尽则不通关（即使答完了题）', () => {
    let run = createRun(level('carrot'), seeded(6));
    run = applyWrongFirst(run);
    run = applyWrongFirst(run);
    run = applyWrongFirst(run);
    expect(run.success).toBe(false);
    expect(isLevelCleared(level('carrot'), run)).toBe(false);
  });

  it('数字森林：连对 3 题起一次前进 2 步', () => {
    let run = createRun(level('forest'), seeded(8));
    run = applyCorrect(run);
    expect(run.steps).toBe(1);
    run = applyCorrect(run);
    expect(run.steps).toBe(2);
    run = applyCorrect(run); // 连对 3，加速
    expect(run.steps).toBe(4);
  });

  it('数字森林：走满 10 步通关', () => {
    let run = createRun(level('forest'), seeded(9));
    while (!run.finished) run = applyCorrect(run);
    expect(run.steps).toBeGreaterThanOrEqual(10);
    expect(isLevelCleared(level('forest'), run)).toBe(true);
  });

  it('独木桥：每答对点亮 1 块，10 块全亮过桥', () => {
    let run = createRun(level('bridge'), seeded(10));
    run = applyCorrect(run);
    expect(run.planks).toBe(1);
    while (!run.finished) run = applyCorrect(run);
    expect(run.planks).toBe(10);
    expect(isLevelCleared(level('bridge'), run)).toBe(true);
  });

  it('火山：答对 -10%，答错 +5%，降到 0 通关', () => {
    let run = createRun(level('volcano'), seeded(12));
    run = applyCorrect(run);
    expect(run.energy).toBe(90);
    run = applyWrongSecond(applyWrongFirst(run));
    expect(run.energy).toBe(95);
    while (!run.finished) run = applyCorrect(run);
    expect(run.energy).toBe(0);
    expect(isLevelCleared(level('volcano'), run)).toBe(true);
  });

  it('巨龙：连对 3 次 -2HP，连对 5 次必杀', () => {
    let run = createRun(level('dragon'), seeded(14));
    run = applyCorrect(run);
    expect(run.hp).toBe(9); // -1
    run = applyCorrect(run);
    expect(run.hp).toBe(8); // -1
    run = applyCorrect(run);
    expect(run.hp).toBe(6); // 连对 3 → -2
    run = applyCorrect(run);
    expect(run.hp).toBe(4); // 连对 4 → -2
    run = applyCorrect(run);
    expect(run.hp).toBe(0); // 连对 5 → 必杀
    expect(run.finished).toBe(true);
    expect(isLevelCleared(level('dragon'), run)).toBe(true);
  });

  it('宝藏城堡：按正确率评 1~3 星（≥90 三星，≥70 二星，其余一星）', () => {
    // 直接构造结算态：低正确率在实战中要掉光生命才拿得到，用合成态覆盖全部分档
    const synth = (correct: number, wrong: number): IslandRunState => ({
      ...createRun(level('castle'), seeded(16)),
      correct,
      wrong,
    });
    expect(castleStarsOf(synth(10, 0))).toBe(3);
    expect(castleStarsOf(synth(9, 1))).toBe(3);
    expect(castleStarsOf(synth(8, 2))).toBe(2);
    expect(castleStarsOf(synth(7, 3))).toBe(2);
    expect(castleStarsOf(synth(5, 5))).toBe(1);
  });
});

describe('奖励结算', () => {
  it('通关才发关卡奖励，未通关只保留答题所得', () => {
    const def = level('village');
    let run = createRun(def, seeded(18));
    for (let i = 0; i < 5; i += 1) run = applyCorrect(run);
    const cleared = rewardOf(def, run, true);
    const failed = rewardOf(def, run, false);
    expect(cleared.stars).toBe(run.gainStars + def.reward.stars);
    expect(failed.stars).toBe(run.gainStars);
    expect(failed.coins).toBeLessThan(cleared.coins);
  });

  it('宝藏城堡按星级额外发 10/20/30 星', () => {
    const def = level('castle');
    let run = createRun(def, seeded(20));
    while (!run.finished) run = applyCorrect(run);
    const reward = rewardOf(def, run, true);
    expect(reward.castleStars).toBe(3);
    expect(reward.stars).toBe(run.gainStars + 30);
  });
});

describe('年级推荐', () => {
  it('低年级加减为主，三年级起上乘除', () => {
    expect(gradePresetOf(1).ops).toEqual(['add', 'sub']);
    expect(gradePresetOf(2).ops).toEqual(['add', 'sub', 'mul']);
    expect(gradePresetOf(3).ops).toContain('div');
    // 解析不出年级时回落到二年级口径（小学游戏，默认别一上来 100 以内混算）
    expect(gradePresetOf(null)).toEqual(gradePresetOf(2));
  });
});

describe('存档解析（本机存储是弱类型，脏数据不能崩页面）', () => {
  it('非对象 / 缺字段都回落初始进度', () => {
    expect(parseProgress(null)).toEqual(initialProgress());
    expect(parseProgress('oops')).toEqual(initialProgress());
    const dirty = parseProgress({ stars: 'x', coins: null, levels: { forest: 1 } });
    expect(dirty.stars).toBe(0);
    expect(dirty.coins).toBe(0);
    // forest 是数字 1（脏值）→ 整条丢弃，不留下半成品状态
    expect(dirty.levels.forest).toBeUndefined();
  });

  it('关卡状态是对象时逐字段兜底，非布尔的 done 一律当未通关', () => {
    const dirty = parseProgress({ levels: { forest: { done: 'yes', steps: 'x', planks: 3 } } });
    expect(dirty.levels.forest?.done).toBe(false);
    expect(dirty.levels.forest?.steps).toBe(0);
    expect(dirty.levels.forest?.planks).toBe(3);
  });
});

describe('MathIslandService（账号级存档）', () => {
  const fakeStorage = (): IslandStoragePort & { data: Map<string, unknown> } => {
    const data = new Map<string, unknown>();
    return {
      data,
      read: (k) => data.get(k) ?? null,
      write: (k, v) => void data.set(k, v),
      remove: (k) => void data.delete(k),
    };
  };

  // 结算会顺手写一条云记录，repository 必须能给 save（否则 commitRun 直接抛错）
  const stubGameRepo = (saved: MemoryGameRecordCreate[]): MemoryGameRepository => ({
    async save(input) {
      saved.push(input);
      return { _id: 'r', ...input, createdAt: new Date(), updatedAt: new Date() };
    },
    async listByUser() {
      return [];
    },
  });

  // 云存档仓库：doc 为 null 表示「云端还没存档」；throwIt 模拟集合未创建 / 云不可用
  const stubIslandRepo = (
    doc: IslandProgress | null = null,
    opts: { throwIt?: boolean; writes?: IslandProgressUpsert[] } = {},
  ): MathIslandRepository => ({
    async getByUser() {
      if (opts.throwIt) throw new Error('collection not exists');
      return doc;
    },
    async upsert(_userId, data) {
      opts.writes?.push(data);
      return undefined;
    },
  });

  it('关卡按顺序解锁：只有通关上一个才解锁下一个', async () => {
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(),
      memoryGameRepository: stubGameRepo([]),
      storage: fakeStorage(),
    });
    const views = service.levelViews(initialProgress());
    expect(views[0]?.unlocked).toBe(true);
    expect(views[1]?.unlocked).toBe(false);
    expect(views[0]?.current).toBe(true);
  });

  it('load：云端有存档就以云为准（source=cloud），并刷新本机镜像', async () => {
    const cloud: IslandProgress = { ...initialProgress(), stars: 42, coins: 7 };
    const storage = fakeStorage();
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(cloud),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });
    const res = await service.load('u1');
    expect(res.source).toBe('cloud');
    expect(res.progress.stars).toBe(42);
    // 云拿到后镜像被刷新：下次断网也能读到 42
    expect(parseProgress(storage.data.get('mathIsland_v1_u1')).stars).toBe(42);
  });

  it('load：云端没有存档时回落到本机镜像（source=mirror）', async () => {
    const storage = fakeStorage();
    const seed: IslandProgress = { ...initialProgress(), stars: 9 };
    storage.data.set('mathIsland_v1_u1', seed);
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(null),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });
    const res = await service.load('u1');
    expect(res.source).toBe('mirror');
    expect(res.progress.stars).toBe(9);
  });

  it('load：云不可用时不抛错，回落到镜像继续玩', async () => {
    const storage = fakeStorage();
    storage.data.set('mathIsland_v1_u1', { ...initialProgress(), coins: 5 });
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(null, { throwIt: true }),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });
    const res = await service.load('u1');
    expect(res.source).toBe('mirror');
    expect(res.progress.coins).toBe(5);
  });

  it('存档按 userId 分开：同设备换账号不串进度', async () => {
    const storage = fakeStorage();
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });
    const mine: IslandProgress = { ...initialProgress(), stars: 30 };
    service.save('u1', mine);
    const other = await service.load('u2');
    expect(other.progress.stars).toBe(0);
    expect(storage.data.has('mathIsland_v1_u1')).toBe(true);
    expect(storage.data.has('mathIsland_v1_u2')).toBe(false);
  });

  it('commitRun 累加星星并点亮关卡，且写一条 gameType=island 记录', async () => {
    const saved: MemoryGameRecordCreate[] = [];
    const writes: IslandProgressUpsert[] = [];
    const storage = fakeStorage();
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(null, { writes }),
      memoryGameRepository: stubGameRepo(saved),
      storage,
    });

    const def = level('village');
    let run = createRun(def, seeded(22));
    while (!run.finished) run = applyCorrect(run);

    const { progress, summary } = service.commitRun({
      userId: 'u1',
      chapterId: 'ch1',
      progress: (await service.load('u1')).progress,
      level: def,
      run,
      durationMs: 12_000,
    });

    expect(summary.cleared).toBe(true);
    expect(progress.levels.village?.done).toBe(true);
    // ⚠️ 星星/金币不再进岛屿存档：全站钱包（user_game_profile）是唯一钱袋子，
    // 岛屿只保留关卡进度；reward 仍算出来交给调用方入账。
    expect(summary.stars).toBeGreaterThan(0);
    expect(progress.stars).toBe(0);
    expect(summary.gainedKeys).toBe(1); // 通关新关卡 → 1 把钥匙（由钱包入账）
    expect(summary.unlockedName).toContain('胡萝卜挑战');
    expect(saved[0]?.gameType).toBe('island');
    expect(saved[0]?.duration).toBe(12);
    // 存档落到本机 + 写云两条路都走了
    expect(parseProgress(storage.data.get('mathIsland_v1_u1')).stars).toBe(progress.stars);
    expect(writes[0]?.stars).toBe(progress.stars);
  });

  // ⚠️ 写云是异步且不 await 的：玩家一打完就点「回冒险地图」，地图页立刻读云时，
  //    云端很可能还停在旧值。2026-09-16 修掉的正是这条 —— 判据是 rev 而不是「云优先」。
  it('写云还没落库时不丢进度：以本机镜像为准，并补推一次云', async () => {
    const writes: IslandProgressUpsert[] = [];
    const storage = fakeStorage();
    const service = createMathIslandService({
      // 云端还停在 rev=0（还没同步这一局的星星）
      mathIslandRepository: stubIslandRepo(initialProgress(), { writes }),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });

    service.save('u1', { ...initialProgress(), stars: 30 });
    expect(storage.data.has('mathIsland_v1_u1')).toBe(true);

    const res = await service.load('u1');
    expect(res.source).toBe('mirror');
    expect(res.progress.stars).toBe(30); // 没有被云端的旧值盖回去
    expect(writes[writes.length - 1]?.stars).toBe(30); // 顺手补推，下次联网就好了
  });

  it('换设备时云端更新：以云为准（rev 更高的那份）', async () => {
    const cloud: IslandProgress = { ...initialProgress(), rev: 5, stars: 99 };
    const storage = fakeStorage();
    storage.data.set('mathIsland_v1_u1', { ...initialProgress(), rev: 1, stars: 30 });
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(cloud),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });
    const res = await service.load('u1');
    expect(res.source).toBe('cloud');
    expect(res.progress.stars).toBe(99);
    expect(parseProgress(storage.data.get('mathIsland_v1_u1')).stars).toBe(99);
  });

  it('save 递增 rev，镜像与云端写同一份值', async () => {
    const writes: IslandProgressUpsert[] = [];
    const storage = fakeStorage();
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(null, { writes }),
      memoryGameRepository: stubGameRepo([]),
      storage,
    });
    const base = initialProgress();
    expect(base.rev).toBe(0);
    const a = service.save('u1', base);
    expect(a.rev).toBe(1);
    const b = service.save('u1', a);
    expect(b.rev).toBe(2);
    expect(writes.map((w) => w.rev)).toEqual([1, 2]);
    expect(parseProgress(storage.data.get('mathIsland_v1_u1')).rev).toBe(2);
  });

  it('未通关也保留森林步数，下次接着走', async () => {
    const service = createMathIslandService({
      mathIslandRepository: stubIslandRepo(),
      memoryGameRepository: stubGameRepo([]),
      storage: fakeStorage(),
    });
    const def = level('forest');
    let run = createRun(def, seeded(24));
    run = applyCorrect(run);
    run = applyCorrect(run);
    const { progress } = service.commitRun({
      userId: 'u1',
      chapterId: '',
      progress: (await service.load('u1')).progress,
      level: def,
      run: { ...run, finished: true, success: false, reason: '生命用完啦' },
      durationMs: 5_000,
    });
    expect(progress.levels.forest?.done).toBe(false);
    expect(progress.levels.forest?.steps).toBe(2);
  });
});

// 自由练习不进地图，但题量与范围要按传入值走
describe('自由练习', () => {
  it('按传入的运算符与范围出题', () => {
    const def = freeLevel(['mul'], 20, 5);
    const run = createRun(def, seeded(26));
    expect(run.questions).toHaveLength(5);
    expect(run.need).toBe(5);
    for (const q of run.questions) expect(q.op).toBe('mul');
  });

  it('currentQuestion 在开局返回第一题', () => {
    const run = createRun(level('village'), seeded(28));
    expect(currentQuestion(run)).toBe(run.questions[0]);
  });
});
