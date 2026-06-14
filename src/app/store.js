/**
 * Store — 全局状态管理
 * 管理当前节气、交互模式、视图状态等
 */
export class Store {
  constructor() {
    this._state = {
      currentTermId: null,
      viewMode: 'science',    // 'science' | 'folk'
      interactionMode: null,  // 'gesture' | 'touch' | 'click' | ...
      isLoading: true,
      prevPage: null          // 上一页面 hash
    };
    this._listeners = new Map();
  }

  get state() {
    return { ...this._state };
  }

  set(key, value) {
    const old = this._state[key];
    if (old !== value) {
      this._state[key] = value;
      this._notify(key, value, old);
    }
  }

  get(key) {
    return this._state[key];
  }

  on(key, fn) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, []);
    }
    this._listeners.get(key).push(fn);
    return () => {
      const arr = this._listeners.get(key);
      if (arr) {
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  _notify(key, value, old) {
    const fns = this._listeners.get(key);
    if (fns) {
      fns.forEach(fn => fn(value, old));
    }
  }
}