// 小蜜蜂射击引擎纯逻辑（Chapter 15：方块移动/碰撞/输入匹配/得分，全部纯函数可测）。
import type { Knowledge } from '../core/knowledge';
import { scoreForCorrect } from './memoryGameLogic';

export interface Enemy {
  readonly knowledgeId: string;
  readonly meaning: string; // 显示中文
  readonly word: string; // 匹配用的英文答案
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number; // px/s
  active: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  targetX: number;
  speed: number; // px/s
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface EngineState {
  readonly enemies: Enemy[];
  readonly bullets: Bullet[];
  readonly particles: Particle[];
  readonly currentInput: string;
  readonly score: number;
  readonly streak: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitIds: string[];
  readonly missIds: string[];
}

// 创建新敌人（随机取知识池中未上场的单词）
export function spawnEnemy(
  state: EngineState,
  pool: readonly Knowledge[],
  canvasWidth: number,
  random: () => number,
  speed: number,
): EngineState {
  const activeIds = new Set(state.enemies.filter((e) => e.active).map((e) => e.knowledgeId));
  const candidates = pool.filter((item) => !activeIds.has(item._id));
  if (candidates.length === 0) return state;
  const knowledge = candidates[Math.floor(random() * candidates.length)] ?? candidates[0];
  if (!knowledge) return state;
  const enemy: Enemy = {
    knowledgeId: knowledge._id,
    meaning: knowledge.meaning,
    word: knowledge.word,
    x: Math.max(30, random() * (canvasWidth - 120)),
    y: 0,
    w: 120,
    h: 44,
    speed,
    active: true,
  };
  return { ...state, enemies: [...state.enemies, enemy] };
}

// 方块下落 dt 秒
export function tickEnemies(state: EngineState, _canvasHeight: number, dt: number): EngineState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.active ? { ...enemy, y: enemy.y + enemy.speed * dt } : enemy,
    ),
  };
}

// 检测落地方块 → 标记 miss（调用方判断 Game Over）
export function checkMissed(state: EngineState, bottomY: number): EngineState {
  let missCount = state.missCount;
  const missIds = [...state.missIds];
  const enemies = state.enemies.map((enemy) => {
    if (enemy.active && enemy.y > bottomY) {
      missCount += 1;
      missIds.push(enemy.knowledgeId);
      return { ...enemy, active: false };
    }
    return enemy;
  });
  return {
    ...state,
    enemies,
    missCount,
    missIds,
    streak: state.streak > 0 && missCount === 0 ? state.streak : 0,
  };
}

// 键盘输入处理（Q5：允许删除；完整匹配当前活跃敌人的单词 → 返回命中敌人下标）
export function handleInput(state: EngineState, key: string): EngineState {
  if (key === 'BACKSPACE') {
    return { ...state, currentInput: state.currentInput.slice(0, -1) };
  }
  // 单字母追加
  const input = state.currentInput + key;
  return { ...state, currentInput: input };
}

export function clearInput(state: EngineState): EngineState {
  return { ...state, currentInput: '' };
}

// 检查当前输入是否完整匹配某个活跃敌人
export function findMatch(state: EngineState): number {
  const word = state.currentInput.toLowerCase();
  return state.enemies.findIndex((enemy) => enemy.active && enemy.word.toLowerCase() === word);
}

// 命中：生成子弹 + 加分
export function applyHit(state: EngineState, enemyIndex: number, airplaneX: number): EngineState {
  const enemy = state.enemies[enemyIndex];
  if (!enemy) return state;
  const { delta, newStreak } = scoreForCorrect(state.streak);
  const bullet: Bullet = { x: airplaneX, y: 0, targetX: enemy.x + enemy.w / 2, speed: 600 };
  return {
    ...state,
    currentInput: '',
    score: state.score + delta,
    streak: newStreak,
    hitCount: state.hitCount + 1,
    hitIds: [...state.hitIds, enemy.knowledgeId],
    enemies: state.enemies.map((e, i) => (i === enemyIndex ? { ...e, active: false } : e)),
    bullets: [...state.bullets, bullet],
  };
}

// 子弹飞行 + 碰撞
export function tickBullets(state: EngineState, dt: number): EngineState {
  const keep: Bullet[] = [];
  const particles = [...state.particles];
  for (const bullet of state.bullets) {
    const distX = bullet.targetX - bullet.x;
    const distY = -bullet.y; // 向上飞
    const totalDist = Math.sqrt(distX ** 2 + distY ** 2);
    if (totalDist < 10) {
      // 命中目标位置生成粒子
      for (let i = 0; i <= 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        particles.push({
          x: bullet.targetX,
          y: 0,
          vx: Math.cos(angle) * 160,
          vy: Math.sin(angle) * 160 - 80,
          life: 0.4,
          maxLife: 0.4,
        });
      }
      continue;
    }
    const step = bullet.speed * dt;
    const ratio = Math.min(1, step / totalDist);
    keep.push({
      ...bullet,
      x: bullet.x + distX * ratio,
      y: bullet.y + distY * ratio,
    });
  }
  return { ...state, bullets: keep, particles };
}

// 粒子衰减
export function tickParticles(state: EngineState, dt: number): EngineState {
  return {
    ...state,
    particles: state.particles
      .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: p.life - dt }))
      .filter((p) => p.life > 0),
  };
}
