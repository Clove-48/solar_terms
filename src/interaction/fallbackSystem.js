/**
 * fallbackSystem.js — 降级交互系统
 *
 * 统一调度 6 种交互模式：
 *   Mode 2: 左右滑动黄道带（已实现 via ZodiacCanvas）
 *   Mode 3: 点击节气卡片（已实现）
 *   Mode 4: 前后翻页按钮
 *   Mode 5: 摇一摇随机节气
 *   Mode 6: 拖拽节气到场景
 *   Mode 7: 日期选择器
 */

import { getCurrentTermInfo } from '../business/calendar.js';

/**
 * 检测设备能力
 * @returns {{touch: boolean, motion: boolean, weChat: boolean}}
 */
export function detectCapabilities() {
  return {
    touch: 'ontouchstart' in window,
    motion: !!window.DeviceMotionEvent,
    weChat: /MicroMessenger/i.test(navigator.userAgent),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
}

/**
 * 激活前后翻页按钮（Mode 4）
 * @param {string} page - 'zodiac' | 'detail'
 * @param {object} store
 * @param {Array} terms
 */
export function enablePrevNextButtons(page, store, terms) {
  const containerId = page === 'zodiac' ? 'zodiac-page' : 'detail-footer-bar';
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentId = store.get('currentTermId') || terms[0]?.id || 1;
  const currentIdx = terms.findIndex(t => t.id === currentId);
  const prevTerm = terms[(currentIdx - 1 + terms.length) % terms.length];
  const nextTerm = terms[(currentIdx + 1) % terms.length];

  const wrapper = document.createElement('div');
  wrapper.className = 'fallback-nav-buttons';
  wrapper.innerHTML = `
    <button class="fallback-nav-btn" data-nav="prev" title="上一个节气">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      <span>${prevTerm.name}</span>
    </button>
    <button class="fallback-nav-btn" data-nav="next" title="下一个节气">
      <span>${nextTerm.name}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  `;

  wrapper.querySelector('[data-nav="prev"]').addEventListener('click', () => {
    navigateToTerm(prevTerm.id, store, page);
  });
  wrapper.querySelector('[data-nav="next"]').addEventListener('click', () => {
    navigateToTerm(nextTerm.id, store, page);
  });

  container.appendChild(wrapper);
  return () => wrapper.remove();
}

function navigateToTerm(termId, store, page) {
  store.set('currentTermId', termId);
  if (page === 'detail') {
    location.hash = `#detail?term=${termId}`;
  } else {
    location.hash = `#zodiac`;
  }
}

/**
 * 激活摇一摇随机节气（Mode 5）
 * @param {object} store
 * @param {Array} terms
 * @returns {Function} 清理函数
 */
export function enableShakeToRandom(store, terms) {
  if (!window.DeviceMotionEvent) return () => {};

  let lastX = 0, lastY = 0, lastZ = 0;
  let lastShakeTime = 0;
  const SHAKE_THRESHOLD = 15;
  const SHAKE_COOLDOWN = 2000;

  function handleMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const { x, y, z } = acc;
    const deltaX = Math.abs(x - lastX);
    const deltaY = Math.abs(y - lastY);
    const deltaZ = Math.abs(z - lastZ);

    lastX = x; lastY = y; lastZ = z;

    if ((deltaX > SHAKE_THRESHOLD && deltaY > SHAKE_THRESHOLD) ||
        (deltaX > SHAKE_THRESHOLD && deltaZ > SHAKE_THRESHOLD) ||
        (deltaY > SHAKE_THRESHOLD && deltaZ > SHAKE_THRESHOLD)) {
      const now = Date.now();
      if (now - lastShakeTime < SHAKE_COOLDOWN) return;
      lastShakeTime = now;

      const randomTerm = terms[Math.floor(Math.random() * terms.length)];
      if (randomTerm) {
        location.hash = `#detail?term=${randomTerm.id}`;
      }
    }
  }

  window.addEventListener('devicemotion', handleMotion, false);
  return () => window.removeEventListener('devicemotion', handleMotion);
}

/**
 * 激活日期选择器（Mode 7）
 * @param {HTMLElement} container
 * @param {Array} terms
 * @returns {Function} 清理函数
 */
export function enableDatePicker(container, terms) {
  if (!container) return () => {};

  const wrapper = document.createElement('div');
  wrapper.className = 'fallback-date-picker';
  wrapper.innerHTML = `
    <label class="fallback-date-label">
      <span>选择日期探索节气：</span>
      <input type="date" class="fallback-date-input" />
    </label>
  `;

  const input = wrapper.querySelector('.fallback-date-input');
  input.addEventListener('change', () => {
    const date = new Date(input.value);
    if (isNaN(date.getTime())) return;
    const info = getCurrentTermInfo(date, terms);
    if (info.currentTerm) {
      location.hash = `#detail?term=${info.currentTerm.id}`;
    }
  });

  container.appendChild(wrapper);
  return () => wrapper.remove();
}

/**
 * 激活拖拽节气到场景（Mode 6）
 * @param {HTMLElement} container
 * @param {Array} terms
 * @returns {Function} 清理函数
 */
export function enableDragToNavigate(container, terms) {
  if (!container) return () => {};

  const dragBar = document.createElement('div');
  dragBar.className = 'fallback-drag-bar';
  dragBar.innerHTML = `
    <span class="drag-bar-hint">拖拽节气到上方 →</span>
    <div class="drag-bar-terms">
      ${terms.map(t => `
        <div class="drag-term-chip" draggable="true" data-term-id="${t.id}">
          ${t.name}
        </div>
      `).join('')}
    </div>
  `;

  dragBar.querySelectorAll('.drag-term-chip').forEach(chip => {
    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', chip.dataset.termId);
      chip.classList.add('dragging');
    });
    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
    });
  });

  container.appendChild(dragBar);

  const dropZone = document.getElementById('zodiac-canvas');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const termId = parseInt(e.dataTransfer.getData('text/plain'));
      if (termId) {
        location.hash = `#detail?term=${termId}`;
      }
    });
  }

  return () => { dragBar.remove(); };
}

/**
 * 初始化降级交互系统
 * @param {object} store
 * @param {Array} terms
 * @param {string} page - 'zodiac' | 'detail'
 * @returns {Function} 清理所有降级交互的函数
 */
export function initFallbackSystem(store, terms, page) {
  const capabilities = detectCapabilities();
  const cleanups = [];

  // Mode 4: 前后翻页按钮（所有设备通用）
  const cleanup4 = enablePrevNextButtons(page, store, terms);
  if (cleanup4) cleanups.push(cleanup4);

  // Mode 5: 摇一摇（支持 DeviceMotion）
  if (capabilities.motion && page === 'zodiac') {
    const cleanup5 = enableShakeToRandom(store, terms);
    if (cleanup5) cleanups.push(cleanup5);
  }

  // Mode 6: 拖拽（仅黄道带页面）
  if (page === 'zodiac') {
    const dragContainer = document.getElementById('zodiac-page');
    if (dragContainer) {
      const cleanup6 = enableDragToNavigate(dragContainer, terms);
      if (cleanup6) cleanups.push(cleanup6);
    }
  }

  // Mode 7: 日期选择器
  const dateContainer = page === 'zodiac'
    ? document.getElementById('zodiac-page')
    : document.getElementById('detail-footer-bar');
  if (dateContainer) {
    const cleanup7 = enableDatePicker(dateContainer, terms);
    if (cleanup7) cleanups.push(cleanup7);
  }

  return () => {
    cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
  };
}