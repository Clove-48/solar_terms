/**
 * audio.js — 音效管理
 * 基于 Web Audio API 的低延迟音效播放
 */

class AudioManager {
  constructor() {
    this._ctx = null;
    this._volume = 0.5;
    this._initialized = false;
    this._buffers = new Map();
  }

  /**
   * 初始化 AudioContext（需用户交互后调用）
   * @returns {AudioContext}
   */
  init() {
    if (this._ctx) return this._ctx;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._initialized = true;
    return this._ctx;
  }

  /**
   * 获取 AudioContext
   * @returns {AudioContext|null}
   */
  getContext() {
    return this._ctx;
  }

  /**
   * 设置主音量 [0, 1]
   * @param {number} vol
   */
  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * 获取当前音量
   * @returns {number}
   */
  getVolume() {
    return this._volume;
  }

  /**
   * 预加载音效
   * @param {string} name  音效名称
   * @param {string} url   音效 URL
   * @returns {Promise<void>}
   */
  async loadSound(name, url) {
    if (!this._ctx) this.init();
    try {
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
      this._buffers.set(name, audioBuffer);
    } catch (e) {
      console.warn(`[Audio] 加载音效失败: ${name}`, e);
    }
  }

  /**
   * 播放音效
   * @param {string} name  音效名称（已通过 loadSound 加载）
   * @param {Object} [opts]
   * @param {number} [opts.loop=false]
   * @param {number} [opts.volume]    独立音量 [0,1]，默认使用主音量
   * @returns {AudioBufferSourceNode|null}
   */
  playSound(name, opts = {}) {
    const buffer = this._buffers.get(name);
    if (!buffer) {
      console.warn(`[Audio] 音效未加载: ${name}`);
      return null;
    }

    if (!this._ctx) this.init();
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop || false;

    const gainNode = this._ctx.createGain();
    gainNode.gain.value = opts.volume !== undefined ? opts.volume : this._volume;

    source.connect(gainNode);
    gainNode.connect(this._ctx.destination);
    source.start(0);
    return source;
  }

  /**
   * 播放简单音调（无需加载外部文件）
   * @param {Object} [opts]
   * @param {number} [opts.frequency=440]
   * @param {number} [opts.duration=0.15]
   * @param {string} [opts.type='sine']
   */
  playTone(opts = {}) {
    const { frequency = 440, duration = 0.15, type = 'sine' } = opts;
    if (!this._ctx) this.init();
    if (this._ctx.state === 'suspended') this._ctx.resume();

    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = this._volume * 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this._ctx.destination);
    osc.start();
    osc.stop(this._ctx.currentTime + duration);
  }

  /**
   * 销毁 AudioContext
   */
  destroy() {
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
    this._buffers.clear();
    this._initialized = false;
  }
}

// 导出单例
export const audio = new AudioManager();