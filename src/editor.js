/**
 * 编辑器
 * 支持：拖动、缩放、自由画布、文字叠加编辑、图注编辑
 * 布局引擎返回像素坐标，编辑器屏幕坐标直接转像素
 */
import { getState, updateElement, setSelectedElement, setSelectedPage } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { clamp } from './utils.js';
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

// 屏幕坐标 → 页面像素坐标
function screenToPage(clientX, clientY) {
  const canvas = document.getElementById('page-canvas');
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const s = getScale();
  return {
    x: (clientX - rect.left) / s,
    y: (clientY - rect.top) / s,
  };
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
  const { x, y } = screenToPage(e.clientX, e.clientY);
  const { pages, selectedPageId } = getState();
  const page = pages.find(p => p.id === selectedPageId);
  if (!page) return;

  for (let i = page.elements.length - 1; i >= 0; i--) {
    const elem = page.elements[i];
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      setSelectedElement(elem.id);
      const s = getScale();
      const resizeThreshold = 20 / s;
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
  const { x, y } = screenToPage(e.clientX, e.clientY);
  const dx = x - dragState.startX;
  const dy = y - dragState.startY;
  const { pages } = getState();
  const page = pages.find(p => p.id === dragState.pageId);
  if (!page) return;
  const elem = page.elements.find(e => e.id === dragState.elementId);
  if (!elem) return;

  if (dragState.isResize) {
    const { w: pW, h: pH } = getPagePixelSize();
    elem.w = clamp(dragState.origW + dx, 20, pW);
    elem.h = clamp(dragState.origH + dy, 20, pH);
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
  const { x, y } = screenToPage(e.clientX, e.clientY);
  const { pages, selectedPageId } = getState();
  const page = pages.find(p => p.id === selectedPageId);
  if (!page) return;

  for (const elem of page.elements) {
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      if (elem.type === 'text') {
        const newText = prompt('编辑文字:', elem.text || '');
        if (newText !== null) updateElement(page.id, elem.id, { text: newText });
      } else if (elem.imageId) {
        // 作品集模式：编辑描述；否则编辑图注
        if (elem.showMeta) {
          const newDesc = prompt('编辑图片描述:', elem.description || '');
          if (newDesc !== null) {
            updateElement(page.id, elem.id, { description: newDesc });
            // 同步更新 image 对象
            const img = getState().images.find(i => i.id === elem.imageId);
            if (img) img.description = newDesc;
          }
        } else {
          const newCaption = prompt('编辑图注:', elem.caption || '');
          if (newCaption !== null) updateElement(page.id, elem.id, { caption: newCaption });
        }
      }
      return;
    }
  }
}
