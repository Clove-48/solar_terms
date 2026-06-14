/**
 * ZodiacCanvas — 黄道带 Canvas 渲染引擎（国风科技版）
 *
 * 视觉语言：
 *   - 深空背景 + 金色星点 → 天文科技感
 *   - 24 节气以金色浑天仪环排列 → 传统天文元素
 *   - 四象（青龙/朱雀/白虎/玄武）标注四正点 → 国风符号
 *   - 28 星宿微点环绕黄道 → 古籍星图细节
 *   - 当前节气以朱砂红光晕高亮 → 点睛之笔
 *   - 半透明祥云纹作为角落装饰
 *
 * 交互：触屏拖拽旋转 + 点击节气标记 + 惯性滑动
 */
import { distance } from '../utils/math.js';

export class ZodiacCanvas {
  constructor(canvas, { store }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.terms = store.get('solarTerms') || window.__solarTerms || [];
    this.rotation = 0;
    this.radius = 0;
    this.centerX = 0;
    this.centerY = 0;
    this._animId = null;

    // 季节背景色（国风宣纸浅色调）
    this._season = 'spring';
    this._bgColors = {
      spring: { c1: '#f5f0e8', c2: '#efe8d8', c3: '#e8dfcc', c4: '#ddd3bc' },
      summer: { c1: '#f5ede0', c2: '#efe4d0', c3: '#e8dac0', c4: '#ddd0b0' },
      autumn: { c1: '#f5f0e0', c2: '#efe8d0', c3: '#e8dfc0', c4: '#ddd3b0' },
      winter: { c1: '#f0efe8', c2: '#e8e6dc', c3: '#e0ddd0', c4: '#d5d2c0' },
    };

    // 滑动交互
    this._isDragging = false;
    this._startX = 0;
    this._startY = 0;
    this._velocity = 0;
    this._lastAngle = 0;
    this._lastTime = 0;
    this._inertiaId = null;
    this._zoomLevel = 1;

    this._stars = [];

    // 轻触检测
    this._startPointer = { x: 0, y: 0 };
    this._onTermClick = null;

    // 绑定事件
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  /** 设置季节背景色 */
  setSeason(seasonKey) {
    if (this._bgColors[seasonKey]) {
      this._season = seasonKey;
    }
  }

  init() {
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.target === this.canvas) e.preventDefault();
    }, { passive: false });

    this._draw();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(dpr, dpr);

    const screenW = rect.width;

    // 移动端适配：缩小圆环，避免遮挡底部诗词
    if (screenW <= 480) {
      this._baseRadius = Math.min(screenW, rect.height) * 0.32; // 与桌面端相同，不放大
      this._scaleFactor = 0.65;
    } else if (screenW <= 768) {
      this._baseRadius = Math.min(screenW, rect.height) * 0.35;
      this._scaleFactor = 0.82;
    } else {
      this._baseRadius = Math.min(screenW, rect.height) * 0.32;
      this._scaleFactor = 1.0;
    }

    this.centerX = screenW / 2;
    this.centerY = rect.height / 2 + 16;
    this.radius = this._baseRadius * this._zoomLevel;

    // 生成固定星点（在 Canvas 尺寸变化时重新生成）
    this._generateStars();
  }

  /** 生成背景星点 */
  _generateStars() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this._stars = [];
    for (let i = 0; i < 80; i++) {
      this._stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.5 + 0.15,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  _getAngleFromPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.centerX;
    const y = clientY - rect.top - this.centerY;
    return Math.atan2(y, x);
  }

  _onPointerDown(e) {
    this._isDragging = true;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._startPointer = { x: e.clientX, y: e.clientY };
    this._lastAngle = this._getAngleFromPointer(e.clientX, e.clientY);
    this._lastTime = Date.now();
    this._velocity = 0;
    if (this._inertiaId) {
      cancelAnimationFrame(this._inertiaId);
      this._inertiaId = null;
    }
    this.canvas.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this._isDragging) return;
    const currentAngle = this._getAngleFromPointer(e.clientX, e.clientY);
    const deltaAngle = currentAngle - this._lastAngle;
    const now = Date.now();
    const dt = now - this._lastTime;
    if (dt > 0) {
      this._velocity = (deltaAngle / dt) * 16;
    }
    this.rotation += deltaAngle;
    this._lastAngle = currentAngle;
    this._lastTime = now;
  }

  _onPointerUp(e) {
    if (!this._isDragging) return;
    this._isDragging = false;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}

    // 轻触检测：起始点偏移 < 10px 视为点击，触发 term 跳转
    const dx = e.clientX - this._startPointer.x;
    const dy = e.clientY - this._startPointer.y;
    const isTap = (dx * dx + dy * dy) < 100;

    if (isTap) {
      // 直接调用 getTermAt 并触发回调（绕过惯性/吸附逻辑）
      const term = this.getTermAt(e);
      if (term && this._onTermClick) {
        this._onTermClick(term.id);
        return;
      }
      // 没点到节气则仍吸附到最近节气
      this._snapToNearest();
    } else if (Math.abs(this._velocity) > 0.01) {
      this._startInertia();
    } else {
      this._snapToNearest();
    }
  }

  _startInertia() {
    const step = () => {
      this._velocity *= 0.92;
      this.rotation += this._velocity;
      if (Math.abs(this._velocity) > 0.001) {
        this._inertiaId = requestAnimationFrame(step);
      } else {
        this._inertiaId = null;
        this._snapToNearest();
      }
    };
    this._inertiaId = requestAnimationFrame(step);
  }

  _getCenterLon() {
    const lon = 180 + this.rotation * (360 / (Math.PI * 0.8));
    return ((lon % 360) + 360) % 360;
  }

  /** 获取当前中心位置最近的节气 */
  _getTermAtCenter(terms) {
    const centerLon = this._getCenterLon();
    let nearest = null, nearestDist = Infinity;
    for (const t of terms) {
      let diff = Math.abs(t.solarLongitude - centerLon);
      if (diff > 180) diff = 360 - diff;
      if (diff < nearestDist) { nearestDist = diff; nearest = t; }
    }
    return nearest;
  }

  get zoomLevel() { return this._zoomLevel; }
  set zoomLevel(v) {
    this._zoomLevel = Math.max(0.4, Math.min(3, v));
  }

  _getTermAngle(solarLongitude) {
    const centerLon = this._getCenterLon();
    let offset = solarLongitude - centerLon;
    if (offset > 180) offset -= 360;
    if (offset < -180) offset += 360;
    return Math.PI * 0.5 + (offset / 360) * Math.PI * 0.8;
  }

  /** 绘制国风科技黄道带 */
  _draw() {
    this._animId = requestAnimationFrame(() => this._draw());
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    // 根据 zoomLevel 实时调整半径
    this.radius = this._baseRadius * this._zoomLevel;

    ctx.clearRect(0, 0, w, h);

    // ── ① 宣纸背景渐变（随季节变化） ──
    const sc = this._bgColors[this._season] || this._bgColors.spring;
    const bgGrad = ctx.createRadialGradient(
      this.centerX, this.centerY - 40, 0,
      this.centerX, this.centerY - 40, this.radius * 2.2
    );
    bgGrad.addColorStop(0, sc.c1);
    bgGrad.addColorStop(0.35, sc.c2);
    bgGrad.addColorStop(0.65, sc.c3);
    bgGrad.addColorStop(1, sc.c4);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1.0;

    // ── ② 背景星点（闪烁效果，深色适应浅色背景） ──
    const t = Date.now() / 2000;
    this._stars.forEach((star) => {
      const alpha = star.a * (0.6 + 0.4 * Math.sin(t + star.twinkle));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60, 50, 40, ${alpha * 0.5})`;
      ctx.fill();
    });

    const centerLon = this._getCenterLon();

    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    // ── ③ 黄道带轨道 — 双层辉光环 ──
    // 外圈发光
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6, Math.PI * 0.1, Math.PI * 0.9);
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.08)';
    ctx.lineWidth = 20;
    ctx.stroke();

    // 主轨道（金色渐变，适应浅色背景）
    const arcGrad = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
    arcGrad.addColorStop(0, 'rgba(139, 90, 43, 0.25)');
    arcGrad.addColorStop(0.5, 'rgba(139, 90, 43, 0.45)');
    arcGrad.addColorStop(1, 'rgba(139, 90, 43, 0.25)');
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, Math.PI * 0.1, Math.PI * 0.9);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── ④ 黄经刻度线（每 15°） ──
    for (let deg = 0; deg < 360; deg += 15) {
      const angle = this._getTermAngle(deg);
      if (angle < Math.PI * 0.1 || angle > Math.PI * 0.9) continue;
      const isMajor = deg % 90 === 0;
      const isMid = deg % 45 === 0;
      const innerR = isMajor ? this.radius - 14 : isMid ? this.radius - 10 : this.radius - 7;
      const outerR = this.radius + (isMajor ? 8 : 5);

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.strokeStyle = isMajor
        ? 'rgba(139, 90, 43, 0.5)'
        : deg % 45 === 0
          ? 'rgba(139, 90, 43, 0.4)'
          : 'rgba(139, 90, 43, 0.2)';
      ctx.lineWidth = isMajor ? 1.5 : 0.8;
      ctx.stroke();
    }

    // ── ⑤ 四象标注（四正点） ──
    const fourSymbols = [
      { lon: 0,   label: '青龙', emoji: '辰', en: 'SPRING' },
      { lon: 90,  label: '朱雀', emoji: '午', en: 'SUMMER' },
      { lon: 180, label: '白虎', emoji: '酉', en: 'AUTUMN' },
      { lon: 270, label: '玄武', emoji: '子', en: 'WINTER' },
    ];

    // 四象 + 英文（响应式字号）
    const s = this._scaleFactor || 1;
    const fourFontSize = Math.round(14 * s);
    const fourEnSize = Math.round(7 * s);
    const termFontSize = Math.round(10 * s);
    const curFontSize1 = Math.round(14 * s);
    const curFontSize2 = Math.round(8 * s);
    const lonTextSize = Math.round(8 * s);
    const markRadius = 3.5 * s;

    fourSymbols.forEach(({ lon, label, en }) => {
      const a = this._getTermAngle(lon);
      if (a < Math.PI * 0.1 || a > Math.PI * 0.9) return;
      const x = Math.cos(a) * (this.radius + 36 * s);
      const y = Math.sin(a) * (this.radius + 36 * s);

      // 四象名称
      ctx.fillStyle = 'rgba(139, 90, 43, 0.65)';
      ctx.font = `bold ${fourFontSize}px "Noto Serif SC", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, x, y - 2);

      // 英文小字
      ctx.fillStyle = 'rgba(139, 90, 43, 0.3)';
      ctx.font = `${fourEnSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(en, x, y + 2);
    });

    // ── ⑥ 28 星宿微点（作为背景装饰环绕黄道） ──
    for (let i = 0; i < 28; i++) {
      const degOffset = (i / 28) * 360;
      const angle = this._getTermAngle(degOffset);
      if (angle < Math.PI * 0.1 || angle > Math.PI * 0.9) continue;
      const x = Math.cos(angle) * (this.radius + 12);
      const y = Math.sin(angle) * (this.radius + 12);
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 90, 43, 0.15)';
      ctx.fill();
    }

    // ── ⑦ 节气标记 ──
    const currentId = this.store.get('currentTermId');

    // 先绘制非当前节气
    this.terms.forEach((term) => {
      if (term.id === currentId) return;

      const angle = this._getTermAngle(term.solarLongitude);
      if (angle < Math.PI * 0.1 || angle > Math.PI * 0.9) return;
      const x = Math.cos(angle) * this.radius;
      const y = Math.sin(angle) * this.radius;

      // 节气名称
      ctx.fillStyle = 'rgba(60, 50, 40, 0.65)';
      ctx.font = `${termFontSize}px "Noto Serif SC", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(term.name, x, y - 14 * s);

      // 小棕色圆点
      ctx.beginPath();
      ctx.arc(x, y, markRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 90, 43, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // ── ⑧ 当前节气 — 高亮（朱砂红 × 金色） ──
    const currentTerm = this.terms.find(t => t.id === currentId);
    if (currentTerm) {
      const angle = this._getTermAngle(currentTerm.solarLongitude);
      const x = Math.cos(angle) * this.radius;
      const y = Math.sin(angle) * this.radius;

      // 多层辉光
      const glowSizes = [22 * s, 16 * s, 10 * s];
      const glowStyles = [
        'rgba(194, 59, 34, 0.12)',
        'rgba(194, 59, 34, 0.2)',
        'rgba(139, 90, 43, 0.25)',
      ];
      glowSizes.forEach((size, i) => {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = glowStyles[i];
        ctx.fill();
      });

      // 高亮圆点
      ctx.beginPath();
      ctx.arc(x, y, 6 * s, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(194, 59, 34, 0.4)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#c23b22';
      ctx.fill();
      ctx.shadowBlur = 0;

      // 金色边框
      ctx.beginPath();
      ctx.arc(x, y, 6 * s, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 当前节气名称（大号深色）
      ctx.fillStyle = '#3a3028';
      ctx.font = `bold ${Math.round(15 * s)}px "Noto Serif SC", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(currentTerm.name, x, y - 22 * s);

      // 黄经 + 日期
      ctx.fillStyle = 'rgba(139, 90, 43, 0.8)';
      ctx.font = `${Math.round(9 * s)}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(`${currentTerm.solarLongitude}° · ${currentTerm.date}`, x, y + 12 * s);
    }

    // ── ⑨ 中心信息 ──
    // 太阳黄经大字
    ctx.fillStyle = 'rgba(139, 90, 43, 0.25)';
    ctx.font = `bold ${Math.round(28 * s)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(centerLon)}°`, 0, -this.radius * 0.35);

    // 太阳黄经标签
    ctx.fillStyle = 'rgba(139, 90, 43, 0.35)';
    ctx.font = `${Math.round(9 * s)}px "Noto Sans SC", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText('太阳黄经', 0, -this.radius * 0.22);

    // ── ⑩ 底部装饰文字 ──
    ctx.fillStyle = 'rgba(139, 90, 43, 0.2)';
    ctx.font = `${Math.round(8 * s)}px "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('二 十 四 节 气 · 黄 道 观 测', 0, this.radius + 40 * s);

    // ── ⑪ 中心科普信息提示 ──
    const currentTermInfo = this.terms.find(t => t.id === this.store.get('currentTermId'));
    if (currentTermInfo) {
      const s = currentTermInfo.science;
      const seasonLabel = this._season === 'spring' ? '春' : this._season === 'summer' ? '夏' : this._season === 'autumn' ? '秋' : '冬';

      // 太阳符号（适应浅色背景）
      ctx.fillStyle = `rgba(180, 100, 40, ${0.12 + 0.04 * Math.sin(Date.now() / 3000)})`;
      ctx.font = '36px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☀', 0, this.radius * 0.2);

      // 科学数据流
      const infoLines = [
        `太阳黄经 ${currentTermInfo.solarLongitude}°`,
        `赤纬 ${s.sunDeclination} · 昼 ${s.dayLength}`,
        `圭表影 ${s.shadowLength} · 直射 ${s.directPoint}`,
      ];
      infoLines.forEach((line, i) => {
        const alpha = 0.3 - i * 0.06;
        ctx.fillStyle = `rgba(139, 90, 43, ${alpha})`;
        ctx.font = i === 0 ? 'bold 11px "JetBrains Mono", monospace' : '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(line, 0, this.radius * 0.32 + i * 14);
      });

      // 科学解说摘要
      const breathAlpha = 0.2 + 0.08 * Math.sin(Date.now() / 4000);
      ctx.fillStyle = `rgba(60, 50, 40, ${breathAlpha})`;
      ctx.font = '10px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const descText = s.description.length > 30 ? s.description.slice(0, 30) + '...' : s.description;
      ctx.fillText(descText, 0, this.radius * 0.72);
    }

    ctx.restore();
  }

  _snapToNearest() {
    if (!this.terms.length) return;
    const centerLon = this._getCenterLon();
    let nearestTerm = null;
    let nearestDist = Infinity;
    this.terms.forEach((term) => {
      let diff = Math.abs(term.solarLongitude - centerLon);
      if (diff > 180) diff = 360 - diff;
      if (diff < nearestDist) {
        nearestDist = diff;
        nearestTerm = term;
      }
    });
    if (nearestTerm) {
      this.store.set('currentTermId', nearestTerm.id);
    }
  }

  getTermAt(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - this.centerX;
    const y = event.clientY - rect.top - this.centerY;
    for (const term of this.terms) {
      const angle = this._getTermAngle(term.solarLongitude);
      if (angle < Math.PI * 0.1 || angle > Math.PI * 0.9) continue;
      const tx = Math.cos(angle) * this.radius;
      const ty = Math.sin(angle) * this.radius;
      if (distance(x, y, tx, ty) < 20) return term;
    }
    return null;
  }

  destroy() {
    if (this._animId) cancelAnimationFrame(this._animId);
    if (this._inertiaId) cancelAnimationFrame(this._inertiaId);
    window.removeEventListener('resize', () => this._resize());
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
  }
}