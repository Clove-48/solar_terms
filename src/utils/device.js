/**
 * device.js — 设备能力检测
 */

/**
 * 检测摄像头是否可用
 * @returns {Promise<boolean>}
 */
export async function detectCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'videoinput');
  } catch {
    return false;
  }
}

/**
 * 检测是否支持触屏
 * @returns {boolean}
 */
export function detectTouch() {
  return 'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;
}

/**
 * 检测 DeviceMotion API 是否可用
 * @returns {boolean}
 */
export function detectMotion() {
  return 'DeviceMotionEvent' in window;
}

/**
 * 获取设备类型
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
  const tablet = /Tablet|iPad|PlayBook|Silk/i.test(ua) ||
    (navigator.maxTouchPoints > 0 && !mobile && screen.width >= 768 && screen.width <= 1024);

  if (tablet) return 'tablet';
  if (mobile) return 'mobile';
  return 'desktop';
}

/**
 * 检测是否为微信内置浏览器
 * @returns {boolean}
 */
export function isWeChat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * 检测是否为 Safari
 * @returns {boolean}
 */
export function isSafari() {
  return /Safari|AppleWebKit/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|Edg|FxiOS/i.test(navigator.userAgent);
}

/**
 * 检测是否支持 prefers-reduced-motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 获取设备像素比
 * @returns {number}
 */
export function getDPR() {
  return window.devicePixelRatio || 1;
}