/**
 * soundEffects.js — 节气场景化音效
 *
 * 使用 Web Audio API 合成简单的场景音效，无需外部音频文件：
 * - 立春：春雷声（低频 rumbling）
 * - 夏至：蝉鸣（高频振荡 + 颤音）
 * - 秋分：秋风（白噪声掠过）
 * - 冬至：寒风（低频白噪声）
 * - 通用：页面切换 whoosh
 */

import { audio } from '../utils/audio.js';

/**
 * 根据节气 ID 获取对应的音效类型
 */
const SOUND_MAP = {
  1: 'spring',    // 立春
  2: 'spring',    // 雨水
  3: 'spring',    // 惊蛰
  4: 'spring',    // 春分
  5: 'spring',    // 清明
  6: 'spring',    // 谷雨
  7: 'summer',    // 立夏
  8: 'summer',    // 小满
  9: 'summer',    // 芒种
  10: 'summer',   // 夏至
  11: 'summer',   // 小暑
  12: 'summer',   // 大暑
  13: 'autumn',   // 立秋
  14: 'autumn',   // 处暑
  15: 'autumn',   // 白露
  16: 'autumn',   // 秋分
  17: 'autumn',   // 寒露
  18: 'autumn',   // 霜降
  19: 'winter',   // 立冬
  20: 'winter',   // 小雪
  21: 'winter',   // 大雪
  22: 'winter',   // 冬至
  23: 'winter',   // 小寒
  24: 'winter',   // 大寒
};

/**
 * 播放春季音效（春雷声）
 * 低频隆隆声 + 随机爆裂
 */
function playSpring() {
  const ctx = audio.init();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  // 低频隆隆声
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 60;
  osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.8);
  gain.gain.value = 0.08;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);

  // 随机爆裂
  setTimeout(() => {
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    noise.connect(ng);
    ng.connect(ctx.destination);
    noise.start();
  }, 300);
}

/**
 * 播放夏季音效（蝉鸣）
 * 高频振荡 + 周期频率调制（颤音效果）
 */
function playSummer() {
  const ctx = audio.init();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 4000;
  lfo.type = 'sine';
  lfo.frequency.value = 6;
  lfoGain.gain.value = 500;

  gain.gain.value = 0.04;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gain);
  gain.connect(ctx.destination);

  lfo.start();
  osc.start();
  osc.stop(ctx.currentTime + 1.5);
  lfo.stop(ctx.currentTime + 1.5);
}

/**
 * 播放秋季音效（秋风）
 * 白噪声掠过
 */
function playAutumn() {
  const ctx = audio.init();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 1.2);

  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

/**
 * 播放冬季音效（寒风 + 雪声）
 * 低频白噪声
 */
function playWinter() {
  const ctx = audio.init();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = ctx.createGain();
  gain.gain.value = 0.07;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

/**
 * 播放页面切换 whoosh 音效
 */
function playWhoosh() {
  const ctx = audio.init();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

/**
 * 播放页面切换 whoosh 音效（公开接口）
 */
export function playPageTransition() {
  try { playWhoosh(); } catch (e) { /* ignore audio errors */ }
}

/**
 * 根据节气 ID 播放对应季节音效
 * @param {number} termId - 节气 ID (1-24)
 */
export function playTermSound(termId) {
  try {
    const season = SOUND_MAP[termId];
    switch (season) {
      case 'spring': playSpring();  break;
      case 'summer': playSummer();  break;
      case 'autumn': playAutumn();  break;
      case 'winter': playWinter();  break;
      default: break;
    }
  } catch (e) {
    // 静默忽略音效错误
  }
}