/**
 * sceneEngine.js — 动态国风场景引擎 v2
 *
 * 改进：
 *   - 基于 delta-time 的平滑动画（不依赖帧率）
 *   - 水墨风诗人剪影（bezier 曲线勾勒，去掉几何拼凑）
 *   - 国风配色（赭石/花青/藤黄/胭脂）
 *   - 粒子飘落带缓动曲线
 */

export class SceneEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._animId = null;
    this._particles = [];
    this._season = 'spring';
    this._lastTime = 0;

    this._resize = this._resize.bind(this);
  }

  setScene(seasonKey, termName) {
    if (this._season === seasonKey) return;
    this._season = seasonKey;
    this._termName = termName || '';
    this._particles = [];
    this._lastTime = performance.now();
    switch (seasonKey) {
      case 'spring': this._spawn(60, () => this._petal()); break;
      case 'summer': this._spawn(30, () => this._heat()); break;
      case 'autumn': this._spawn(50, () => this._leaf()); break;
      case 'winter':
        const count = termName === '大雪' ? 120 : termName === '小雪' ? 60 : 100;
        this._spawn(count, () => this._snow());
        break;
    }
  }

  _spawn(count, factory) {
    while (count--) this._particles.push(factory());
  }

  /* ---------- 粒子工厂 ---------- */
  _rand(a, b) { return a + Math.random() * (b - a); }

  _petal() {
    const x = this._rand(0, this.canvas.width);
    const y = this._rand(-this.canvas.height, 0);
    return {
      type: 'petal',
      baseX: x, baseY: y,
      x, y,
      sx: this._rand(-1.5, 1.5), sy: this._rand(120, 280),  // px/s
      size: this._rand(8, 18),
      rot: this._rand(0, Math.PI * 2), rs: this._rand(-1.5, 1.5),
      alpha: this._rand(0.4, 0.7),
      hue: this._rand(320, 360), sat: this._rand(50, 80), lig: this._rand(60, 80),
      swingAmp: this._rand(20, 40), swingFreq: this._rand(1.5, 3),
      phase: Math.random() * 100,
    };
  }

  _leaf() {
    const x = this._rand(0, this.canvas.width);
    const y = this._rand(-this.canvas.height, 0);
    return {
      type: 'leaf',
      baseX: x, baseY: y,
      x, y,
      sx: this._rand(-1.5, 1.5), sy: this._rand(100, 220),  // px/s
      size: this._rand(10, 20),
      rot: this._rand(0, Math.PI * 2), rs: this._rand(-1.2, 1.2),
      alpha: this._rand(0.4, 0.7),
      hue: this._rand(15, 45), sat: this._rand(65, 85), lig: this._rand(40, 60),
      swingAmp: this._rand(25, 50), swingFreq: this._rand(1.2, 2.5),
      phase: Math.random() * 100,
    };
  }

  _snow() {
    const x = this._rand(0, this.canvas.width);
    const y = this._rand(-this.canvas.height, 0);
    return {
      type: 'snow',
      baseX: x, baseY: y,
      x, y,
      sx: this._rand(-1, 1), sy: this._rand(80, 180),  // px/s
      size: this._rand(2, 6),
      alpha: this._rand(0.5, 0.9),
      swingAmp: this._rand(15, 35), swingFreq: this._rand(1.8, 3.5),
      phase: Math.random() * 100,
    };
  }

  _heat() {
    return {
      type: 'heat', phase: Math.random() * 100,
      x: this._rand(0, this.canvas.width), y: this._rand(0, this.canvas.height),
      size: this._rand(20, 50),
      sy: this._rand(-25, -10),
      alpha: this._rand(0.02, 0.06),
      life: this._rand(0.3, 1),
    };
  }

  /* ---------- 生命周期 ---------- */
  init() {
    this._resize();
    this._lastTime = performance.now();
    window.addEventListener('resize', this._resize);
    this._draw();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement?.getBoundingClientRect() ||
                 { width: window.innerWidth, height: window.innerHeight };
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- 主渲染循环 ---------- */
  _draw() {
    this._animId = requestAnimationFrame(() => this._draw());
    const now = performance.now();
    const dt = Math.min(now - this._lastTime, 50) / 1000; // 限制最大步长50ms
    this._lastTime = now;

    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // 持续补充新粒子
    this._refillParticles(w, h);

    // 绘制粒子
    this._drawParticles(ctx);

    // 绘制场景元素
    this._drawSeasonal(ctx, w, h, dt);

    // 更新
    this._update(dt, w, h);
  }

  /** 持续补充粒子，保持密度 */
  _refillParticles(w, h) {
    const maxCounts = { petal: 80, leaf: 70, snow: 150, heat: 30 };
    const maxCount = maxCounts[this._season === 'spring' ? 'petal' :
                               this._season === 'summer' ? 'heat' :
                               this._season === 'autumn' ? 'leaf' : 'snow'] || 30;
    while (this._particles.length < maxCount) {
      switch (this._season) {
        case 'spring': this._particles.push(this._petal()); break;
        case 'summer': this._particles.push(this._heat()); break;
        case 'autumn': this._particles.push(this._leaf()); break;
        case 'winter': this._particles.push(this._snow()); break;
      }
    }
  }

  /* 国风宣纸底纹 */
  _drawGuoFengTexture(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    // 浅米色宣纸底
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ---------- 季节场景元素 ---------- */
  _drawSeasonal(ctx, w, h, dt) {
    const t = (this._lastTime || performance.now()) / 1000;

    switch (this._season) {
      case 'summer':
        this._drawInkSun(ctx, w, h, t);
        break;
      case 'winter':
        this._drawInkMoon(ctx, w, h, t);
        break;
    }
  }

  /* ══════ 水墨诗人剪影（精细贝塞尔曲线） ══════ */
  _drawInkPoet(ctx, w, h, t) {
    // 诗人位置：左侧偏下，尺寸放大
    const scale = Math.min(w, h) / 800;
    const x = 80 * scale;
    const yBase = h * 0.5;
    const breath = 0.88 + 0.12 * Math.sin(t * 0.8);
    const armSwing = 4 * Math.sin(t * 0.5); // 持笔手臂微动

    ctx.save();
    ctx.globalAlpha = 0.7 * breath;
    ctx.fillStyle = '#3a3028';

    // ── 头部（戴幞头，椭圆形） ──
    ctx.beginPath();
    ctx.ellipse(x + 2 * scale, yBase - 40 * scale, 12 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 幞头巾（软脚幞头）
    ctx.beginPath();
    ctx.moveTo(x - 16 * scale, yBase - 48 * scale);
    ctx.quadraticCurveTo(x, yBase - 62 * scale, x + 20 * scale, yBase - 48 * scale);
    ctx.quadraticCurveTo(x + 24 * scale, yBase - 42 * scale, x + 6 * scale, yBase - 42 * scale);
    ctx.quadraticCurveTo(x + 2 * scale, yBase - 42 * scale, x - 2 * scale, yBase - 42 * scale);
    ctx.quadraticCurveTo(x - 20 * scale, yBase - 42 * scale, x - 16 * scale, yBase - 48 * scale);
    ctx.fill();

    // 幞头两脚（垂在脑后）
    ctx.beginPath();
    ctx.moveTo(x - 8 * scale, yBase - 42 * scale);
    ctx.quadraticCurveTo(x - 14 * scale, yBase - 34 * scale, x - 18 * scale, yBase - 28 * scale);
    ctx.quadraticCurveTo(x - 16 * scale, yBase - 32 * scale, x - 10 * scale, yBase - 36 * scale);
    ctx.quadraticCurveTo(x - 5 * scale, yBase - 40 * scale, x - 8 * scale, yBase - 42 * scale);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 12 * scale, yBase - 42 * scale);
    ctx.quadraticCurveTo(x + 18 * scale, yBase - 34 * scale, x + 22 * scale, yBase - 28 * scale);
    ctx.quadraticCurveTo(x + 20 * scale, yBase - 32 * scale, x + 14 * scale, yBase - 36 * scale);
    ctx.quadraticCurveTo(x + 10 * scale, yBase - 40 * scale, x + 12 * scale, yBase - 42 * scale);
    ctx.fill();

    // ── 身体（广袖长袍，精细轮廓） ──
    ctx.beginPath();
    // 左肩→左袖
    ctx.moveTo(x - 28 * scale, yBase - 26 * scale);
    ctx.quadraticCurveTo(x - 38 * scale, yBase - 16 * scale, x - 44 * scale, yBase - 4 * scale);
    ctx.quadraticCurveTo(x - 48 * scale, yBase + 4 * scale, x - 42 * scale, yBase + 10 * scale);
    // 左袖垂落
    ctx.quadraticCurveTo(x - 36 * scale, yBase + 18 * scale, x - 28 * scale, yBase + 14 * scale);
    ctx.quadraticCurveTo(x - 22 * scale, yBase + 10 * scale, x - 18 * scale, yBase + 4 * scale);
    // 左侧袍摆
    ctx.lineTo(x - 14 * scale, yBase + 14 * scale);
    ctx.quadraticCurveTo(x - 10 * scale, yBase + 28 * scale, x - 6 * scale, yBase + 36 * scale);
    ctx.lineTo(x - 4 * scale, yBase + 80 * scale);
    // 袍摆底部弧线
    ctx.quadraticCurveTo(x, yBase + 92 * scale, x + 4 * scale, yBase + 80 * scale);
    ctx.lineTo(x + 6 * scale, yBase + 36 * scale);
    ctx.quadraticCurveTo(x + 10 * scale, yBase + 28 * scale, x + 14 * scale, yBase + 14 * scale);
    // 右侧袍摆→右袖
    ctx.lineTo(x + 18 * scale, yBase + 4 * scale);
    ctx.quadraticCurveTo(x + 22 * scale, yBase + 10 * scale, x + 28 * scale, yBase + 14 * scale);
    ctx.quadraticCurveTo(x + 36 * scale, yBase + 18 * scale, x + 42 * scale, yBase + 10 * scale);
    ctx.quadraticCurveTo(x + 48 * scale, yBase + 4 * scale, x + 44 * scale, yBase - 4 * scale);
    // 右袖→右肩
    ctx.quadraticCurveTo(x + 38 * scale, yBase - 16 * scale, x + 28 * scale, yBase - 26 * scale);
    // 领口弧线
    ctx.quadraticCurveTo(x + 12 * scale, yBase - 30 * scale, x + 6 * scale, yBase - 28 * scale);
    ctx.quadraticCurveTo(x, yBase - 30 * scale, x - 6 * scale, yBase - 28 * scale);
    ctx.quadraticCurveTo(x - 12 * scale, yBase - 30 * scale, x - 28 * scale, yBase - 26 * scale);
    ctx.closePath();
    ctx.fill();

    // ── 右臂抬起（执笔/持杯） ──
    const armRaise = -12 + armSwing;
    ctx.beginPath();
    ctx.moveTo(x + 26 * scale, yBase - 24 * scale);
    ctx.quadraticCurveTo(x + 36 * scale, yBase - 34 * scale, x + 44 * scale, yBase - 46 * scale + armRaise);
    ctx.quadraticCurveTo(x + 50 * scale, yBase - 54 * scale + armRaise, x + 56 * scale, yBase - 50 * scale + armRaise);
    // 袖口垂落
    ctx.quadraticCurveTo(x + 52 * scale, yBase - 46 * scale + armRaise, x + 46 * scale, yBase - 42 * scale + armRaise);
    ctx.quadraticCurveTo(x + 38 * scale, yBase - 32 * scale, x + 28 * scale, yBase - 22 * scale);
    ctx.closePath();
    ctx.fill();

    // ── 腰带/衣带 ──
    ctx.globalAlpha = 0.5 * breath;
    ctx.beginPath();
    ctx.moveTo(x - 8 * scale, yBase + 2 * scale);
    ctx.quadraticCurveTo(x, yBase, x + 8 * scale, yBase + 2 * scale);
    ctx.lineTo(x + 7 * scale, yBase + 10 * scale);
    ctx.quadraticCurveTo(x, yBase + 8 * scale, x - 7 * scale, yBase + 10 * scale);
    ctx.closePath();
    ctx.fill();

    // 衣带飘带
    ctx.globalAlpha = 0.3 * breath;
    ctx.beginPath();
    ctx.moveTo(x + 8 * scale, yBase + 6 * scale);
    ctx.quadraticCurveTo(x + 14 * scale, yBase + 10 * scale, x + 12 * scale, yBase + 18 * scale);
    ctx.quadraticCurveTo(x + 10 * scale, yBase + 14 * scale, x + 6 * scale, yBase + 10 * scale);
    ctx.closePath();
    ctx.fill();

    // ── 衣纹线条（淡墨勾勒，增加质感） ──
    ctx.globalAlpha = 0.12 * breath;
    ctx.strokeStyle = '#2a2218';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(x, yBase + 10 * scale);
    ctx.quadraticCurveTo(x - 4 * scale, yBase + 30 * scale, x - 5 * scale, yBase + 50 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yBase + 10 * scale);
    ctx.quadraticCurveTo(x + 3 * scale, yBase + 30 * scale, x + 5 * scale, yBase + 50 * scale);
    ctx.stroke();

    // 第二组衣纹
    ctx.beginPath();
    ctx.moveTo(x - 6 * scale, yBase + 20 * scale);
    ctx.quadraticCurveTo(x - 10 * scale, yBase + 35 * scale, x - 8 * scale, yBase + 55 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 6 * scale, yBase + 20 * scale);
    ctx.quadraticCurveTo(x + 10 * scale, yBase + 35 * scale, x + 8 * scale, yBase + 55 * scale);
    ctx.stroke();

    // ── 头顶若有若无的"诗"字墨韵 ──
    ctx.globalAlpha = 0.04 * breath;
    ctx.fillStyle = '#2a2218';
    ctx.font = `${28 * scale}px "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.fillText('詩', x + 2 * scale, yBase - 55 * scale);

    ctx.restore();
  }

  /* ══════ 国画风烈日（朱砂+藤黄晕染） ══════ */
  _drawInkSun(ctx, w, h, t) {
    const cx = w - 90, cy = 85;
    const pulse = 1 + 0.06 * Math.sin(t * 1.8);

    ctx.save();

    // 朱砂晕染外层
    for (let i = 4; i >= 0; i--) {
      const r = 40 * pulse + i * 25;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const alpha = (0.10 - i * 0.015) * (0.7 + 0.3 * Math.sin(t * 0.5 + i));
      grad.addColorStop(0, `rgba(200, 80, 40, ${alpha})`);
      grad.addColorStop(0.6, `rgba(200, 100, 50, ${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(200, 100, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 藤黄内芯
    const core = ctx.createRadialGradient(cx - 6, cy - 6, 0, cx, cy, 30 * pulse);
    core.addColorStop(0, 'rgba(240, 200, 80, 0.20)');
    core.addColorStop(1, 'rgba(240, 200, 80, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ══════ 国画风冬月（花青淡染） ══════ */
  _drawInkMoon(ctx, w, h, t) {
    const cx = 100, cy = 80;
    const glow = 0.6 + 0.25 * Math.sin(t * 0.3);

    ctx.save();

    // 月晕（花青淡染）
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    grad.addColorStop(0, `rgba(160, 190, 220, ${0.03 * glow})`);
    grad.addColorStop(1, 'rgba(160, 190, 220, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fill();

    // 月轮
    ctx.globalAlpha = 0.12 * glow;
    ctx.fillStyle = '#c8d8e8';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ---------- 粒子绘制 ---------- */
  _drawParticles(ctx) {
    const now = (this._lastTime || performance.now()) / 1000;

    this._particles.forEach(p => {
      ctx.save();

      switch (p.type) {
        case 'petal':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.lig}%)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size / 2, p.size / 3, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'leaf':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.lig}%)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size / 2, p.size / 3.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // 叶脉
          ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lig - 15}%, 0.3)`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.size * 0.3, 0);
          ctx.stroke();
          break;

        case 'snow':
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = 'rgba(160, 185, 210, 0.7)';
          ctx.shadowColor = 'rgba(120, 150, 180, 0.15)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // 加深外圈
          ctx.globalAlpha = p.alpha * 0.3;
          ctx.strokeStyle = 'rgba(120, 150, 180, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;

        case 'heat':
          ctx.globalAlpha = p.alpha * p.life;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, 'rgba(200, 160, 100, 0.06)');
          grad.addColorStop(1, 'rgba(200, 160, 100, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    });
  }

  /* ---------- 粒子更新（delta-time 秒级驱动） ---------- */
  _update(dt, w, h) {
    const now = performance.now() / 1000;
    // 直接使用 delta 秒，确保任意帧率下速度一致、运动平滑
    const dts = Math.min(dt, 0.05); // 限制最大步长50ms

    this._particles.forEach(p => {
      switch (p.type) {
        case 'petal':
        case 'leaf':
          p.baseX += p.sx * dts;
          p.baseY += p.sy * dts;
          p.rot += p.rs * dts;
          p.x = p.baseX + Math.sin(now * p.swingFreq + p.phase) * p.swingAmp;
          p.y = p.baseY;
          if (p.baseY > h + 30) { p.baseY = -30; p.baseX = Math.random() * w; }
          if (p.baseX < -40) p.baseX = w + 40;
          if (p.baseX > w + 40) p.baseX = -40;
          break;

        case 'snow':
          p.baseX += p.sx * dts;
          p.baseY += p.sy * dts;
          p.x = p.baseX + Math.sin(now * p.swingFreq + p.phase) * p.swingAmp;
          p.y = p.baseY;
          if (p.baseY > h + 15) { p.baseY = -15; p.baseX = Math.random() * w; }
          if (p.baseX < -20) p.baseX = w + 20;
          if (p.baseX > w + 20) p.baseX = -20;
          break;

        case 'heat':
          p.y += p.sy * dts;
          p.life -= 0.15 * dts;
          if (p.life <= 0 || p.y < -30) {
            p.x = Math.random() * w;
            p.y = h * (0.4 + Math.random() * 0.5);
            p.life = this._rand(0.5, 1);
          }
          break;
      }
    });
  }

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    window.removeEventListener('resize', this._resize);
    this._particles = [];
  }
}