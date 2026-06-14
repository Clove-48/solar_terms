/**
 * loading.js — 资源加载管理器
 * 支持 Handpose 模型、字体、数据加载，带进度回调
 */

/**
 * 加载 Handpose 模型
 * @param {Function} onProgress  进度回调 (0-100)
 * @returns {Promise<Object>}    model 实例
 */
export async function loadModel(onProgress) {
  onProgress?.(0);

  // Step 1: 加载 tfjs-core
  onProgress?.(10);
  const tf = await import('@tensorflow/tfjs-core');
  onProgress?.(25);

  // Step 2: 加载 WebGL backend
  await import('@tensorflow/tfjs-backend-webgl');
  onProgress?.(45);

  // Step 3: 加载 Handpose
  const handpose = await import('@tensorflow-models/handpose');
  onProgress?.(65);

  // Step 4: 初始化模型
  const model = await handpose.load();
  onProgress?.(90);

  return model;
}

/**
 * 加载字体（通过 document.fonts API）
 * @param {string[]} fontFamilies  字体家族列表
 * @param {Function} onProgress    进度回调 (0-100)
 * @returns {Promise<boolean>}     是否全部加载成功
 */
export async function loadFonts(fontFamilies, onProgress) {
  if (!document.fonts) {
    onProgress?.(100);
    return true;
  }

  const total = fontFamilies.length;
  let loaded = 0;

  const promises = fontFamilies.map(family =>
    document.fonts.load(`1em "${family}"`).then(() => {
      loaded++;
      onProgress?.((loaded / total) * 100);
    }).catch(() => {
      loaded++;
      console.warn(`[loadFonts] 字体加载失败: ${family}`);
    })
  );

  await Promise.allSettled(promises);
  onProgress?.(100);
  return loaded === total;
}

/**
 * 加载 JSON 数据
 * @param {string} url  JSON 文件 URL
 * @returns {Promise<Object>}
 */
export async function loadData(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`加载数据失败: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * 创建资源加载管理器
 * @param {Object} resources  资源列表
 * @param {Function} onProgress  总进度回调
 * @returns {Promise<void>}
 *
 * @example
 * const loader = createLoader({
 *   onProgress: (pct) => updateProgressBar(pct),
 *   tasks: [
 *     { name: '模型', weight: 60, fn: () => loadModel() },
 *     { name: '数据', weight: 20, fn: () => loadData('/data/solarTerms.json') },
 *     { name: '字体', weight: 20, fn: () => loadFonts(['Noto Serif SC']) },
 *   ]
 * });
 */
export async function createLoader({ tasks, onProgress }) {
  const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0);
  let accumulated = 0;

  for (const task of tasks) {
    const weight = task.weight || 1;
    const weightRatio = weight / totalWeight;

    await task.fn((subProgress) => {
      const pct = accumulated + subProgress * weightRatio;
      onProgress?.(Math.round(pct));
    });

    accumulated += weightRatio * 100;
    onProgress?.(Math.round(accumulated));
  }
}