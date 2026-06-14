/**
 * gnomon.js — 圭表测影计算模型
 *
 * 基于太阳黄经计算：
 * - 太阳赤纬 δ = arcsin(sin(λ) × sin(ε))
 * - 正午太阳高度角 H = 90° - |φ - δ|
 * - 圭表影长 L = h × cot(H)
 *
 * 参数：
 *   λ = 太阳黄经（度）
 *   ε = 黄赤交角 ≈ 23.44°
 *   φ = 观测点纬度（默认 34°N，河南登封/洛阳地区）
 *   h = 表高（默认 8 尺 ≈ 2.67m）
 */

const OBLIQUITY_DEG = 23.44;
const OBSERVER_LAT_DEG = 34;
const POLE_HEIGHT_CHI = 8;

/**
 * 计算太阳赤纬（度）
 * @param {number} solarLongitude - 太阳黄经（度）
 * @returns {number} 太阳赤纬（度）
 */
export function calcSunDeclination(solarLongitude) {
  const lonRad = solarLongitude * Math.PI / 180;
  const obliquityRad = OBLIQUITY_DEG * Math.PI / 180;
  const declRad = Math.asin(Math.sin(lonRad) * Math.sin(obliquityRad));
  return declRad * 180 / Math.PI;
}

/**
 * 计算正午太阳高度角（度）
 * @param {number} solarLongitude - 太阳黄经（度）
 * @param {number} [observerLat=34] - 观测点纬度（度）
 * @returns {number} 正午太阳高度角（度）
 */
export function calcNoonAltitude(solarLongitude, observerLat = OBSERVER_LAT_DEG) {
  const declDeg = calcSunDeclination(solarLongitude);
  return 90 - Math.abs(observerLat - declDeg);
}

/**
 * 计算圭表影长（尺）
 * @param {number} solarLongitude - 太阳黄经（度）
 * @param {number} [observerLat=34] - 观测点纬度
 * @param {number} [poleHeight=8] - 表高（尺）
 * @returns {number} 影长（尺）
 */
export function calcShadowLength(solarLongitude, observerLat = OBSERVER_LAT_DEG, poleHeight = POLE_HEIGHT_CHI) {
  const altitudeDeg = calcNoonAltitude(solarLongitude, observerLat);
  if (altitudeDeg <= 1) return 20; // 极低高度角时影长极大
  const altitudeRad = altitudeDeg * Math.PI / 180;
  return poleHeight / Math.tan(altitudeRad);
}

/**
 * 获取影长对应的文字描述
 * @param {number} shadowLength - 影长（尺）
 * @param {number} altitudeDeg - 太阳高度角（度）
 * @returns {string} 描述文字
 */
export function getShadowDescription(shadowLength, altitudeDeg) {
  if (shadowLength < 2.5) {
    return '夏至附近：影长最短，太阳高度角最大。"立表测影，夏至影最短，故曰夏至"。';
  }
  if (shadowLength > 12) {
    return '冬至附近：影长最长，太阳高度角最小。"冬至影最长，一阳生，故曰冬至"。';
  }
  if (shadowLength < 4.5) {
    return '春/秋分附近：影长适中，昼夜等长，阴阳平衡。';
  }
  return `影长 ${shadowLength.toFixed(1)} 尺，太阳高度角 ${altitudeDeg.toFixed(1)}°。`;
}

/**
 * 批量计算所有节气的影长数据
 * @param {Array<{solarLongitude: number}>} terms - 节气数据数组
 * @returns {Array<{shadowLength: number, altitude: number, declination: number}>}
 */
export function calcAllShadowLengths(terms) {
  return terms.map(term => {
    const declination = calcSunDeclination(term.solarLongitude);
    const altitude = calcNoonAltitude(term.solarLongitude);
    const shadowLength = calcShadowLength(term.solarLongitude);
    return { shadowLength, altitude, declination };
  });
}