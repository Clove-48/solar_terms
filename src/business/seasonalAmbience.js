/**
 * seasonalAmbience.js — 四季氛围音频引擎 v2
 *
 * 基于 Web Audio API 合成持续背景音频，随季节自动切换：
 * - 春：细雨沙沙 + 清脆鸟鸣
 * - 夏：潺潺溪流 + 嘹亮蝉鸣
 * - 秋：秋风瑟瑟 + 落叶沙沙
 * - 冬：寒风呼啸 + 雪花簌簌
 *
 * 特性：
 * - 跨季节平滑过渡（2s 淡入/淡出）
 * - 自动休眠（离开页面暂停，回到页面恢复）
 * - 自愈（异常后自动静默降级，不抛错）
 */

const FADE_DURATION = 2.0; // 淡入淡出秒数

// 12 节气 → 季节映射
const SEASON_MAP = {
  spring: { ids: [1, 2, 3, 4, 5, 6]  },
  summer: { ids: [7, 8, 9, 10, 11, 12] },
  autumn: { ids: [13, 14, 15, 16, 17, 18] },
  winter: { ids: [19, 20, 21, 22, 23, 24] },
};

export function getSeasonByTermId(termId) {
  if (termId >= 1 && termId <= 6) return 'spring';
  if (termId >= 7 && termId <= 12) return 'summer';
  if (termId >= 13 && termId <= 18) return 'autumn';
  return 'winter';
}

export class SeasonalAmbience {
  constructor() {
    this._ctx = null;
    this._currentSeason = null;
    this._nodes = {
      masterGain: null,
      noiseSource: null,
      noiseFilter: null,
      noiseGain: null,
      toneOsc: null,
      toneGain: null,
      toneLfo: null,
      toneLfoGain: null,
    };
    this._targetVolumes = { noise: 0, tone: 0 };
    this._currentVolumes = { noise: 0, tone: 0 };
    this._animId = null;
    this._visible = true;
    this._started = false;
    this._boundVisibility = null;
  }

  /**
   * 初始化音频上下文（需用户交互后调用）
   */
  init() {
    if (this._ctx) return this._ctx;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._createGraph();
      this._started = true;

      // 监听页面可见性变化
      this._boundVisibility = () => this._onVisibilityChange();
      document.addEventListener('visibilitychange', this._boundVisibility);
      window.addEventListener('pagehide', () => this._pause());
      window.addEventListener('pageshow', () => this._resume());

      return this._ctx;
    } catch (e) {
      console.warn('[Ambience] AudioContext init failed, ambient disabled:', e);
      this._ctx = null;
      this._started = false;
      return null;
    }
  }

  /**
   * 构建音频节点图
   */
  _createGraph() {
    if (!this._ctx) return;
    const ctx = this._ctx;

    // 主音量
    this._nodes.masterGain = ctx.createGain();
    this._nodes.masterGain.gain.value = 0.08;
    this._nodes.masterGain.connect(ctx.destination);

    // ── 白噪声通道（风声/雨声/雪声） ──
    const bufSize = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this._nodes.noiseSource = ctx.createBufferSource();
    this._nodes.noiseSource.buffer = buf;
    this._nodes.noiseSource.loop = true;

    this._nodes.noiseFilter = ctx.createBiquadFilter();
    this._nodes.noiseFilter.type = 'lowpass';
    this._nodes.noiseFilter.frequency.value = 500;

    this._nodes.noiseGain = ctx.createGain();
    this._nodes.noiseGain.gain.value = 0;

    this._nodes.noiseSource.connect(this._nodes.noiseFilter);
    this._nodes.noiseFilter.connect(this._nodes.noiseGain);
    this._nodes.noiseGain.connect(this._nodes.masterGain);
    this._nodes.noiseSource.start();

    // ── 音调通道（鸟鸣/蝉鸣） ──
    this._nodes.toneOsc = ctx.createOscillator();
    this._nodes.toneOsc.type = 'sine';
    this._nodes.toneOsc.frequency.value = 2000;

    this._nodes.toneLfo = ctx.createOscillator();
    this._nodes.toneLfo.type = 'sine';
    this._nodes.toneLfo.frequency.value = 4;

    this._nodes.toneLfoGain = ctx.createGain();
    this._nodes.toneLfoGain.gain.value = 0;

    this._nodes.toneGain = ctx.createGain();
    this._nodes.toneGain.gain.value = 0;

    this._nodes.toneLfo.connect(this._nodes.toneLfoGain);
    this._nodes.toneLfoGain.connect(this._nodes.toneOsc.frequency);
    this._nodes.toneOsc.connect(this._nodes.toneGain);
    this._nodes.toneGain.connect(this._nodes.masterGain);
    this._nodes.toneOsc.start();
    this._nodes.toneLfo.start();
  }

  /**
   * 切换到指定季节
   * @param {string} season - 'spring' | 'summer' | 'autumn' | 'winter'
   */
  setSeason(season) {
    if (!this._ctx || !this._started) return;
    if (season === this._currentSeason) return;
    this._currentSeason = season;

    // 确保 AudioContext 处于运行状态
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }

    const params = this._getSeasonParams(season);
    this._targetVolumes.noise = params.noiseVolume;
    this._targetVolumes.tone = params.toneVolume;
    this._applyFilters(params);

    // 如果已启动动画循环，无需重复启动
    if (!this._animId) {
      this._startFadeLoop();
    }
  }

  /**
   * 获取季节参数
   * 参考 white-noises.com 的白噪音色调分类：
   * - 春：雨声（rain）+ 鸟鸣（birds）→ 高频噪音 + 啁啾调制
   * - 夏：溪流（stream）+ 蝉鸣（crickets）→ 低频流水 + 高频颤音
   * - 秋：风声（wind）+ 落叶（leaves rustle）→ 中频噪音 + 短促脉冲
   * - 冬：风雪（storm）+ 寂静（silence）→ 低频呼啸 + 几乎无音调
   */
  _getSeasonParams(season) {
    switch (season) {
      case 'spring':
        return {
          noiseVolume: 0.35,     // 细雨声
          toneVolume: 0.25,      // 鸟鸣
          noiseFreq: 1800,       // 中高频雨声
          toneFreq: 3200,
          lfoFreq: 5,
          lfoDepth: 200,
        };
      case 'summer':
        return {
          noiseVolume: 0.30,     // 潺潺溪流（低噪 + 中频白噪混合）
          toneVolume: 0.40,      // 嘹亮蝉鸣
          noiseFreq: 600,        // 低中频流水
          toneFreq: 4800,
          lfoFreq: 6,
          lfoDepth: 600,
        };
      case 'autumn':
        return {
          noiseVolume: 0.42,     // 秋风
          toneVolume: 0.18,      // 稀疏落叶声
          noiseFreq: 1100,       // 中频风声
          toneFreq: 700,
          lfoFreq: 3,
          lfoDepth: 180,
        };
      case 'winter':
        return {
          noiseVolume: 0.50,     // 寒风呼啸
          toneVolume: 0.05,      // 几乎无音调（冬夜寂静）
          noiseFreq: 280,        // 低频风声
          toneFreq: 200,
          lfoFreq: 1.2,
          lfoDepth: 80,
        };
      default:
        return {
          noiseVolume: 0, toneVolume: 0, noiseFreq: 500,
          toneFreq: 2000, lfoFreq: 4, lfoDepth: 0,
        };
    }
  }

  /**
   * 应用滤波器参数
   */
  _applyFilters(params) {
    if (!this._nodes.noiseFilter) return;
    const now = this._ctx.currentTime;
    this._nodes.noiseFilter.frequency.linearRampToValueAtTime(params.noiseFreq, now + FADE_DURATION);
    if (this._nodes.toneOsc) {
      this._nodes.toneOsc.frequency.linearRampToValueAtTime(params.toneFreq, now + FADE_DURATION);
    }
    if (this._nodes.toneLfo) {
      this._nodes.toneLfo.frequency.linearRampToValueAtTime(params.lfoFreq, now + FADE_DURATION);
    }
    if (this._nodes.toneLfoGain) {
      this._nodes.toneLfoGain.gain.linearRampToValueAtTime(params.lfoDepth, now + FADE_DURATION);
    }
  }

  /**
   * 启动淡入/淡出动画循环
   */
  _startFadeLoop() {
    if (this._animId) return;
    const tick = () => {
      // 更新噪声增益
      const ng = this._nodes.noiseGain;
      const tg = this._nodes.toneGain;
      if (ng) {
        const diff = this._targetVolumes.noise - this._currentVolumes.noise;
        this._currentVolumes.noise += diff * 0.05; // 指数平滑
        if (Math.abs(diff) > 0.001) {
          ng.gain.value = this._currentVolumes.noise;
        }
      }
      if (tg) {
        const diff = this._targetVolumes.tone - this._currentVolumes.tone;
        this._currentVolumes.tone += diff * 0.05;
        if (Math.abs(diff) > 0.001) {
          tg.gain.value = this._currentVolumes.tone;
        }
      }
      this._animId = requestAnimationFrame(tick);
    };
    this._animId = requestAnimationFrame(tick);
  }

  /**
   * 暂停（页面隐藏时）
   */
  _pause() {
    if (!this._nodes.masterGain) return;
    try {
      this._nodes.masterGain.gain.value = 0;
    } catch (_) {}
  }

  /**
   * 恢复（页面显示时）
   */
  _resume() {
    if (!this._nodes.masterGain || !this._currentSeason) return;
    try {
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {});
      }
      this._nodes.masterGain.gain.value = 0.08;
    } catch (_) {}
  }

  /**
   * 可见性变化处理
   */
  _onVisibilityChange() {
    if (document.hidden) {
      this._pause();
    } else {
      this._resume();
    }
  }

  /**
   * 销毁释放
   */
  destroy() {
    this._targetVolumes = { noise: 0, tone: 0 };
    this._currentVolumes = { noise: 0, tone: 0 };

    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    try {
      if (this._nodes.noiseSource) this._nodes.noiseSource.stop();
      if (this._nodes.toneOsc) this._nodes.toneOsc.stop();
      if (this._nodes.toneLfo) this._nodes.toneLfo.stop();
    } catch (_) {}

    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
    }

    if (this._boundVisibility) {
      document.removeEventListener('visibilitychange', this._boundVisibility);
      window.removeEventListener('pagehide', () => this._pause());
      window.removeEventListener('pageshow', () => this._resume());
    }

    this._nodes = {
      masterGain: null, noiseSource: null, noiseFilter: null, noiseGain: null,
      toneOsc: null, toneGain: null, toneLfo: null, toneLfoGain: null,
    };
    this._currentSeason = null;
    this._started = false;
  }
}

// 导出单例
export const ambience = new SeasonalAmbience();