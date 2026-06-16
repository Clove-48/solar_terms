/**
 * sundialCanvas.js — 日晷模拟 Canvas 渲染 v2
 *
 * 基于 CSDN 桌面日晷教程增强：
 * - 支持时辰选择，阴影随太阳时角旋转
 * - 太阳轨迹弧线 + 日出日落标记
 * - 更精细的刻度与时辰显示
 */
import { calcSunDeclination } from '../business/gnomon.js';

const OBSERVER_LAT = 34; // 登封观星台纬度

/**
 * 计算给定时辰的太阳高度角（度）
 */
function calcHourElevation(longitudeDeg, hourOfDay, latDeg = OBSERVER_LAT) {
  const declRad = calcSunDeclination(longitudeDeg) * Math.PI / 180;
  const latRad = latDeg * Math.PI / 180;
  const hourAngleRad = (hourOfDay - 12) * 15 * Math.PI / 180;
  const sinAlt = Math.sin(latRad) * Math.sin(declRad) +
                 Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;
}

/**
 * 计算日出/日落时角（小时，正负表示距正午的小时数）
 */
function calcSunriseSet(longitudeDeg, latDeg = OBSERVER_LAT) {
  const declRad = calcSunDeclination(longitudeDeg) * Math.PI / 180;
  const latRad = latDeg * Math.PI / 180;
  const cosHA = -Math.tan(latRad) * Math.tan(declRad);
  const haDeg = Math.acos(Math.max(-1, Math.min(1, cosHA))) * 180 / Math.PI;
  const halfDay = haDeg / 15;
  return { sunrise: 12 - halfDay, sunset: 12 + halfDay, halfDay };
}

/**
 * 获取时辰（地支）名称
 */
function getShichenName(hour) {
  const names = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  // 子时 23-01, 丑时 01-03, ...
  // 用 (hour + 1) % 24 / 2 取整正确
  // 例如 h=0 (0点) → (0+1)%24=1 → 1/2=0 → 子
  // h=1 → (1+1)%24=2 → 2/2=1 → 丑
  // h=23 → (23+1)%24=0 → 0/2=0 → 子
  const idx = Math.floor(((hour + 1) % 24) / 2);
  return names[idx];
}

export class SundialCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._altitude = 0;
    this._longitude = 0;
    this._termName = '';
    this._hourOfDay = 12;
  }

  init() {
    this._resize();
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
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this._w = this.canvas.width / dpr;
    this._h = 200;
    this.render(this._altitude, this._longitude, this._termName, this._hourOfDay);
  }

  render(altitudeDeg, longitude, termName, hourOfDay = 12) {
    this._altitude = altitudeDeg;
    this._longitude = longitude;
    this._termName = termName;
    this._hourOfDay = hourOfDay;

    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    const cx = w / 2;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.35;

    // 计算当前时刻的太阳高度角
    const hourElevation = calcHourElevation(longitude, hourOfDay);
    const { sunrise, sunset, halfDay } = calcSunriseSet(longitude);

    ctx.clearRect(0, 0, w, h);

    // ── 背景 ──
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.3);
    bgGrad.addColorStop(0, '#141a2e');
    bgGrad.addColorStop(0.5, '#0f1322');
    bgGrad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ── 太阳轨迹弧线（从日出到日落） ──
    const arcR = radius * 0.65;
    // 日出/日落位置在地平线上（东/西两侧）
    const sunriseAngle = -Math.min(halfDay * 15, 90) * Math.PI / 180; // 左侧（东）
    const sunsetAngle = Math.min(halfDay * 15, 90) * Math.PI / 180;   // 右侧（西）

    ctx.beginPath();
    // 使用椭圆弧从日出到日落（中间拱起）
    for (let a = -halfDay * 15; a <= halfDay * 15; a += 1) {
      const angleRad = a * Math.PI / 180;
      // 弧线在正午最高，日落/日出最低
      const arcY = cy - radius * 0.2 + radius * 0.5 * Math.cos(a * Math.PI / 180 / halfDay * 0.5);
      const arcX = cx + Math.sin(angleRad) * arcR * 0.6;
      if (a === -halfDay * 15) ctx.moveTo(arcX, arcY);
      else ctx.lineTo(arcX, arcY);
    }
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 太阳当前位置标记
    const currentAngle = (hourOfDay - 12) * 15;
    if (currentAngle >= -halfDay * 15 && currentAngle <= halfDay * 15 && hourElevation > -5) {
      const t = currentAngle / Math.max(halfDay * 15, 1);
      const sunX = cx + Math.sin(currentAngle * Math.PI / 180) * arcR * 0.6;
      const sunY = cy - radius * 0.2 + radius * 0.5 * Math.cos(t * Math.PI / 2 * 0.6);
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 10);
      sunGrad.addColorStop(0, 'rgba(255, 220, 80, 0.6)');
      sunGrad.addColorStop(0.5, 'rgba(255, 200, 60, 0.2)');
      sunGrad.addColorStop(1, 'rgba(255, 200, 60, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sunX, sunY, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 220, 80, 0.8)';
      ctx.fill();
    }

    // ── 日晷盘面 ──
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── 日出/日落标记 ──
    const markR = radius * 0.92;
    // 日出 (东 = 左侧，canvas坐标：左侧 = 180°方向)
    const srAngleDeg = -Math.min(halfDay * 15, 90);
    const ssAngleDeg = Math.min(halfDay * 15, 90);
    [{deg: srAngleDeg, label: '日出', color: 'rgba(255, 160, 60, 0.4)'},
     {deg: ssAngleDeg, label: '日落', color: 'rgba(200, 100, 200, 0.4)'}
    ].forEach(({deg, label, color}) => {
      const angleRad = deg * Math.PI / 180;
      const mx = cx + Math.sin(angleRad) * markR;
      const my = cy - Math.cos(angleRad) * markR;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = deg < 0 ? 'bottom' : 'top';
      ctx.fillText(label, mx, my + (deg < 0 ? -5 : 5));
    });

    // ── 刻度（60个小格 + 12个大格） ──
    for (let i = 0; i < 12; i++) {
      const isMain = i % 3 === 0;
      const innerR = isMain ? radius * 0.82 : radius * 0.86;
      const outerR = radius * 0.93;

      ctx.beginPath();
      const angle = (i * 30) * Math.PI / 180;
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = isMain
        ? 'rgba(212, 165, 116, 0.5)'
        : 'rgba(212, 165, 116, 0.2)';
      ctx.lineWidth = isMain ? 1.5 : 0.8;
      ctx.stroke();
    }

    // 5分钟小刻度
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue; // 大刻度已画
      const angle = (i * 6) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * radius * 0.88, cy + Math.sin(angle) * radius * 0.88);
      ctx.lineTo(cx + Math.cos(angle) * radius * 0.92, cy + Math.sin(angle) * radius * 0.92);
      ctx.strokeStyle = 'rgba(212, 165, 116, 0.08)';
      ctx.lineWidth = 0.5;
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

    // ── 当前时辰高亮 ──
    const shichenIdx = Math.floor(((hourOfDay + 1) % 24) / 2);
    const hlAngle = (shichenIdx * 30 - 90) * Math.PI / 180;
    const hlR = radius * 0.94;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(hlAngle) * hlR, cy + Math.sin(hlAngle) * hlR, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── 指针 (gnomon) ──
    // 指针角度基于当前时辰
    const hourAngleRad = (hourOfDay - 12) * 15 * Math.PI / 180;
    // 阴影方向 = 太阳的方位（从北顺时针）
    // 简化：阴影在午时朝北（向上），在子时朝南（向下）
    const shadowAngleRad = hourAngleRad;
    const shadowLen = radius * 0.55;

    // 指针线（从中心沿阴影方向延伸）
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const ptrEndX = cx + Math.sin(shadowAngleRad) * shadowLen;
    const ptrEndY = cy - Math.cos(shadowAngleRad) * shadowLen;
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

    // ── 阴影（投影在地面） ──
    // 阴影长度随太阳高度角变化
    const elevRad = Math.max(hourElevation, 1) * Math.PI / 180;
    const shadowFactor = 1 / Math.tan(elevRad) / 3; // 归一化
    const shadowLength = Math.min(radius * 1.0, radius * 0.25 + radius * 0.75 * Math.min(shadowFactor, 3));

    // 阴影方向与指针相反
    const shadowDirRad = shadowAngleRad + Math.PI;
    const shadowEndX = cx + Math.sin(shadowDirRad) * shadowLength;
    const shadowEndY = cy - Math.cos(shadowDirRad) * shadowLength;

    // 阴影主投影
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(shadowEndX, shadowEndY);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 阴影发光
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(shadowEndX, shadowEndY);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.06)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // ── 中心点 ──
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.6)';
    ctx.fill();

    // ── 信息标注 ──
    ctx.fillStyle = '#ededef';
    ctx.font = '11px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${termName || '--'} · ${getShichenName(hourOfDay)}时 · ${Math.round(hourOfDay)}:00`, cx, cy - radius - 10);

    ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`太阳高度角 ${hourElevation.toFixed(1)}°`, cx, cy + radius + 10);

    ctx.fillStyle = 'rgba(212, 165, 116, 0.4)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`日出 ${sunrise.toFixed(1)}h · 日落 ${sunset.toFixed(1)}h · 黄经 ${longitude.toFixed(0)}°`, cx, cy + radius + 24);
  }

  destroy() {
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
  }
}