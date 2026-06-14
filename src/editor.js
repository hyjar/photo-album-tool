/**
 * 编辑器
 * 支持：拖动、缩放、自由画布、文字叠加编辑、图注编辑
 */
import { getState, updateElement, setSelectedElement, setSelectedPage } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { clamp, mmToPx } from './utils.js';
import { renderPreviewThrottled } from './preview.js';

let dragState = null;

export function initEditor() {
  const preview = document.getElementById('page-preview');
  if (!preview) return;
  preview.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  preview.addEventListener('dblclick', onDblClick);
}

// 屏幕坐标 → 毫米坐标
function screenToMm(clientX, clientY) {
  const canvas = document.getElementById('page-canvas');
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const s = getScale();
  const px = (clientX - rect.left) / s;
  const py = (clientY - rect.top) / s;
  return { x: px / 3.7795, y: py / 3.7795 };
}

function getScale() {
  const canvas = document.getElementById('page-canvas');
  if (!canvas) return 1;
  const { w } = getPagePixelSize();
  return canvas.clientWidth / w;
}

function onMouseDown(e) {
  const canvas = document.getElementById('page-canvas');
  if (!canvas) return;
  const { x, y } = screenToMm(e.clientX, e.clientY);
  const { pages, selectedPageId } = getState();
  const page = pages.find(p => p.id === selectedPageId);
  if (!page) return;

  for (let i = page.elements.length - 1; i >= 0; i--) {
    const elem = page.elements[i];
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      setSelectedElement(elem.id);
      const s = getScale();
      const resizeThreshold = 20 / s / 3.7795; // 20px → mm
      const isResize = (x > elem.x + elem.w - resizeThreshold) && (y > elem.y + elem.h - resizeThreshold);
      dragState = {
        elementId: elem.id, pageId: selectedPageId,
        startX: x, startY: y,
        origX: elem.x, origY: elem.y, origW: elem.w, origH: elem.h,
        isResize,
      };
      e.preventDefault();
      return;
    }
  }
  setSelectedElement(null);
}

function onMouseMove(e) {
  if (!dragState) return;
  const { x, y } = screenToMm(e.clientX, e.clientY);
  const dx = x - dragState.startX;
  const dy = y - dragState.startY;
  const { pages } = getState();
  const page = pages.find(p => p.id === dragState.pageId);
  if (!page) return;
  const elem = page.elements.find(e => e.id === dragState.elementId);
  if (!elem) return;

  if (dragState.isResize) {
    const { w: pW, h: pH } = getPagePixelSize();
    elem.w = clamp(dragState.origW + dx, 5, pW / 3.7795);
    elem.h = clamp(dragState.origH + dy, 5, pH / 3.7795);
  } else {
    elem.x = dragState.origX + dx;
    elem.y = dragState.origY + dy;
  }
  renderPreviewThrottled();
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
  }
}

function onDblClick(e) {
  const { x, y } = screenToMm(e.clientX, e.clientY);
  const { pages, selectedPageId } = getState();
  const page = pages.find(p => p.id === selectedPageId);
  if (!page) return;

  for (const elem of page.elements) {
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      if (elem.type === 'text') {
        const newText = prompt('编辑文字:', elem.text || '');
        if (newText !== null) updateElement(page.id, elem.id, { text: newText });
      } else if (elem.imageId) {
        const newCaption = prompt('编辑图注:', elem.caption || '');
        if (newCaption !== null) updateElement(page.id, elem.id, { caption: newCaption });
      }
      return;
    }
  }
}
