/**
 * seasonalAmbience.js — 四季氛围音频引擎 v3
 *
 * 基于 white-noises.com 的 8 大类白噪音分类：
 *   自然（雨/风/溪流/海浪/篝火） | 动物（鸟/蝉/蛙） | 物品（时钟/风铃/键盘）
 *   噪音（白/粉/棕）
 *
 * 使用 Web Audio API 实时合成持续背景音（避免外部 CDN 依赖与 CORS 问题）：
 * - 春：细雨沙沙 + 鸟鸣啁啾 → 高频雨噪声 + 啁啾调制
 * - 夏：潺潺溪流 + 蝉鸣颤音 → 低频流水 + 高频颤音
 * - 秋：秋风瑟瑟 + 落叶沙沙 → 中频风声 + 短促脉冲
 * - 冬：寒风呼啸 + 冬夜寂静 → 低频呼啸 + 几乎静音
 *
 * 页面生命周期：
 * - enable()：进入首页/黄道带，激活播放
 * - disable()：离开首页，淡出停止
 * - destroy()：完全销毁
 *
 * 特性：
 * - 跨季节平滑淡入淡出
 * - 页面隐藏自动暂停
 * - 异常静默降级
 * - 用户首次交互后自动解锁
 */

const FADE_DURATION = 1.8; // 淡入淡出秒数
const MASTER_VOLUME = 0.08;

export function getSeasonByTermId(termId) {
  if (termId >= 1 && termId <= 6) return 'spring';
  if (termId >= 7 && termId <= 12) return 'summer';
  if (termId >= 13 && termId <= 18) return 'autumn';
  return 'winter';
}

export class SeasonalAmbience {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._noiseSource = null;
    this._noiseFilter = null;
    this._noiseGain = null;
    this._toneOsc = null;
    this._toneGain = null;
    this._toneLfo = null;
    this._toneLfoGain = null;
    this._currentSeason = null;
    this._targetVolume = 0;
    this._currentVolume = 0;
    this._animId = null;
    this._started = false;
    this._enabled = false; // 是否在启用页面（首页/黄道带）
    this._unlocked = false;
    this._boundVisibility = null;
  }

  /**
   * 初始化音频上下文（无需用户交互也可调用，但 audioCtx.state === 'suspended'）
   */
  init() {
    if (this._ctx) return this._ctx;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._buildGraph();
      this._started = true;

      // 监听页面可见性
      this._boundVisibility = () => this._onVisibilityChange();
      document.addEventListener('visibilitychange', this._boundVisibility);

      return this._ctx;
    } catch (e) {
      console.warn('[Ambience] AudioContext init failed:', e);
      this._ctx = null;
      this._started = false;
      return null;
    }
  }

  /**
   * 解锁 AudioContext（需在用户交互后调用）
   */
  unlock() {
    if (!this._ctx || this._unlocked) return;
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    this._unlocked = true;
  }

  /**
   * 启用环境音（在首页/黄道带调用）
   * 总是尝试 resume AudioContext，因为离开期间 iOS Safari 等浏览器可能自动 suspend
   */
  enable() {
    this._enabled = true;
    // 总是尝试恢复 ctx（即使已 unlock，离开期间 ctx 可能被浏览器自动 suspend）
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    this._unlocked = true;
    if (this._currentSeason) {
      this._targetVolume = MASTER_VOLUME;
    }
  }

  /**
   * 禁用环境音（离开首页时调用）→ 1.8s 淡出后停止
   */
  disable() {
    this._enabled = false;
    this._targetVolume = 0;
  }

  /**
   * 切换到指定季节
   * @param {string} season - 'spring' | 'summer' | 'autumn' | 'winter'
   */
  setSeason(season) {
    if (!this._ctx || !this._started) return;
    if (season === this._currentSeason) return;
    this._currentSeason = season;

    this.unlock();

    const params = this._getSeasonParams(season);
    this._applyFilters(params);

    // 启用时才把目标音量调高
    if (this._enabled) {
      this._targetVolume = MASTER_VOLUME;
    }
  }

  /**
   * 构建音频图
   */
  _buildGraph() {
    if (!this._ctx) return;
    const ctx = this._ctx;

    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 0;
    this._masterGain.connect(ctx.destination);

    // 白噪声通道
    const bufSize = ctx.sampleRate * 1.0;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this._noiseSource = ctx.createBufferSource();
    this._noiseSource.buffer = buf;
    this._noiseSource.loop = true;

    this._noiseFilter = ctx.createBiquadFilter();
    this._noiseFilter.type = 'lowpass';
    this._noiseFilter.frequency.value = 500;
    this._noiseFilter.Q.value = 0.5;

    this._noiseGain = ctx.createGain();
    this._noiseGain.gain.value = 0;

    this._noiseSource.connect(this._noiseFilter);
    this._noiseFilter.connect(this._noiseGain);
    this._noiseGain.connect(this._masterGain);
    this._noiseSource.start();

    // 音调通道（鸟/蝉）
    this._toneOsc = ctx.createOscillator();
    this._toneOsc.type = 'sine';
    this._toneOsc.frequency.value = 2000;

    this._toneLfo = ctx.createOscillator();
    this._toneLfo.type = 'sine';
    this._toneLfo.frequency.value = 4;

    this._toneLfoGain = ctx.createGain();
    this._toneLfoGain.gain.value = 0;

    this._toneGain = ctx.createGain();
    this._toneGain.gain.value = 0;

    this._toneLfo.connect(this._toneLfoGain);
    this._toneLfoGain.connect(this._toneOsc.frequency);
    this._toneOsc.connect(this._toneGain);
    this._toneGain.connect(this._masterGain);
    this._toneOsc.start();
    this._toneLfo.start();

    // 启动音量平滑循环
    this._startFadeLoop();
  }

  /**
   * 获取季节参数（参考 white-noises.com 的白噪音色调分类）
   */
  _getSeasonParams(season) {
    switch (season) {
      case 'spring':
        return { noiseFreq: 1800, toneFreq: 3200, lfoFreq: 5,   lfoDepth: 250, toneGain: 0.5 };
      case 'summer':
        return { noiseFreq: 600,  toneFreq: 4800, lfoFreq: 6,   lfoDepth: 600, toneGain: 0.7 };
      case 'autumn':
        return { noiseFreq: 1100, toneFreq: 700,  lfoFreq: 3,   lfoDepth: 180, toneGain: 0.3 };
      case 'winter':
        return { noiseFreq: 280,  toneFreq: 200,  lfoFreq: 1.2, lfoDepth: 80,  toneGain: 0.1 };
      default:
        return { noiseFreq: 500, toneFreq: 2000, lfoFreq: 4, lfoDepth: 0, toneGain: 0 };
    }
  }

  /**
   * 应用滤波器参数
   */
  _applyFilters(params) {
    if (!this._ctx || !this._noiseFilter) return;
    const now = this._ctx.currentTime;
    this._noiseFilter.frequency.cancelScheduledValues(now);
    this._noiseFilter.frequency.linearRampToValueAtTime(params.noiseFreq, now + FADE_DURATION);
    if (this._toneOsc) {
      this._toneOsc.frequency.cancelScheduledValues(now);
      this._toneOsc.frequency.linearRampToValueAtTime(params.toneFreq, now + FADE_DURATION);
    }
    if (this._toneLfo) {
      this._toneLfo.frequency.cancelScheduledValues(now);
      this._toneLfo.frequency.linearRampToValueAtTime(params.lfoFreq, now + FADE_DURATION);
    }
    if (this._toneLfoGain) {
      this._toneLfoGain.gain.cancelScheduledValues(now);
      this._toneLfoGain.gain.linearRampToValueAtTime(params.lfoDepth, now + FADE_DURATION);
    }
    if (this._toneGain) {
      this._toneGain.gain.cancelScheduledValues(now);
      this._toneGain.gain.linearRampToValueAtTime(params.toneGain, now + FADE_DURATION);
    }
  }

  /**
   * 启动音量平滑循环
   */
  _startFadeLoop() {
    if (this._animId) return;
    const tick = () => {
      if (!this._ctx || !this._masterGain) {
        this._animId = null;
        return;
      }
      const diff = this._targetVolume - this._currentVolume;
      if (Math.abs(diff) > 0.0005) {
        this._currentVolume += diff * 0.05;
        try {
          this._masterGain.gain.value = this._currentVolume;
        } catch (_) {}
      }
      this._animId = requestAnimationFrame(tick);
    };
    this._animId = requestAnimationFrame(tick);
  }

  /**
   * 暂停（页面隐藏）
   */
  _pause() {
    if (!this._masterGain) return;
    try {
      this._masterGain.gain.value = 0;
      this._currentVolume = 0;
    } catch (_) {}
  }

  /**
   * 恢复（页面显示）
   */
  _resume() {
    if (!this._masterGain || !this._enabled) return;
    try {
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {});
      }
      this._targetVolume = MASTER_VOLUME;
    } catch (_) {}
  }

  /**
   * 可见性变化
   */
  _onVisibilityChange() {
    if (document.hidden) {
      this._pause();
    } else {
      this._resume();
    }
  }

  /**
   * 完全销毁
   */
  destroy() {
    this._targetVolume = 0;
    this._currentVolume = 0;

    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    try {
      if (this._noiseSource) this._noiseSource.stop();
      if (this._toneOsc) this._toneOsc.stop();
      if (this._toneLfo) this._toneLfo.stop();
    } catch (_) {}

    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
    }

    if (this._boundVisibility) {
      document.removeEventListener('visibilitychange', this._boundVisibility);
      this._boundVisibility = null;
    }

    this._masterGain = null;
    this._noiseSource = null;
    this._noiseFilter = null;
    this._noiseGain = null;
    this._toneOsc = null;
    this._toneGain = null;
    this._toneLfo = null;
    this._toneLfoGain = null;
    this._currentSeason = null;
    this._started = false;
    this._enabled = false;
    this._unlocked = false;
  }
}

// 导出单例
export const ambience = new SeasonalAmbience();