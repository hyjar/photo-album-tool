/**
 * 编辑器
 * 支持：拖动、缩放、自由画布、文字叠加编辑、图注编辑、辅助线
 * 布局引擎返回像素坐标，编辑器屏幕坐标直接转像素
 */
import { getState, updateElement, setSelectedElement, setSelectedPage, setSelectedImage, clearSelectedImage } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { clamp } from './utils.js';
import { renderPreviewThrottled, forceRenderPreview } from './preview.js';
import { createInlineEditor } from './richTextEditor.js';

let dragState = null;
let guideElements = [];

export function initEditor() {
  const preview = document.getElementById('page-preview');
  if (!preview) return;
  preview.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  preview.addEventListener('dblclick', onDblClick);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.right-sidebar') && !e.target.closest('.preview-element')) {
      clearSelectedImage();
      document.getElementById('right-sidebar')?.classList.remove('visible');
      document.querySelector('.main-content')?.classList.remove('shifted');
    }
  });
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

function getScale(canvas, page) {
  if (!canvas) return 1;
  const pw = page && page.width ? page.width * 3.7795 : getPagePixelSize().w;
  return canvas.clientWidth / pw;
}

// ====== 辅助线系统 ======
const GUIDE_THRESHOLD = 2; // mm，触发吸附的距离

function clearGuides() {
  guideElements.forEach(el => el.remove());
  guideElements = [];
}

function addGuide(canvas, type, pos, label, isVertical) {
  const div = document.createElement('div');
  div.className = `guide-line ${isVertical ? 'guide-line-v' : 'guide-line-h'} guide-${type}`;
  if (isVertical) {
    div.style.left = `${pos}px`;
  } else {
    div.style.top = `${pos}px`;
  }
  canvas.appendChild(div);
  guideElements.push(div);

  if (label) {
    const lbl = document.createElement('div');
    lbl.className = `guide-label ${isVertical ? 'guide-label-v' : 'guide-label-h'}`;
    lbl.textContent = label;
    if (isVertical) {
      lbl.style.left = `${pos + 4}px`;
    } else {
      lbl.style.top = `${pos + 4}px`;
    }
    canvas.appendChild(lbl);
    guideElements.push(lbl);
  }
}

function findAlignments(elem, page, canvas, scale) {
  const guides = [];
  const pageW = (page.width || getState().pageSize.width);
  const pageH = (page.height || getState().pageSize.height);
  const mmToPx = (mm) => mm * 3.7795 * scale;

  const cx = elem.x + elem.w / 2;
  const cy = elem.y + elem.h / 2;
  const pageCx = pageW / 2;
  const pageCy = pageH / 2;
  const p = getState().theme.padding;

  // 页面中心
  if (Math.abs(cx - pageCx) < GUIDE_THRESHOLD) {
    guides.push({ type: 'center', px: mmToPx(pageCx), label: '水平居中', vertical: true, snapX: pageCx - elem.w / 2 });
  }
  if (Math.abs(cy - pageCy) < GUIDE_THRESHOLD) {
    guides.push({ type: 'center', px: mmToPx(pageCy), label: '垂直居中', vertical: false, snapY: pageCy - elem.h / 2 });
  }

  // 页面边距
  const edges = [
    { val: elem.x, ref: p, label: `左 ${p}mm`, vertical: true, snap: p },
    { val: elem.x + elem.w, ref: pageW - p, label: `右 ${p}mm`, vertical: true, snap: pageW - p - elem.w },
    { val: elem.y, ref: p, label: `上 ${p}mm`, vertical: false, snap: p },
    { val: elem.y + elem.h, ref: pageH - p, label: `下 ${p}mm`, vertical: false, snap: pageH - p - elem.h },
  ];
  for (const e of edges) {
    if (Math.abs(e.val - e.ref) < GUIDE_THRESHOLD) {
      guides.push({ type: 'edge', px: mmToPx(e.ref), label: e.label, vertical: e.vertical,
        snapX: e.vertical ? e.snap : undefined,
        snapY: !e.vertical ? e.snap : undefined,
      });
    }
  }

  // 其他元素对齐
  for (const other of page.elements) {
    if (other.id === elem.id) continue;
    const ocx = other.x + other.w / 2;
    const ocy = other.y + other.h / 2;

    // 中心对齐
    if (Math.abs(cx - ocx) < GUIDE_THRESHOLD) {
      guides.push({ type: 'element', px: mmToPx(ocx), label: null, vertical: true, snapX: ocx - elem.w / 2 });
    }
    if (Math.abs(cy - ocy) < GUIDE_THRESHOLD) {
      guides.push({ type: 'element', px: mmToPx(ocy), label: null, vertical: false, snapY: ocy - elem.h / 2 });
    }

    // 边缘对齐
    const otherEdges = [
      { val: elem.x, ref: other.x, vertical: true, snap: other.x },
      { val: elem.x + elem.w, ref: other.x + other.w, vertical: true, snap: other.x + other.w - elem.w },
      { val: elem.x, ref: other.x + other.w, vertical: true, snap: other.x + other.w },
      { val: elem.x + elem.w, ref: other.x, vertical: true, snap: other.x - elem.w },
      { val: elem.y, ref: other.y, vertical: false, snap: other.y },
      { val: elem.y + elem.h, ref: other.y + other.h, vertical: false, snap: other.y + other.h - elem.h },
      { val: elem.y, ref: other.y + other.h, vertical: false, snap: other.y + other.h },
      { val: elem.y + elem.h, ref: other.y, vertical: false, snap: other.y - elem.h },
    ];
    for (const oe of otherEdges) {
      if (Math.abs(oe.val - oe.ref) < GUIDE_THRESHOLD) {
        guides.push({ type: 'element', px: mmToPx(oe.ref), label: null, vertical: oe.vertical,
          snapX: oe.vertical ? oe.snap : undefined,
          snapY: !oe.vertical ? oe.snap : undefined,
        });
      }
    }
  }

  return guides;
}

function applyGuidesAndSnap(elem, page, canvas, scale) {
  clearGuides();
  const alignments = findAlignments(elem, page, canvas, scale);

  let snappedX = false, snappedY = false;
  for (const g of alignments) {
    addGuide(canvas, g.type, g.px, g.label, g.vertical);
    if (g.snapX !== undefined && !snappedX) { elem.x = g.snapX; snappedX = true; }
    if (g.snapY !== undefined && !snappedY) { elem.y = g.snapY; snappedY = true; }
  }
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
      setSelectedImage(elem.id, {
        width: elem.w || 100,
        height: elem.h || 100,
        rotation: elem.rotation || 0,
        flipH: elem.flipH || false,
        flipV: elem.flipV || false,
        x: elem.x || 0,
        y: elem.y || 0,
        borderWidth: elem.borderWidth || 0,
        borderColor: elem.borderColor || '#000000',
        borderRadius: elem.borderRadius || 0,
        brightness: elem.brightness || 100,
        contrast: elem.contrast || 100,
        saturate: elem.saturate || 100,
      });
      document.getElementById('right-sidebar')?.classList.add('visible');
      document.querySelector('.main-content')?.classList.add('shifted');
      // 缩放区域：右下角小角落，取元素短边的 15% 且不超过 8mm
      const cornerSize = Math.min(Math.max(elem.w, elem.h) * 0.15, 8);
      const isResize = (x > elem.x + elem.w - cornerSize) && (y > elem.y + elem.h - cornerSize);

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

  // 辅助线对齐和吸附（仅移动时）
  if (!dragState.isResize) {
    const s = getScale(dragState.canvas, page);
    applyGuidesAndSnap(elem, page, dragState.canvas, s);
  }

  // 直接更新 DOM 样式，不重建整个预览
  if (dragState.domElement) {
    const s = getScale(dragState.canvas, page);
    const mmToPxVal = (mm) => mm * 3.7795;
    dragState.domElement.style.left = `${mmToPxVal(elem.x) * s}px`;
    dragState.domElement.style.top = `${mmToPxVal(elem.y) * s}px`;
    dragState.domElement.style.width = `${mmToPxVal(elem.w) * s}px`;
    dragState.domElement.style.height = `${mmToPxVal(elem.h) * s}px`;
  }
}

function onMouseUp() {
  if (dragState) {
    clearGuides();
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
        createInlineEditor(e.target, {
          value: elem.text || '',
          rich: true,
          onChange: (newText) => {
            updateElement(page.id, elem.id, { text: newText });
          }
        });
      } else if (elem.imageId) {
        createInlineEditor(e.target, {
          value: elem.caption || '',
          onChange: (newCaption) => {
            updateElement(page.id, elem.id, { caption: newCaption });
          }
        });
      }
      return;
    }
  }
}
