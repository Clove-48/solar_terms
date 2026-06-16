/**
 * videoEmbed.js — 国风卷轴式视频嵌入组件（可复用）
 *
 * 从 detail 页面提取，支持：
 * - BV 号嵌入（自动播放/静音/循环/防缓存）
 * - 两种 BV：BV1WS4y1C7BD（日晷科普）、BV1D6f1BfEqT（圭表测影）
 *
 * 调用 createVideoEmbed({ container, bvid, title, source }) 即可在任意容器注入完整卷轴式视频。
 */

/**
 * 获取Bilibili嵌入URL
 * @param {string} bvid - 视频 BV 号
 * @param {string} [page] - 分P，默认1
 * @returns {string}
 */
export function getBiliUrl(bvid, page = 1) {
  const t = Date.now();
  return `https://player.bilibili.com/player.html?bvid=${bvid}&p=${page}&autoplay=0&loop=1&danmaku=0&no_related=1&playsinline=1&high_quality=1&t=${t}`;
}

/**
 * 获取节气象局科普视频URL
 * @param {number} termId
 */
export function getTermVideoUrl(termId) {
  return getBiliUrl('BV1iW411v7sr', termId);
}

/**
 * 预设的视频 BV 库
 */
export const VIDEO_BVIDS = {
  // 节气科普动画（中国气象局）
  solarTerms: 'BV1iW411v7sr',
  // 日晷科普
  sundial: 'BV1WS4y1C7BD',
  // 圭表测影
  gnomon: 'BV1D6f1BfEqT',
};

/**
 * 在指定容器中创建国风卷轴式视频
 * @param {Object} opts
 * @param {HTMLElement} opts.container - 父容器
 * @param {string} opts.bvid - B站视频BV号
 * @param {string} [opts.title] - 视频标题
 * @param {string} [opts.source] - 视频来源
 * @param {string} [opts.icon] - 标题图标（◆ ◇ ◈）
 * @param {number} [opts.page=1] - 分P
 * @returns {HTMLElement} 创建的视频容器元素
 */
export function createVideoEmbed(opts) {
  const {
    container,
    bvid,
    title = '科普视频',
    source = 'B站',
    icon = '◆',
    page = 1,
  } = opts;

  if (!container) return null;

  const wrap = document.createElement('div');
  wrap.className = 'guo-video-container guo-detail-enter';
  wrap.dataset.videoTerm = bvid;
  wrap.innerHTML = `
    <div class="guo-video-header">
      <span class="guo-video-label">${icon} ${title}</span>
      <div class="guo-video-header-actions">
        <span class="guo-video-source">${source}</span>
        <button class="guo-video-toggle" data-collapsed="false" aria-label="收起视频">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
      </div>
    </div>
    <div class="guo-video-body">
      <div class="guo-video-frame">
        <div class="guo-video-scroll guo-video-scroll-left">
          <div class="scroll-rod"></div>
        </div>
        <div class="guo-video-scroll guo-video-scroll-right">
          <div class="scroll-rod"></div>
        </div>
        <div class="guo-video-inner">
          <div class="guo-video-placeholder">点击展开视频…</div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrap);

  // 卷轴展开动画 + 注入iframe
  triggerScrollOpen(wrap, bvid, page);

  // 折叠/展开
  setupVideoToggle(wrap);

  // 滚动可见性暂停
  setupVideoObserver(wrap);

  return wrap;
}

/**
 * 触发卷轴展开动画
 */
function triggerScrollOpen(container, bvid, page) {
  setTimeout(() => {
    const frame = container.querySelector('.guo-video-frame');
    if (frame) frame.classList.add('scroll-opening');

    // 卷轴展开动画结束后注入iframe
    setTimeout(() => {
      const inner = container.querySelector('.guo-video-inner');
      if (inner) {
        inner.style.clipPath = 'none';
        inner.style.animation = 'none';
      }
      const placeholder = container.querySelector('.guo-video-placeholder');
      if (placeholder) {
        // 改为可点击加载（移动端友好：避免自动播放+预加载数据）
        placeholder.textContent = '点击播放视频';
        placeholder.style.cursor = 'pointer';
        placeholder.addEventListener('click', () => loadIframe(container, bvid, page), { once: true });
      }
    }, 1300);
  }, 100);
}

/**
 * 用户点击后再加载iframe（节省移动端流量）
 */
function loadIframe(container, bvid, page) {
  const inner = container.querySelector('.guo-video-inner');
  if (!inner) return;
  const placeholder = container.querySelector('.guo-video-placeholder');
  if (placeholder) placeholder.remove();

  // 已存在则不重复创建
  if (inner.querySelector('iframe')) return;

  const iframe = document.createElement('iframe');
  iframe.className = 'guo-video-embed';
  iframe.src = getBiliUrl(bvid, page);
  iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('title', '科普视频');
  iframe.style.touchAction = 'auto';
  inner.appendChild(iframe);
}

/**
 * 设置视频折叠/展开
 */
function setupVideoToggle(container) {
  const toggleBtn = container.querySelector('.guo-video-toggle');
  const videoBody = container.querySelector('.guo-video-body');
  if (!toggleBtn || !videoBody) return;

  toggleBtn.addEventListener('click', () => {
    const collapsed = videoBody.classList.toggle('collapsed');
    toggleBtn.dataset.collapsed = String(collapsed);
    toggleBtn.innerHTML = collapsed
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 15l-6-6-6 6"/></svg>`;
  });
}

/**
 * 滚动可见性观察：进入视口恢复 iframe 加载，离开视口 blank 掉以停止播放
 *
 * B站 iframe embed 不支持 postMessage 的 { type: 'play'/'pause' } 控制；
 * 改用 src 清空/恢复的方式：离开视口 src → "about:blank" 强制暂停，
 * 回到视口从 data-orig-src 恢复原始链接。
 */
function setupVideoObserver(container) {
  const videoContainer = container;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const targetIframe = entry.target.querySelector('.guo-video-embed');
      if (!targetIframe) return;

      if (entry.isIntersecting) {
        // 回到视口 → 从 data-orig-src 恢复
        const origSrc = targetIframe.dataset.origSrc;
        if (origSrc && targetIframe.src !== origSrc) {
          try { targetIframe.src = origSrc; } catch (_) {}
        }
      } else {
        // 离开视口 → blank 掉，记录原始 src
        const current = targetIframe.src;
        if (current && !current.startsWith('about:')) {
          try {
            targetIframe.dataset.origSrc = current;
            targetIframe.src = 'about:blank';
          } catch (_) {}
        }
      }
    });
  }, { threshold: 0.2 });
  observer.observe(videoContainer);
  videoContainer._videoObserver = observer;
}