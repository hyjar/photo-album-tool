/**
 * 页面编辑器模块
 * 支持拖动、缩放、交换图片位置
 */
import { getState, updateElement, setSelectedElement, setSelectedPage } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { clamp } from './utils.js';
import { renderPreviewThrottled } from './preview.js';

let dragState = null;

// 初始化编辑器交互
export function initEditor() {
  const preview = document.getElementById('page-preview');
  if (!preview) return;

  preview.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function getCanvasOffset() {
  const canvas = document.getElementById('page-canvas');
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left, y: rect.top };
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

  const rect = canvas.getBoundingClientRect();
  const scale = getScale();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  const { pages, selectedPageId } = getState();
  const page = pages.find(p => p.id === selectedPageId);
  if (!page || page.isTextPage) return;

  // 检查是否点击了某个元素
  for (let i = page.elements.length - 1; i >= 0; i--) {
    const elem = page.elements[i];
    if (x >= elem.x && x <= elem.x + elem.w && y >= elem.y && y <= elem.y + elem.h) {
      setSelectedElement(elem.id);

      // 检查是否在右下角缩放区域
      const isResize = (x > elem.x + elem.w - 20 / scale) && (y > elem.y + elem.h - 20 / scale);

      dragState = {
        elementId: elem.id,
        pageId: selectedPageId,
        startX: x,
        startY: y,
        origX: elem.x,
        origY: elem.y,
        origW: elem.w,
        origH: elem.h,
        isResize,
      };

      e.preventDefault();
      return;
    }
  }

  // 点击空白区域取消选择
  setSelectedElement(null);
}

function onMouseMove(e) {
  if (!dragState) return;

  const canvas = document.getElementById('page-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scale = getScale();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  const dx = x - dragState.startX;
  const dy = y - dragState.startY;

  const { pages } = getState();
  const page = pages.find(p => p.id === dragState.pageId);
  if (!page) return;

  const elem = page.elements.find(e => e.id === dragState.elementId);
  if (!elem) return;

  if (dragState.isResize) {
    // 缩放
    const { w: pageW, h: pageH } = getPagePixelSize();
    const newW = clamp(dragState.origW + dx, 30, pageW);
    const newH = clamp(dragState.origH + dy, 30, pageH);
    elem.w = newW;
    elem.h = newH;
  } else {
    // 拖动
    elem.x = dragState.origX + dx;
    elem.y = dragState.origY + dy;
  }

  // 实时更新预览（节流）
  renderPreviewThrottled();
}

function onMouseUp() {
  if (dragState) {
    // 保存最终状态
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

// 交换两个元素的位置
export function swapElements(pageId, elemId1, elemId2) {
  const { pages } = getState();
  const page = pages.find(p => p.id === pageId);
  if (!page) return;

  const e1 = page.elements.find(e => e.id === elemId1);
  const e2 = page.elements.find(e => e.id === elemId2);
  if (!e1 || !e2) return;

  const tmpX = e1.x, tmpY = e1.y;
  e1.x = e2.x; e1.y = e2.y;
  e2.x = tmpX; e2.y = tmpY;

  updateElement(pageId, elemId1, { x: e1.x, y: e1.y });
  updateElement(pageId, elemId2, { x: e2.x, y: e2.y });
}
