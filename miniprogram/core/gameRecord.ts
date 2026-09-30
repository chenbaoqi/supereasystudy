// 游戏战绩聚合（L2「我的战绩」）——**纯函数**，不依赖 wx。
//
// 数据源只有一处：`memory_game_records`（每局一条，由各游戏的 finishGame 写入）。
// 之前这张表是**只写不读**的黑洞（`listByUser` 没有任何调用方），L2 就是给它一个出口。
//
// 设计取舍：
//   1. 聚合口径刻意保守——只算「记录里本来就有的字段」（correct/wrong/score/duration），
//      不反过来推断诸如「平均每局多少秒」以外的东西，避免口径越滚越复杂。
//   2. 任何脏值（NaN / 负数 / 缺失日期）都**兜底成 0 或 '—'**，页面不会因为一条坏记录整页崩。
//   3. 时间显示需要注入 now（否则单测依赖真实时钟，跨天就飘）。

import type { MemoryGameRecord, MemoryGameType } from './memoryGame';

export interface GameRecordStats {
  readonly totalGames: number; // 总局数
  readonly totalCorrect: number; // 累计答对
  readonly totalWrong: number; // 累计答错
  readonly totalSeconds: number; // 累计用时（秒）
  readonly bestScore: number; // 单局最高分
  readonly accuracy: number; // 整体正确率（百分数 0~100，取整）
}

export interface GameRecordGroup {
  readonly gameType: MemoryGameType;
  readonly name: string;
  readonly icon: string;
  readonly plays: number; // 局数
  readonly bestScore: number;
  readonly accuracy: number;
  readonly lastPlayedText: string; // 例「今天」「昨天」「3 天前」；未知为 ''
}

// 最近战绩的一行（时间文案在纯函数里算好：WXML 不能调 toLocaleString 之类的方法）
export interface GameRecordRow {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly score: number;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly durationText: string; // 例「1 分 20 秒」
  readonly whenText: string; // 例「今天 14:30」
}

export interface GameRecordView {
  readonly stats: GameRecordStats;
  readonly groups: readonly GameRecordGroup[];
  readonly rows: readonly GameRecordRow[];
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

// 秒 → 「1 分 20 秒」/「45 秒」（<60 秒不显示分钟，孩子读着不别扭）
export function durationTextOf(seconds: number): string {
  const total = num(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} 秒`;
  if (s === 0) return `${m} 分`;
  return `${m} 分 ${s} 秒`;
}

// 跨零点/跨时区都按**自然日**判，不用毫秒差（毫秒差会把「昨晚 23:50」算成今天）
const daysBetween = (from: Date, to: Date): number => {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
};

export function whenTextOf(date: Date, now: Date = new Date()): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const days = daysBetween(date, now);
  if (days === 0) return `今天 ${hh}:${mm}`;
  if (days === 1) return `昨天 ${hh}:${mm}`;
  if (days > 1 && days < 30) return `${days} 天前`;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

const accuracyOf = (correct: number, wrong: number): number => {
  const total = correct + wrong;
  return total > 0 ? Math.round((correct / total) * 100) : 0;
};

// date 可能是云端返回的 Date，也可能是被 JSON 化过的字符串（测试/历史数据）→ 两种都认
const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export interface GameRecordAggregateDeps {
  // 由 config/games 提供（gameByRecordType）：这里不直接 import config，保持 core 纯净可测
  resolveGame: (type: MemoryGameType) => { name: string; icon: string } | undefined;
  now?: () => Date;
  // 最近战绩最多显示几条（默认 20；records 本身已被仓储层限 100 条）
  recentLimit?: number;
}

export function aggregateRecords(
  records: readonly MemoryGameRecord[],
  deps: GameRecordAggregateDeps,
): GameRecordView {
  const now = (deps.now ?? (() => new Date()))();
  const recentLimit = deps.recentLimit ?? 20;
  const list = Array.isArray(records) ? records : [];

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalSeconds = 0;
  let bestScore = 0;
  // gameType → 累计（分组统计）
  const buckets = new Map<
    MemoryGameType,
    { plays: number; correct: number; wrong: number; best: number; last: Date | null }
  >();

  for (const r of list) {
    const correct = num(r?.correctCount);
    const wrong = num(r?.wrongCount);
    const score = typeof r?.score === 'number' && Number.isFinite(r.score) ? r.score : 0;
    totalCorrect += correct;
    totalWrong += wrong;
    totalSeconds += num(r?.duration);
    if (score > bestScore) bestScore = score;

    const type = r?.gameType ?? 'match';
    const bucket = buckets.get(type) ?? { plays: 0, correct: 0, wrong: 0, best: 0, last: null };
    bucket.plays += 1;
    bucket.correct += correct;
    bucket.wrong += wrong;
    if (score > bucket.best) bucket.best = score;
    const when = toDate(r?.createdAt);
    if (when && (!bucket.last || when.getTime() > bucket.last.getTime())) bucket.last = when;
    buckets.set(type, bucket);
  }

  const groups: GameRecordGroup[] = [...buckets.entries()]
    .map(([type, b]) => {
      const meta = deps.resolveGame(type);
      return {
        gameType: type,
        name: meta?.name ?? '未知游戏',
        icon: meta?.icon ?? '🎮',
        plays: b.plays,
        bestScore: b.best,
        accuracy: accuracyOf(b.correct, b.wrong),
        lastPlayedText: b.last ? whenTextOf(b.last, now) : '',
      };
    })
    // 玩得多的排前面，其次再看最高分——孩子最关心常玩那个
    .sort((a, b) => b.plays - a.plays || b.bestScore - a.bestScore);

  const rows: GameRecordRow[] = list
    .slice()
    // createdAt 有可能缺失（脏数据）；缺的就排最后，不参与比较
    .sort((a, b) => {
      const ta = toDate(a?.createdAt)?.getTime() ?? 0;
      const tb = toDate(b?.createdAt)?.getTime() ?? 0;
      return tb - ta;
    })
    .slice(0, Math.max(0, recentLimit))
    .map((r, index) => {
      const type = r?.gameType ?? 'match';
      const meta = deps.resolveGame(type);
      const when = toDate(r?.createdAt);
      return {
        id: r?._id ?? `row-${index}`,
        name: meta?.name ?? '未知游戏',
        icon: meta?.icon ?? '🎮',
        score: typeof r?.score === 'number' && Number.isFinite(r.score) ? r.score : 0,
        correctCount: num(r?.correctCount),
        wrongCount: num(r?.wrongCount),
        durationText: durationTextOf(r?.duration),
        whenText: when ? whenTextOf(when, now) : '',
      };
    });

  return {
    stats: {
      totalGames: list.length,
      totalCorrect,
      totalWrong,
      totalSeconds,
      bestScore,
      accuracy: accuracyOf(totalCorrect, totalWrong),
    },
    groups,
    rows,
  };
}
