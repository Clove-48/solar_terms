/**
 * dom.js — DOM 工具函数
 */

/**
 * 创建 HTML 元素
 * @param {string} tag       标签名
 * @param {Object} [attrs]   属性键值对
 * @param {string} [text]    文本内容
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, text = '') {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      el.setAttribute(key, value);
    }
  });
  if (text) el.textContent = text;
  return el;
}

/**
 * 查询单个元素
 * @param {string} selector
 * @param {HTMLElement} [context=document]
 * @returns {HTMLElement|null}
 */
export function query(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * 查询所有元素
 * @param {string} selector
 * @param {HTMLElement} [context=document]
 * @returns {HTMLElement[]}
 */
export function queryAll(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * 事件委托
 * @param {HTMLElement} parent     父容器
 * @param {string}      selector   子元素选择器
 * @param {string}      eventType  事件类型
 * @param {Function}    handler    处理函数 (接收原生事件对象)
 * @returns {Function}              取消委托函数
 */
export function delegate(parent, selector, eventType, handler) {
  const wrapped = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  };
  parent.addEventListener(eventType, wrapped);
  return () => parent.removeEventListener(eventType, wrapped);
}

/**
 * 清空子节点
 * @param {HTMLElement} el
 */
export function empty(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * 设置 HTML
 * @param {HTMLElement} el
 * @param {string} html
 */
export function setHTML(el, html) {
  el.innerHTML = html;
}

/**
 * 获取或设置数据属性
 * @param {HTMLElement} el
 * @param {string} key
 * @param {string} [value]
 * @returns {string|undefined}
 */
export function data(el, key, value) {
  if (value === undefined) {
    return el.dataset[key];
  }
  el.dataset[key] = value;
}