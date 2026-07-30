// 极速选择游戏规则参数（Chapter 08 §5 + Q3 确认：可调，配置优先）。
export const SPEED_QUESTION_SECONDS = 5; // 每题限时（秒）
export const SPEED_BONUS_PER_REMAINING_SECOND = 2; // 速度奖励系数（剩余秒 × 系数）

// 听音找词游戏规则参数（Chapter 09 §5 + Q3 确认）。
export const LISTEN_QUESTION_SECONDS = 8; // 每题限时（秒，含播放与作答）

// 小蜜蜂射击游戏难度参数（Chapter 15 Q3 确认）。
export const SHOOTER_DIFFICULTY = {
  easy: { maxEnemies: 2, spawnIntervalMs: 3000, fallSeconds: 8 },
  medium: { maxEnemies: 4, spawnIntervalMs: 2000, fallSeconds: 6 },
  hard: { maxEnemies: 6, spawnIntervalMs: 1500, fallSeconds: 4 },
} as const;
export type ShooterDifficulty = keyof typeof SHOOTER_DIFFICULTY;
