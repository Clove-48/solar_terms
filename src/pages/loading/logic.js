/**
 * loading 页面逻辑
 * 仅加载节气数据，无需摄像头/手势识别
 */
import solarTermsData from '/data/solarTerms.json';

export async function mount(store) {
  const progressCircle = document.getElementById('progress-circle');
  const progressText = document.getElementById('progress-text');
  const loadingText = document.getElementById('loading-text');

  const circumference = 226.2;

  function setProgress(pct) {
    const offset = circumference - (pct / 100) * circumference;
    if (progressCircle) progressCircle.style.strokeDashoffset = offset;
    if (progressText) progressText.textContent = `${Math.round(pct)}%`;
  }

  try {
    // ── Step 1: 加载节气数据 ──
    setProgress(10);
    loadingText.textContent = '正在加载节气数据...';
    await sleep(100);

    window.__solarTerms = solarTermsData;
    store.set('solarTerms', solarTermsData);
    setProgress(60);

    loadingText.textContent = '正在初始化界面...';
    await sleep(200);
    setProgress(90);

  } catch (err) {
    console.warn('[Loading] Error during initialization:', err);
    setProgress(85);
  }

  // ── 完成 ──
  loadingText.textContent = '准备就绪！';
  await sleep(200);
  setProgress(100);

  store.set('isLoading', false);
  store.set('interactionMode', 'click');

  // 延迟跳转
  requestAnimationFrame(() => {
    location.hash = '#zodiac';
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function unmount() {
}