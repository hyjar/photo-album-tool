/**
 * 全局状态管理 + 撤销/重做
 * 性能优化：快照不复制图片数据，只保留引用
 */
import { uid, deepClone, A4_WIDTH_MM, A4_HEIGHT_MM } from './utils.js';

// 全局状态
const state = {
  images: [],
  pages: [],
  selectedPageId: null,
  selectedElementId: null,
  template: 'grid',
  pageSize: { width: A4_WIDTH_MM, height: A4_HEIGHT_MM },
  orientation: 'portrait',
  theme: {
    bgColor: '#ffffff',
    accentColor: '#1a1a2e',
    borderColor: 'none',
    spacing: 4,
    padding: 10,
  },
  textPages: [],
  darkMode: false,
};

// 撤销/重做栈
const history = {
  undoStack: [],
  redoStack: [],
  maxSize: 30,
};

// 快照：只保存布局数据到历史栈，不通知 UI
function pushSnapshot() {
  const snapshot = {
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
  };
  history.undoStack.push(snapshot);
  if (history.undoStack.length > history.maxSize) {
    history.undoStack.shift();
  }
  history.redoStack = [];
}

// 通知所有监听器
const listeners = new Set();
function notify() {
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() { return state; }

// ============ 撤销/重做 ============
export function undo() {
  if (history.undoStack.length === 0) return;
  history.redoStack.push({
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
  });
  const prev = history.undoStack.pop();
  state.pages = prev.pages;
  state.textPages = prev.textPages;
  state.template = prev.template;
  state.pageSize = prev.pageSize;
  state.orientation = prev.orientation;
  Object.assign(state.theme, prev.theme);
  notify();
}

export function redo() {
  if (history.redoStack.length === 0) return;
  history.undoStack.push({
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
  });
  const next = history.redoStack.pop();
  state.pages = next.pages;
  state.textPages = next.textPages;
  state.template = next.template;
  state.pageSize = next.pageSize;
  state.orientation = next.orientation;
  Object.assign(state.theme, next.theme);
  notify();
}

export function canUndo() { return history.undoStack.length > 0; }
export function canRedo() { return history.redoStack.length > 0; }

// ============ 图片操作 ============
export function updateImages(images) {
  pushSnapshot();
  state.images = images;
  notify();
}

export function addImages(newImages) {
  pushSnapshot();
  state.images.push(...newImages);
  notify();
}

export function removeImage(id) {
  pushSnapshot();
  state.images = state.images.filter(img => img.id !== id);
  state.pages.forEach(page => {
    page.elements = page.elements.filter(el => el.imageId !== id);
  });
  notify();
}

export function reorderImages(fromIdx, toIdx) {
  pushSnapshot();
  const [item] = state.images.splice(fromIdx, 1);
  state.images.splice(toIdx, 0, item);
  notify();
}

// ============ 页面操作 ============
export function setPages(pages) {
  pushSnapshot();
  state.pages = pages;
  notify();
}

export function updatePage(pageId, updates) {
  pushSnapshot();
  const page = state.pages.find(p => p.id === pageId);
  if (page) Object.assign(page, updates);
  notify();
}

export function updateElement(pageId, elementId, updates) {
  const page = state.pages.find(p => p.id === pageId);
  if (!page) return;
  const elem = page.elements.find(e => e.id === elementId);
  if (!elem) return;
  pushSnapshot();
  Object.assign(elem, updates);
  notify();
}

// ============ 选中状态（不需要快照） ============
export function setSelectedPage(id) {
  state.selectedPageId = id;
  state.selectedElementId = null;
  notify();
}

export function setSelectedElement(id) {
  state.selectedElementId = id;
  notify();
}

// ============ 模板/页面设置 ============
export function setTemplate(template) {
  pushSnapshot();
  state.template = template;
  notify();
}

export function setPageSize(size) {
  pushSnapshot();
  state.pageSize = size;
  notify();
}

export function setOrientation(orientation) {
  pushSnapshot();
  state.orientation = orientation;
  notify();
}

export function setTheme(theme) {
  pushSnapshot();
  Object.assign(state.theme, theme);
  notify();
}

export function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.documentElement.classList.toggle('dark', state.darkMode);
  notify();
}

// ============ 文字页面 ============
export function addTextPage(textPage) {
  pushSnapshot();
  state.textPages.push({ id: uid(), ...textPage });
  notify();
}

export function removeTextPage(id) {
  pushSnapshot();
  state.textPages = state.textPages.filter(tp => tp.id !== id);
  notify();
}

// ============ 保存/加载 ============
export function exportState() {
  return {
    images: state.images.map(img => ({
      id: img.id,
      name: img.name,
      width: img.width,
      height: img.height,
      aspectRatio: img.aspectRatio,
    })),
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
    savedAt: new Date().toISOString(),
  };
}

export function importState(saved, imageMap) {
  pushSnapshot();
  state.images = saved.images.map(img => ({
    ...img,
    objectURL: imageMap[img.id] || imageMap[img.name] || '',
    thumbURL: '',
  }));
  state.pages = saved.pages || [];
  state.textPages = saved.textPages || [];
  state.template = saved.template || 'grid';
  state.pageSize = saved.pageSize || { width: A4_WIDTH_MM, height: A4_HEIGHT_MM };
  state.orientation = saved.orientation || 'portrait';
  if (saved.theme) Object.assign(state.theme, saved.theme);
  notify();
}
