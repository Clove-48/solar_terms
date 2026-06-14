/* ==========================================
   main.js — 应用入口
   ========================================== */

import './styles/reset.css';
import './styles/tokens.css';
import './styles/typography.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/transitions.css';
import './styles/responsive.css';

import { initMobileAdapt } from './utils/mobileAdapt.js';
import { Router } from './app/router.js';
import { Store } from './app/store.js';
import { events } from './app/events.js';

// 初始化移动端自适应系统
initMobileAdapt();

const store = new Store();
const router = new Router({ store });

router.register('loading', () => import('./pages/loading/logic.js'));
router.register('zodiac', () => import('./pages/zodiac/logic.js'));
router.register('detail', () => import('./pages/detail/logic.js'));
router.register('lab', () => import('./pages/lab/logic.js'));

router.init('#loading');

// 将 store 和 events 挂到全局以便调试
window.__store = store;
window.__events = events;