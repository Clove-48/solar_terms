/**
 * math.js — 数学计算工具
 * 角度/坐标/插值等天文计算辅助函数
 */

/** 角度转弧度 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/** 弧度转角度 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** 限制值在 [min, max] 范围内 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 线性插值 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/** 极坐标 → 笛卡尔坐标 */
export function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = degToRad(angleDeg);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/** 两点间距离 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** 两点间角度（度） */
export function angleBetween(x1, y1, x2, y2) {
  return radToDeg(Math.atan2(y2 - y1, x2 - x1));
}

/** 将角度归一化到 [0, 360) */
export function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

/** 计算两个角度间的最短差值（带符号） */
export function angleDiff(a, b) {
  let diff = (b - a) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/** 惯性衰减: 给定速度和衰减因子，返回下一帧速度 */
export function frictionDecay(velocity, friction = 0.95) {
  return Math.abs(velocity) < 0.1 ? 0 : velocity * friction;
}