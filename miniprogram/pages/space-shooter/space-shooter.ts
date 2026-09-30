// 小蜜蜂射击游戏页（Chapter 15：Canvas 2D 引擎 + 26 键虚拟键盘）。
// Canvas 初始化在开始游戏时执行（wx:if 块进入 DOM 后），非 onReady。
import { SHOOTER_DIFFICULTY, type ShooterDifficulty } from '../../config/gameRules';
import type { Knowledge } from '../../core/knowledge';
import { spaceShooterService } from '../../services/spaceShooterService';
import { gradeScope } from '../../services/gradeScope';
import { restoreShooterAudioPreference, shooterAudio } from '../../services/shooterAudio';
import { pronunciationService } from '../../services/pronunciationService';
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
const CANVAS_H = 360;
const AIRPLANE_Y = CANVAS_H - 50;

Page({
  data: {
    status: 'READY' as GameStatus,
    poolEmpty: false,
    difficulty: 'medium' as ShooterDifficulty,
    inputText: '',
    score: 0,
    streak: 0,
    musicOn: true,
    pronounceOn: true,
    paused: false,
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
    // 上次关掉的就别再响：静音选择跨会话记住（音效是合成出来的，没素材也要守这条）
    restoreShooterAudioPreference();
    this.setData({ musicOn: !shooterAudio.isMuted() });
  },

  async onStart() {
    const user = userService.getCurrentUser();
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.userId = user._id;
    // ADR-012：题源按当前年级过滤，别考还没学到的内容
    const start = await spaceShooterService.startGame(
      user._id,
      this.chapterId,
      gradeScope.currentGrade(),
    );
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
    // Game Over：方块落地（非初级）
    if (state.missIds.length > (this.engine?.missIds.length ?? 0) && diff !== 'easy') {
      shooterAudio.playSfx('miss');
      shooterAudio.stopBgm();
      void this.finish();
      return state;
    }
    // 胜利：所有池内单词已命中且无敌机活跃
    if (
      state.hitIds.length >= this.pool.length &&
      state.enemies.filter((e) => e.active).length === 0
    ) {
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
      ctx.roundRect(enemy.x + 3, enemy.y + 3, enemy.w, enemy.h, [8]);
      ctx.fill();
      // 渐变填充（红→暗红）
      const grad = ctx.createLinearGradient(enemy.x, enemy.y, enemy.x, enemy.y + enemy.h);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(1, '#c0392b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(enemy.x, enemy.y, enemy.w, enemy.h, [8]);
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
    // 战斗机（灰色机身+后掠翼+尾翼+座舱+引擎火焰）
    const ax = CANVAS_W / 2;
    const ay = AIRPLANE_Y;
    // 引擎火焰（随帧闪烁）
    const flicker = 0.7 + 0.3 * Math.sin(Date.now() * 0.02);
    ctx.fillStyle = `rgba(255, 120, 30, ${flicker})`;
    ctx.beginPath();
    ctx.moveTo(ax - 8, ay + 10);
    ctx.lineTo(ax, ay + 26 * flicker);
    ctx.lineTo(ax + 8, ay + 10);
    ctx.fill();
    // 机身
    ctx.fillStyle = '#4a5568';
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 30);
    ctx.lineTo(ax + 10, ay + 4);
    ctx.lineTo(ax + 16, ay + 10);
    ctx.lineTo(ax + 12, ay + 12);
    ctx.lineTo(ax + 6, ay + 6);
    ctx.lineTo(ax, ay + 10);
    ctx.lineTo(ax - 6, ay + 6);
    ctx.lineTo(ax - 12, ay + 12);
    ctx.lineTo(ax - 16, ay + 10);
    ctx.lineTo(ax - 10, ay + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 座舱
    ctx.fillStyle = '#63b3ed';
    ctx.strokeStyle = '#2b6cb0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ax, ay - 14, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 机炮
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 30);
    ctx.lineTo(ax, ay - 38);
    ctx.stroke();
    // 子弹（曳光弹+尾迹）
    for (const bullet of st.bullets) {
      // 尾迹
      ctx.strokeStyle = 'rgba(255,200,50,0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y + 10);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
      // 弹头
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // 爆炸粒子（多色+大小衰减）
    for (const p of st.particles) {
      const alpha = p.life / p.maxLife;
      const size = 5 * alpha;
      if (alpha > 0.3) {
        ctx.fillStyle = `rgba(255, 220, 50, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (alpha > 0.15) {
        ctx.fillStyle = `rgba(255, 100, 30, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(
          p.x + (Math.random() - 0.5) * 8 * alpha,
          p.y + (Math.random() - 0.5) * 8 * alpha,
          size * 0.6,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
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
      state = applyHit(state, matchIndex, CANVAS_W / 2, AIRPLANE_Y);
      shooterAudio.playSfx('shoot');
      shooterAudio.playSfx('hit');
      shooterAudio.playSfx('explode');
      // 命中播读音（读音期间 BGM 临时降到 10%）
      if (this.data.pronounceOn && state.enemies[matchIndex]) {
        const enemy = state.enemies[matchIndex];
        shooterAudio.duckBgm();
        pronunciationService
          .speak(enemy.word, enemy.pronunciation)
          .then((src) => {
            const audio = wx.createInnerAudioContext();
            audio.volume = 1.0;
            audio.src = src;
            audio.play();
            audio.onEnded(() => {
              audio.destroy();
              shooterAudio.restoreBgm();
            });
            audio.onError(() => {
              audio.destroy();
              shooterAudio.restoreBgm();
            });
          })
          .catch(() => {
            shooterAudio.restoreBgm();
            wx.showToast({ title: '读音无法播放，检查插件配置', icon: 'none' });
          });
      }
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

  onToggleMusic() {
    const on = !this.data.musicOn;
    this.setData({ musicOn: on });
    // 一个开关管全部声音：孩子不用理解「音乐」和「音效」的区别
    shooterAudio.setMuted(!on);
    if (on) shooterAudio.startBgm();
    else shooterAudio.stopBgm();
  },
  onTogglePronounce() {
    this.setData({ pronounceOn: !this.data.pronounceOn });
  },
  onPauseGame() {
    if (this.data.status !== 'PLAYING') return;
    this.setData({ status: 'PAUSED', paused: true });
    shooterAudio.stopBgm();
    if (this.rafId && this.segment) this.segment.cancelAnimationFrame(this.rafId);
  },
  onResume() {
    if (!this.data.paused) return;
    this.setData({ status: 'PLAYING', paused: false });
    this.lastTick = 0;
    if (this.data.musicOn) shooterAudio.startBgm();
    this.startLoop();
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
