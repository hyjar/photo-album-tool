/**
 * 编辑器
 * 支持：拖动、缩放、自由画布、文字叠加编辑、图注编辑
 * 布局引擎返回像素坐标，编辑器屏幕坐标直接转像素
 */
import { getState, updateElement, setSelectedElement, setSelectedPage } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { clamp } from './utils.js';
import { renderPreviewThrottled, forceRenderPreview } from './preview.js';

let dragState = null;

export function initEditor() {
  const preview = document.getElementById('page-preview');
  if (!preview) return;
  preview.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  preview.addEventListener('dblclick', onDblClick);
}

// 找到点击位置所在的 page-canvas 及其页面信息
function findTargetPage(clientX, clientY) {
  const canvases = document.querySelectorAll('.page-canvas');
  for (const canvas of canvases) {
    const rect = canvas.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom) {
      return { canvas, rect };
    }
  }
  return null;
}

// 屏幕坐标 → 页面毫米坐标（与元素坐标同坐标系）
function screenToMm(clientX, clientY, canvas, rect) {
  if (!canvas) return { x: 0, y: 0 };
  const s = getScale(canvas);
  return {
    x: (clientX - rect.left) / s / 3.7795,
    y: (clientY - rect.top) / s / 3.7795,
  };
}

function getScale(canvas) {
  if (!canvas) return 1;
  const { w } = getPagePixelSize();
  return canvas.clientWidth / w;
}

// 根据点击位置找到对应的 page 对象
function findPageByCanvas(canvas) {
  const pageEl = canvas.closest('.preview-page');
  if (!pageEl) return null;
  // 通过顺序匹配：canvas 在 preview 中的索引对应 pages 数组的索引
  const allPages = document.querySelectorAll('.preview-page');
  const idx = Array.from(allPages).indexOf(pageEl);
  const { pages } = getState();
  return pages[idx] || null;
}

function onMouseDown(e) {
  const target = findTargetPage(e.clientX, e.clientY);
  if (!target) return;

  const { canvas, rect } = target;
  const { x, y } = screenToMm(e.clientX, e.clientY, canvas, rect);
  const page = findPageByCanvas(canvas);
  if (!page) return;

  setSelectedPage(page.id);

  for (let i = page.elements.length - 1; i >= 0; i--) {
    const elem = page.elements[i];
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      setSelectedElement(elem.id);
      const s = getScale(canvas);
      const resizeThreshold = 20 / s;
      const isResize = (x > elem.x + elem.w - resizeThreshold) && (y > elem.y + elem.h - resizeThreshold);

      // 找到对应的 DOM 元素用于拖动时直接更新
      const domElement = canvas.querySelector(`[data-elem-id="${elem.id}"]`) ||
        canvas.children[i];

      dragState = {
        elementId: elem.id, pageId: page.id,
        startX: x, startY: y,
        origX: elem.x, origY: elem.y, origW: elem.w, origH: elem.h,
        isResize,
        domElement,
        canvas,
      };
      window.__photoAlbumDragging = true;
      e.preventDefault();
      return;
    }
  }
  setSelectedElement(null);
}

function onMouseMove(e) {
  if (!dragState) return;
  const rect = dragState.canvas.getBoundingClientRect();
  const { x, y } = screenToMm(e.clientX, e.clientY, dragState.canvas, rect);
  const dxCanvas = x - dragState.startX;
  const dyCanvas = y - dragState.startY;
  const { pages } = getState();
  const page = pages.find(p => p.id === dragState.pageId);
  if (!page) return;
  const elem = page.elements.find(el => el.id === dragState.elementId);
  if (!elem) return;

  // delta 已经是毫米（screenToMm 返回毫米）
  const dx = dxCanvas;
  const dy = dyCanvas;

  if (dragState.isResize) {
    const { w: pW, h: pH } = getPagePixelSize();
    elem.w = clamp(dragState.origW + dx, 20, pW / 3.7795);
    elem.h = clamp(dragState.origH + dy, 20, pH / 3.7795);
  } else {
    elem.x = dragState.origX + dx;
    elem.y = dragState.origY + dy;
  }

  // 直接更新 DOM 样式，不重建整个预览
  if (dragState.domElement) {
    const s = getScale(dragState.canvas);
    const mmToPxVal = (mm) => mm * 3.7795;
    dragState.domElement.style.left = `${mmToPxVal(elem.x) * s}px`;
    dragState.domElement.style.top = `${mmToPxVal(elem.y) * s}px`;
    dragState.domElement.style.width = `${mmToPxVal(elem.w) * s}px`;
    dragState.domElement.style.height = `${mmToPxVal(elem.h) * s}px`;
  }
}

function onMouseUp() {
  if (dragState) {
    const { pages } = getState();
    const page = pages.find(p => p.id === dragState.pageId);
    if (page) {
      const elem = page.elements.find(e => e.id === dragState.elementId);
      if (elem) {
        updateElement(dragState.pageId, dragState.elementId, {
          x: elem.x, y: elem.y, w: elem.w, h: elem.h,
        });
      }
    }
    dragState = null;
    window.__photoAlbumDragging = false;
    // 强制重新渲染以更新元数据块等附属元素位置
    forceRenderPreview();
  }
}

function onDblClick(e) {
  const target = findTargetPage(e.clientX, e.clientY);
  if (!target) return;

  const { canvas, rect } = target;
  const { x, y } = screenToMm(e.clientX, e.clientY, canvas, rect);
  const page = findPageByCanvas(canvas);
  if (!page) return;

  for (const elem of page.elements) {
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      if (elem.type === 'text') {
        const newText = prompt('编辑文字:', elem.text || '');
        if (newText !== null) updateElement(page.id, elem.id, { text: newText });
      } else if (elem.imageId) {
        // 双击图片编辑图注（作品集模式的元数据由 preview.js 处理）
        const newCaption = prompt('编辑图注:', elem.caption || '');
        if (newCaption !== null) updateElement(page.id, elem.id, { caption: newCaption });
      }
      return;
    }
  }
}
