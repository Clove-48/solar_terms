/**
 * sundialCanvas.js — 日晷模拟 Canvas 渲染
 *
 * 绘制日晷盘面 + 指针阴影随节气变化
 */
export class SundialCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._altitude = 0;
    this._longitude = 0;
    this._termName = '';
  }

  init() {
    this._resize();
    // 必须保存回调引用，否则 destroy() 无法移除监听器，导致内存泄漏/卡顿
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width - 32) * dpr;
    this.canvas.height = 200 * dpr;
    this.canvas.style.width = (rect.width - 32) + 'px';
    this.canvas.style.height = '200px';
    // 重置变换矩阵，避免重复调用 scale 导致累积缩放
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this._w = this.canvas.width / dpr;
    this._h = 200;
    this.render(this._altitude, this._longitude, this._termName);
  }

  render(altitudeDeg, longitude, termName) {
    this._altitude = altitudeDeg;
    this._longitude = longitude;
    this._termName = termName;

    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    const cx = w / 2;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.35;

    ctx.clearRect(0, 0, w, h);

    // ── 背景 ──
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.3);
    bgGrad.addColorStop(0, '#141a2e');
    bgGrad.addColorStop(0.5, '#0f1322');
    bgGrad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ── 日晷盘面 ──
    // 外圈
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 内圈
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── 刻度 ──
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const isMain = i % 3 === 0;
      const innerR = isMain ? radius * 0.82 : radius * 0.86;
      const outerR = radius * 0.93;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = isMain
        ? 'rgba(212, 165, 116, 0.5)'
        : 'rgba(212, 165, 116, 0.2)';
      ctx.lineWidth = isMain ? 1.5 : 0.8;
      ctx.stroke();
    }

    // ── 时辰标注 ──
    const hours = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    ctx.fillStyle = 'rgba(212, 165, 116, 0.35)';
    ctx.font = '9px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    hours.forEach((label, i) => {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const r = radius * 0.74;
      ctx.fillText(label, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    });

    // ── 指针 (gnomon) ──
    // 指针角度取决于太阳高度角
    const shadowAngle = (90 - altitudeDeg) * Math.PI / 180;
    const shadowLen = radius * 0.6;

    // 指针线
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const ptrEndX = cx + Math.sin(shadowAngle) * shadowLen;
    const ptrEndY = cy - Math.cos(shadowAngle) * shadowLen;
    ctx.lineTo(ptrEndX, ptrEndY);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 指针顶点
    ctx.beginPath();
    ctx.arc(ptrEndX, ptrEndY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.8)';
    ctx.fill();

    // ── 阴影（指针在地面的投影） ──
    const shadowDirX = cx - Math.cos(shadowAngle) * shadowLen * 0.7;
    const shadowDirY = cy + Math.sin(shadowAngle) * shadowLen * 0.7;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(shadowDirX, shadowDirY);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 阴影发光
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(shadowDirX, shadowDirY);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.08)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // ── 中心点 ──
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.6)';
    ctx.fill();

    // ── 信息标注 ──
    // 节气名称
    ctx.fillStyle = 'var(--foreground-primary, #ededef)';
    ctx.font = '12px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(termName || '--', cx, cy - radius - 10);

    // 太阳高度角
    ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`太阳高度角 ${altitudeDeg.toFixed(1)}°`, cx, cy + radius + 10);

    // 黄经
    ctx.fillStyle = 'rgba(212, 165, 116, 0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`黄经 ${longitude.toFixed(0)}°`, cx, cy + radius + 26);
  }

  destroy() {
    // 必须使用 init() 中保存的同一个函数引用才能正确移除监听器
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
  }
}