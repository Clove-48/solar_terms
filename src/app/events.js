/**
 * Events — 全局事件总线
 * 用于页面间通信，解耦交互触发与页面响应
 *
 * 事件列表:
 *   TERM_SELECTED   — 节气被选中 (payload: { termId })
 *   GESTURE_DETECTED — 识别到手势 (payload: { gestureType })
 *   MODE_SWITCHED   — 交互模式切换 (payload: { mode })
 *   TAB_SWITCHED    — 科学/民俗标签切换 (payload: { tab })
 *   DATA_LOADED     — 数据加载完成 (payload: { type })
 */

export const EventTypes = {
  TERM_SELECTED: 'term:selected',
  GESTURE_DETECTED: 'gesture:detected',
  MODE_SWITCHED: 'mode:switched',
  TAB_SWITCHED: 'tab:switched',
  DATA_LOADED: 'data:loaded',
  NAVIGATE: 'app:navigate',
  ERROR: 'app:error',
};

class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} type  事件类型
   * @param {Function} fn  回调函数
   * @returns {Function}   取消订阅函数
   */
  on(type, fn) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type).push(fn);
    return () => this.off(type, fn);
  }

  /**
   * 取消订阅
   */
  off(type, fn) {
    const fns = this._listeners.get(type);
    if (!fns) return;
    const idx = fns.indexOf(fn);
    if (idx >= 0) fns.splice(idx, 1);
  }

  /**
   * 触发事件
   * @param {string} type    事件类型
   * @param {*}      payload 事件载荷
   */
  emit(type, payload) {
    const fns = this._listeners.get(type);
    if (!fns) return;
    fns.forEach(fn => {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[EventBus] Error in handler for "${type}":`, e);
      }
    });
  }

  /**
   * 清除某类型的所有监听器
   */
  clear(type) {
    if (type) {
      this._listeners.delete(type);
    } else {
      this._listeners.clear();
    }
  }
}

// 导出单例
export const events = new EventBus();