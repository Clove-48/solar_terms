/**
 * mobileAdapt.js — 移动端自适应引擎
 *
 * 策略：
 *   1. 使用标准 viewport（无 DPR 缩放，避免字体过小问题）
 *   2. 设置 CSS 变量用于响应式计算
 *   3. HTML data-device 属性用于设备类型标记
 */

const MOBILE_MAX = 480;
const TABLET_MAX = 768;

/**
 * 检测是否为移动设备（含平板）
 */
export function isMobile() {
  return window.innerWidth <= TABLET_MAX;
}

/**
 * 检测是否为手机
 */
export function isPhone() {
  return window.innerWidth <= MOBILE_MAX;
}

/**
 * 检测是否为平板
 */
export function isTablet() {
  const w = window.innerWidth;
  return w > MOBILE_MAX && w <= TABLET_MAX;
}

/**
 * 设置 CSS 变量用于响应式计算
 */
function updateCSSVariables() {
  const docEl = document.documentElement;
  const w = window.innerWidth;
  const h = window.innerHeight;

  docEl.style.setProperty('--vw-unit', (w / 100).toFixed(2) + 'px');
  docEl.style.setProperty('--vh-unit', (h / 100).toFixed(2) + 'px');
  docEl.style.setProperty('--screen-width', w.toFixed(0) + 'px');

  // 设备类型标记
  docEl.setAttribute('data-device',
    isPhone() ? 'phone' : isTablet() ? 'tablet' : 'desktop'
  );

  // 安全区
  const style = getComputedStyle(docEl);
  const safeTop = parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0;
  const safeBottom = parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0;
  docEl.style.setProperty('--safe-top', safeTop + 'px');
  docEl.style.setProperty('--safe-bottom', safeBottom + 'px');
}

/**
 * 初始化自适应系统
 */
export function initMobileAdapt() {
  updateCSSVariables();

  // resize 时只更新 CSS 变量
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateCSSVariables, 100);
  });

  // 页面从缓存恢复
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) updateCSSVariables();
  });

  // 屏幕旋转
  window.addEventListener('orientationchange', () => {
    setTimeout(updateCSSVariables, 400);
  });
}

/**
 * 获取当前断点名称
 * @returns {'phone'|'tablet'|'desktop'}
 */
export function getBreakpoint() {
  if (isPhone()) return 'phone';
  if (isTablet()) return 'tablet';
  return 'desktop';
}

/**
 * 匹配移动端媒体查询 (≤ 768px)
 */
export function matchMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}