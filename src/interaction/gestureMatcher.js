/**
 * gestureMatcher.js — 精准手势分类引擎 v4
 *
 * 手势类型:
 *   'palm'   - 张手（5指伸展，用于空间操纵）
 *   'circle' - 画圈（轨迹画圈检测）
 *   'none'   - 无识别
 */

// 关键点索引常量
const IDX = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

// 每个手指的 [指尖idx, 自身MCP_idx]
const FINGER_PAIRS = [
  { name: 'thumb',  tip: IDX.THUMB_TIP,  mcp: IDX.THUMB_MCP },
  { name: 'index',  tip: IDX.INDEX_TIP,  mcp: IDX.INDEX_MCP },
  { name: 'middle', tip: IDX.MIDDLE_TIP, mcp: IDX.MIDDLE_MCP },
  { name: 'ring',   tip: IDX.RING_TIP,   mcp: IDX.RING_MCP },
  { name: 'pinky',  tip: IDX.PINKY_TIP,  mcp: IDX.PINKY_MCP },
];

// ── 阈值 ──
const T = {
  PALM_THRESH: 0.50,        // 指尖-MCP > 此值视为伸展
  PALM_THUMB_THRESH: 0.38,  // 拇指较短，单独阈值
  PALM_NEED: 3,             // 至少3指伸展即可，降低误拒率
  SPREAD_MIN: 1.3,          // 最小展开比
  CIRCLE_RADIUS_VAR: 0.55,  // 画圈半径变化容忍度
  CIRCLE_MIN_POINTS: 15,    // 最少采样点数
  CIRCLE_MAX_GAP: 3000,     // 最大时间间隔（ms）
  CIRCLE_MIN_ANGLE: 3.14,   // 最小角度（180°，半圈即可触发）
  DEBOUNCE: 4,              // 防抖帧数
  LOCK_PERIOD: 400,         // 锁定周期（ms）
};

// ── 工具函数 ──
function dist(p1, p2) {
  if (!p1 || !p2) return Infinity;
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function angleDeg(vertex, a, b) {
  if (!vertex || !a || !b) return 0;
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (m1 < 1 || m2 < 1) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180 / Math.PI;
}

function thumbAngleDeg(landmarks) {
  const wrist = landmarks[IDX.WRIST];
  const mcp = landmarks[IDX.THUMB_MCP];
  const tip = landmarks[IDX.THUMB_TIP];
  return angleDeg(mcp, wrist, tip);
}

// ── 特征提取 ──
function extractFingerDists(landmarks) {
  const indexMcp = landmarks[IDX.INDEX_MCP];
  const pinkyMcp = landmarks[IDX.PINKY_MCP];
  const handSpan = dist(indexMcp, pinkyMcp);
  if (handSpan < 2) return null;

  const dists = {};
  for (const f of FINGER_PAIRS) {
    dists[f.name] = dist(landmarks[f.tip], landmarks[f.mcp]) / handSpan;
  }
  dists._handSpan = handSpan;
  return dists;
}

// ── 画圈检测 ──
function detectCircleMotion(trajectory) {
  if (trajectory.length < T.CIRCLE_MIN_POINTS) return false;

  const pts = trajectory.slice(-T.CIRCLE_MIN_POINTS);
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  // 计算平均半径
  const radii = pts.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const avgRad = radii.reduce((s, r) => s + r, 0) / radii.length;
  if (avgRad < 15) return false;

  // 半径变化率
  const maxRad = Math.max(...radii);
  const minRad = Math.min(...radii);
  if ((maxRad - minRad) / avgRad > T.CIRCLE_RADIUS_VAR) return false;

  // 计算角度覆盖范围
  const angles = pts.map(p => Math.atan2(p.y - cy, p.x - cx));
  let totalAngle = 0;
  for (let i = 1; i < angles.length; i++) {
    let diff = angles[i] - angles[i - 1];
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    totalAngle += diff;
  }
  return Math.abs(totalAngle) > T.CIRCLE_MIN_ANGLE;
}

// ── 主匹配函数 ──
export function matchGesture(landmarks, prevLandmarks = null) {
  if (!landmarks || landmarks.length < 21) return 'none';

  const dists = extractFingerDists(landmarks);
  if (!dists) return 'none';

  const { thumb, index, middle, ring, pinky } = dists;
  const thumbAngle = thumbAngleDeg(landmarks);

  // ── 张手：至少3指伸展 + 拇指伸展 + 展开比 ──
  const thumbOpen = thumbAngle > 90;
  const opened = [index, middle, ring, pinky].filter(d => d > T.PALM_THRESH).length;
  if (opened >= T.PALM_NEED && thumbOpen) {
    const spread = dist(landmarks[IDX.INDEX_TIP], landmarks[IDX.PINKY_TIP]) / dists._handSpan;
    if (spread > T.SPREAD_MIN) return 'palm';
  }

  return 'none';
}

// ── 防抖匹配器 ──
export class GestureMatcher {
  constructor() {
    this._history = [];
    this._lastLm = null;
    this._settled = 'none';
    this._lastTrigger = 0;
    this._lastRawGesture = 'none';
    this._trajectory = [];
    this._lastTrajectoryTime = 0;
  }

  update(landmarks) {
    const gesture = matchGesture(landmarks, this._lastLm);
    this._lastLm = landmarks;
    if (gesture !== 'none') this._lastRawGesture = gesture;

    // 记录轨迹（用于画圈检测）
    if (landmarks && landmarks[IDX.WRIST]) {
      const now = Date.now();
      const wrist = landmarks[IDX.WRIST];
      if (now - this._lastTrajectoryTime < T.CIRCLE_MAX_GAP) {
        if (gesture === 'palm') {
          this._trajectory.push({ x: wrist.x, y: wrist.y, t: now });
        }
      } else {
        this._trajectory = [];
      }
      this._lastTrajectoryTime = now;
      if (this._trajectory.length > T.CIRCLE_MIN_POINTS * 2) {
        this._trajectory.splice(0, T.CIRCLE_MIN_POINTS);
      }
    }

    // 防抖逻辑
    this._history.push(gesture);
    if (this._history.length > T.DEBOUNCE) this._history.shift();

    const now = Date.now();
    if (now - this._lastTrigger < T.LOCK_PERIOD && this._settled !== 'none') return 'palm';
    // 在锁定期间返回 'palm' 确保连续跟踪不断

    if (this._history.length === T.DEBOUNCE) {
      const first = this._history[0];
      if (first !== 'none' && this._history.every(g => g === first) && first !== this._settled) {
        // 画圈检测（仅在palm稳定时）
        if (first === 'palm' && detectCircleMotion(this._trajectory)) {
          this._settled = 'circle';
          this._lastTrigger = now;
          this._history = [];
          this._trajectory = [];
          return 'circle';
        }
        this._settled = first;
        this._lastTrigger = now;
        this._history = [];
        return first;
      }
    }

    // 连续none重置
    if (gesture === 'none' && this._settled !== 'none') {
      if (this._history.slice(-3).every(g => g === 'none')) {
        this._settled = 'none';
        this._trajectory = [];
      }
    }

    return 'none';
  }

  /** 获取当前原始手势（连续跟踪用） */
  getRawGesture() {
    if (this._lastRawGesture !== 'none') return this._lastRawGesture;
    return this._settled !== 'none' ? this._settled : 'none';
  }

  getSettledGesture() { return this._settled; }

  reset() {
    this._history = [];
    this._lastLm = null;
    this._settled = 'none';
    this._lastRawGesture = 'none';
    this._trajectory = [];
  }
}

export { IDX, dist as dist2d, T as THRESHOLDS };