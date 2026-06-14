/**
 * sunPosition.js — 太阳位置与昼夜时长计算
 *
 * 基于太阳黄经计算：
 * - 太阳直射点纬度
 * - 昼夜时长
 * - 太阳正午高度角
 */

import { calcSunDeclination } from './gnomon.js';

const OBSERVER_LAT_DEG = 34;

/**
 * 计算太阳直射点纬度（度）
 * 直射点纬度 = 太阳赤纬
 * @param {number} solarLongitude - 太阳黄经（度）
 * @returns {number} 直射点纬度（度）
 */
export function calcDirectPoint(solarLongitude) {
  return calcSunDeclination(solarLongitude);
}

/**
 * 格式化直射点纬度文字
 * @param {number} solarLongitude - 太阳黄经（度）
 * @returns {string} 如 "北纬23°26'" 或 "南纬15°30'"
 */
export function formatDirectPoint(solarLongitude) {
  const declDeg = calcSunDeclination(solarLongitude);
  const absDeg = Math.abs(declDeg);
  const degrees = Math.floor(absDeg);
  const minutes = Math.round((absDeg - degrees) * 60);
  const direction = declDeg >= 0 ? '北纬' : '南纬';
  return `${direction}${degrees}°${minutes}'`;
}

/**
 * 计算昼长（小时）
 * 公式：昼长 = 2/15 × arccos(-tan(φ) × tan(δ))
 * @param {number} solarLongitude - 太阳黄经（度）
 * @param {number} [observerLat=34] - 观测点纬度（度）
 * @returns {number} 昼长（小时）
 */
export function calcDayLength(solarLongitude, observerLat = OBSERVER_LAT_DEG) {
  const declDeg = calcSunDeclination(solarLongitude);
  const phiRad = observerLat * Math.PI / 180;
  const declRad = declDeg * Math.PI / 180;

  const tanProduct = Math.tan(phiRad) * Math.tan(declRad);

  // 极昼/极夜情况
  if (tanProduct >= 1) return 24;
  if (tanProduct <= -1) return 0;

  const hourAngleRad = Math.acos(-tanProduct);
  return (2 * hourAngleRad * 180 / Math.PI) / 15;
}

/**
 * 格式化昼长
 * @param {number} hours - 昼长（小时）
 * @returns {string} 如 "14h 32m"
 */
export function formatDayLength(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/**
 * 计算夜长（小时）
 * @param {number} solarLongitude - 太阳黄经（度）
 * @param {number} [observerLat=34] - 观测点纬度
 * @returns {number} 夜长（小时）
 */
export function calcNightLength(solarLongitude, observerLat = OBSERVER_LAT_DEG) {
  return 24 - calcDayLength(solarLongitude, observerLat);
}

/**
 * 计算日出/日落时间（距正午的小时数）
 * @param {number} solarLongitude - 太阳黄经（度）
 * @param {number} [observerLat=34]
 * @returns {{sunrise: number, sunset: number}} 日出/日落时间（小时，0-24）
 */
export function calcSunriseSunset(solarLongitude, observerLat = OBSERVER_LAT_DEG) {
  const dayLength = calcDayLength(solarLongitude, observerLat);
  const halfDay = dayLength / 2;
  return {
    sunrise: 12 - halfDay,
    sunset: 12 + halfDay
  };
}

/**
 * 获取昼夜对比数据（用于可视化）
 * @param {number} solarLongitude
 * @param {number} [observerLat=34]
 * @returns {{dayHours: number, nightHours: number, dayPercent: number, nightPercent: number}}
 */
export function getDayNightRatio(solarLongitude, observerLat = OBSERVER_LAT_DEG) {
  const dayHours = calcDayLength(solarLongitude, observerLat);
  const nightHours = 24 - dayHours;
  return {
    dayHours,
    nightHours,
    dayPercent: (dayHours / 24) * 100,
    nightPercent: (nightHours / 24) * 100
  };
}