/**
 * lab 页面逻辑 — 科学实验室（纯触控版）
 * 圭表测影互动 + 日晷模拟 + 视频科普
 */
import { GnomonCanvas } from '../../renderer/gnomonCanvas.js';
import { SundialCanvas } from '../../renderer/sundialCanvas.js';
import { renderShadowChart, pickTermFromChart } from '../../renderer/shadowChart.js';
import { calcSunDeclination, calcNoonAltitude, calcShadowLength, getShadowDescription } from '../../business/gnomon.js';
import { calcDayLength, formatDayLength, calcDirectPoint, formatDirectPoint, getDayNightRatio, calcSunriseSunset } from '../../business/sunPosition.js';
import { getDataByDayOfYear } from '../../business/calendar.js';
import { createVideoEmbed, VIDEO_BVIDS } from '../../utils/videoEmbed.js';

let gnomonCanvas = null;
let sundialCanvas = null;
// 收集所有事件监听器 + 计时器，unmount 时统一清理，避免内存泄漏/卡顿
let _cleanupFns = [];
let _chartCanvas = null;
let _chartTerms = [];
let _currentSundialTerm = null;
let _applyTermChartRaf = 0; // 节气切换时合并柱状图重绘的 rAF 句柄
let _chartHighlightId = null; // 当前柱状图高亮的节气 id（resize 时保留）

export async function mount(store) {
  const terms = store.get('solarTerms') || window.__solarTerms || [];
  // 每次 mount 重置清理列表，防止重复注册
  _cleanupFns = [];

  // 返回按钮
  const backBtn = document.getElementById('btn-lab-back');
  if (backBtn) {
    const onBack = () => { location.hash = '#zodiac'; };
    backBtn.addEventListener('click', onBack);
    _cleanupFns.push(() => backBtn.removeEventListener('click', onBack));
  }

  // ── 圭表测影 ──
  const gnomonCvs = document.getElementById('gnomon-canvas');
  if (gnomonCvs) {
    gnomonCanvas = new GnomonCanvas(gnomonCvs);
    gnomonCanvas.init();
  }

  const slider = document.getElementById('date-slider');
  if (slider) {
    let sliderRaf = 0;
    const onSliderInput = () => {
      const day = parseInt(slider.value);
      // rAF 节流：拖动日期滑块时合并同一帧内的多次触发
      if (sliderRaf) return;
      sliderRaf = requestAnimationFrame(() => {
        sliderRaf = 0;
        updateGnomon(day);
      });
    };
    slider.addEventListener('input', onSliderInput);
    _cleanupFns.push(() => {
      slider.removeEventListener('input', onSliderInput);
      if (sliderRaf) { cancelAnimationFrame(sliderRaf); sliderRaf = 0; }
    });
    updateGnomon(80);
  }

  // ── 圭表 24 节气影长柱状图 ──
  _chartCanvas = document.getElementById('gnomon-chart-canvas');
  _chartTerms = terms;
  if (_chartCanvas) {
    // 初次渲染（无选中态）
    renderShadowChart(_chartCanvas, _chartTerms, null, null);

    // 柱状图点击 → 更新圭表日期滑块，使画面展示该节气的测影
    const onChartClick = (e) => {
      const rect = _chartCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left);
      const y = (e.clientY - rect.top);
      const termId = pickTermFromChart(_chartCanvas, x, y);
      if (!termId) return;
      const term = _chartTerms.find(t => t.id === termId);
      if (!term) return;
      // 把节气的起始日序解析出来，更新滑块
      const day = parseTermStartDay(term);
      if (day === null) return;
      const slider = document.getElementById('date-slider');
      if (slider) {
        slider.value = String(Math.max(0, Math.min(365, day)));
        // 触发 input 事件以复用现有的滑块监听器（避免重复逻辑）
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // 高亮柱状图上对应的节气（同时记下 id，resize 时保留高亮）
      _chartHighlightId = termId;
      if (_chartCanvas) {
        if (_applyTermChartRaf) cancelAnimationFrame(_applyTermChartRaf);
        _applyTermChartRaf = requestAnimationFrame(() => {
          _applyTermChartRaf = 0;
          renderShadowChart(_chartCanvas, _chartTerms, termId, null);
        });
      }
    };
    _chartCanvas.addEventListener('click', onChartClick);
    _cleanupFns.push(() => _chartCanvas.removeEventListener('click', onChartClick));

    // 窗口大小变化时重绘（rAF 节流：合并同一帧内多次触发，避免连续重绘卡顿）
    // 保留当前高亮的节气（避免 resize 把用户刚选中的高亮状态抹掉）
    let chartResizeRaf = 0;
    const onChartResize = () => {
      if (chartResizeRaf) return;
      chartResizeRaf = requestAnimationFrame(() => {
        chartResizeRaf = 0;
        renderShadowChart(_chartCanvas, _chartTerms, _chartHighlightId, null);
      });
    };
    window.addEventListener('resize', onChartResize);
    _cleanupFns.push(() => {
      window.removeEventListener('resize', onChartResize);
      if (chartResizeRaf) { cancelAnimationFrame(chartResizeRaf); chartResizeRaf = 0; }
    });
  }

  // ── 视频科普：圭表测影（详情页式样卷轴） ──
  const gnomonVideoMount = document.getElementById('gnomon-video-mount');
  if (gnomonVideoMount) {
    createVideoEmbed({
      container: gnomonVideoMount,
      bvid: VIDEO_BVIDS.gnomon,
      title: '圭表测影 · 视频科普',
      source: 'B站科普',
      icon: '◆',
    });
  }

  // ── 日晷模拟 ──
  const sundialCvs = document.getElementById('sundial-canvas');
  if (sundialCvs) {
    sundialCanvas = new SundialCanvas(sundialCvs);
    sundialCanvas.init();
  }

  // 时辰选择器
  const timeSlider = document.getElementById('sundial-time-slider');
  const shichenLabel = document.getElementById('sundial-shichen-label');
  const sunriseLabel = document.getElementById('sundial-sunrise-label');
  const SHICHEN_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const getShichenName = (h) => SHICHEN_NAMES[Math.floor(((h + 1) % 24) / 2)];

  if (timeSlider) {
    let timeSliderRaf = 0;
    const onTimeSliderInput = () => {
      const h = parseInt(timeSlider.value);
      const shichen = getShichenName(h);
      if (shichenLabel) shichenLabel.textContent = `${shichen}时 (${String(h).padStart(2,'0')}:00)`;
      if (!_currentSundialTerm) return;
      // rAF 节流：拖动滑块时只画最新一帧
      if (timeSliderRaf) return;
      timeSliderRaf = requestAnimationFrame(() => {
        timeSliderRaf = 0;
        renderSundial(_currentSundialTerm, h);
      });
    };
    timeSlider.addEventListener('input', onTimeSliderInput);
    _cleanupFns.push(() => {
      timeSlider.removeEventListener('input', onTimeSliderInput);
      if (timeSliderRaf) { cancelAnimationFrame(timeSliderRaf); timeSliderRaf = 0; }
    });
  }

  const toggleBtn = document.getElementById('sundial-term-toggle');
  const labelEl = document.getElementById('sundial-term-label');
  const panel = document.getElementById('sundial-term-panel');
  // 视频科普：日晷（详情页式样卷轴） — 放在面板区之外，置于整个日晷卡片之后
  // 此处仅在 picker 初始化后挂载一次
  const sundialVideoMount = document.getElementById('sundial-video-mount');
  if (sundialVideoMount && !sundialVideoMount.dataset.mounted) {
    sundialVideoMount.dataset.mounted = '1';
    createVideoEmbed({
      container: sundialVideoMount,
      bvid: VIDEO_BVIDS.sundial,
      title: '日晷模拟 · 视频科普',
      source: 'B站科普',
      icon: '◇',
    });
  }
  if (toggleBtn && panel && terms.length) {
    const picker = document.getElementById('sundial-term-picker');
    // 按季节填充 term
    const seasonMap = { spring: [], summer: [], autumn: [], winter: [] };
    terms.forEach(t => {
      if (t.id >= 1 && t.id <= 6) seasonMap.spring.push(t);
      else if (t.id >= 7 && t.id <= 12) seasonMap.summer.push(t);
      else if (t.id >= 13 && t.id <= 18) seasonMap.autumn.push(t);
      else seasonMap.winter.push(t);
    });
    Object.keys(seasonMap).forEach(season => {
      const grid = panel.querySelector(`[data-season-terms="${season}"]`);
      if (!grid) return;
      grid.innerHTML = seasonMap[season].map(t => `
        <button type="button" class="term-picker-chip" data-term-id="${t.id}" role="option">
          <span class="term-picker-chip-name">${t.name}</span>
          <span class="term-picker-chip-lon">${t.solarLongitude}°</span>
        </button>
      `).join('');
    });

    const currentId = store.get('currentTermId') || 1;
    const setActiveChip = (id) => {
      panel.querySelectorAll('.term-picker-chip').forEach(c => {
        c.classList.toggle('active', Number(c.dataset.termId) === id);
      });
    };
    const applyTerm = (id) => {
      const term = terms.find(t => t.id === id);
      if (!term) return;
      _currentSundialTerm = term;
      if (labelEl) labelEl.textContent = `${term.name} · 黄经 ${term.solarLongitude}°`;
      setActiveChip(id);
      // 获取当前时间滑块值
      const currentHour = timeSlider ? parseInt(timeSlider.value) : 12;
      // 使用 requestAnimationFrame 让数据卡片先更新，再异步重绘 canvas，避免同步渲染卡顿
      requestAnimationFrame(() => renderSundial(term, currentHour));
      // 同步刷新影长柱状图高亮（节气快速切换时也用 rAF 合并）
      _chartHighlightId = id;
      if (_chartCanvas) {
        if (_applyTermChartRaf) cancelAnimationFrame(_applyTermChartRaf);
        _applyTermChartRaf = requestAnimationFrame(() => {
          _applyTermChartRaf = 0;
          renderShadowChart(_chartCanvas, _chartTerms, id, null);
        });
      }
    };
    applyTerm(currentId);

    // ── 下拉面板：使用 position: fixed 弹出，逃出 overflow:auto 容器 + 视频容器遮挡 ──
    // 注入一次性的 CSS：把面板提升为 fixed，并通过 CSS 变量定位
    const POS_STYLE_ID = 'lab-term-picker-pos-style';
    if (!document.getElementById(POS_STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = POS_STYLE_ID;
      styleEl.textContent = `
        .term-picker-panel.is-open {
          position: fixed !important;
          z-index: 9999 !important;
          top: var(--lab-picker-top, 0px) !important;
          left: var(--lab-picker-left, 0px) !important;
          width: var(--lab-picker-width, 0px) !important;
          max-height: min(60vh, 360px) !important;
        }
        .term-picker-panel.is-open[hidden] {
          display: block !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    let isOpen = false;
    let repositionRaf = 0;

    const positionPanel = () => {
      if (!isOpen) return;
      const rect = toggleBtn.getBoundingClientRect();
      const top = rect.bottom + 6;
      const left = rect.left;
      const width = rect.width;
      panel.style.setProperty('--lab-picker-top', `${top}px`);
      panel.style.setProperty('--lab-picker-left', `${left}px`);
      panel.style.setProperty('--lab-picker-width', `${width}px`);
    };
    const scheduleReposition = () => {
      if (repositionRaf) return;
      repositionRaf = requestAnimationFrame(() => {
        repositionRaf = 0;
        positionPanel();
      });
    };

    const openPanel = () => {
      if (isOpen) return;
      isOpen = true;
      positionPanel();
      panel.classList.add('is-open');
      panel.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('open');
      // 滚动到当前选中项（仅在不可见时滚动，避免强制滚动吞掉移动端的点击）
      const active = panel.querySelector('.term-picker-chip.active');
      if (active && typeof active.scrollIntoView === 'function') {
        try {
          active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        } catch (_) { /* ignore */ }
      }
    };
    const closePanel = () => {
      if (!isOpen) return;
      isOpen = false;
      panel.classList.remove('is-open');
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('open');
    };

    const onToggleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) closePanel(); else openPanel();
    };
    toggleBtn.addEventListener('click', onToggleClick);
    _cleanupFns.push(() => toggleBtn.removeEventListener('click', onToggleClick));

    const onDocClick = (e) => {
      if (!isOpen) return;
      if (picker && !picker.contains(e.target)) closePanel();
    };
    document.addEventListener('click', onDocClick);
    _cleanupFns.push(() => document.removeEventListener('click', onDocClick));

    const onPanelClick = (e) => {
      const chip = e.target.closest('.term-picker-chip');
      if (!chip) return;
      // 阻止冒泡到 document：避免 document click 处理器在 chip click 之后误触发关闭
      e.stopPropagation();
      const id = Number(chip.dataset.termId);
      applyTerm(id);
      closePanel();
    };
    panel.addEventListener('click', onPanelClick);
    _cleanupFns.push(() => panel.removeEventListener('click', onPanelClick));

    // 滚动/缩放时重新定位（rAF 合并）；列表本身的滚动交给 panel 的 overflow-y
    window.addEventListener('resize', scheduleReposition);
    window.addEventListener('scroll', scheduleReposition, true);
    _cleanupFns.push(() => {
      window.removeEventListener('resize', scheduleReposition);
      window.removeEventListener('scroll', scheduleReposition, true);
      if (repositionRaf) { cancelAnimationFrame(repositionRaf); repositionRaf = 0; }
    });
  }
}

// ══════════════════════════════════════════
//  圭表测影
// ══════════════════════════════════════════

/** 从节气 date 字符串解析起始日序（"6月5日-7日" → day 156） */
function parseTermStartDay(term) {
  if (!term || !term.date) return null;
  const m = String(term.date).match(/(\d+)月(\d+)日/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const d = new Date(2026, month - 1, day);
  const start = new Date(2026, 0, 0);
  return Math.floor((d - start) / 86400000);
}

function updateGnomon(day) {
  const data = getDataByDayOfYear(day);
  const { longitude, shadowLength, altitude } = data;

  const shadowEl = document.getElementById('gnomon-shadow');
  const dateLabel = document.getElementById('gnomon-date-label');
  const angleLabel = document.getElementById('gnomon-angle-label');
  const lonLabel = document.getElementById('gnomon-lon-label');
  const declEl = document.getElementById('gnomon-declination');
  const descEl = document.getElementById('gnomon-description');

  if (shadowEl) shadowEl.textContent = `${shadowLength.toFixed(2)}`;
  if (dateLabel) dateLabel.textContent = `日序: ${day}`;
  if (angleLabel) angleLabel.textContent = `${altitude.toFixed(1)}°`;
  if (lonLabel) lonLabel.textContent = `黄经: ${longitude.toFixed(1)}°`;
  if (declEl) declEl.textContent = `${data.declination.toFixed(1)}°`;

  const desc = getShadowDescription(shadowLength, altitude);
  if (descEl) descEl.textContent = desc;

  // 更新 Canvas
  if (gnomonCanvas) {
    gnomonCanvas.render(altitude, shadowLength, longitude);
  }
}

// ══════════════════════════════════════════
//  日晷模拟
// ══════════════════════════════════════════

function renderSundial(term, hourOfDay = 12) {
  if (!sundialCanvas) return;
  const longitude = term.solarLongitude;

  const altitude = calcNoonAltitude(longitude);
  const declination = calcSunDeclination(longitude);
  const dayLength = calcDayLength(longitude);
  const directPoint = formatDirectPoint(longitude);
  const ratio = getDayNightRatio(longitude);

  // 日出日落计算
  const { sunrise, sunset } = calcSunriseSunset(longitude);
  const sunriseLabel = document.getElementById('sundial-sunrise-label');
  if (sunriseLabel) {
    sunriseLabel.textContent = `日出 ${sunrise.toFixed(1)}h · 日落 ${sunset.toFixed(1)}h`;
  }
  const shichenLabel = document.getElementById('sundial-shichen-label');
  if (shichenLabel) {
    const shichenNames = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const h = Math.round(hourOfDay);
    const name = shichenNames[Math.floor(((h + 1) % 24) / 2)];
    shichenLabel.textContent = `${name}时 (${String(h).padStart(2,'0')}:00)`;
  }

  // 更新数据卡片
  const altEl = document.getElementById('sundial-altitude');
  const declEl2 = document.getElementById('sundial-declination');
  const dayEl = document.getElementById('sundial-day-length');
  const directEl = document.getElementById('sundial-direct-point');
  const ratioEl = document.getElementById('sundial-daynight-ratio');

  if (altEl) altEl.textContent = `${altitude.toFixed(1)}°`;
  if (declEl2) declEl2.textContent = `${declination.toFixed(1)}°`;
  if (dayEl) dayEl.textContent = formatDayLength(dayLength);
  if (directEl) directEl.textContent = directPoint;
  if (ratioEl) ratioEl.textContent = `${ratio.dayPercent.toFixed(0)}% : ${ratio.nightPercent.toFixed(0)}%`;

  // 更新 Canvas（传入时辰）
  sundialCanvas.render(altitude, longitude, term.name, hourOfDay);
}

export function unmount() {
  if (gnomonCanvas) { gnomonCanvas.destroy(); gnomonCanvas = null; }
  if (sundialCanvas) { sundialCanvas.destroy(); sundialCanvas = null; }
  // 清理所有注册的事件监听器，避免多次进出页面后累积导致卡顿
  _cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
  _cleanupFns = [];
  if (_applyTermChartRaf) { cancelAnimationFrame(_applyTermChartRaf); _applyTermChartRaf = 0; }
  _chartCanvas = null;
  _currentSundialTerm = null;
  _chartHighlightId = null;
}