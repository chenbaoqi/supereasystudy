// 小蜜蜂射击游戏页（Chapter 15：Canvas 引擎 + 虚拟键盘）。
// Canvas 2D 即时渲染 + requestAnimationFrame 游戏循环。
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
const CANVAS_H = 600;
const AIRPLANE_Y = CANVAS_H - 60;

Page({
  data: {
    status: 'READY' as GameStatus,
    poolEmpty: false,
    difficulty: 'medium' as ShooterDifficulty,
    inputText: '',
    score: 0,
    streak: 0,
    hint: '',
  },

  chapterId: '',
  semesterId: '',
  userId: '',
  pool: [] as Knowledge[],
  segment: null as WechatMiniprogram.Canvas | null,
  ctx: null as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D | null,
  engine: null as EngineState | null,
  spawnQueue: [] as Knowledge[],
  lastSpawn: 0,
  startTime: 0,
  rafId: 0,
  frameCount: 0,
  lastTick: 0,

  onLoad(query: Record<string, string>) {
    this.chapterId = query.chapterId ?? '';
    this.semesterId = query.semesterId ?? '';
  },

  // Canvas 2D 初始化（必须在 onReady 中通过 SelectorQuery 拿 node）
  onReady() {
    wx.createSelectorQuery()
      .select('#gameCanvas')
      .fields({ node: true })
      .exec((res) => {
        const canvas = res[0]?.node as WechatMiniprogram.Canvas | undefined;
        if (!canvas) return;
        canvas.width = CANVAS_W * 2; // 物理像素（Retina）
        canvas.height = CANVAS_H * 2;
        this.segment = canvas;
      });
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
    this.startLoop();
    wx.enableAlertBeforeUnload({ message: '本局进行中，退出将不保存' });
  },

  startLoop() {
    const canvas = this.segment;
    if (!canvas) return;
    const ctx = canvas.getContext(
      '2d',
    ) as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D;
    if (!ctx) return;
    this.ctx = ctx;
    const loop = (ts: number) => {
      if (this.data.status !== 'PLAYING') return;
      if (!this.lastTick) this.lastTick = ts;
      const dt = Math.min((ts - this.lastTick) / 1000, 0.1); // cap dt
      this.lastTick = ts;
      this.engine = this.update(dt);
      this.render();
      this.rafId = (
        canvas as unknown as { requestAnimationFrame: (cb: (ts: number) => void) => number }
      ).requestAnimationFrame(loop);
    };
    this.rafId = (
      this.segment as unknown as { requestAnimationFrame: (cb: (ts: number) => void) => number }
    ).requestAnimationFrame(loop);
  },

  update(dt: number): EngineState {
    let state = this.engine!;
    const diff = this.data.difficulty;
    const cfg = SHOOTER_DIFFICULTY[diff];
    // 计时刷敌（优先用 spawnQueue，空了从 pool 循环）
    this.frameCount++;
    const now = Date.now();
    if (
      now - this.lastSpawn > cfg.spawnIntervalMs &&
      state.enemies.filter((e) => e.active).length < cfg.maxEnemies
    ) {
      if (this.spawnQueue.length === 0)
        this.spawnQueue = [...this.pool].sort(() => Math.random() - 0.5);
      const speed = CANVAS_H / cfg.fallSeconds;
      state = spawnEnemy(state, this.spawnQueue.splice(0, 1), CANVAS_W, Math.random, speed);
      this.lastSpawn = now;
    }
    state = tickEnemies(state, CANVAS_H, dt);
    state = checkMissed(state, AIRPLANE_Y);
    // 有方块抵达飞机层 → Game Over
    if (state.missIds.length > 0) {
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
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    // 敌机方块
    for (const enemy of st.enemies) {
      if (!enemy.active) continue;
      ctx.fillStyle = '#fa5151';
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.meaning, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2 + 7);
    }
    // 子弹
    for (const bullet of st.bullets) {
      ctx.fillStyle = '#07c160';
      ctx.fillRect(bullet.x - 3, bullet.y - 12, 6, 12);
    }
    // 粒子
    for (const p of st.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    // 飞机
    ctx.fillStyle = '#07c160';
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2 - 20, AIRPLANE_Y);
    ctx.lineTo(CANVAS_W / 2 + 20, AIRPLANE_Y);
    ctx.lineTo(CANVAS_W / 2, AIRPLANE_Y - 30);
    ctx.closePath();
    ctx.fill();
    // HUD
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.fillText(`得分 ${st.score}`, 20, 40);
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
    if (this.rafId) {
      if (this.segment)
        (
          this.segment as unknown as { cancelAnimationFrame: (id: number) => void }
        ).cancelAnimationFrame(this.rafId);
    }
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
    if (this.rafId && this.segment) {
      (
        this.segment as unknown as { cancelAnimationFrame: (id: number) => void }
      ).cancelAnimationFrame(this.rafId);
    }
  },
});
