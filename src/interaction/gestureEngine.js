/**
 * gestureEngine.js — 手势识别引擎核心
 *
 * 职责：
 *   - 加载/管理 Handpose 模型
 *   - 从摄像头帧中检测手部 21 个关键点
 *   - 支持单手/双手跟踪
 *   - 将关键点数据传递给手势匹配器
 *   - 触发手势识别事件
 */

import { GestureMatcher, IDX } from './gestureMatcher.js';
import * as cameraManager from './cameraManager.js';
import { events, EventTypes } from '../app/events.js';

const DETECTION_INTERVAL_MS = 50; // 20fps
const LOW_FPS_INTERVAL_MS = 200;

export class GestureEngine {
  constructor({ store }) {
    this.store = store;
    this._model = null;
    this._video = null;
    this._isRunning = false;
    this._animId = null;
    this._matcher = new GestureMatcher();
    this._lastDetectionTime = 0;
    this._detectionInterval = DETECTION_INTERVAL_MS;
    this._frameCount = 0;
    this._onFrameCallback = null;

    this._lastRawGesture = 'none';
    this._lastRawLandmarks = null;   // 最新单手的原始 landmarks
    this._allHands = [];             // 所有手的 landmarks 数组
  }

  async init(onProgress) {
    try {
      if (onProgress) onProgress(0.1);
      const tf = await import('@tensorflow/tfjs-core');
      await import('@tensorflow/tfjs-backend-webgl');
      await tf.ready();
      if (onProgress) onProgress(0.4);
      const handpose = await import('@tensorflow-models/handpose');
      if (onProgress) onProgress(0.7);
      this._model = await handpose.load({
        detectionConfidence: 0.8,
        maxContinuousChecks: 5,
        iouThreshold: 0.3,
        scoreThreshold: 0.5
      });
      if (onProgress) onProgress(1.0);
      console.log('[GestureEngine] Handpose model loaded');
    } catch (err) {
      console.error('[GestureEngine] Model loading failed:', err);
      throw err;
    }
  }

  /**
   * 每帧回调：onFrame({ gesture, settled, landmarks, hands })
   * gesture - 本次匹配的稳定手势（含'none'）
   * settled - 已锁定的手势
   * landmarks - 单手（首选手）landmarks
   * hands - 所有检测到的手
   */
  onFrame(callback) {
    this._onFrameCallback = callback;
  }

  async start(video) {
    if (this._isRunning) return;
    if (!this._model) throw new Error('Model not initialized');

    this._video = video;
    this._isRunning = true;
    this._matcher.reset();
    this._detectionLoop();
    console.log('[GestureEngine] Detection started');
  }

  stop() {
    this._isRunning = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._video) {
      cameraManager.stopStream(this._video);
      this._video = null;
    }
    this._matcher.reset();
  }

  async _detectionLoop() {
    if (!this._isRunning) return;
    const now = Date.now();
    if (now - this._lastDetectionTime >= this._detectionInterval) {
      this._lastDetectionTime = now;
      try { await this._detectFrame(); }
      catch (err) { console.warn('[GestureEngine] Detection error:', err); }
    }
    this._animId = requestAnimationFrame(() => this._detectionLoop());
  }

  async _detectFrame() {
    if (!this._model || !this._video || !this._isRunning) return;
    if (this._video.readyState < 2) return;

    try {
      const predictions = await this._model.estimateHands(this._video);

      if (predictions && predictions.length > 0) {
        this._detectionInterval = DETECTION_INTERVAL_MS;
        this._frameCount++;

        // 处理所有检测到的手
        this._allHands = predictions.map(p => p.landmarks.map(([x, y, z]) => ({ x, y, z })));

        // 首选手 = 第一只手
        const landmarks = this._allHands[0];

        // 匹配手势
        const gesture = this._matcher.update(landmarks);
        this._lastRawLandmarks = landmarks;
        this._lastRawGesture = gesture !== 'none' ? gesture : this._matcher.getRawGesture();

        // 触发回调（即使gesture为'none'也传递landmarks用于连续跟踪）
        if (this._onFrameCallback) {
          this._onFrameCallback({
            gesture,
            settled: this._matcher.getSettledGesture(),
            rawGesture: this._lastRawGesture,
            landmarks,
            hands: this._allHands,
          });
        }

        // 发射事件
        if (gesture !== 'none') {
          events.emit(EventTypes.GESTURE_DETECTED, { gesture, landmarks, hands: this._allHands });
        }
      } else {
        this._matcher.update(null);
        this._allHands = [];
        this._detectionInterval = LOW_FPS_INTERVAL_MS;
        if (this._onFrameCallback) {
          this._onFrameCallback({ gesture: 'none', settled: 'none', rawGesture: 'none', landmarks: null, hands: [] });
        }
      }
    } catch (err) {
      console.warn('[GestureEngine] Detection error:', err);
    }
  }

  pause() {
    this._isRunning = false;
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
  }

  resume() {
    if (!this._isRunning && this._model && this._video) {
      this._isRunning = true;
      this._detectionLoop();
    }
  }

  getStatus() {
    return {
      settledGesture: this._matcher.getSettledGesture(),
      rawGesture: this._lastRawGesture,
      isRunning: this._isRunning,
      frameCount: this._frameCount
    };
  }

  destroy() {
    this.stop();
    this._model = null;
    this._onFrameCallback = null;
  }
}