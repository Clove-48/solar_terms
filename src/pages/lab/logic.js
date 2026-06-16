/**
 * lab 页面逻辑 — 科学实验室（纯触控版）
 * 圭表测影互动 + 日晷模拟
 */
import { GnomonCanvas } from '../../renderer/gnomonCanvas.js';
import { SundialCanvas } from '../../renderer/sundialCanvas.js';
import { calcSunDeclination, calcNoonAltitude, calcShadowLength, getShadowDescription } from '../../business/gnomon.js';
import { calcDayLength, formatDayLength, calcDirectPoint, formatDirectPoint, getDayNightRatio, calcSunriseSunset } from '../../business/sunPosition.js';
import { getDataByDayOfYear } from '../../business/calendar.js';

let gnomonCanvas = null;
let sundialCanvas = null;
// 收集所有事件监听器 + 计时器，unmount 时统一清理，避免内存泄漏/卡顿
let _cleanupFns = [];

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
    const onSliderInput = () => {
      const day = parseInt(slider.value);
      updateGnomon(day);
    };
    slider.addEventListener('input', onSliderInput);
    _cleanupFns.push(() => slider.removeEventListener('input', onSliderInput));
    updateGnomon(80);
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
  let currentSundialTerm = null;

  if (timeSlider) {
    const onTimeSliderInput = () => {
      const h = parseInt(timeSlider.value);
      const shichen = getShichenName(h);
      if (shichenLabel) shichenLabel.textContent = `${shichen}时 (${String(h).padStart(2,'0')}:00)`;
      if (currentSundialTerm) {
        requestAnimationFrame(() => renderSundial(currentSundialTerm, h));
      }
    };
    timeSlider.addEventListener('input', onTimeSliderInput);
    _cleanupFns.push(() => timeSlider.removeEventListener('input', onTimeSliderInput));
  }

  const toggleBtn = document.getElementById('sundial-term-toggle');
  const labelEl = document.getElementById('sundial-term-label');
  const panel = document.getElementById('sundial-term-panel');
  if (toggleBtn && panel && terms.length) {
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
      currentSundialTerm = term;
      if (labelEl) labelEl.textContent = `${term.name} · 黄经 ${term.solarLongitude}°`;
      setActiveChip(id);
      // 获取当前时间滑块值
      const currentHour = timeSlider ? parseInt(timeSlider.value) : 12;
      // 使用 requestAnimationFrame 让数据卡片先更新，再异步重绘 canvas，避免同步渲染卡顿
      requestAnimationFrame(() => renderSundial(term, currentHour));
    };
    applyTerm(currentId);

    // 标记是否正在处理 chip 选择，避免 document click 在 chip click 之后立即关闭面板（移动端 300ms click 延迟下关键）
    let isSelecting = false;
    // 追踪待执行的 closePanel 计时器，openPanel/selectChip 时需清理，防止旧计时器在新一次操作后误关闭面板
    let closeTimer = null;
    const clearCloseTimer = () => {
      if (closeTimer !== null) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    };

    // 打开/关闭面板
    const closePanel = () => {
      clearCloseTimer();
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('open');
    };
    const openPanel = () => {
      clearCloseTimer();
      isSelecting = false;
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
    const onToggleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (panel.hidden) openPanel(); else closePanel();
    };
    // 不再绑定 touchend：移动端 click 事件由浏览器合成（fastclick 已默认启用），空函数 touchend 反而会干扰合成 click 在某些机型上的派发
    toggleBtn.addEventListener('click', onToggleClick);
    _cleanupFns.push(() => toggleBtn.removeEventListener('click', onToggleClick));

    const onDocClick = (e) => {
      // 正在处理选择中（chip click 触发的 50ms 窗口内）→ 忽略 document click，避免吞掉选择
      if (isSelecting) return;
      const picker = document.getElementById('sundial-term-picker');
      if (!panel.hidden && picker && !picker.contains(e.target)) {
        closePanel();
      }
    };
    // 使用 capture 阶段 + once 不行（需要多次触发）；改为常规冒泡
    document.addEventListener('click', onDocClick);
    _cleanupFns.push(() => document.removeEventListener('click', onDocClick));

    const onPanelClick = (e) => {
      const chip = e.target.closest('.term-picker-chip');
      if (!chip) return;
      // 阻止冒泡到 document：移动端 click 延迟 300ms 期间，document click 处理器可能在 chip click 之后看到旧事件并误关闭
      e.stopPropagation();
      const id = Number(chip.dataset.termId);
      isSelecting = true;
      applyTerm(id);
      // 清理上一次未执行的 closePanel，再排队本次的，避免旧计时器在新一次操作后误关闭
      clearCloseTimer();
      closeTimer = setTimeout(() => {
        closeTimer = null;
        isSelecting = false;
        closePanel();
      }, 60);
    };
    panel.addEventListener('click', onPanelClick);
    _cleanupFns.push(() => {
      panel.removeEventListener('click', onPanelClick);
      clearCloseTimer();
    });
  }
}

// ══════════════════════════════════════════
//  圭表测影
// ══════════════════════════════════════════

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
}