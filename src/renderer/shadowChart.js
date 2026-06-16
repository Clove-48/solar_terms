/**
 * shadowChart.js — 圭表测影柱状图渲染
 *
 * 圭表测影：古人在冬至前后数日用 8 尺表（高 2.4m）观测正午影长，
 * 一年中夏至影最短（0.5尺），冬至影最长（15尺+），
 * 影长变化曲线呈对称抛物线（近似）。
 *
 * 交互：
 * - 点击柱状条查看详情
 * - 鼠标悬停显示精确数值
 * - 高亮当前选中的节气
 */

const POLE_HEIGHT = 8; // 古代标准圭表：8 尺（≈2.4m）

// 24 节气正午影长（尺，简化模型：表高 × |cot(高度角)|）
// 高度角 = 90 - |纬度 - 太阳直射点纬度|
// 登封纬度 ≈ 34.4°，太阳直射点纬度 = 23.4° × sin((黄经 - 90) × π/180)
const DENGFENG_LAT = 34.4;

/**
 * 计算给定黄经的太阳直射点纬度
 */
function calcDirectLat(longitude) {
  return 23.4 * Math.sin((longitude - 90) * Math.PI / 180);
}

/**
 * 计算正午影长（单位：尺）
 * 公式：影长 = 表高 × cot(90° - |lat - δ|) = 表高 × tan(|lat - δ|)
 */
export function calcShadowLengthChi(longitude) {
  const directLat = calcDirectLat(longitude);
  const diff = Math.abs(DENGFENG_LAT - directLat);
  // 接近 0 时（夏至直射本地），影长趋近 0
  if (diff < 0.5) return 0.5;
  return POLE_HEIGHT * Math.tan(diff * Math.PI / 180);
}

/**
 * 绘制圭表测影柱状图到指定 canvas
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{id:number, name:string, solarLongitude:number}>} terms
 * @param {number} currentTermId - 高亮当前节气
 * @param {Function} onSelect - 选中回调 (termId) => void
 */
export function renderShadowChart(canvas, terms, currentTermId, onSelect) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  const w = (rect.width - 32);
  const h = 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // 计算每个节气的影长
  const data = terms.map(t => ({
    id: t.id,
    name: t.name,
    longitude: t.solarLongitude,
    shadow: calcShadowLengthChi(t.solarLongitude),
  }));
  const maxShadow = Math.max(...data.map(d => d.shadow), 16);

  // 背景
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0f1322');
  bgGrad.addColorStop(1, '#0a0e1a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 季节分割线
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  [6, 12, 18].forEach(idx => {
    if (idx < data.length) {
      const x = (idx / data.length) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h - 30);
      ctx.stroke();
    }
  });
  ctx.setLineDash([]);

  // 柱状图
  const barW = (w - 40) / data.length * 0.7;
  const barGap = (w - 40) / data.length * 0.3;
  const baseY = h - 30;
  const chartH = h - 50;

  // 季节背景色条
  const seasonColors = [
    { range: [0, 6], color: 'rgba(160, 220, 100, 0.05)', label: '春' },
    { range: [6, 12], color: 'rgba(255, 180, 60, 0.05)', label: '夏' },
    { range: [12, 18], color: 'rgba(220, 140, 80, 0.05)', label: '秋' },
    { range: [18, 24], color: 'rgba(140, 180, 220, 0.05)', label: '冬' },
  ];
  seasonColors.forEach(({ range, color, label }) => {
    const x0 = (range[0] / data.length) * w;
    const x1 = (range[1] / data.length) * w;
    ctx.fillStyle = color;
    ctx.fillRect(x0, 0, x1 - x0, baseY);
    ctx.fillStyle = 'rgba(212, 165, 116, 0.3)';
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, (x0 + x1) / 2, 4);
  });

  // Y 轴刻度
  ctx.fillStyle = 'rgba(212, 165, 116, 0.4)';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= maxShadow; v += 4) {
    const y = baseY - (v / maxShadow) * chartH;
    ctx.fillText(v + '尺', 32, y);
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.05)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(35, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 判断移动端
  const isNarrow = w < 500;

  // 柱子
  data.forEach((d, i) => {
    const x = 40 + (i / data.length) * (w - 40) + barGap / 2;
    const barH = (d.shadow / maxShadow) * chartH;
    const y = baseY - barH;
    const isCurrent = d.id === currentTermId;

    // 柱体渐变
    let grad;
    if (d.id >= 1 && d.id <= 6) {
      // 春 - 绿
      grad = ctx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, isCurrent ? 'rgba(140, 220, 100, 0.95)' : 'rgba(140, 220, 100, 0.6)');
      grad.addColorStop(1, 'rgba(100, 180, 80, 0.4)');
    } else if (d.id >= 7 && d.id <= 12) {
      // 夏 - 黄
      grad = ctx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, isCurrent ? 'rgba(255, 200, 60, 0.95)' : 'rgba(255, 200, 60, 0.6)');
      grad.addColorStop(1, 'rgba(220, 160, 40, 0.4)');
    } else if (d.id >= 13 && d.id <= 18) {
      // 秋 - 橙
      grad = ctx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, isCurrent ? 'rgba(255, 140, 60, 0.95)' : 'rgba(255, 140, 60, 0.6)');
      grad.addColorStop(1, 'rgba(200, 100, 40, 0.4)');
    } else {
      // 冬 - 蓝
      grad = ctx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, isCurrent ? 'rgba(140, 200, 240, 0.95)' : 'rgba(140, 200, 240, 0.6)');
      grad.addColorStop(1, 'rgba(100, 140, 200, 0.4)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);

    // 当前节气高亮边框
    if (isCurrent) {
      ctx.strokeStyle = 'rgba(255, 220, 100, 1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, barW + 2, barH + 2);
    }

    // 名称（移动端交错显示避免重叠）
    if (isNarrow) {
      // 窄屏：只显示奇数索引+高亮项，文字用单字符
      if (i % 2 === 0 && !isCurrent) {
        // 只显示影长数值（顶部）
        if (barH > 18) {
          ctx.fillStyle = 'rgba(212, 165, 116, 0.5)';
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textBaseline = 'bottom';
          ctx.fillText(d.shadow.toFixed(1), x + barW / 2, y - 2);
        }
        return;
      }
      const shortName = d.name.substring(0, 1);
      ctx.save();
      // 在柱子下方旋转45度绘制单字
      ctx.translate(x + barW / 2, baseY + 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = isCurrent ? 'rgba(255, 220, 100, 0.95)' : 'rgba(212, 165, 116, 0.6)';
      ctx.font = isCurrent ? 'bold 9px "Noto Serif SC", serif' : '8px "Noto Serif SC", serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(shortName, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = isCurrent ? 'rgba(255, 220, 100, 0.95)' : 'rgba(212, 165, 116, 0.5)';
      ctx.font = isCurrent ? 'bold 10px "Noto Serif SC", serif' : '9px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const name = d.name.length > 2 ? d.name.substring(0, 2) : d.name;
      ctx.fillText(name, x + barW / 2, baseY + 6);
    }

    // 影长数值（顶部）
    if (barH > 18) {
      ctx.fillStyle = isCurrent ? 'rgba(255, 220, 100, 0.9)' : 'rgba(212, 165, 116, 0.5)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(d.shadow.toFixed(1), x + barW / 2, y - 2);
    }
  });

  // 标题
  ctx.fillStyle = 'rgba(212, 165, 116, 0.7)';
  ctx.font = '10px "Noto Serif SC", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('登封观星台圭表测影 · 表高 8尺', 36, 4);

  // 存储柱子信息供点击
  canvas._chartBars = data.map((d, i) => ({
    termId: d.id,
    name: d.name,
    shadow: d.shadow,
    x: 40 + (i / data.length) * (w - 40) + barGap / 2,
    y: baseY - (d.shadow / maxShadow) * chartH,
    w: barW,
    h: (d.shadow / maxShadow) * chartH,
  }));
}

/**
 * 处理点击：根据点击坐标返回对应 termId
 */
export function pickTermFromChart(canvas, clickX, clickY) {
  const bars = canvas._chartBars;
  if (!bars) return null;
  const dpr = window.devicePixelRatio || 1;
  for (const b of bars) {
    if (clickX >= b.x * dpr / dpr && clickX <= (b.x + b.w) * dpr / dpr
        && clickY >= b.y * dpr / dpr && clickY <= (b.y + b.h + 30) * dpr / dpr) {
      return b.termId;
    }
  }
  return null;
}