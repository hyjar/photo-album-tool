/**
 * 页面预览渲染模块
 * 性能优化：增量更新、使用 objectURL、节流渲染
 */
import { getState, setSelectedPage, setSelectedElement } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { el, throttle } from './utils.js';

let scale = 0.5;
let _lastRenderKey = '';

// 生成渲染签名，用于跳过无变化的渲染
function getRenderKey() {
  const { pages, images, selectedPageId, selectedElementId, theme } = getState();
  return JSON.stringify({
    pageCount: pages.length,
    pageIds: pages.map(p => p.id),
    elements: pages.map(p => p.elements.map(e => `${e.id}:${Math.round(e.x)},${Math.round(e.y)},${Math.round(e.w)},${Math.round(e.h)}`)),
    selectedPageId,
    selectedElementId,
    bgColor: theme.bgColor,
    accentColor: theme.accentColor,
    imgCount: images.length,
  });
}

// 渲染所有页面预览
export function renderPreview() {
  const container = document.getElementById('page-preview');
  if (!container) return;

  const renderKey = getRenderKey();
  if (renderKey === _lastRenderKey) return; // 无变化，跳过
  _lastRenderKey = renderKey;

  const { pages, images, selectedPageId, selectedElementId, theme } = getState();
  container.innerHTML = '';

  if (pages.length === 0) {
    container.innerHTML = `
      <div class="empty-preview">
        <div class="empty-icon">📷</div>
        <p>导入图片并点击"自动排版"开始</p>
      </div>`;
    return;
  }

  const { w: pageW, h: pageH } = getPagePixelSize();
  const maxWidth = container.clientWidth || container.parentElement.clientWidth || 600;
  scale = Math.min((maxWidth - 60) / pageW, 0.7);
  scale = Math.max(scale, 0.05); // 保证最小缩放

  const fragment = document.createDocumentFragment();

  pages.forEach((page, pageIdx) => {
    const pageEl = el('div', {
      class: `preview-page ${page.id === selectedPageId ? 'selected' : ''}`,
      style: {
        width: `${pageW * scale}px`,
        height: `${pageH * scale}px`,
        backgroundColor: theme.bgColor,
      },
    }, [
      el('div', { class: 'page-number', textContent: `第 ${pageIdx + 1} 页` }),
    ]);

    pageEl.addEventListener('click', (e) => {
      if (e.target === pageEl || e.target.classList.contains('page-canvas')) {
        setSelectedPage(page.id);
      }
    });

    if (page.isTextPage) {
      const textOverlay = el('div', {
        class: 'text-page-content',
        style: {
          fontSize: `${(page.textStyle?.fontSize || 48) * scale}px`,
          fontWeight: page.textStyle?.fontWeight || 'bold',
          textAlign: page.textStyle?.textAlign || 'center',
          color: page.textStyle?.color || theme.accentColor,
        },
        textContent: page.text,
      });
      pageEl.appendChild(textOverlay);
    } else {
      const canvas = el('div', {
        class: 'page-canvas',
        id: page.id === selectedPageId ? 'page-canvas' : undefined,
      });

      page.elements.forEach(elem => {
        const img = images.find(i => i.id === elem.imageId);
        if (!img) return;

        const isSelected = elem.id === selectedElementId && page.id === selectedPageId;
        const imgEl = el('div', {
          class: `preview-element ${isSelected ? 'selected' : ''}`,
          style: {
            left: `${elem.x * scale}px`,
            top: `${elem.y * scale}px`,
            width: `${elem.w * scale}px`,
            height: `${elem.h * scale}px`,
          },
        }, [
          el('img', {
            src: img.previewURL || img.thumbURL || img.objectURL,
            style: { width: '100%', height: '100%', objectFit: 'cover' },
          }),
          ...(isSelected ? [el('div', { class: 'resize-handle' })] : []),
        ]);

        imgEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedPage(page.id);
          setSelectedElement(elem.id);
        });

        canvas.appendChild(imgEl);
      });

      pageEl.appendChild(canvas);
    }

    fragment.appendChild(pageEl);
  });

  container.appendChild(fragment);
}

// 节流版本的渲染（用于频繁调用的场景）
export const renderPreviewThrottled = throttle(renderPreview, 50);

// 强制重新渲染（忽略缓存）
export function forceRenderPreview() {
  _lastRenderKey = '';
  renderPreview();
}

export function setPreviewScale(s) {
  scale = s;
  _lastRenderKey = '';
  renderPreview();
}

export function getPreviewScale() {
  return scale;
}
