/**
 * gnomonCanvas.js — 圭表测影 Canvas 渲染
 *
 * 绘制垂直表杆 + 水平地面 + 动态影子
 */
export class GnomonCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._animId = null;
    this._altitude = 0;
    this._shadow = 0;
    this._longitude = 0;
  }

  init() {
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width - 32) * dpr; // 减去 padding
    this.canvas.height = 180 * dpr;
    this.canvas.style.width = (rect.width - 32) + 'px';
    this.canvas.style.height = '180px';
    this.ctx.scale(dpr, dpr);
    this._w = this.canvas.width / dpr;
    this._h = 180;
    this.render(this._altitude, this._shadow, this._longitude);
  }

  render(altitudeDeg, shadowLength, longitude) {
    this._altitude = altitudeDeg;
    this._shadow = shadowLength;

    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;

    ctx.clearRect(0, 0, w, h);

    // ── 背景 ──
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0e1a');
    grad.addColorStop(0.6, '#141a2e');
    grad.addColorStop(1, '#1c1714');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // ── 地面线 ──
    const groundY = h * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── 表杆 (圭表) ──
    const poleX = w * 0.35;
    const poleHeight = h * 0.4;
    const poleTop = groundY - poleHeight;

    // 表杆渐变
    const poleGrad = ctx.createLinearGradient(poleX - 3, 0, poleX + 3, 0);
    poleGrad.addColorStop(0, 'rgba(212, 165, 116, 0.4)');
    poleGrad.addColorStop(0.5, 'rgba(212, 165, 116, 0.8)');
    poleGrad.addColorStop(1, 'rgba(212, 165, 116, 0.4)');
    ctx.fillStyle = poleGrad;
    ctx.fillRect(poleX - 2, poleTop, 4, poleHeight);

    // 表杆顶端标记
    ctx.beginPath();
    ctx.arc(poleX, poleTop, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.9)';
    ctx.fill();

    // ── 影子 ──
    // 影长映射到 Canvas 宽度
    const maxShadow = 16; // 最大影长 16 尺
    const shadowPixels = Math.min((shadowLength / maxShadow) * w * 0.45, w * 0.45);

    // 影子方向：向右（北半球正午太阳在南）
    const shadowEndX = poleX + shadowPixels;

    // 影子渐变
    ctx.beginPath();
    ctx.moveTo(poleX, groundY);
    ctx.lineTo(shadowEndX, groundY);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 影子发光
    ctx.beginPath();
    ctx.moveTo(poleX, groundY);
    ctx.lineTo(shadowEndX, groundY);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.15)';
    ctx.lineWidth = 10;
    ctx.stroke();

    // 影子端点标记
    ctx.beginPath();
    ctx.arc(shadowEndX, groundY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
    ctx.fill();

    // ── 太阳射线（从杆顶到影子末端） ──
    const rayEndX = shadowEndX;
    const rayEndY = groundY;

    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.moveTo(poleX, poleTop);
    ctx.lineTo(rayEndX, rayEndY);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // ── 标注 ──
    ctx.fillStyle = 'rgba(212, 165, 116, 0.5)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    // 影长标注
    ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
    ctx.fillText(`影长 ${shadowLength.toFixed(1)}尺`, (poleX + shadowEndX) / 2, groundY + 18);

    // 表高标注
    ctx.fillStyle = 'rgba(212, 165, 116, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('表高 8尺', poleX - 10, groundY - poleHeight / 2);
    ctx.textAlign = 'center';

    // 太阳高度角标注
    ctx.fillStyle = 'rgba(212, 165, 116, 0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`太阳高度角 ${altitudeDeg.toFixed(1)}°`, w / 2, h - 8);

    // 黄经标注
    ctx.fillStyle = 'rgba(212, 165, 116, 0.3)';
    ctx.fillText(`黄经 ${longitude.toFixed(1)}°`, w / 2, 14);
  }

  destroy() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
    }
    window.removeEventListener('resize', () => this._resize());
  }
}