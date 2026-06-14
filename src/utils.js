/**
 * 工具函数模块
 */

// 生成唯一 ID
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// A4 尺寸常量 (mm)
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// mm 转 px（用于屏幕预览，基准 96dpi）
export function mmToPx(mm) {
  return mm * 3.7795;
}

// px 转 mm
export function pxToMm(px) {
  return px / 3.7795;
}

// 创建 DOM 元素
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') {
      element.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(element.style, val);
    } else if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'innerHTML') {
      element.innerHTML = val;
    } else if (key === 'textContent') {
      element.textContent = val;
    } else {
      element.setAttribute(key, val);
    }
  }
  for (const child of (Array.isArray(children) ? children : [children])) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }
  return element;
}

// 图片加载 Promise
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 读取文件为 DataURL
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 格式化文件大小
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// 防抖
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// 节流
export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 日期格式化
export function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}${s}`;
}

// 计算图片宽高比
export function getAspectRatio(img) {
  return img.naturalWidth / img.naturalHeight;
}

// 限制值在范围内
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// 深拷贝
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
