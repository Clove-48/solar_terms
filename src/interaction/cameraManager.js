/**
 * cameraManager.js — 摄像头权限管理 + 视频流控制
 *
 * 职责：
 *   - 检测浏览器是否支持 getUserMedia
 *   - 请求摄像头权限
 *   - 开启/停止视频流
 *   - 错误处理（权限拒绝、设备不可用、超时）
 *   - Safari 兼容：需用户手势触发后延迟启动
 */

const DEFAULT_CONSTRAINTS = {
  audio: false,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'
  }
};

const TIMEOUT_MS = 10000; // 10s 超时

/**
 * 检测浏览器是否支持 getUserMedia
 * @returns {boolean}
 */
export function detect() {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

/**
 * 检测是否有可用的摄像头设备
 * @returns {Promise<boolean>}
 */
export async function hasCameraDevice() {
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
 * 请求摄像头权限
 * 注意：必须在用户手势触发后调用（Safari 要求）
 * @param {Object} [constraints] 可选的视频约束
 * @returns {Promise<boolean>} 是否获得权限
 */
export async function requestPermission(constraints = DEFAULT_CONSTRAINTS) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // 立即停止测试流，仅验证权限
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.warn('[Camera] Permission denied or error:', err.message);
    return false;
  }
}

/**
 * 开启摄像头视频流
 * @param {Object} [constraints] 可选的视频约束
 * @returns {Promise<HTMLVideoElement>} 包含视频流的 video 元素
 */
export async function startStream(constraints = DEFAULT_CONSTRAINTS) {
  if (!detect()) {
    throw new Error('getUserMedia is not supported in this browser');
  }

  // 超时控制
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Camera start timeout')), TIMEOUT_MS);
  });

  const streamPromise = navigator.mediaDevices.getUserMedia(constraints);

  const stream = await Promise.race([streamPromise, timeoutPromise]);

  const video = document.createElement('video');
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.muted = true;

  await video.play();

  return video;
}

/**
 * 停止视频流，释放资源
 * @param {HTMLVideoElement} video 视频元素
 */
export function stopStream(video) {
  if (!video) return;

  if (video.srcObject) {
    const stream = video.srcObject;
    stream.getTracks().forEach(track => {
      track.stop();
    });
    video.srcObject = null;
  }

  // 移除 video 元素
  if (video.parentNode) {
    video.parentNode.removeChild(video);
  }
}

/**
 * 获取当前的视频约束配置
 * @param {'user'|'environment'} [facingMode='user']
 * @returns {Object}
 */
export function getConstraints(facingMode = 'user') {
  return {
    audio: false,
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode
    }
  };
}

/**
 * Safari 安全启动：检测 Safari 并延迟启动
 * @returns {boolean} 是否是 Safari 浏览器
 */
export function isSafari() {
  return /Safari|AppleWebKit/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|Edg|FxiOS/i.test(navigator.userAgent);
}