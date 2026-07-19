// 日期纯函数（复习排期与「今日」判定共用；DRY：禁止各页面各自 new Date 拼装）。

// 在 date 基础上加 days 天（返回新对象，不改入参）
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// 今日 00:00:00.000
export const startOfToday = (now: Date = new Date()): Date => {
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  return result;
};

// 今日 23:59:59.999（「今日待复习」的上界，含已过期）
export const endOfToday = (now: Date = new Date()): Date => {
  const result = new Date(now);
  result.setHours(23, 59, 59, 999);
  return result;
};

// 连续学习天数（Specification §13.3 方案 A：按日期去重，从今日/昨日向前连续计数）。
// 今日尚无活动时从昨日算起——连续记录不因「今天还没学」而清零。
export const countStreakDays = (dates: readonly Date[], now: Date = new Date()): number => {
  const dayKey = (date: Date): string =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const activeDays = new Set(dates.map(dayKey));
  const cursor = new Date(now);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
