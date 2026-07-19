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
