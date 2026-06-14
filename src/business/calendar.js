/**
 * calendar.js — 公历日期 ↔ 节气 映射 + 实时校准
 *
 * 算法：
 *   - 一年按 ~365.25 天计，太阳每日黄经前进约 0.986°
 *   - 以春分日（约 3月20日，日序 80）为黄经 0° 起点
 *   - 当前黄经 ≈ (当前日序 - 春分日序) × 0.986° (模 360°)
 *   - 精确保留一位小数用于显示
 */

const DAILY_MOTION = 360 / 365.25; // ≈ 0.9856°/天
const VERNAL_EQUINOX_DAY = 80;     // 春分日序（3月20日 ± 1天）

/**
 * 获取某年某日的日序（1月1日=1）
 * @param {Date} date
 * @returns {number}
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
  return Math.floor(diff / 86400000);
}

/**
 * 根据日期计算当前太阳黄经（度）
 * @param {Date} [date=new Date()]
 * @returns {number} 太阳黄经（0-360）
 */
export function getCurrentSolarLongitude(date = new Date()) {
  const dayOfYear = getDayOfYear(date);
  const daysSinceEquinox = dayOfYear - VERNAL_EQUINOX_DAY;
  const longitude = (daysSinceEquinox * DAILY_MOTION + 360) % 360;
  return Math.round(longitude * 10) / 10;
}

/**
 * 根据日期计算太阳黄经（精确，基于年份的天数）
 * @param {Date} date
 * @returns {number}
 */
export function getSolarLongitudeByDate(date) {
  const year = date.getFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInYear = isLeap ? 366 : 365;
  const dailyMotion = 360 / daysInYear;
  const dayOfYear = getDayOfYear(date);
  const daysSinceEquinox = dayOfYear - VERNAL_EQUINOX_DAY;
  const longitude = (daysSinceEquinox * dailyMotion + 360) % 360;
  return Math.round(longitude * 10) / 10;
}

/**
 * 根据日期定位当前所处的节气
 * @param {Date} date
 * @param {Array<{id: number, name: string, solarLongitude: number}>} terms
 * @returns {{currentTerm: object|null, nextTerm: object|null, daysUntilNext: number, currentLongitude: number}}
 */
export function getCurrentTermInfo(date = new Date(), terms = []) {
  if (!terms || terms.length === 0) {
    const currentLongitude = getCurrentSolarLongitude(date);
    return { currentTerm: null, nextTerm: null, daysUntilNext: 0, currentLongitude };
  }

  const currentLongitude = getCurrentSolarLongitude(date);

  // 按黄经排序
  const sorted = [...terms].sort((a, b) => a.solarLongitude - b.solarLongitude);

  let currentTerm = sorted[sorted.length - 1]; // 默认最后一个
  let nextTerm = sorted[0];

  for (let i = 0; i < sorted.length; i++) {
    if (currentLongitude >= sorted[i].solarLongitude) {
      currentTerm = sorted[i];
      nextTerm = sorted[(i + 1) % sorted.length];
    }
  }

  // 计算距下一个节气的天数
  let longitudeDiff = nextTerm.solarLongitude - currentLongitude;
  if (longitudeDiff < 0) longitudeDiff += 360;
  const daysUntilNext = Math.round(longitudeDiff / DAILY_MOTION);

  return { currentTerm, nextTerm, daysUntilNext, currentLongitude };
}

/**
 * 根据用户选择的日序（1-365/366）计算对应的黄经和数据
 * @param {number} dayOfYear - 日序
 * @param {boolean} [isLeap=false] - 是否闰年
 * @returns {{longitude: number, dayLength: number, shadowLength: number}}
 */
export function getDataByDayOfYear(dayOfYear, isLeap = false) {
  const daysInYear = isLeap ? 366 : 365;
  const dailyMotion = 360 / daysInYear;
  const daysSinceEquinox = dayOfYear - VERNAL_EQUINOX_DAY;
  const longitude = ((daysSinceEquinox * dailyMotion) + 360) % 360;

  // 延迟导入避免循环依赖
  const declinationDeg = Math.asin(
    Math.sin(longitude * Math.PI / 180) * Math.sin(23.44 * Math.PI / 180)
  ) * 180 / Math.PI;

  const observerLat = 34;
  const altitudeDeg = 90 - Math.abs(observerLat - declinationDeg);
  const altitudeRad = altitudeDeg * Math.PI / 180;
  const shadowLength = altitudeDeg > 1 ? 8 / Math.tan(altitudeRad) : 20;

  return {
    longitude: Math.round(longitude * 10) / 10,
    declination: Math.round(declinationDeg * 100) / 100,
    altitude: Math.round(altitudeDeg * 10) / 10,
    shadowLength: Math.round(shadowLength * 100) / 100
  };
}