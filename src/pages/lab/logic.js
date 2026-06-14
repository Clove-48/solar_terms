/**
 * lab 页面逻辑 — 科学实验室（纯触控版）
 * 圭表测影互动 + 日晷模拟
 */
import { GnomonCanvas } from '../../renderer/gnomonCanvas.js';
import { SundialCanvas } from '../../renderer/sundialCanvas.js';
import { calcSunDeclination, calcNoonAltitude, calcShadowLength, getShadowDescription } from '../../business/gnomon.js';
import { calcDayLength, formatDayLength, calcDirectPoint, formatDirectPoint, getDayNightRatio } from '../../business/sunPosition.js';
import { getDataByDayOfYear } from '../../business/calendar.js';

let gnomonCanvas = null;
let sundialCanvas = null;

export async function mount(store) {
  const terms = store.get('solarTerms') || window.__solarTerms || [];

  // 返回按钮
  document.getElementById('btn-lab-back')?.addEventListener('click', () => {
    location.hash = '#zodiac';
  });

  // ── 圭表测影 ──
  const gnomonCvs = document.getElementById('gnomon-canvas');
  if (gnomonCvs) {
    gnomonCanvas = new GnomonCanvas(gnomonCvs);
    gnomonCanvas.init();
  }

  const slider = document.getElementById('date-slider');
  if (slider) {
    slider.addEventListener('input', () => {
      const day = parseInt(slider.value);
      updateGnomon(day);
    });
    updateGnomon(80);
  }

  // ── 日晷模拟 ──
  const sundialCvs = document.getElementById('sundial-canvas');
  if (sundialCvs) {
    sundialCanvas = new SundialCanvas(sundialCvs);
    sundialCanvas.init();
  }

  const select = document.getElementById('sundial-term-select');
  if (select && terms.length) {
    terms.forEach(term => {
      const opt = document.createElement('option');
      opt.value = term.id;
      opt.textContent = `${term.name} (黄经 ${term.solarLongitude}°)`;
      select.appendChild(opt);
    });
    const currentId = store.get('currentTermId') || 1;
    select.value = currentId;
    const initialTerm = terms.find(t => t.id === parseInt(select.value)) || terms[0];
    renderSundial(initialTerm);
    select.addEventListener('change', () => {
      const term = terms.find(t => t.id === parseInt(select.value));
      if (term) renderSundial(term);
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

function renderSundial(term) {
  if (!sundialCanvas) return;
  const longitude = term.solarLongitude;

  const altitude = calcNoonAltitude(longitude);
  const declination = calcSunDeclination(longitude);
  const dayLength = calcDayLength(longitude);
  const directPoint = formatDirectPoint(longitude);
  const ratio = getDayNightRatio(longitude);

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

  // 更新 Canvas
  sundialCanvas.render(altitude, longitude, term.name);
}

export function unmount() {
  if (gnomonCanvas) { gnomonCanvas.destroy(); gnomonCanvas = null; }
  if (sundialCanvas) { sundialCanvas.destroy(); sundialCanvas = null; }
}