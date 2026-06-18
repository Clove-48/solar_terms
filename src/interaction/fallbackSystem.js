/**
 * fallbackSystem.js — 交互辅助系统
 *
 * 统一调度 3 种交互模式：
 *   Mode 2: 左右滑动黄道带（已实现 via ZodiacCanvas）
 *   Mode 3: 点击节气卡片（已实现）
 *   Mode 4: 前后翻页按钮
 *   Mode 7: 日期选择器
 */

import { getCurrentTermInfo } from '../business/calendar.js';

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
 * 初始化交互辅助系统
 * @param {object} store
 * @param {Array} terms
 * @param {string} page - 'zodiac' | 'detail'
 * @returns {Function} 清理所有交互辅助的函数
 */
export function initFallbackSystem(store, terms, page) {
  const cleanups = [];

  // Mode 4: 前后翻页按钮（所有设备通用）
  const cleanup4 = enablePrevNextButtons(page, store, terms);
  if (cleanup4) cleanups.push(cleanup4);

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