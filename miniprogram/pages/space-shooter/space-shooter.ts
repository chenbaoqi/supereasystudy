// 小蜜蜂射击游戏页（Chapter 15：Canvas 2D 引擎 + 26 键虚拟键盘）。
// Canvas 初始化在开始游戏时执行（wx:if 块进入 DOM 后），非 onReady。
import { SHOOTER_DIFFICULTY, type ShooterDifficulty } from '../../config/gameRules';
import type { Knowledge } from '../../core/knowledge';
import { spaceShooterService } from '../../services/spaceShooterService';
import { shooterAudio } from '../../services/shooterAudio';
import {
  type EngineState,
  applyHit,
  checkMissed,
  findMatch,
  handleInput,
  spawnEnemy,
  tickBullets,
  tickEnemies,
  tickParticles,
} from '../../services/shooterEngine';
import { userService } from '../../services/userService';

type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
const CANVAS_W = 375;
const CANVAS_H = 520;
const AIRPLANE_Y = CANVAS_H - 50;

Page({
  data: {
    status: 'READY' as GameStatus,
    poolEmpty: false,
    difficulty: 'medium' as ShooterDifficulty,
    inputText: '',
    score: 0,
    streak: 0,
  },

  chapterId: '',
  semesterId: '',
  userId: '',
  pool: [] as Knowledge[],
  segment: null as unknown as {
    requestAnimationFrame: (cb: (ts: number) => void) => number;
    cancelAnimationFrame: (id: number) => void;
  } | null,
  ctx: null as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D | null,
  engine: null as EngineState | null,
  spawnQueue: [] as Knowledge[],
  lastSpawn: 0,
  startTime: 0,
  rafId: 0,
  lastTick: 0,
  dpr: 2,

  onLoad(query: Record<string, string>) {
    this.chapterId = query.chapterId ?? '';
    this.semesterId = query.semesterId ?? '';
  },

  async onStart() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    const start = await spaceShooterService.startGame(user._id, this.chapterId);
    if (!start.eligible) {
      this.setData({ poolEmpty: true });
      return;
    }
    this.pool = start.pool.sort(() => Math.random() - 0.5);
    this.spawnQueue = [...this.pool];
    this.engine = {
      enemies: [],
      bullets: [],
      particles: [],
      currentInput: '',
      score: 0,
      streak: 0,
      hitCount: 0,
      missCount: 0,
      hitIds: [],
      missIds: [],
    };
    this.startTime = Date.now();
    this.lastSpawn = 0;
    this.lastTick = 0;
    this.setData({ status: 'PLAYING', score: 0, streak: 0, inputText: '' });
    shooterAudio.startBgm();
    wx.enableAlertBeforeUnload({ message: '本局进行中，退出将不保存' });
    // Canvas 初始化（必须在 DOM 出现后——wx:if 条件块）
    await new Promise<void>((resolve) => {
      wx.createSelectorQuery()
        .select('#gameCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res[0]?.node as Record<string, unknown> | undefined;
          if (!canvas) {
            console.error('Canvas node not found');
            resolve();
            return;
          }
          this.dpr = wx.getSystemInfoSync().pixelRatio || 2;
          (canvas as { width: number; height: number }).width = CANVAS_W * this.dpr;
          (canvas as { width: number; height: number }).height = CANVAS_H * this.dpr;
          this.segment = canvas as unknown as typeof this.segment;
          resolve();
        });
    });
    if (!this.segment) {
      console.error('Canvas init failed');
      return;
    }
    const ctx = (this.segment as unknown as { getContext(type: string): unknown }).getContext(
      '2d',
    ) as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D;
    if (!ctx) {
      console.error('Canvas context failed');
      return;
    }
    this.ctx = ctx;
    this.startLoop();
  },

  startLoop() {
    if (!this.segment || !this.ctx) return;
    const loop = (ts: number) => {
      if (this.data.status !== 'PLAYING') return;
      if (!this.lastTick) this.lastTick = ts;
      const dt = Math.min((ts - this.lastTick) / 1000, 0.1);
      this.lastTick = ts;
      this.engine = this.update(dt);
      this.render();
      this.rafId = this.segment!.requestAnimationFrame(loop);
    };
    this.rafId = this.segment!.requestAnimationFrame(loop);
  },

  update(dt: number): EngineState {
    let state = this.engine!;
    const diff = this.data.difficulty;
    const cfg = SHOOTER_DIFFICULTY[diff];
    const now = Date.now();
    const active = state.enemies.filter((e) => e.active).length;
    if (now - this.lastSpawn > cfg.spawnIntervalMs && active < cfg.maxEnemies) {
      if (this.spawnQueue.length === 0)
        this.spawnQueue = [...this.pool].sort(() => Math.random() - 0.5);
      state = spawnEnemy(
        state,
        this.spawnQueue.splice(0, 1),
        CANVAS_W,
        Math.random,
        CANVAS_H / cfg.fallSeconds,
      );
      this.lastSpawn = now;
    }
    state = tickEnemies(state, CANVAS_H, dt);
    state = checkMissed(state, AIRPLANE_Y);
    if (state.missIds.length > (this.engine?.missIds.length ?? 0)) {
      shooterAudio.playSfx('miss');
      shooterAudio.stopBgm();
      void this.finish();
      return state;
    }
    state = tickBullets(state, dt);
    state = tickParticles(state, dt);
    return state;
  },

  render() {
    const ctx = this.ctx;
    const st = this.engine;
    if (!ctx || !st) return;
    const s = this.dpr; // 缩放因子（物理/逻辑像素）
    // 清屏：覆盖逻辑像素区域（物理画布是 logW*s × logH*s）
    ctx.save();
    ctx.scale(s, s);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    // 天空背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // 星星点缀
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i <= 20; i++) {
      ctx.fillRect((i * 47) % CANVAS_W, (i * 83 + st.score * 2) % CANVAS_H, 2, 2);
    }
    // 敌机方块（渐变填充+白色描边+阴影，中文白字）
    for (const enemy of st.enemies) {
      if (!enemy.active) continue;
      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(enemy.x + 3, enemy.y + 3, enemy.w, enemy.h, 8);
      ctx.fill();
      // 渐变填充（红→暗红）
      const grad = ctx.createLinearGradient(enemy.x, enemy.y, enemy.x, enemy.y + enemy.h);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(1, '#c0392b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(enemy.x, enemy.y, enemy.w, enemy.h, 8);
      ctx.fill();
      // 描边
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.meaning, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    }
    // 飞机（三角形，绿色，居中靠下）
    ctx.fillStyle = '#0f3460';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const ax = CANVAS_W / 2;
    const ay = AIRPLANE_Y;
    ctx.moveTo(ax, ay - 24);
    ctx.lineTo(ax - 18, ay + 8);
    ctx.lineTo(ax + 18, ay + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 子弹
    for (const bullet of st.bullets) {
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 10);
    }
    // 粒子
    for (const p of st.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    // HUD
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`得分 ${st.score}`, 20, 20);
    if (st.streak >= 2) {
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`Combo x${st.streak}`, 120, 20);
    }
    ctx.restore();
  },

  onKeyPress(event: WechatMiniprogram.CustomEvent<{ key: string }>) {
    if (!this.engine) return;
    let state = handleInput(this.engine, event.detail.key);
    const matchIndex = findMatch(state);
    if (matchIndex >= 0) {
      state = applyHit(state, matchIndex, CANVAS_W / 2);
      shooterAudio.playSfx('shoot');
      shooterAudio.playSfx('hit');
      shooterAudio.playSfx('explode');
    }
    this.engine = state;
    this.setData({ inputText: state.currentInput, score: state.score, streak: state.streak });
  },

  onBackspace() {
    if (!this.engine) return;
    this.engine = handleInput(this.engine, 'BACKSPACE');
    this.setData({ inputText: this.engine.currentInput });
  },

  onSetDifficulty(event: WechatMiniprogram.TouchEvent) {
    const { level } = event.currentTarget.dataset as { level: ShooterDifficulty };
    this.setData({ difficulty: level });
  },

  async finish() {
    if (this.data.status === 'FINISHED') return;
    this.data.status = 'FINISHED';
    shooterAudio.stopBgm();
    if (this.rafId && this.segment) this.segment.cancelAnimationFrame(this.rafId);
    wx.disableAlertBeforeUnload();
    const st = this.engine!;
    await spaceShooterService.finishGame({
      userId: this.userId,
      chapterId: this.chapterId,
      pool: this.pool,
      hitIds: st.hitIds,
      missIds: st.missIds,
      score: st.score,
      duration: Math.round((Date.now() - this.startTime) / 1000),
    });
    wx.redirectTo({
      url: `/pages/memory-result/memory-result?chapterId=${this.chapterId}&semesterId=${this.semesterId}`,
    });
  },

  onHide() {
    if (this.data.status === 'PLAYING') {
      this.setData({ status: 'PAUSED' });
      shooterAudio.stopBgm();
    }
  },
  onShow() {
    if (this.data.status === 'PAUSED') {
      this.setData({ status: 'PLAYING' });
      this.lastTick = 0;
      shooterAudio.startBgm();
    }
  },
  onUnload() {
    shooterAudio.stopBgm();
    wx.disableAlertBeforeUnload();
    if (this.rafId && this.segment) this.segment.cancelAnimationFrame(this.rafId);
  },
});
