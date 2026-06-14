/**
 * Router — Hash-based 轻量路由
 * 页面注册与懒加载切换
 */

// 页面 HTML 模板内联（实际项目可改为 fetch 加载）
const PAGES = {
  loading: `
    <div class="page-fullscreen flex-center flex-col" style="gap: var(--spacing-lg);">
      <div id="progress-ring" class="progress-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none"
            stroke="var(--border-subtle)" stroke-width="3" />
          <circle id="progress-circle" cx="40" cy="40" r="36" fill="none"
            stroke="var(--accent-gold)" stroke-width="3"
            stroke-linecap="round" stroke-dasharray="226.2"
            stroke-dashoffset="226.2" transform="rotate(-90 40 40)" />
        </svg>
        <span id="progress-text" class="data-label"
          style="position:absolute;color:var(--accent-gold);">0%</span>
      </div>
      <p class="text-muted" id="loading-text">正在初始化...</p>
    </div>
  `,
  zodiac: `
    <div class="page-fullscreen flex-col" id="zodiac-page">
      <div class="guo-fret-top"></div>
      <div class="guo-ink-bg"></div>

      <!-- 祥云纹 -->
      <div class="guo-cloud-tl"><svg viewBox="0 0 48 48"><path d="M12 24c0-6 4-10 10-10 4 0 7 2 9 5 2-1 4-2 7-2 5 0 9 4 9 9s-4 9-9 9H20c-4 0-8-4-8-11z" opacity="0.3"/><path d="M8 30c0-4 3-7 7-7 3 0 5 1 7 3 1-1 3-2 5-2 4 0 7 3 7 7s-3 7-7 7H16c-3 0-6-3-6-7z" opacity="0.15"/></svg></div>
      <div class="guo-cloud-tr"><svg viewBox="0 0 48 48"><path d="M12 24c0-6 4-10 10-10 4 0 7 2 9 5 2-1 4-2 7-2 5 0 9 4 9 9s-4 9-9 9H20c-4 0-8-4-8-11z" opacity="0.3"/><path d="M8 30c0-4 3-7 7-7 3 0 5 1 7 3 1-1 3-2 5-2 4 0 7 3 7 7s-3 7-7 7H16c-3 0-6-3-6-7z" opacity="0.15"/></svg></div>

      <!-- 场景动画 Canvas（覆盖层） -->
      <canvas id="scene-canvas" class="scene-overlay"></canvas>

      <!-- 状态栏 -->
      <header class="header-fixed" id="status-bar" style="z-index:60;">
        <span class="data-label" style="color:var(--muted-ink);font-size:11px;">
          所在·<span id="current-term-name">--</span>
          · 太阳黄经 <span id="current-longitude">--</span>
          · 距下个节气 <span id="days-until-next">--</span>
        </span>
      </header>

      <!-- 浮动迷你节气信息（当前选定节气，不遮挡黄道带） -->
      <div id="float-info" class="float-info-bar">
        <span class="float-info-term">--</span>
      </div>

      <!-- 诗词行（移动端占实际空间，桌面端隐藏） -->
      <div class="poem-row">
        <div id="poem-left" class="poem-container poem-left"></div>
        <div id="poem-right" class="poem-container poem-right"></div>
      </div>

      <canvas id="zodiac-canvas" style="flex:1;touch-action:none;position:relative;z-index:10;"></canvas>

      <footer class="footer-fixed" style="display:flex;align-items:center;justify-content:center;padding:var(--spacing-sm) var(--spacing-md);z-index:20;">
        <button id="btn-lab-entry" class="btn btn-ghost touch-target" style="font-size:13px;">⏄ 科学实验室</button>
      </footer>
    </div>
    <!-- 科普解释面板（移动端底部吸底显示） -->
    <div id="poem-explanation" class="poem-explanation"></div>
  `,
  detail: `
    <div class="page-fullscreen flex-col" id="detail-page">

      <!-- 国风头部 -->
      <header class="guo-detail-header">
        <button id="btn-back" class="guo-btn-back" aria-label="返回黄道带">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span>黄道</span>
        </button>
        <div class="guo-detail-title-group">
          <div id="detail-seal" class="guo-seal-small">节</div>
          <div class="guo-detail-title-text">
            <h1 id="detail-title" class="guo-detail-title"></h1>
            <span id="detail-longitude" class="guo-detail-lon"></span>
          </div>
        </div>
      </header>

      <!-- 主内容区 -->
      <div class="guo-detail-body" id="detail-body-scroll">
        <!-- 国风 Tab 栏 -->
        <div class="guo-tab-bar" id="tab-bar">
          <span class="guo-tab-item active" data-tab="science">
            <span class="guo-tab-deco"></span>
            科 学
            <span class="guo-tab-deco"></span>
          </span>
          <span class="guo-tab-item" data-tab="folk">
            <span class="guo-tab-deco"></span>
            民 俗
            <span class="guo-tab-deco"></span>
          </span>
        </div>
        <div id="detail-content" class="guo-detail-content"></div>
      </div>

      <!-- 底部返回按钮 -->
      <div class="guo-detail-footer" id="detail-footer-bar">
        <button id="btn-back-bottom" class="btn btn-ghost touch-target" style="font-size:12px;color:var(--accent-gold);">← 返回黄道</button>
      </div>
    </div>
  `,
  lab: `
    <div class="page-fullscreen flex-col" id="lab-page">
      <header class="header-fixed" style="display:flex;align-items:center;gap:var(--spacing-md);">
        <button id="btn-lab-back" class="touch-target data-label" style="color:var(--accent-gold);">← 返回</button>
        <h2 class="science-title" style="flex:1;color:var(--foreground-primary);">循时 · 科学实验室</h2>
      </header>
      <div class="hide-scrollbar" style="flex:1;overflow-y:auto;padding:80px var(--spacing-md) var(--spacing-md);">
        <!-- 圭表测影 -->
        <div class="card" style="margin-bottom:var(--spacing-lg);border-left:2px solid var(--accent-gold);">
          <h3 class="science-title" style="font-size:18px;margin-bottom:var(--spacing-sm);color:var(--accent-gold);">· 圭表测影</h3>
          <div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-md);">
            <div class="lab-data-card" style="flex:1;">
              <div class="lab-data-value" id="gnomon-shadow">8.00</div>
              <div class="lab-data-label">影长(尺)</div>
            </div>
            <div class="lab-data-card" style="flex:1;">
              <div class="lab-data-value" id="gnomon-angle-label" style="font-size:22px;">--</div>
              <div class="lab-data-label">太阳高度角</div>
            </div>
          </div>
          <canvas id="gnomon-canvas" style="width:100%;height:180px;margin-bottom:var(--spacing-md);border-radius:var(--radius-sm);"></canvas>
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);padding:0 var(--spacing-sm);">
            <span class="data-label" style="color:var(--muted-ink);font-size:9px;white-space:nowrap;">春分</span>
            <input type="range" id="date-slider" min="0" max="365" value="80"
              style="flex:1;">
            <span class="data-label" style="color:var(--muted-ink);font-size:9px;white-space:nowrap;">春分</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:var(--spacing-xs);">
            <span class="data-label" style="color:var(--accent-cyan);font-size:10px;" id="gnomon-date-label">日序: 80</span>
            <span class="data-label" style="color:var(--accent-gold);font-size:10px;" id="gnomon-lon-label">黄经: --</span>
          </div>
          <p class="body-science" style="margin-top:var(--spacing-md);font-size:13px;color:var(--muted-ink);line-height:1.6;" id="gnomon-description">
            拖动滑块改变日期，观察正午圭表影长变化。夏至影最短，冬至影最长。
          </p>
        </div>

        <!-- 日晷模拟 -->
        <div class="card" style="margin-bottom:var(--spacing-lg);border-left:2px solid var(--accent-gold);">
          <h3 class="science-title" style="font-size:18px;margin-bottom:var(--spacing-sm);color:var(--accent-gold);">· 日晷模拟</h3>
          <!-- 日晷数据卡片 -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-sm);margin-bottom:var(--spacing-md);">
            <div class="lab-data-card">
              <div class="lab-data-value" id="sundial-altitude" style="font-size:22px;">--</div>
              <div class="lab-data-label">太阳高度角</div>
            </div>
            <div class="lab-data-card">
              <div class="lab-data-value" id="sundial-declination" style="font-size:20px;">--</div>
              <div class="lab-data-label">太阳赤纬</div>
            </div>
            <div class="lab-data-card">
              <div class="lab-data-value" id="sundial-day-length" style="font-size:20px;">--</div>
              <div class="lab-data-label">昼长</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--spacing-sm);margin-bottom:var(--spacing-md);">
            <div class="lab-data-card">
              <div class="lab-data-value" id="sundial-direct-point" style="font-size:20px;">--</div>
              <div class="lab-data-label">太阳直射点</div>
            </div>
            <div class="lab-data-card">
              <div class="lab-data-value" id="sundial-daynight-ratio" style="font-size:20px;">--</div>
              <div class="lab-data-label">昼夜比</div>
            </div>
          </div>
          <canvas id="sundial-canvas" style="width:100%;height:200px;margin-bottom:var(--spacing-md);border-radius:var(--radius-sm);"></canvas>
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);">
            <span class="text-muted" style="font-size:13px;white-space:nowrap;color:var(--accent-gold);">选择节气</span>
            <div class="term-picker" id="sundial-term-picker" style="flex:1;">
              <button type="button" class="term-picker-btn" id="sundial-term-toggle" aria-haspopup="listbox" aria-expanded="false">
                <span class="term-picker-label" id="sundial-term-label">—</span>
                <span class="term-picker-arrow" aria-hidden="true">▾</span>
              </button>
              <div class="term-picker-panel" id="sundial-term-panel" role="listbox" hidden>
                <div class="term-picker-season" data-season="spring">
                  <span class="term-picker-season-label">春</span>
                  <div class="term-picker-grid" data-season-terms="spring"></div>
                </div>
                <div class="term-picker-season" data-season="summer">
                  <span class="term-picker-season-label">夏</span>
                  <div class="term-picker-grid" data-season-terms="summer"></div>
                </div>
                <div class="term-picker-season" data-season="autumn">
                  <span class="term-picker-season-label">秋</span>
                  <div class="term-picker-grid" data-season-terms="autumn"></div>
                </div>
                <div class="term-picker-season" data-season="winter">
                  <span class="term-picker-season-label">冬</span>
                  <div class="term-picker-grid" data-season-terms="winter"></div>
                </div>
              </div>
            </div>
          </div>
          <p class="body-science" style="margin-top:var(--spacing-md);font-size:13px;color:var(--muted-ink);line-height:1.6;">
            选择不同节气，观察日晷指针阴影随太阳高度角的变化。
          </p>
        </div>
      </div>
    </div>
  `
};

export class Router {
  constructor({ store }) {
    this._store = store;
    this._routes = new Map();
    this._currentPage = null;
    this._currentQuery = null;
    this._container = document.getElementById('app');

    window.addEventListener('hashchange', () => this._onHashChange());
  }

  register(name, loader) {
    this._routes.set(name, { loader, loaded: false, module: null });
  }

  async init(defaultHash) {
    // 等待 DOM 就绪后再初始化路由
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._init(defaultHash));
    } else {
      this._init(defaultHash);
    }
  }

  async _init(defaultHash) {
    location.hash = defaultHash;
    this._onHashChange();
  }

  async _onHashChange() {
    const rawHash = location.hash.replace('#', '') || 'loading';

    // 解析路由名和参数 — 使用 indexOf 避免 split 在 ? 处的歧义
    const qIdx = rawHash.indexOf('?');
    const hash = qIdx >= 0 ? rawHash.slice(0, qIdx) : rawHash;
    const queryString = qIdx >= 0 ? rawHash.slice(qIdx + 1) : '';

    // 路由身份 = 页面名 + 查询参数（防止相同页面不同参数不刷新）
    if (hash === this._currentPage && queryString === this._currentQuery) return;

    this._store.set('prevPage', this._currentPage);
    const prevPage = this._currentPage;
    this._currentPage = hash;
    this._currentQuery = queryString;

    const route = this._routes.get(hash);
    if (!route) {
      location.hash = '#loading';
      return;
    }

    // 加载页面模块
    if (!route.loaded) {
      const mod = await route.loader();
      route.module = mod;
      route.loaded = true;
    }

    // 渲染 HTML 模板
    const html = PAGES[hash] || '<div class="page-fullscreen flex-center"><p>404</p></div>';

    // 页面过渡动画
    const transitionType = this._getTransitionType(prevPage, hash);
    await this._transitionPage(html, transitionType);

    // 调用页面 logic (传递 URL 参数)
    if (route.module && route.module.mount) {
      await route.module.mount(this._store, queryString);
    }
  }

  /**
   * 根据页面切换方向确定过渡类型
   */
  _getTransitionType(prevPage, nextPage) {
    if (!prevPage) return null; // 首屏无过渡
    switch (`${prevPage}__${nextPage}`) {
      case 'loading__zodiac': return 'fade';
      case 'zodiac__detail':  return 'slide-up';
      case 'detail__zodiac':  return 'slide-down';
      default:                return 'fade';
    }
  }

  /**
   * 执行页面过渡动画（leave → 替换 → enter）
   */
  _transitionPage(html, type) {
    const container = this._container;
    const oldPage = container.querySelector('.page-fullscreen');

    if (!oldPage || !type) {
      container.innerHTML = html;
      return Promise.resolve();
    }

    const leaveMap = {
      'fade':       'fade-leave-active',
      'slide-up':   'slide-up-leave-active',
      'slide-down': 'slide-down-leave-active',
    };

    const enterMap = {
      'fade':       ['fade-enter', 'fade-enter-active'],
      'slide-up':   ['slide-up-enter', 'slide-up-enter-active'],
      'slide-down': ['slide-down-enter', 'slide-down-enter-active'],
    };

    return new Promise(async (resolve) => {
      // Step 1: Leave 动画（旧页面退出）
      const leaveClass = leaveMap[type];
      if (leaveClass) {
        oldPage.classList.add(leaveClass);
        await this._waitForTransition(oldPage);
      }

      // Step 2: 替换内容
      container.innerHTML = html;

      // Step 3: Enter 动画（新页面进入）
      const newPage = container.querySelector('.page-fullscreen');
      const [enterClass, enterActiveClass] = enterMap[type] || [];
      if (newPage && enterClass) {
        newPage.classList.add(enterClass);
        // 强制回流以触发初始样式
        void newPage.offsetHeight;
        newPage.classList.add(enterActiveClass);
        await this._waitForTransition(newPage);
        newPage.classList.remove(enterClass, enterActiveClass);
      }

      resolve();
    });
  }

  /**
   * 等待 CSS transition 完成（含超时兜底）
   */
  _waitForTransition(el) {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, 600);
      el.addEventListener('transitionend', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  navigate(hash) {
    location.hash = `#${hash}`;
  }
}
