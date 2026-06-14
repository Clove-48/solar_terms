/**
 * mobileAdapt.js — 移动端/桌面端自适应引擎
 *
 * 策略（参考阿里 flexible + vw 混合方案）：
 *   1. 桌面端（>768px）：固定 max-width 容器居中，不缩放
 *   2. 平板端（481-768px）：基于 rem 等比缩放
 *   3. 手机端（≤480px）：viewport 缩放 + rem 动态计算
 *
 * CSS 变量输出：
 *   --vw-unit: 1vw 的实际像素等效值（用于 calc 计算）
 *   --safe-top / --safe-bottom: 安全区（刘海屏适配）
 */

const MOBILE_MAX = 480;
const TABLET_MAX = 768;
const DESIGN_WIDTH_MOBILE = 375;
const DESIGN_WIDTH_DESKTOP = 1024;

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
 * 获取设备像素比
 */
function getDPR() {
  const dpr = window.devicePixelRatio || 1;
  // Android 低版本 WebView 可能误报，限制上限
  return Math.min(dpr, 3);
}

/**
 * 设置 CSS 变量用于响应式计算
 */
function updateCSSVariables() {
  const docEl = document.documentElement;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // --vw-unit: 设计稿 375px 下 1vw 的等效值
  // 用于 calc() 中动态计算：calc(var(--vw-unit) * 20) ≈ 20px on 375px screen
  docEl.style.setProperty('--vw-unit', (w / 100).toFixed(2) + 'px');
  docEl.style.setProperty('--vh-unit', (h / 100).toFixed(2) + 'px');
  docEl.style.setProperty('--screen-width', w.toFixed(0) + 'px');

  // 设备类型标记
  docEl.setAttribute('data-device',
    isPhone() ? 'phone' : isTablet() ? 'tablet' : 'desktop'
  );

  // DPR 标记
  docEl.setAttribute('data-dpr', getDPR());

  // 安全区（简化版，标准 iPhone 刘海屏在竖屏时 top 约 44px, bottom 约 34px）
  const style = getComputedStyle(docEl);
  const safeTop = parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0;
  const safeBottom = parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0;
  docEl.style.setProperty('--safe-top', safeTop + 'px');
  docEl.style.setProperty('--safe-bottom', safeBottom + 'px');
}

/**
 * 设置 rem 基准值（手机/平板生效，桌面端使用固定 px）
 */
function setRemUnit() {
  const docEl = document.documentElement;
  const w = window.innerWidth;

  if (w <= MOBILE_MAX) {
    // 手机端：rem 基准 = 屏幕宽 / 3.75 （设计稿375px → 1rem=100px）
    const rem = w / (DESIGN_WIDTH_MOBILE / 100);
    docEl.style.fontSize = rem + 'px';
  } else if (w <= TABLET_MAX) {
    // 平板端：rem 基准 = 屏幕宽 / 7.68
    const rem = w / 7.68;
    docEl.style.fontSize = rem + 'px';
  } else {
    // 桌面端：固定 16px 基准
    docEl.style.fontSize = '16px';
  }
}

/**
 * 更新 viewport meta 标签（手机端缩放处理）
 */
function updateViewport() {
  const dpr = getDPR();
  const metaEl = document.querySelector('meta[name="viewport"]');
  if (!metaEl) return;

  if (isPhone()) {
    // 手机端：按 DPR 缩放实现高清
    const scale = 1 / dpr;
    metaEl.setAttribute('content',
      `width=device-width,initial-scale=${scale},maximum-scale=${scale},minimum-scale=${scale},user-scalable=no,viewport-fit=cover`
    );
  } else {
    // 桌面/平板端：标准视口
    metaEl.setAttribute('content',
      'width=device-width,initial-scale=1.0,maximum-scale=2.0,user-scalable=yes,viewport-fit=cover'
    );
  }
}

/**
 * 主适配函数（仅初始化时调用一次）
 */
function adapt() {
  updateViewport();
  setRemUnit();
  updateCSSVariables();
}

/**
 * resize 时仅更新 CSS 变量（不触发布局回流循环）
 */
function onResize() {
  updateCSSVariables();
}

/**
 * 初始化自适应系统
 */
export function initMobileAdapt() {
  adapt();

  // resize 时只更新 CSS 变量 —— 不改变 viewport / rem，避免循环反馈
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 100);
  });

  // 页面从缓存恢复
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) adapt();
  });

  // 屏幕旋转（稳定后重新适配）
  window.addEventListener('orientationchange', () => {
    setTimeout(adapt, 400);
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
 * 用于 JS 中判断是否需要移动端行为
 */
export function matchMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}