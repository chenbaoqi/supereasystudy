// 极速选择游戏规则参数（Chapter 08 §5 + Q3 确认：可调，配置优先）。
export const SPEED_QUESTION_SECONDS = 5; // 每题限时（秒）
export const SPEED_BONUS_PER_REMAINING_SECOND = 2; // 速度奖励系数（剩余秒 × 系数）

// 听音找词游戏规则参数（Chapter 09 §5 + Q3 确认）。
export const LISTEN_QUESTION_SECONDS = 8; // 每题限时（秒，含播放与作答）

// 小蜜蜂射击游戏难度参数（Chapter 15 Q3；2026-07-31 大幅减速 + 降门槛）。
export const SHOOTER_DIFFICULTY = {
  easy: { maxEnemies: 1, spawnIntervalMs: 5000, fallSeconds: 22 },
  medium: { maxEnemies: 2, spawnIntervalMs: 3800, fallSeconds: 16 },
  hard: { maxEnemies: 3, spawnIntervalMs: 2800, fallSeconds: 10 },
} as const;
export type ShooterDifficulty = keyof typeof SHOOTER_DIFFICULTY;
