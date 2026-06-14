/**
 * zodiac 页面逻辑 — 黄道带主页面 v4
 * 纯触控操作：点击节气查看详情 | 自动旋转播放
 */
import { ZodiacCanvas } from '../../renderer/zodiacCanvas.js';
import { SceneEngine } from '../../renderer/sceneEngine.js';
import { events, EventTypes } from '../../app/events.js';
import { initFallbackSystem } from '../../interaction/fallbackSystem.js';
import { playTermSound, playPageTransition } from '../../business/soundEffects.js';
import poemData from '/data/poems.json';

let zodiacCanvas = null;
let sceneEngine = null;
let storeRef = null;
let _poemTimer = null;
let _poemIndex = 0;
let _fallbackCleanup = null;

export async function mount(store) {
  storeRef = store;

  const canvas = document.getElementById('zodiac-canvas');
  if (!canvas) return;

  zodiacCanvas = new ZodiacCanvas(canvas, { store });
  zodiacCanvas.init();

  // 场景引擎
  const sceneCanvas = document.getElementById('scene-canvas');
  if (sceneCanvas) {
    sceneEngine = new SceneEngine(sceneCanvas);
    sceneEngine.init();
  }

  const terms = store.get('solarTerms') || window.__solarTerms || [];
  if (!terms.length) return;

  // 根据当前日期定位到正确的节气
  updateStatusBar(store);

  // 初始旋转角度对准当前节气
  const currentId = store.get('currentTermId');
  const currentTerm = terms.find(t => t.id === currentId);
  if (currentTerm && zodiacCanvas) {
    const targetLon = currentTerm.solarLongitude;
    zodiacCanvas.rotation = (targetLon - 180) * (Math.PI * 0.8 / 360);
    updatePoetryDisplay(store, currentTerm);
  }

  // 点击节气标记 → 详情（通过 Canvas tap 检测，兼容移动端）
  zodiacCanvas._onTermClick = (termId) => {
    navigateToDetail(store, termId);
  };
  canvas.addEventListener('click', (e) => {
    // 桌面端 click 兜底
    const term = zodiacCanvas.getTermAt(e);
    if (term) navigateToDetail(store, term.id);
  });

  document.getElementById('btn-lab-entry')?.addEventListener('click', () => {
    location.hash = '#lab';
  });

  // 初始化交互辅助系统（前后翻页、摇一摇、拖拽、日期选择器）
  _fallbackCleanup = initFallbackSystem(store, terms, 'zodiac');

  // 监听 currentTermId 变化
  store.on('currentTermId', (newId) => {
    const term = terms.find(t => t.id === newId);
    if (term) {
      updatePoetryDisplay(store, term);
      if (sceneEngine) sceneEngine.setScene(getSeasonKey(term.id), term.name);
    }
  });

  if (currentTerm && sceneEngine) {
    sceneEngine.setScene(getSeasonKey(currentTerm.id), currentTerm.name);
  }
}

function navigateToDetail(store, termId) {
  const id = parseInt(termId, 10);
  store.set('currentTermId', id);
  events.emit(EventTypes.TERM_SELECTED, { termId: id });
  // 播放季节音效 + 页面切换音效
  playTermSound(id);
  playPageTransition();
  location.hash = '#detail?id=' + id;
}

// ══════════════════════════════════════════
//  诗句流式输出
// ══════════════════════════════════════════

function updatePoetryDisplay(store, term) {
  if (!term) return;
  const poemEntry = poemData.find(p => p.id === term.id);
  const poems = poemEntry?.poems || [];
  const explanations = poemEntry?.explanations || [];
  const kepu = poemEntry?.kepu || '';
  const termType = poemEntry?.type || '';
  if (poems.length === 0) return;

  _poemIndex = (_poemIndex + 1) % poems.length;
  const leftEl = document.getElementById('poem-left');
  const rightEl = document.getElementById('poem-right');
  const explEl = document.getElementById('poem-explanation');
  if (!leftEl || !rightEl) return;

  const poem = poems[_poemIndex];
  const explanation = explanations[_poemIndex] || '';
  const isLeft = _poemIndex % 2 === 0;

  if (explEl) {
    explEl.classList.remove('expl-visible', 'expl-left', 'expl-right');
    explEl.textContent = '';
  }

  if (isLeft) {
    typewriterEffect(leftEl, poem);
    rightEl.textContent = '';
    rightEl.classList.remove('poem-visible');
    leftEl.classList.add('poem-visible');
    if (explEl) { explEl.classList.add('expl-right'); streamExplanation(explEl, explanation, kepu); }
  } else {
    typewriterEffect(rightEl, poem);
    leftEl.textContent = '';
    leftEl.classList.remove('poem-visible');
    rightEl.classList.add('poem-visible');
    if (explEl) { explEl.classList.add('expl-left'); streamExplanation(explEl, explanation, kepu); }
  }

  const infoEl = document.getElementById('float-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <span class="float-info-term">${term.name}</span>
      <span class="float-info-sep">·</span>
      <span style="font-size:10px;color:#8b5a2b;opacity:0.6;">${termType || ''}</span>
      <span class="float-info-sep">·</span>
      <span class="float-info-date">${term.date}</span>
      <span class="float-info-sep">·</span>
      <span class="float-info-lon">节气·黄经 ${term.solarLongitude}°</span>
    `;
    infoEl.classList.remove('float-info-enter');
    void infoEl.offsetHeight;
    infoEl.classList.add('float-info-enter');
  }
}

function streamExplanation(el, explanation, kepu) {
  el.textContent = '';
  el.style.opacity = '1';
  let fullContent = explanation;
  if (kepu) fullContent += '\n\n━━━ 天文小知识 ━━━\n' + kepu;
  let i = 0;
  if (_poemTimer) clearInterval(_poemTimer);
  _poemTimer = setInterval(() => {
    if (i < fullContent.length) {
      el.textContent += fullContent[i];
      i++;
    } else {
      clearInterval(_poemTimer);
      _poemTimer = null;
      setTimeout(() => el.classList.add('expl-visible'), 200);
    }
  }, 35);
}

function typewriterEffect(el, text, onComplete) {
  el.textContent = '';
  el.style.opacity = '1';
  let i = 0;
  if (_poemTimer) clearInterval(_poemTimer);
  _poemTimer = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i];
      i++;
    } else {
      clearInterval(_poemTimer);
      _poemTimer = null;
      if (onComplete) setTimeout(onComplete, 300);
    }
  }, 60);
}

function getSeasonKey(termId) {
  if (termId >= 1 && termId <= 6) return 'spring';
  if (termId >= 7 && termId <= 12) return 'summer';
  if (termId >= 13 && termId <= 18) return 'autumn';
  return 'winter';
}

/** 从节气日期字符串解析近似起始日序（如"6月5日-7日" → day 156） */
function parseTermStartDay(term) {
  const m = term.date.match(/(\d+)月(\d+)日/);
  if (!m) return null;
  const month = parseInt(m[1]), day = parseInt(m[2]);
  const d = new Date(2026, month - 1, day);
  const start = new Date(2026, 0, 0);
  return Math.floor((d - start) / (1000 * 60 * 60 * 24));
}

/** 根据当前日期计算黄经和对应节气 */
function updateStatusBar(store) {
  const terms = store.get('solarTerms') || window.__solarTerms || [];
  if (!terms.length) return;
  const nameEl = document.getElementById('current-term-name');
  const lonEl = document.getElementById('current-longitude');
  const daysEl = document.getElementById('days-until-next');
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
  // 黄经 ≈ (dayOfYear - 春分日序约80) * 0.9863°/天
  let longitude = ((dayOfYear - 80) * 0.9863) % 360;
  if (longitude < 0) longitude += 360;

  let currentTerm = null, nextTerm = null;
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i], next = terms[(i + 1) % terms.length];
    if (t.solarLongitude <= next.solarLongitude) {
      if (longitude >= t.solarLongitude && longitude < next.solarLongitude) { currentTerm = t; nextTerm = next; break; }
    } else {
      if (longitude >= t.solarLongitude || longitude < next.solarLongitude) { currentTerm = t; nextTerm = next; break; }
    }
  }
  if (currentTerm) {
    if (nameEl) nameEl.textContent = currentTerm.name;
    if (lonEl) lonEl.textContent = `${Math.round(longitude)}°`;
    // 用节气实际日期计算剩余天数（比线性公式更准确）
    if (daysEl && nextTerm) {
      const nextDay = parseTermStartDay(nextTerm);
      if (nextDay !== null && nextDay >= dayOfYear) {
        daysEl.textContent = `${nextDay - dayOfYear}天`;
      } else {
        // 兜底：使用线性公式
        const degDiff = ((nextTerm.solarLongitude - longitude + 360) % 360);
        daysEl.textContent = `${Math.round(degDiff / 0.9863)}天`;
      }
    }
    store.set('currentTermId', currentTerm.id);
  }
}

export function unmount() {
  if (zodiacCanvas) { zodiacCanvas.destroy(); zodiacCanvas = null; }
  if (sceneEngine) { sceneEngine.destroy(); sceneEngine = null; }
  if (_poemTimer) { clearInterval(_poemTimer); _poemTimer = null; }
  if (_fallbackCleanup) { _fallbackCleanup(); _fallbackCleanup = null; }
}