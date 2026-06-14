/**
 * responsive.js — 响应式断点检测
 */

/** 断点常量 */
export const BREAKPOINTS = {
  SM: 375,   // 小屏手机
  MD: 414,   // 标准手机
  LG: 768,   // 平板
};

/**
 * 获取当前断点
 * @returns {'sm' | 'md' | 'lg'}
 */
export function getBreakpoint() {
  const w = window.innerWidth;
  if (w < BREAKPOINTS.SM) return 'sm';
  if (w < BREAKPOINTS.MD) return 'md';
  return 'lg';
}

/**
 * 是否为横屏模式
 * @returns {boolean}
 */
export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

/**
 * 监听窗口尺寸变化 (带防抖)
 * @param {Function} callback  回调接收 { width, height, breakpoint, landscape }
 * @param {number}   delay     防抖延迟 (ms)
 * @returns {Function}         取消监听函数
 */
export function onResize(callback, delay = 200) {
  let timer = null;
  const handler = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      callback({
        width: window.innerWidth,
        height: window.innerHeight,
        breakpoint: getBreakpoint(),
        landscape: isLandscape(),
      });
    }, delay);
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}