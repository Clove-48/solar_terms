/**
 * detail 页面逻辑 — 节气详情页（国风版·增强科普）
 * 科学/民俗双标签切换 + 黄道位置可视化
 */

import { initFallbackSystem } from '../../interaction/fallbackSystem.js';

let _fallbackCleanup = null;

export async function mount(store, queryString = '') {
  const terms = store.get('solarTerms') || window.__solarTerms || [];

  const params = new URLSearchParams(queryString || '');
  let termId = null;

  // 兼容多种参数名：id（详情页内部跳转）、term（交互系统传入）
  const idParam = params.get('id') ?? params.get('term');
  if (idParam !== null) {
    termId = Number(idParam);
    if (isNaN(termId)) termId = null;
  }

  if (termId === null || isNaN(termId)) {
    termId = store.get('currentTermId') || 1;
  }

  const term = terms.find(t => t.id === termId) || terms[0];
  if (!term) return;

  const sealEl = document.getElementById('detail-seal');
  if (sealEl) {
    sealEl.textContent = term.name ? term.name.charAt(0) : '节';
  }

  const titleEl = document.getElementById('detail-title');
  const lonEl = document.getElementById('detail-longitude');
  if (titleEl) titleEl.textContent = term.name;
  if (lonEl) lonEl.textContent = `黄经 ${term.solarLongitude}°`;

  store.set('currentTermId', term.id);

  const detailPage = document.getElementById('detail-page');
  if (detailPage) {
    detailPage.classList.add('science-mode');
    detailPage.classList.remove('folk-mode');
  }

  // 渲染增强科普内容
  renderRichScience(term, terms);

  // Tab 切换
  document.querySelectorAll('.guo-tab-item').forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
  });

  document.querySelectorAll('.guo-tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.guo-tab-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.tab;
      if (detailPage) {
        detailPage.classList.remove('science-mode', 'folk-mode');
        detailPage.classList.add(mode === 'science' ? 'science-mode' : 'folk-mode');
      }
      if (mode === 'science') {
        renderRichScience(term, terms);
      } else {
        renderRichFolk(term, terms);
      }
    });
  });

  document.getElementById('btn-back')?.addEventListener('click', navigateBack);
  document.getElementById('btn-back-bottom')?.addEventListener('click', navigateBack);

  addNavigation(term, terms, store);

  // 初始化交互辅助系统（前后翻页、日期选择器）
  _fallbackCleanup = initFallbackSystem(store, terms, 'detail');
}

/** 渲染增强科学科普内容 */
function renderRichScience(term, allTerms) {
  const container = document.getElementById('detail-content');
  if (!container) return;

  const s = term.science;
  const currentIdx = allTerms.findIndex(t => t.id === term.id);

  // 计算四季节气跨度
  const seasonName = getSeasonName(term.id);
  const seasonEmoji = getSeasonEmoji(term.id);

  // 黄道位置指示
  const startAngle = -140;
  const spanAngle = 160;
  const posRatio = (term.solarLongitude % 360) / 360;
  const posAngle = startAngle + posRatio * spanAngle;

  container.innerHTML = `
    <!-- 黄道位置可视化 -->
    <div class="guo-detail-visual guo-detail-enter">
      <div class="guo-visual-inner" style="width:100%;">
        <span class="guo-visual-label" style="margin-bottom:6px;">太 阳 黄 经 位 置</span>
        <div class="zodiac-pos-track">
          <div class="zodiac-pos-arc">
            <div class="zodiac-pos-dot" style="left:${50 + 40 * Math.sin(posAngle * Math.PI / 180)}%;top:${50 - 40 * Math.cos(posAngle * Math.PI / 180)}%;"></div>
          </div>
          <div class="zodiac-pos-value">
            <span class="zodiac-pos-degree">${term.solarLongitude}°</span>
            <span class="zodiac-pos-label">${term.name}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 节气涵义科普视频（可折叠，滚动暂停/恢复） -->
    <div class="guo-video-container guo-detail-enter" data-video-term="${term.id}">
      <div class="guo-video-header">
        <span class="guo-video-label">◆ 节气涵义 · 科普动画</span>
        <div class="guo-video-header-actions">
          <span class="guo-video-source">中国气象局出品</span>
          <button class="guo-video-toggle" data-collapsed="false" aria-label="收起视频">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
        </div>
      </div>
      <div class="guo-video-body">
        <!-- 国风卷轴式视频外框 -->
        <div class="guo-video-frame">
          <!-- 卷轴轴杆 - 左（展开前覆盖在中间） -->
          <div class="guo-video-scroll guo-video-scroll-left">
            <div class="scroll-rod"></div>
          </div>
          <!-- 卷轴轴杆 - 右（展开前覆盖在中间） -->
          <div class="guo-video-scroll guo-video-scroll-right">
            <div class="scroll-rod"></div>
          </div>
          <!-- 视频区域 - 从中间向两侧裁剪展开，iframe 在卷轴展开后注入 -->
          <div class="guo-video-inner">
            <div class="guo-video-placeholder">加载中…</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 核心科学数据 -->
    <div class="guo-data-grid">
      <div class="guo-data-card">
        <div class="guo-data-card-label">太阳赤纬</div>
        <div class="guo-data-card-value">${s.sunDeclination}</div>
      </div>
      <div class="guo-data-card">
        <div class="guo-data-card-label">昼 长</div>
        <div class="guo-data-card-value">${s.dayLength}</div>
      </div>
      <div class="guo-data-card">
        <div class="guo-data-card-label">直射纬度</div>
        <div class="guo-data-card-value">${s.directPoint}</div>
      </div>
      <div class="guo-data-card">
        <div class="guo-data-card-label">圭表影长</div>
        <div class="guo-data-card-value">${s.shadowLength}</div>
      </div>
    </div>

    <!-- 季节特征 -->
    <div class="guo-science-card">
      <div class="guo-science-title">季节特征 · ${seasonName}</div>
      <p class="guo-science-text">${getSeasonDescription(term.id)}</p>
    </div>

    <!-- 科学深度解说 -->
    <div class="guo-science-card" style="margin-top:var(--spacing-sm);">
      <div class="guo-science-title">天文科学解说</div>
      <p class="guo-science-text">${s.description}</p>
    </div>

    <!-- 天文数据对比 -->
    <div class="guo-science-card" style="margin-top:var(--spacing-sm);border-left-color:var(--accent-gold);">
      <div class="guo-science-title">黄道科普</div>
      <p class="guo-science-text">${getZodiacKnowledge(term.id)}</p>
    </div>
  `;

  // 应用进入动画
  setTimeout(() => {
    container.querySelectorAll('.guo-data-card, .guo-science-card, .guo-detail-visual, .guo-video-container').forEach((el, i) => {
      el.style.animation = `guoDetailEnter 0.4s var(--ease-out) ${i * 0.06}s forwards`;
      el.style.opacity = '0';
    });
  }, 50);

  // 设置视频折叠/展开
  setupVideoToggle(container);

  // 设置滚动可见性暂停/恢复
  setupVideoObserver(container);

  // 触发卷轴展开动画
  triggerScrollOpen(container);
}

/** 渲染增强民俗内容 */
function renderRichFolk(term, allTerms) {
  const container = document.getElementById('detail-content');
  if (!container) return;

  const f = term.folk;
  const bc = getBaikeCustoms(term.id);

  // 构建百科习俗详情列表
  let customsDetailHtml = '';
  if (bc && bc.customs && bc.customs.length > 0) {
    customsDetailHtml = bc.customs.map(c => `
      <div class="guo-baike-item">
        <div class="guo-baike-item-title">◈ ${c.title}</div>
        <p class="guo-baike-item-desc">${c.desc}</p>
      </div>
    `).join('');
  }

  // 构建特色饮食列表
  let foodsHtml = '';
  if (bc && bc.foods && bc.foods.length > 0) {
    foodsHtml = `
      <div class="guo-folk-scroll">
        <div class="guo-folk-label">时令饮食</div>
        <div class="guo-baike-tags">
          ${bc.foods.map(fd => `<span class="guo-baike-tag">${fd}</span>`).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="guo-folk-scroll guo-detail-enter">
      <div class="guo-folk-label">物候现象</div>
      <p class="guo-folk-text">${f.phenomena}</p>
      <div style="margin-top:var(--spacing-sm);font-size:11px;color:var(--muted-ink);font-family:var(--font-sans);line-height:1.6;opacity:0.7;">
        <em>古人通过观察自然界的动植物变化来判定节气，称为"物候"。</em>
      </div>
    </div>
    <div class="guo-folk-scroll">
      <div class="guo-folk-label">农事活动</div>
      <p class="guo-folk-text">${f.agriculture}</p>
      <div style="margin-top:var(--spacing-sm);font-size:11px;color:var(--muted-ink);font-family:var(--font-sans);line-height:1.6;opacity:0.7;">
        <em>二十四节气起源于黄河流域，是指导农业生产的重要历法补充。</em>
      </div>
    </div>
    <div class="guo-folk-scroll">
      <div class="guo-folk-label">传统习俗</div>
      <p class="guo-folk-text">${f.customs}</p>
    </div>
    ${bc && bc.customs ? `
    <div class="guo-folk-scroll">
      <div class="guo-folk-label">习俗详解 · 百度百科</div>
      ${customsDetailHtml}
    </div>` : ''}
    ${foodsHtml}
    <div class="guo-folk-scroll" style="margin-bottom:0;">
      <div class="guo-folk-label">民俗文化解说</div>
      <p class="guo-folk-text">${f.description}</p>
    </div>
    <div class="guo-science-card" style="margin-top:var(--spacing-md);border-left-color:var(--accent-gold);background:linear-gradient(135deg,rgba(212,165,116,0.12) 0%,rgba(212,165,116,0.04) 100%);">
      <div class="guo-science-title" style="color:var(--accent-gold);">节气养生</div>
      <p class="guo-science-text">${getHealthTip(term.id)}</p>
    </div>
  `;
}

/** 获取季节名 */
function getSeasonName(id) {
  if (id >= 1 && id <= 6) return '春 季';
  if (id >= 7 && id <= 12) return '夏 季';
  if (id >= 13 && id <= 18) return '秋 季';
  return '冬 季';
}

function getSeasonEmoji(id) {
  if (id >= 1 && id <= 6) return '🌱';
  if (id >= 7 && id <= 12) return '☀️';
  if (id >= 13 && id <= 18) return '🍂';
  return '❄️';
}

function getSeasonDescription(id) {
  const descs = {
    1: '东风解冻，万物复苏。太阳直射点开始北移，北半球逐渐回暖。',
    2: '降水增多，草木萌动。春雨贵如油，是农作物生长的关键期。',
    3: '春雷乍动，惊醒冬眠动物。气温回升，春耕全面展开。',
    4: '昼夜等长，太阳直射赤道。古时以立春至立夏为春，春分平分春季。',
    5: '气清景明，万物生长。既是自然节气，也是传统祭祖节日。',
    6: '雨生百谷，春将尽。降水增多利于谷物生长。',
    7: '夏季开始，气温升高。蝼蛄鸣叫，蚯蚓出土。',
    8: '麦类灌浆，籽粒渐满。蕴含"满而不溢"的中庸哲学。',
    9: '有芒作物成熟，农事最忙。"芒种"谐音"忙种"。',
    10: '白昼最长，太阳直射北回归线。阳气至极，阴气始生。',
    11: '小热，天气渐热但未到最热。江淮梅雨即将结束。',
    12: '一年中最热时期。高温高湿利于作物生长。',
    13: '秋季开始，暑气渐消。万物从繁茂走向成熟。',
    14: '出暑，暑气消退。秋高气爽，收获季节。',
    15: '天气转凉，露水凝结。秋意渐浓，鸿雁南飞。',
    16: '再次昼夜等长。北半球昼渐短夜渐长。',
    17: '露水更冷，深秋景象。重阳登高赏菊。',
    18: '气肃而凝，露结为霜。秋季最后一个节气。',
    19: '冬季开始，万物收藏。河水开始结冰。',
    20: '降雪开始，雪量不大。小雪雪满天，来年必丰年。',
    21: '降雪增大，积雪保墒。北方进入寒冬。',
    22: '白昼最短，阴极阳生。冬至大如年，团圆之日。',
    23: '一年中最冷时段之一。小寒胜大寒。',
    24: '寒冷至极，阳气已动。二十四节气之终，周而复始。',
  };
  return descs[id] || '';
}

function getZodiacKnowledge(id) {
  const knowledge = {
    1: '立春是二十四节气之首，"立"即开始之意。古人将黄道划分为24等份，每份15°，太阳每运行15°便进入下一个节气。立春时太阳黄经为315°。',
    2: '雨水节气标志着降雨开始增多。古人云"春雨贵如油"，此时太阳直射点已从南回归线向北移动至南纬11.5°，北半球日照时间逐渐增长。',
    3: '惊蛰原名"启蛰"，因避汉景帝刘启讳改。春雷乍动，惊醒了冬眠的昆虫。此时太阳直射南纬5.9°，北半球昼长已达11小时以上。',
    4: '春分日太阳直射赤道，全球昼夜等长。在黄道坐标系中，春分点被定义为黄经0°，是整个节气系统的起算点。',
    5: '清明既是节气也是节日。此时太阳黄经15°，气清景明。古人以"桐始华、田鼠化为鴽、虹始见"描述此时期物候。',
    6: '谷雨是春季最后一个节气，"雨生百谷"。此时太阳直射北纬11.5°，北半球昼长13小时以上，气温上升加快。',
    7: '立夏标志着夏季开始。太阳黄经45°，直射北纬16.3°。古人观察到"蝼蝈鸣、蚯蚓出、王瓜生"的物候变化。',
    8: '小满指麦类籽粒开始饱满。"四月中，小满者，物致于此小得盈满"，蕴含中国传统"满而不溢"的哲学思想。',
    9: '芒种又称"忙种"，是农事最繁忙的时节。太阳黄经75°，直射北纬22.6°，接近北回归线。',
    10: '夏至日太阳直射北回归线（北纬23.4°），北半球白昼最长。"至"即极至，阳气最盛，但盛极必衰，此后白昼渐短。',
    11: '小暑意为"小热"，江淮流域梅雨即将结束。太阳直射点开始南移，但气温仍将持续上升。',
    12: '大暑是一年中最热的时期。太阳黄经120°，虽直射点已南移，但地面热量积累达到峰值。',
    13: '立秋标志着秋季开始。虽暑气未消，但阳气渐收，阴气渐长，万物从繁茂走向成熟。',
    14: '处暑即"出暑"，暑气消退。太阳黄经150°，直射北纬11.5°，北半球昼长13小时，秋高气爽。',
    15: '白露时节昼夜温差加大，水汽凝结成露。"露凝而白"，秋意渐浓。太阳直射点已至北纬5.9°。',
    16: '秋分日太阳再次直射赤道，全球昼夜等长。此后北半球白昼继续缩短，黑夜加长。',
    17: '寒露时露水更冷，北方已呈深秋景象。太阳黄经195°，直射南纬5.9°。',
    18: '霜降是秋季最后一个节气，气肃而凝，露结为霜。太阳直射南纬11.5°，气温继续下降。',
    19: '立冬标志着冬季开始。太阳黄经225°，直射南纬16.3°，北半球昼长仅10小时29分。',
    20: '小雪时气温下降，开始降雪。太阳直射南纬20.2°，昼长10小时5分。农谚"小雪雪满天，来年必丰年"。',
    21: '大雪节气降雪量增大。太阳黄经255°，直射南纬22.6°，北半球进入深冬。',
    22: '冬至日太阳直射南回归线（南纬23.4°），北半球白昼最短、黑夜最长。阴极阳生，古人视冬至为新一年的开始。',
    23: '小寒是一年中最冷时段之一。太阳直射南纬22.6°，虽已开始北移，但热量仍在散失。',
    24: '大寒是二十四节气之终。"大寒到顶点，日后天渐暖"，寒冷至极但阳气已开始萌动，周而复始。',
  };
  return knowledge[id] || '二十四节气是古人通过观察太阳周年运动，认知一年中时令、气候、物候变化规律所形成的知识体系。';
}

function getHealthTip(id) {
  const tips = {
    1: '立春宜养肝，适当运动，多吃辛甘发散之品（如韭菜、香菜、豆芽），少食酸收之味。',
    2: '雨水时节湿气重，宜健脾祛湿。可食薏米、山药、茯苓，注意春捂保暖。',
    3: '惊蛰后气温波动大，易感冒。宜食梨润肺，多吃清淡蔬菜，适量运动增强免疫力。',
    4: '春分宜调和阴阳，保持作息规律。适合吃时令蔬菜如春笋、菠菜、韭菜。',
    5: '清明踏青正当时，宜舒缓情绪。可食青团（艾草糯米），适量摄入维生素。',
    6: '谷雨后湿气加重，宜健脾祛湿。可食赤小豆、薏米，忌油腻生冷。',
    7: '立夏后心火渐旺，宜养心安神。可食莲子、百合、绿豆，注意午休。',
    8: '小满时节湿热交加，宜清热利湿。可吃苦菜、冬瓜、黄瓜，忌辛辣厚味。',
    9: '芒种时节炎热多雨，宜清补。可食薏米、绿豆、荷叶粥，多喝水。',
    10: '夏至宜养阴，多吃酸味以固表。可食番茄、柠檬、鸭肉，忌过度贪凉。',
    11: '小暑宜清热解暑。可食莲藕、西瓜、冬瓜，注意防暑降温。',
    12: '大暑是一年中最热，宜清补。可食羊肉（伏羊）、姜茶，冬病夏治好时机。',
    13: '立秋宜润肺防燥。可食银耳、梨、蜂蜜，少食辛辣。',
    14: '处暑后秋燥渐显，宜滋阴润燥。可食百合、银耳、山药，多喝水。',
    15: '白露后早晚温差大，宜护肠胃。可食红薯、板栗、桂圆，注意保暖。',
    16: '秋分宜平和饮食，润肺养胃。可食芝麻、糯米、蜂蜜，保持作息规律。',
    17: '寒露气温骤降，宜温补。可食羊肉、核桃、红枣，注意足部保暖。',
    18: '霜降宜进补，健脾养胃。可食牛肉、鸡肉、山药，适量运动。',
    19: '立冬宜补肾藏精。可食羊肉、黑芝麻、核桃，注意早睡晚起。',
    20: '小雪宜温补，多吃高热量食物。可食牛肉、羊肉、腰果，注意保暖。',
    21: '大雪宜温补养肾。可食羊肉、韭菜、核桃，忌寒凉生冷。',
    22: '冬至宜进补，阴极阳生。北方吃饺子，南方吃汤圆，温补为宜。',
    23: '小寒宜温补，防寒保暖。可食羊肉、姜枣茶、桂圆，避免熬夜。',
    24: '大寒宜温补养阳，为春季做准备。可食糯米、红枣、桂圆，注意休息。',
  };
  return tips[id] || '节气养生讲究"天人相应"，顺应自然变化调整饮食起居。';
}

/**
 * 触发卷轴展开动画
 * 1. 卷轴轴杆从中间向两侧移开
 * 2. 视频区域从中间裁剪展开
 * 3. 动画结束后才注入 iframe，避免 B 站 player 缓存污染导致的封面错乱
 */
function triggerScrollOpen(container) {
  const frame = container.querySelector('.guo-video-frame');
  if (!frame) return;

  // 延迟触发，让DOM渲染完成
  setTimeout(() => {
    frame.classList.add('scroll-opening');

    // 动画1.2s结束后：移除clip-path + 注入对应节气的iframe
    setTimeout(() => {
      const inner = frame.querySelector('.guo-video-inner');
      if (inner) {
        inner.style.clipPath = 'none';
        inner.style.animation = 'none';
      }
      const placeholder = frame.querySelector('.guo-video-placeholder');
      if (placeholder) placeholder.remove();

      const termId = Number(container.querySelector('.guo-video-container')?.dataset.videoTerm) || 1;
      const iframe = document.createElement('iframe');
      iframe.className = 'guo-video-embed';
      iframe.src = getVideoUrl(termId);
      iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'eager');
      iframe.setAttribute('title', '节气科普');
      iframe.style.touchAction = 'auto';
      if (inner) inner.appendChild(iframe);
    }, 1300);
  }, 100);
}

/**
 * 设置视频折叠/展开功能
 * 视频默认完全展开，用户可点击折叠按钮收起以节省空间
 */
function setupVideoToggle(container) {
  const toggleBtn = container.querySelector('.guo-video-toggle');
  const videoBody = container.querySelector('.guo-video-body');
  if (!toggleBtn || !videoBody) return;

  toggleBtn.addEventListener('click', () => {
    const collapsed = videoBody.classList.toggle('collapsed');
    toggleBtn.dataset.collapsed = collapsed;
    toggleBtn.innerHTML = collapsed
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 15l-6-6-6 6"/></svg>`;
  });
}

/**
 * 设置视频滚动可见性暂停/恢复
 * 视频划出视口自动暂停，划回自动恢复播放
 */
function setupVideoObserver(container) {
  const videoContainer = container.querySelector('.guo-video-container');
  const iframe = container.querySelector('.guo-video-embed');
  if (!videoContainer || !iframe) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const targetIframe = entry.target.querySelector('.guo-video-embed');
      if (!targetIframe || !targetIframe.src) return;
      try {
        if (entry.isIntersecting) {
          // 进入视口 → 恢复播放
          targetIframe.contentWindow.postMessage({ type: 'play' }, '*');
        } else {
          // 离开视口 → 暂停
          targetIframe.contentWindow.postMessage({ type: 'pause' }, '*');
        }
      } catch (e) {
        // 跨域通信错误静默忽略
      }
    });
  }, { threshold: 0.3 });

  observer.observe(videoContainer);
  // 存储 observer 引用以便 unmount 时清理
  container._videoObserver = observer;
}

/**
 * 获取Bilibili节气科普视频嵌入URL
 * 使用中国气象局《二十四节气系列创意动画》(BV1iW411v7sr)
 * 共24集，p=term.id 一一对应（B站官方API使用 p 而非 page）
 * t=时间戳 防B站iframe缓存
 * autoplay=1 自动播放
 */
function getVideoUrl(termId) {
  const bvid = 'BV1iW411v7sr';
  const t = Date.now();
  return `https://player.bilibili.com/player.html?bvid=${bvid}&p=${termId}&autoplay=1&loop=1&danmaku=0&no_related=1&playsinline=1&high_quality=1&t=${t}`;
}

/**
 * 百度百科节气习俗详情数据
 * 从 https://baike.baidu.com/item/二十四节气/191597 整理
 */
function getBaikeCustoms(termId) {
  const data = {
    1: {
      customs: [
        { title: '迎春', desc: '迎春是立春的重要活动，须事先做好准备，进行预演，俗称"演春"，目的是把春天和句芒神接回来。句芒为古代民间神话中的春神，即草木神，也是主宰生命生长之神。' },
        { title: '鞭春牛', desc: '又称打土牛、打春、鞭春，是汉族和白族立春的主要习俗。古代立春时举行鞭春之礼，既是鼓励农耕，也承载着人们对五谷丰登的美好期盼。《燕京岁时记》记载："立春先一日，顺天府官员，在东直门外一里春场迎春。立春日，礼部呈进春山宝座，顺天府呈进春牛图，礼毕回署，引春牛而击之，曰打春。"' },
        { title: '咬春', desc: '咬春是指立春日吃春盘、吃春饼、吃春卷、嚼萝卜之俗，一个"咬"字，道出节令的众多食俗。用蔬菜和饼等装盘，馈送亲友或自食，称为春盘。老北京讲究将春饼卷成筒状，从头吃到尾，意在"有头有尾"。' },
        { title: '戴春鸡', desc: '戴春鸡是陕西铜川一带的古老风俗。每年立春日，母亲用布制作一个约3厘米长的公鸡，缝在小孩帽子的顶端，表示祝愿"春吉（鸡）"。' },
        { title: '佩燕子', desc: '佩燕子是关中一带的习俗。燕子是候鸟，是春的使者，也是幸福吉利的象征。每年立春日，人们喜欢在胸前佩戴用彩绸剪成的燕子，特别是儿童，戴在胸前，燕子翻飞、兴高采烈。' },
      ],
      foods: ['春饼', '春卷', '萝卜', '五辛盘'],
    },
    2: {
      customs: [
        { title: '回娘家', desc: '"雨水节，回娘家"是流行于川西一带的汉族节日习俗。到了雨水节气，出嫁的女儿纷纷带上礼物回娘家拜望父母。生育了子女的妇女，须带上罐罐肉、藤椅等礼物，回家感谢父母的养育之恩。' },
        { title: '接寿', desc: '雨水节上，女婿送节的礼品通常是一丈二尺长的红棉带，称为"接寿"，祈求岳父母长命百岁。女儿炖好猪脚、鸡汤，用红纸、红绳封了罐口，由女婿给岳父母送去，表示感恩。' },
        { title: '拉保保', desc: '"拉保保"是四川一些地区的习俗。旧时人们为儿女求神问卦，看自己的儿女好不好养，一定要拜个干爹，即"保保"。此举年复一年，传承至今，取雨露滋润、保护生长之意。' },
      ],
      foods: ['罐罐肉', '红枣粥', '山药'],
    },
    3: {
      customs: [
        { title: '祭白虎', desc: '根据民间传说，白虎是口舌、是非之神，每年都会在这天出来觅食，开口噬人，犯白虎会导致百般不顺。人们为了自保，便在惊蛰之时祭白虎。拜祭用纸绘制的老虎，虎口画有一对獠牙，用猪血猪肉祭之。' },
        { title: '蒙鼓皮', desc: '根据《周礼》卷四十《挥人》篇所记："凡冒鼓必以启蛰之日"。惊蛰是由雷声引起的。古人想象雷神是位长了翅膀鸟嘴人身的大神，一手持捶，一手连击环绕周身的多面天鼓，发出隆隆的雷声。惊蛰这天，天庭里雷神击天鼓，人间也利用这个时机来蒙鼓皮。' },
        { title: '吃梨', desc: '民间惊蛰吃梨的习俗由来已久。"梨"与"离"谐音，有不忘先祖、离家创业的意思；或说吃梨寓意虫害远离庄稼，保障全年好收成。从节气养生来看，此时气候干燥，生梨性寒味甘，有润肺止咳、滋阴清热的功效。' },
        { title: '吃炒虫', desc: '惊蛰雷动，百虫"惊而出走"。江西上犹、崇义以及吉安遂川客家，惊蛰日上午，农家将谷种、豆种等取一小撮放入锅中干炒，谓之"炒虫"，炒熟后分给小孩食之，据说可保五谷丰收，不受虫害。' },
      ],
      foods: ['梨', '炒豆', '芋子'],
    },
    4: {
      customs: [
        { title: '竖蛋', desc: '俗话说"春分到，蛋儿俏"。"竖蛋"的做法是：选择一只新鲜鸡蛋，在桌子上竖起来。这项游戏般的古老习俗，正是人们对春天来临的一种庆祝。' },
        { title: '祭日', desc: '春分也是节日和祭祀庆典的日子。古代帝王有春分祭日，秋分祭月的仪式，历代相传。古代帝王的祭日场所多设在京郊，北京的日坛是明、清两代皇帝祭祀太阳的地方。' },
        { title: '送春牛', desc: '春分时节民间有挨家送春牛图的习俗。"春牛图"是把二开红纸或黄纸印上全年农历节气及农夫耕田图样。送图者都是些能言善唱者，主要说些春耕不违农时的吉祥话，俗称"说春"。' },
        { title: '粘雀子嘴', desc: '春分之日农民按习俗放假，每家都要吃汤元，还要煮好不用包心的汤元，用细竹叉扦着放到田间地坎，名曰粘雀子嘴，意在避免鸟类破坏庄稼。' },
      ],
      foods: ['春菜', '汤圆', '春笋', '菠菜'],
    },
    5: {
      customs: [
        { title: '扫墓祭祖', desc: '清明节是纪念祖先的节日。唐代之前，寒食与清明是两个前后相继但主题不同的节日，前者怀旧悼亡，后者求新护生。唐玄宗时，朝廷以政令的形式将民间扫墓的风俗固定在清明节前的寒食节，由于寒食与清明在时间上紧密相连，扫墓也由寒食顺延到了清明。' },
        { title: '踏青', desc: '踏青古时叫探春、寻春等，即春游之意。清明时节，春回大地，万物萌生，正是郊游的大好时光，中国民间长期保持着清明踏青的习惯。' },
        { title: '放风筝', desc: '每逢清明时节，人们不仅白天放风筝，夜间也放。夜里放的风筝挂着彩色的小灯笼，如同星光闪烁，被称为"神灯"。过去，有的人把风筝放上天空后，剪断牵线，任凭清风送往天涯海角，意在除病消灾。' },
        { title: '植树插柳', desc: '清明植树最早源于清明戴柳、插柳。柳在中国人心中有辟邪保平安的功用。清明时节是柳树发芽抽枝之际，柳树的生命力非常顽强，正所谓"无心插柳柳成荫"，后来逐渐形成了清明植树的习俗。' },
      ],
      foods: ['青团', '艾草糯米', '清明螺'],
    },
    6: {
      customs: [
        { title: '喝谷雨茶', desc: '南方有谷雨摘茶的习俗。谷雨茶也就是雨前茶，是谷雨时节采制的春茶。传说谷雨这天的茶喝了会清火、辟邪、明目。谷雨茶除了嫩芽外，还有一芽一嫩叶的"旗枪"或一芽两嫩叶的"雀舌"。' },
        { title: '食香椿', desc: '谷雨前后香椿上市，北方有谷雨食香椿的习俗。这时的香椿醇香爽口，营养价值高，有"雨前香椿嫩如丝"之说。香椿具有提高机体免疫力、健胃、理气、止泻等功效。' },
        { title: '祭仓颉', desc: '"谷雨祭仓颉"，是自汉代以来流传千年的民间传统。传说仓颉造字后"天雨谷，鬼夜哭"，于是把仓颉造字这天叫做谷雨。陕西渭南白水县至今流传着谷雨祭祀文祖仓颉的习俗。' },
        { title: '禁蝎', desc: '清代民间已有"谷雨帖"灭毒蝎的习俗。山西临汾一带，谷雨这天画张天师符贴在门上，名曰"禁蝎"。禁蝎习俗反映了人们驱除害虫，渴望丰收、平安的美好愿望。' },
      ],
      foods: ['谷雨茶', '香椿', '乌米饭'],
    },
    7: {
      customs: [
        { title: '迎夏仪式', desc: '立夏日，帝王要率文武百官到京城南郊举行迎夏仪式。明代《帝京景物略》记载，"立夏日启冰，赐文武大臣"，朝廷掌管冰政的官员挖出冬天窖存的冰块，由皇帝赏赐给官员。' },
        { title: '立夏吃蛋', desc: '俗话说："立夏吃了蛋，热天不疰夏。"从立夏起，天气渐渐炎热，许多人会感觉乏力、食欲减退，即所谓"疰夏"。每年立夏时，很多地方都有吃"立夏蛋"的习俗。' },
        { title: '斗蛋游戏', desc: '立夏日，大人用丝线编成蛋套，装入煮熟的鸡蛋、鸭蛋，挂在小孩脖子上供他们相互比试，称为斗蛋。蛋头胜者为第一，蛋称大王；蛋尾胜者为第二，蛋称小王。' },
        { title: '立夏称人', desc: '南方民间流传着立夏秤人的习俗。中午吃过立夏饭，人们挂起一杆大木秤，秤钩悬凳子或竹筐，轮流坐到上面秤人，主要称老人和小孩，反映了人们祈求夏日清静安乐的美好愿望。' },
      ],
      foods: ['立夏蛋', '青梅', '樱桃', '鲥鱼'],
    },
    8: {
      customs: [
        { title: '祭车神', desc: '江南地区有农谚："小满动三车"，"三车"指的是油车、丝车、水车。相传"车神"为白龙，小满时节人们在水车车基上放置鱼肉、香烛等物品祭拜，祭品中会有一杯白水，祭拜时将白水泼入田中，有祈愿水源涌旺的意思。' },
        { title: '祈蚕节', desc: '相传小满是蚕神诞辰，江浙一带的人们为了祈求养蚕有个好收成，会在小满节气期间举行"祈蚕节"。蚕是娇养的生物，很难养活，古时人们把蚕视作"天物"。' },
        { title: '食苦菜', desc: '"春风吹，苦菜长，荒滩野地是粮仓。"苦菜是中国人最早食用的野菜之一。小满虽然寓意丰收的到来，但在过去其时节恰是青黄不接之时，因此很多百姓不得不用苦菜充饥。' },
      ],
      foods: ['苦菜', '苦瓜', '枇杷'],
    },
    9: {
      customs: [
        { title: '送花神', desc: '芒种节气百花开始凋零，民间多在芒种这天举行祭祀花神仪式，饯送花神归位，同时表达对花神的感激之情，盼望来年再会。《红楼梦》第二十七回中描述了芒种送花神的场景。' },
        { title: '安苗', desc: '安苗是皖南的农事习俗，始于明初。每到芒种时节，种完水稻，为祈求秋天有个好收成，各地都要举行安苗祭祀活动。家家户户用新麦面蒸发包，捏成五谷六畜、瓜果蔬菜等形状作为供品。' },
        { title: '打泥巴仗', desc: '贵州东南部一带的侗族青年男女，每年芒种前后都要举办打泥巴仗节。新婚夫妇由要好的男女青年陪同，集体插秧，边插秧边打闹，互扔泥巴。身上泥巴最多的，就是最受欢迎的人。' },
        { title: '煮梅', desc: '在南方，每年五、六月是梅子成熟的季节。如果直接吃，梅子的酸很少有人不怕。于是古人就发明了各种煮梅的方法。青梅含有多种天然优质有机酸和丰富的矿物质。' },
      ],
      foods: ['青梅', '煮梅酒', '杨梅'],
    },
    10: {
      customs: [
        { title: '过水面', desc: '俗话说"冬至饺子夏至面"，北京人在夏至这天讲究吃面。山东各地普遍要吃凉面条，俗称"过水面"。莱阳一带夏至日荐新麦，黄县一带则煮新麦粒吃，富于农家生活的乐趣。' },
        { title: '做夏至', desc: '浙江绍兴地区，旧时人们不分贫富，夏至日皆祭其祖，俗称"做夏至"。无锡人早晨吃麦粥，中午吃馄饨，取混沌和合之意。人们吃过馄饨，为儿童称体重，希望孩子们健康成长。' },
      ],
      foods: ['凉面', '馄饨', '麦粥', '荔枝'],
    },
    11: {
      customs: [
        { title: '吃伏面', desc: '入伏之时，人们精神委顿、食欲不佳，饺子是传统食品中开胃解馋的佳品。就有了"头伏饺子二伏面，三伏烙饼摊鸡蛋"的说法。伏天还可吃过水面、炒面，不仅味道鲜美，还可以"败心火"。' },
        { title: '吃暑羊', desc: '在中国鲁南和苏北地区有小暑时节"吃暑羊"的传统习俗，民间有"彭城伏羊一碗汤，不用神医开药方"的说法。' },
        { title: '炒鳝片', desc: '俗话说"小暑黄鳝赛人参"，小暑前后一个月产的鳝鱼最为滋补味美。黄鳝性温味甘，具有补中益气、补肝脾、除风湿、强筋骨等作用。' },
        { title: '蜜汁藕', desc: '民间有小暑吃藕的习惯，藕中含有碳水化合物及丰富的钙、磷、铁和多种维生素，具有清热养血等功效。鲜藕以小火煨烂，切片后加适量蜂蜜，可随意食用。' },
      ],
      foods: ['饺子', '黄鳝', '莲藕', '羊肉'],
    },
    12: {
      customs: [
        { title: '送大暑船', desc: '这是浙江沿海地区的民间传统习俗，意在把"五圣"送出海，送暑保平安。"大暑船"按旧时三桅帆船缩小比例后建造，船内载有各种祭品。活动开始后，数十名渔民轮流抬着"大暑船"在街道上行进，鼓号喧天、鞭炮齐鸣。' },
        { title: '吃仙草', desc: '粤东南地区流传着"六月大暑吃仙草，活如神仙不会老"的谚语。仙草又名凉粉草、仙人草，茎叶晒干后可以做成烧仙草，广东一带叫凉粉，是一种消暑的甜品。' },
        { title: '吃伏姜', desc: '湘东南有大暑吃姜的风俗，所谓"冬吃萝卜夏吃姜，不需医生开药方"。福建莆田人要吃荔枝、羊肉和米糟来过大暑。' },
      ],
      foods: ['仙草冻', '荔枝', '羊肉', '姜茶'],
    },
    13: {
      customs: [
        { title: '贴秋膘', desc: '民间流行在立秋这天以悬秤称人，将体重与立夏时对比。人到夏天，胃口变化，饮食清淡，两三个月下来体重大都要减少一点。天气转凉，人们希望增加营养，以补偿"苦夏"的损失，补的办法就是吃肉食，俗称"贴秋膘"。' },
        { title: '啃秋', desc: '对城市人家来说，立秋当日买个西瓜，全家围着吃，就是啃秋了。农人的啃秋却是豪放的，树荫下、院落中，三五成群围坐，分享西瓜、香瓜、玉米等各种时令蔬果。' },
        { title: '秋忙会', desc: '秋忙会一般在农历七八月举行，是为迎接秋忙而做准备的经济贸易交流大会，有的与庙会一起举办。其目的是交流生产工具，变卖牲口，交换粮食以及生活用品等。' },
      ],
      foods: ['西瓜', '红烧肉', '秋桃', '饺子'],
    },
    14: {
      customs: [
        { title: '开渔节', desc: '对于沿海渔民来说，处暑以后是渔业收获的时节。每年处暑期间，浙江省沿海都要举行隆重的开渔节，欢送渔民开船出海。原本帆樯林立、千舸锚泊的平静海面，瞬间成为千舸竞发的壮观景象。' },
        { title: '出游迎秋', desc: '处暑之后，秋意渐浓，北方大部分地区率先开始了一年中最美好的天气——秋高气爽。民间素有"七月八月看巧云"之说，正是"出游迎秋"之意。' },
        { title: '吃鸭子', desc: '民间有处暑吃鸭子的习俗。老鸭味甘性凉，做法多样，有白切鸭、柠檬鸭、烤鸭、荷叶鸭等。北京至今保留着这一习俗，处暑时节人们会去买处暑百合鸭。' },
      ],
      foods: ['鸭子', '百合鸭', '龙眼'],
    },
    15: {
      customs: [
        { title: '祭祀禹王', desc: '民间有在白露时节祭祀禹王的习俗。禹王是治水英雄，与尧舜并称古圣王，民间称他为"水路菩萨"。每年的正月初八、清明、七月初七和白露时节，江苏太湖西山都会举行祭祀禹王的香会。' },
        { title: '喝白露茶', desc: '民间有"春茶苦，夏茶涩，要喝茶，秋白露"的说法。茶树经过夏季的酷热，白露时节进入生长佳期。白露茶既不像春茶那样鲜嫩，也不像夏茶那样干涩味苦，具有独特的浓郁甘醇。' },
        { title: '酿白露米酒', desc: '湖南资兴一带历来有酿酒习俗。每年白露节一到，家家酿酒，待客必喝"土酒"。其酒温中含热，略带甜味，用糯米、高粱等五谷酿成，故称"白露米酒"。' },
      ],
      foods: ['白露茶', '白露米酒', '红薯', '龙眼'],
    },
    16: {
      customs: [
        { title: '秋分祭月', desc: '秋分曾是传统的"祭月节"。周代有两分祭日月之说，即春分祭日、秋分祭月。北京的月坛就是明清皇帝祭月的地方。《礼记》载："天子春朝日，秋夕月。"' },
        { title: '竖蛋', desc: '"秋分到，蛋儿俏"。在每年秋分这一天，各地都会有人做"竖蛋"游戏。这个游戏利用了地球地轴与地球绕日公转的轨道平面处于一种力的相对平衡状态。' },
        { title: '送秋牛', desc: '秋分时民间便出现挨家送秋牛图的习俗。秋牛图把二开红纸或黄纸印上全年农历节气，并印上农夫耕田图样。送图者即兴说唱，句句有韵动听，俗称"说秋"。' },
        { title: '粘雀子嘴', desc: '秋分这一天农民按习俗放假，每家都要吃汤圆，把不包馅料的汤圆煮好，用细竹插置于室外田边地坎，免得雀子来破坏庄稼。' },
      ],
      foods: ['秋菜', '汤圆', '桂花鸭', '芋饼'],
    },
    17: {
      customs: [
        { title: '登高赏菊', desc: '寒露时节正值农历九月，人们一直保持着重阳节登高的习俗。农历九月又称菊月，菊花为寒露时节最具代表性的花卉，登高赏菊成了这个时节的乐事雅事。' },
        { title: '斗蟋蟀', desc: '白露、秋分和寒露，是北京、杭州等地市民斗蟋蟀的高潮期。蟋蟀也叫促织，听见蟋蟀叫通常就意味着入秋了，天气渐凉，人们该准备过冬的衣服了。' },
        { title: '秋钓边', desc: '在南方，寒露节气炎热已退，阳光和煦，是钓鱼的好时节。此时气温下降迅速，深水处太阳晒不透，鱼会游向水温较高的浅水区，因此有"秋钓边"的说法。' },
        { title: '饮菊花酒', desc: '寒露节气接近重阳节，一些地区有饮"菊花酒"的习俗。菊花酒由菊花加糯米、酒曲酿制而成，也称作"长寿酒"，有养肝、明目等功效。' },
      ],
      foods: ['菊花酒', '寒露茶', '重阳糕', '螃蟹'],
    },
    18: {
      customs: [
        { title: '吃柿子', desc: '有些地方霜降时节吃红柿子，人们认为这样可以御寒保暖，还能补筋骨。泉州老人的说法是：霜降吃丁柿，不会流鼻涕。有些地方的说法是：霜降这天要吃杮子，不然整个冬天嘴唇会裂开。' },
        { title: '赏菊', desc: '农历九月又叫菊月，霜降时节秋菊盛开，很多地方此时举行菊花会。自汉魏以来，人们便有重阳登山、佩茱萸、赏菊、饮酒的习俗。' },
        { title: '送芋鬼', desc: '广东高明地区，霜降前有"送芋鬼"的习俗。人们用瓦片堆砌成梵塔，在塔里面放入干柴点燃，直至瓦片烧红，再将塔推倒，用烧红的瓦片热熟芋头，最后把瓦片丢到村外，祈求风调雨顺。' },
      ],
      foods: ['柿子', '牛肉', '鸭子', '芋头'],
    },
    19: {
      customs: [
        { title: '迎冬', desc: '古代人们将立冬与立春、立夏、立秋合称"四立"，是重要的节日。古时此日，天子有出郊迎冬之礼，并赐群臣冬衣，对为国捐躯的烈士家人给予表彰和抚恤。' },
        { title: '补冬', desc: '立冬意味着草木凋零，蛰虫休眠，万物活动趋向休止。立冬进补在人们心目中是根深蒂固的。南方热补，爱吃鸡鸭鱼肉；北方吃饺子，有"立冬不端饺子碗，冻掉耳朵没人管"的说法。' },
        { title: '冬泳', desc: '在哈尔滨、商丘、武汉等地，立冬之日冬泳爱好者用游泳的方式迎接冬天的到来。冬泳被称为"血管体操"，能使血管得到锻炼，增强血管弹性。' },
      ],
      foods: ['饺子', '羊肉炉', '姜母鸭', '麻油鸡'],
    },
    20: {
      customs: [
        { title: '腌腊肉', desc: '小雪时节气温急剧下降，天气变得干燥，是加工腊肉的好时候。民间有"冬腊风腌，蓄以御冬"的习俗。南方很多人对腊味食品情有独钟，此时开始动手做香肠、腊肉，正好为春节准备年货。' },
        { title: '吃糍粑', desc: '南方有农历十月吃糍粑的习俗。糍粑是南方传统的节日祭品，最早是农民用来祭献牛神的供品。有做成圆形的，寓意丰收、喜庆和团圆；有做成长方形的，称为"年糕"。' },
        { title: '晒鱼干', desc: '小雪时节，台湾中南部的渔民开始晒鱼干、储存干粮。乌鱼群会在小雪前后来到台湾海峡，台湾俗谚说："十月豆，肥到不见头。"' },
      ],
      foods: ['糍粑', '腊肉', '鱼干', '刨汤'],
    },
    21: {
      customs: [
        { title: '腌肉', desc: '老南京有句俗语："小雪腌菜，大雪腌肉"。大雪节气一到，南方很多人家忙着腌制"咸货"。大雪节气天气寒冷，此时腌制肉类食品不易变质，家家户户忙着腌制咸肉以迎接新年。' },
        { title: '观赏封河', desc: '"小雪封地，大雪封河"，黄河以北有"看红装素裹，分外妖娆"的北国风光。大雪节气河湖结冰，许多公园湖面的溜冰场也开放了，供人们滑冰嬉戏。' },
        { title: '捕鱼', desc: '大雪时节是捕获乌鱼的好时节。俗谚"小雪小到，大雪大到"，到大雪时节乌鱼群沿水温线向南回游，汇集的乌鱼越来越多，产量非常高。' },
      ],
      foods: ['咸肉', '雪菜', '红薯粥'],
    },
    22: {
      customs: [
        { title: '包饺子', desc: '"冬至饺子夏至面"，北方有冬至吃饺子的风俗。俗话说"冬至不端饺子碗，冻掉耳朵没人管"。这一习俗是为纪念"医圣"张仲景冬至舍药医治人们冻疮的善举。' },
        { title: '九九消寒图', desc: '明末《帝京景物略》记载："冬至日人家画素梅一枝，为瓣八十有一，日染一瓣，瓣尽而九九出，则春深矣。"另一种消寒图是描红书法，上有"庭前垂柳珍重待春風"九字，每字九画，共八十一画。' },
        { title: '祭拜祖先', desc: '潮汕人家在冬至时会备足猪、鸡、鱼等三牲和果品，上祠堂祭拜祖先。沿海地区的渔民则在清晨出海捕鱼之前祭祖，意为请神明和祖先保佑渔民出海平安。' },
        { title: '冬酿酒', desc: '姑苏地区对冬至节气非常重视，传统的姑苏人家会在冬至夜喝冬酿酒。冬酿酒是一种米酒，加入桂花酿造，香气宜人。' },
      ],
      foods: ['饺子', '汤圆', '冬酿酒', '赤豆粥'],
    },
    23: {
      customs: [
        { title: '探梅', desc: '此时腊梅已开，红梅含苞待放，选一处梅花盛开的绝佳风景地，细细赏玩，幽香萦鼻，神智也会为之清爽振奋。' },
        { title: '冰嬉', desc: '中国北方各省入冬之后天寒地冻，河面结冰厚实。冰面厚实的地区大多设有冰床，供行人玩耍，也有穿冰鞋在冰面竞走的，古代称为冰嬉，亦称"冰戏"。' },
        { title: '吃腊八粥', desc: '小寒时节临近腊八，民间保留着吃腊八粥的风俗。腊八粥用多种食材熬制，包括五谷杂粮和花生、栗子、红枣、莲子等，含祝祷之意，也有驱寒祈福、庆祝丰收的用意。' },
      ],
      foods: ['腊八粥', '菜饭', '糯米饭', '黄芽菜'],
    },
    24: {
      customs: [
        { title: '尾牙祭', desc: '尾牙源自拜土地公做"牙"的习俗，在福建沿海、台湾等地仍保留着尾牙祭的传统。农历十二月十六日是尾牙，生意人要设宴，白斩鸡为宴席上不可缺少的一道菜。' },
        { title: '除旧布新', desc: '大寒时节人们开始忙着除旧布新，腌制年肴，准备年货。大寒是二十四节气之终，寒冷至极但阳气已开始萌动，"大寒到顶点，日后天渐暖"，周而复始。' },
        { title: '吃消寒糕', desc: '消寒糕是年糕的一种，其糯米比大米含糖量高，食用后全身感觉暖和，在寒冬季节有温散风寒、润肺健脾胃的功效，还有"年高"之意，带着吉祥如意、步步高升的好彩头。' },
      ],
      foods: ['消寒糕', '腊八粥', '年糕', '鸡肉'],
    },
  };
  return data[termId] || null;
}

function navigateBack() {
  location.hash = '#zodiac';
}

function addNavigation(currentTerm, allTerms, store) {
  const navContainer = document.createElement('div');
  navContainer.className = 'guo-term-nav';

  const currentIdx = allTerms.findIndex(t => t.id === currentTerm.id);
  const prevTerm = allTerms[(currentIdx - 1 + allTerms.length) % allTerms.length];
  const nextTerm = allTerms[(currentIdx + 1) % allTerms.length];

  const prevBtn = document.createElement('button');
  prevBtn.className = 'guo-term-nav-btn';
  prevBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> ${prevTerm.name}`;
  prevBtn.addEventListener('click', () => {
    store.set('currentTermId', prevTerm.id);
    location.hash = `#detail?id=${prevTerm.id}`;
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'guo-term-nav-btn';
  nextBtn.innerHTML = `${nextTerm.name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
  nextBtn.addEventListener('click', () => {
    store.set('currentTermId', nextTerm.id);
    location.hash = `#detail?id=${nextTerm.id}`;
  });

  navContainer.appendChild(prevBtn);
  navContainer.appendChild(nextBtn);

  const contentContainer = document.getElementById('detail-content');
  if (contentContainer) {
    contentContainer.appendChild(navContainer);
  }
}

export function unmount() {
  // 清理视频滚动观察器
  const container = document.getElementById('detail-content');
  if (container && container._videoObserver) {
    container._videoObserver.disconnect();
    container._videoObserver = null;
  }
  // 清理交互辅助
  if (_fallbackCleanup) { _fallbackCleanup(); _fallbackCleanup = null; }
}