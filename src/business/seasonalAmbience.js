/**
 * seasonalAmbience.js — 四季氛围音频引擎 v4
 *
 * 使用 white-noises.com 在线白噪音播放器作为背景音：
 *   春 · 细雨 (light-rain)         — https://white-noises.com/?sounds=light-rain%3A0.50
 *   夏 · 丛林 + 鸟鸣               — https://white-noises.com/?sounds=jungle%3A0.57%2Cbirds%3A0.33
 *   秋 · 树林风声                  — https://white-noises.com/?sounds=wind-in-trees%3A0.40
 *   冬 · 寒风 + 雪地行走           — https://white-noises.com/?sounds=wind%3A0.69%2Cwalk-in-snow%3A0.11
 *
 * 页面生命周期：
 * - enable()：进入首页/黄道带，加载当前季节的 iframe 开始播放
 * - disable()：离开首页，将 iframe 切换为 about:blank 立即停止音频
 * - destroy()：从 DOM 移除 iframe 节点
 *
 * 特性：
 * - 单个 iframe 复用，切换季节时只更新 src
 * - 仅在首页（黄道带）激活；离开时立即停止，节省流量/CPU
 * - 不抛错：白噪音站点故障不影响主功能
 */
const AUDIO_URLS = {
  spring: 'https://white-noises.com/?sounds=light-rain%3A0.50',
  summer: 'https://white-noises.com/?sounds=jungle%3A0.57%2Cbirds%3A0.33',
  autumn: 'https://white-noises.com/?sounds=wind-in-trees%3A0.40',
  winter: 'https://white-noises.com/?sounds=wind%3A0.69%2Cwalk-in-snow%3A0.11',
};

const BLANK_SRC = 'about:blank';

export function getSeasonByTermId(termId) {
  if (termId >= 1 && termId <= 6) return 'spring';
  if (termId >= 7 && termId <= 12) return 'summer';
  if (termId >= 13 && termId <= 18) return 'autumn';
  return 'winter';
}

export class SeasonalAmbience {
  constructor() {
    this._iframe = null;
    this._currentSeason = null;
    this._currentSrc = '';   // 记录已赋的 src（避免依赖 iframe.src 读取/归一化差异）
    this._enabled = false;
    this._initialized = false;
  }

  /**
   * 创建隐藏的 iframe（DOM 中只存在一个）
   */
  init() {
    if (this._initialized) return;
    try {
      const iframe = document.createElement('iframe');
      iframe.className = 'solar-ambience-iframe';
      // 视觉上完全隐藏但保留可加载与播放音频的能力
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('tabindex', '-1');
      iframe.setAttribute('allow', 'autoplay');
      iframe.title = '节气背景音';
      Object.assign(iframe.style, {
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        border: '0',
        opacity: '0',
        pointerEvents: 'none',
      });
      // 初始为空 src（不加载任何东西，等 enable() 时再按需加载）
      this._setIframeSrc(BLANK_SRC);
      document.body.appendChild(iframe);
      this._iframe = iframe;
      this._initialized = true;
    } catch (e) {
      console.warn('[Ambience] iframe init failed:', e);
      this._iframe = null;
    }
  }

  /**
   * 启用（首页/黄道带进入）：按当前 season 加载音频
   * 若 season 尚未设置，则暂不加载（等 setSeason 触发）
   */
  enable() {
    this._enabled = true;
    this._syncSrc();
  }

  /**
   * 禁用（离开首页）：把 iframe 切到 about:blank 立即停止音频，节省流量
   */
  disable() {
    this._enabled = false;
    this._setIframeSrc(BLANK_SRC);
  }

  /**
   * 切换到指定季节
   * @param {string} season - 'spring' | 'summer' | 'autumn' | 'winter'
   */
  setSeason(season) {
    if (!AUDIO_URLS[season]) return;
    this._currentSeason = season;
    this._syncSrc();
  }

  /**
   * 设置 iframe src（带去重，避免无谓重载）
   */
  _setIframeSrc(src) {
    if (!this._iframe) return;
    if (this._currentSrc === src) return;
    this._currentSrc = src;
    try {
      this._iframe.src = src;
    } catch (_) { /* ignore */ }
  }

  /**
   * 根据 enabled + currentSeason 同步 iframe.src
   */
  _syncSrc() {
    if (!this._iframe) return;
    if (this._enabled && this._currentSeason) {
      this._setIframeSrc(AUDIO_URLS[this._currentSeason]);
    } else if (!this._enabled) {
      this._setIframeSrc(BLANK_SRC);
    }
  }

  /**
   * 完全销毁
   */
  destroy() {
    if (this._iframe) {
      this._setIframeSrc(BLANK_SRC);
      try { this._iframe.remove(); } catch (_) {}
      this._iframe = null;
    }
    this._currentSeason = null;
    this._currentSrc = '';
    this._enabled = false;
    this._initialized = false;
  }
}

// 导出单例
export const ambience = new SeasonalAmbience();
