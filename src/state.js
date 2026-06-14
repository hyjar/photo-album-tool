/**
 * 全局状态管理 + 撤销/重做
 * 扩展：版式预设、自由画布、跨页、背景、文字叠加、图注、页码
 */
import { uid, deepClone, A4_WIDTH_MM, A4_HEIGHT_MM } from './utils.js';

const state = {
  images: [],
  pages: [],         // { id, elements, isTextPage, isFreeCanvas, text, textStyle, background, pageNumber }
  selectedPageId: null,
  selectedElementId: null,
  template: 'single',
  fitMode: 'contain',  // 'cover' | 'contain' — 单页大图模式
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

  // 新增：版式预设
  presets: [], // { id, name, elements: [{ relX, relY, relW, relH }], imageCount }

  // 新增：页面背景
  // page.background: { type: 'solid'|'gradient'|'texture', color, color2, angle, texture }

  // 新增：页码设置
  pageNumberEnabled: false,
  pageNumberPosition: 'bottom-center', // 'bottom-center'|'bottom-left'|'bottom-right'
  pageNumberStyle: 'number', // 'number'|'line'

  // 新增：页眉页脚
  headerText: '',
  footerText: '',

  // 新增：竖横自适应
  autoOrient: false,
  canvasAutoOrient: true, // 画布是否也跟着自适应方向

  // 新增：网格列数
  gridColumns: 2,

  // 新增：智能分类
  classification: {
    enabled: false,
    mode: 'orientation',
    results: {},
    manualOverrides: {},
    sortStrategy: 'orientation-then-category',
  },

  // 新增：多选（用于交换）
  selectedElementIds: [],

  // 新增：页眉页脚样式
  headerStyle: { fontSize: 10, fontFamily: 'system-ui', color: '#888888' },
  footerStyle: { fontSize: 10, fontFamily: 'system-ui', color: '#888888' },

  // 新增：水印设置
  watermark: {
    enabled: false,
    text: '© 摄影集',
    fontSize: 32,
    fontFamily: 'system-ui',
    color: '#888888',
    opacity: 0.3,
    rotation: -30,
    spacing: 150, // 水印间距 px
  },
  selectedImageId: null,
  selectedImageProps: {
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    x: 0,
    y: 0,
    borderWidth: 0,
    borderColor: '#000000',
    borderRadius: 0,
    brightness: 100,
    contrast: 100,
    saturate: 100,
  },
  lockRatio: true,
  originalAspectRatio: 1,
};

// ====== 快照（只保存布局数据） ======
const history = { undoStack: [], redoStack: [], maxSize: 30 };

function pushSnapshot() {
  history.undoStack.push({
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    fitMode: state.fitMode,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
    presets: deepClone(state.presets),
    pageNumberEnabled: state.pageNumberEnabled,
    pageNumberPosition: state.pageNumberPosition,
    pageNumberStyle: state.pageNumberStyle,
    headerText: state.headerText,
    footerText: state.footerText,
    autoOrient: state.autoOrient,
    canvasAutoOrient: state.canvasAutoOrient,
    gridColumns: state.gridColumns,
    classification: deepClone(state.classification),
    headerStyle: { ...state.headerStyle },
    footerStyle: { ...state.footerStyle },
    watermark: { ...state.watermark },
  });
  if (history.undoStack.length > history.maxSize) history.undoStack.shift();
  history.redoStack = [];
}

function restoreSnapshot(snap) {
  state.pages = snap.pages;
  state.textPages = snap.textPages;
  state.template = snap.template;
  state.fitMode = snap.fitMode;
  state.pageSize = snap.pageSize;
  state.orientation = snap.orientation;
  Object.assign(state.theme, snap.theme);
  state.presets = snap.presets;
  state.pageNumberEnabled = snap.pageNumberEnabled;
  state.pageNumberPosition = snap.pageNumberPosition;
  state.pageNumberStyle = snap.pageNumberStyle;
  state.headerText = snap.headerText;
  state.footerText = snap.footerText;
  state.autoOrient = snap.autoOrient || false;
  state.canvasAutoOrient = snap.canvasAutoOrient !== undefined ? snap.canvasAutoOrient : true;
  state.gridColumns = snap.gridColumns || 2;
  if (snap.classification) state.classification = snap.classification;
  if (snap.headerStyle) Object.assign(state.headerStyle, snap.headerStyle);
  if (snap.footerStyle) Object.assign(state.footerStyle, snap.footerStyle);
  if (snap.watermark) Object.assign(state.watermark, snap.watermark);
}

function saveForRedo() {
  return {
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    fitMode: state.fitMode,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
    presets: deepClone(state.presets),
    pageNumberEnabled: state.pageNumberEnabled,
    pageNumberPosition: state.pageNumberPosition,
    pageNumberStyle: state.pageNumberStyle,
    headerText: state.headerText,
    footerText: state.footerText,
    autoOrient: state.autoOrient,
  };
}

// ====== 通知 ======
const listeners = new Set();
function notify() { listeners.forEach(fn => fn(state)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getState() { return state; }

// ====== 撤销/重做 ======
export function undo() {
  if (!history.undoStack.length) return;
  history.redoStack.push(saveForRedo());
  restoreSnapshot(history.undoStack.pop());
  notify();
}
export function redo() {
  if (!history.redoStack.length) return;
  history.undoStack.push(saveForRedo());
  restoreSnapshot(history.redoStack.pop());
  notify();
}
export function canUndo() { return history.undoStack.length > 0; }
export function canRedo() { return history.redoStack.length > 0; }

// ====== 图片操作 ======
export function addImages(newImages) {
  pushSnapshot();
  state.images.push(...newImages);
  notify();
}
export function removeImage(id) {
  pushSnapshot();
  state.images = state.images.filter(img => img.id !== id);
  state.pages.forEach(p => { p.elements = p.elements.filter(e => e.imageId !== id); });
  notify();
}
export function reorderImages(fromIdx, toIdx) {
  pushSnapshot();
  const [item] = state.images.splice(fromIdx, 1);
  state.images.splice(toIdx, 0, item);
  notify();
}

// ====== 页面操作 ======
export function setPages(pages) {
  pushSnapshot();
  state.pages = pages;
  notify();
}
export function updatePage(pageId, updates) {
  pushSnapshot();
  const p = state.pages.find(pg => pg.id === pageId);
  if (p) Object.assign(p, updates);
  notify();
}
export function updateElement(pageId, elementId, updates) {
  const p = state.pages.find(pg => pg.id === pageId);
  if (!p) return;
  const e = p.elements.find(el => el.id === elementId);
  if (!e) return;
  pushSnapshot();
  Object.assign(e, updates);
  notify();
}

// ====== 选中 ======
export function setSelectedPage(id) {
  state.selectedPageId = id;
  state.selectedElementId = null;
  notify();
}
export function setSelectedElement(id) {
  state.selectedElementId = id;
  notify();
}

// ====== 模板/设置 ======
export function setTemplate(t) { pushSnapshot(); state.template = t; notify(); }
export function setFitMode(m) { pushSnapshot(); state.fitMode = m; notify(); }
export function setPageSize(s) { pushSnapshot(); state.pageSize = s; notify(); }
export function setOrientation(o) { pushSnapshot(); state.orientation = o; notify(); }
export function setAutoOrient(v) { pushSnapshot(); state.autoOrient = v; notify(); }
export function setCanvasAutoOrient(v) { state.canvasAutoOrient = v; notify(); }
export function setTheme(t) { pushSnapshot(); Object.assign(state.theme, t); notify(); }
export function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.documentElement.classList.toggle('dark', state.darkMode);
  notify();
}

// ====== 页码 ======
export function setPageNumber(opts) {
  pushSnapshot();
  Object.assign(state, opts);
  notify();
}

// ====== 页眉页脚 ======
export function setHeaderFooter(h, f) {
  pushSnapshot();
  state.headerText = h;
  state.footerText = f;
  notify();
}

// ====== 网格列数 ======
export function setGridColumns(cols) {
  state.gridColumns = cols;
  notify();
}

// ====== 页眉页脚样式 ======
export function setHeaderStyle(style) {
  pushSnapshot();
  Object.assign(state.headerStyle, style);
  notify();
}
export function setFooterStyle(style) {
  pushSnapshot();
  Object.assign(state.footerStyle, style);
  notify();
}

// ====== 智能分类 ======
export function setClassificationEnabled(enabled) {
  state.classification.enabled = enabled;
  notify();
}
export function setClassificationMode(mode) {
  state.classification.mode = mode;
  notify();
}
export function setClassificationResults(results) {
  state.classification.results = results;
  notify();
}
export function setManualCategory(imageId, category) {
  state.classification.manualOverrides[imageId] = category;
  notify();
}
export function getClassificationForImage(imageId) {
  return state.classification.manualOverrides[imageId]
    || state.classification.results[imageId]
    || null;
}

// ====== 多选与交换 ======
export function toggleElementSelection(elementId) {
  const idx = state.selectedElementIds.indexOf(elementId);
  if (idx >= 0) {
    state.selectedElementIds.splice(idx, 1);
  } else if (state.selectedElementIds.length < 2) {
    state.selectedElementIds.push(elementId);
  } else {
    state.selectedElementIds = [elementId];
  }
  notify();
}
export function clearElementSelection() {
  state.selectedElementIds = [];
  notify();
}
export function swapElements(pageId, elemId1, elemId2) {
  pushSnapshot();
  const page = state.pages.find(p => p.id === pageId);
  if (!page) return;
  const e1 = page.elements.find(e => e.id === elemId1);
  const e2 = page.elements.find(e => e.id === elemId2);
  if (!e1 || !e2) return;
  const temp = { x: e1.x, y: e1.y, w: e1.w, h: e1.h };
  Object.assign(e1, { x: e2.x, y: e2.y, w: e2.w, h: e2.h });
  Object.assign(e2, temp);
  state.selectedElementIds = [];
  notify();
}

// ====== 全局背景 ======
export function setAllPageBackgrounds(bg) {
  pushSnapshot();
  state.pages.forEach(p => { p.background = bg; });
  notify();
}

// ====== 水印 ======
export function setWatermark(opts) {
  pushSnapshot();
  Object.assign(state.watermark, opts);
  notify();
}

// ====== 文字页面 ======
export function addTextPage(tp) {
  pushSnapshot();
  state.textPages.push({ id: uid(), ...tp });
  notify();
}
export function removeTextPage(id) {
  pushSnapshot();
  state.textPages = state.textPages.filter(t => t.id !== id);
  notify();
}

// ====== 版式预设 ======
export function savePreset(name, page) {
  pushSnapshot();
  const relElements = page.elements.map(e => {
    const img = state.images.find(i => i.id === e.imageId);
    const pw = state.pageSize.width * (state.orientation === 'landscape' ? 1 : 0);
    const ph = state.pageSize.height;
    return {
      relX: e.x / (pw || 1),
      relY: e.y / ph,
      relW: e.w / (pw || 1),
      relH: e.h / ph,
      imageIndex: state.images.indexOf(img),
    };
  });
  state.presets.push({
    id: uid(),
    name,
    elements: relElements,
    imageCount: page.elements.length,
  });
  notify();
}
export function deletePreset(id) {
  pushSnapshot();
  state.presets = state.presets.filter(p => p.id !== id);
  notify();
}
export function renamePreset(id, name) {
  pushSnapshot();
  const p = state.presets.find(pr => pr.id === id);
  if (p) p.name = name;
  notify();
}
export function applyPreset(presetId, pageIndex) {
  const preset = state.presets.find(p => p.id === presetId);
  const page = state.pages[pageIndex];
  if (!preset || !page) return;
  pushSnapshot();

  // 为预设中的每项找匹配的图片
  const pw = state.pageSize.width * (state.orientation === 'landscape' ? 1 : 0);
  const ph = state.pageSize.height;
  const mmPerPxW = pw / (pw * 3.7795);
  const mmPerPxH = ph / (ph * 3.7795);

  page.elements = preset.elements.map((pe, i) => {
    const availableImages = state.images.filter(img =>
      !page.elements.some(e => e.imageId === img.id)
    );
    const img = availableImages[i % availableImages.length];
    if (!img) return null;
    return {
      id: uid(),
      imageId: img.id,
      x: pe.relX * pw,
      y: pe.relY * ph,
      w: pe.relW * pw,
      h: pe.relH * ph,
    };
  }).filter(Boolean);
  notify();
}

// ====== 页面背景 ======
export function setPageBackground(pageId, bg) {
  pushSnapshot();
  const p = state.pages.find(pg => pg.id === pageId);
  if (p) p.background = bg;
  notify();
}

// ====== 图片描述 ======
export function updateImageDescription(imageId, description) {
  pushSnapshot();
  const img = state.images.find(i => i.id === imageId);
  if (img) img.description = description;
  // 同步更新所有引用该图片的元素
  state.pages.forEach(p => {
    p.elements.forEach(e => {
      if (e.imageId === imageId) e.description = description;
    });
  });
  notify();
}

export function updateElementDescription(pageId, elementId, description) {
  pushSnapshot();
  const p = state.pages.find(pg => pg.id === pageId);
  if (p) {
    const e = p.elements.find(el => el.id === elementId);
    if (e) e.description = description;
  }
  notify();
}

// ====== 文字叠加 ======
export function addTextOverlay(pageId) {
  pushSnapshot();
  const p = state.pages.find(pg => pg.id === pageId);
  if (!p) return;
  p.elements.push({
    id: uid(),
    type: 'text',
    text: '双击编辑',
    x: 20, y: 20, w: 100, h: 30,
    style: { fontSize: 16, color: '#ffffff', bold: false, italic: false, underline: false, stroke: true, strokeColor: '#000000', fontFamily: 'system-ui', textAlign: 'left', lineHeight: 1.4 },
  });
  notify();
}

// ====== 图注 ======
export function toggleCaptions() {
  pushSnapshot();
  state.pages.forEach(p => {
    p.elements.forEach(e => {
      if (e.type !== 'text' && e.imageId) {
        if (e.caption !== undefined) {
          delete e.caption;
        } else {
          const img = state.images.find(i => i.id === e.imageId);
          e.caption = img ? img.name.replace(/\.[^.]+$/, '') : '';
          e.captionStyle = { fontSize: 10, color: '#666666', position: 'bottom' };
        }
      }
    });
  });
  notify();
}

// ====== 导出/导入 ======
export function exportState() {
  return {
    images: state.images.map(img => ({
      id: img.id, name: img.name, width: img.width,
      height: img.height, aspectRatio: img.aspectRatio,
    })),
    pages: deepClone(state.pages),
    textPages: deepClone(state.textPages),
    template: state.template,
    fitMode: state.fitMode,
    pageSize: { ...state.pageSize },
    orientation: state.orientation,
    theme: { ...state.theme },
    presets: deepClone(state.presets),
    pageNumberEnabled: state.pageNumberEnabled,
    pageNumberPosition: state.pageNumberPosition,
    pageNumberStyle: state.pageNumberStyle,
    headerText: state.headerText,
    footerText: state.footerText,
    autoOrient: state.autoOrient,
    canvasAutoOrient: state.canvasAutoOrient,
    gridColumns: state.gridColumns,
    classification: deepClone(state.classification),
    headerStyle: { ...state.headerStyle },
    footerStyle: { ...state.footerStyle },
    watermark: { ...state.watermark },
    savedAt: new Date().toISOString(),
  };
}

export function importState(saved, imageMap) {
  pushSnapshot();
  state.images = saved.images.map(img => ({
    ...img,
    objectURL: imageMap[img.id] || imageMap[img.name] || '',
    thumbURL: '',
    previewURL: '',
  }));
  state.pages = saved.pages || [];
  state.textPages = saved.textPages || [];
  state.template = saved.template || 'grid';
  state.fitMode = saved.fitMode || 'cover';
  state.pageSize = saved.pageSize || { width: A4_WIDTH_MM, height: A4_HEIGHT_MM };
  state.orientation = saved.orientation || 'portrait';
  if (saved.theme) Object.assign(state.theme, saved.theme);
  state.presets = saved.presets || [];
  state.pageNumberEnabled = saved.pageNumberEnabled || false;
  state.pageNumberPosition = saved.pageNumberPosition || 'bottom-center';
  state.pageNumberStyle = saved.pageNumberStyle || 'number';
  state.headerText = saved.headerText || '';
  state.footerText = saved.footerText || '';
  state.autoOrient = saved.autoOrient || false;
  state.canvasAutoOrient = saved.canvasAutoOrient !== undefined ? saved.canvasAutoOrient : true;
  state.gridColumns = saved.gridColumns || 2;
  if (saved.classification) state.classification = saved.classification;
  if (saved.headerStyle) Object.assign(state.headerStyle, saved.headerStyle);
  if (saved.footerStyle) Object.assign(state.footerStyle, saved.footerStyle);
  if (saved.watermark) Object.assign(state.watermark, saved.watermark);
  notify();
}

// ====== 图片属性状态管理 ======
export function setSelectedImage(imageId, props) {
  state.selectedImageId = imageId;
  if (props) {
    state.selectedImageProps = { ...props };
    state.originalAspectRatio = (props.width || 1) / (props.height || 1);
  }
  notify();
}

export function clearSelectedImage() {
  state.selectedImageId = null;
  notify();
}

export function updateImageProps(props) {
  if (!state.selectedImageId) return;

  const newProps = { ...state.selectedImageProps, ...props };

  // Handle lock ratio
  if (state.lockRatio && (props.width || props.height)) {
    if (props.width) {
      newProps.height = Math.round(props.width / state.originalAspectRatio);
    } else if (props.height) {
      newProps.width = Math.round(props.height * state.originalAspectRatio);
    }
  }

  state.selectedImageProps = newProps;

  // Update the element in pages — only apply the props that were explicitly passed,
  // to avoid overwriting layout engine's w/h with stale selectedImageProps values
  const { pages, selectedPageId } = state;
  const page = pages.find(p => p.id === selectedPageId);
  if (page) {
    const element = page.elements.find(el => el.id === state.selectedImageId);
    if (element) {
      // Map sidebar props to element props
      const elemUpdates = {};
      if ('x' in props) elemUpdates.x = props.x;
      if ('y' in props) elemUpdates.y = props.y;
      if ('width' in props) elemUpdates.w = props.width;
      if ('height' in props) elemUpdates.h = props.height;
      if ('rotation' in props) elemUpdates.rotation = props.rotation;
      if ('flipH' in props) elemUpdates.flipH = props.flipH;
      if ('flipV' in props) elemUpdates.flipV = props.flipV;
      if ('borderWidth' in props) elemUpdates.borderWidth = props.borderWidth;
      if ('borderColor' in props) elemUpdates.borderColor = props.borderColor;
      if ('borderRadius' in props) elemUpdates.borderRadius = props.borderRadius;
      if ('brightness' in props) elemUpdates.brightness = props.brightness;
      if ('contrast' in props) elemUpdates.contrast = props.contrast;
      if ('saturate' in props) elemUpdates.saturate = props.saturate;
      Object.assign(element, elemUpdates);
    }
  }

  notify();
}

export function setLockRatio(lock) {
  state.lockRatio = lock;
  if (lock) {
    const { width, height } = state.selectedImageProps;
    state.originalAspectRatio = width / height;
  }
  notify();
}

export function resetImageFilters() {
  state.selectedImageProps = {
    ...state.selectedImageProps,
    brightness: 100,
    contrast: 100,
    saturate: 100,
  };
  notify();
}
