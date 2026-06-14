/**
 * 页面预览渲染
 * 新增：页面背景、页码、页眉页脚、图注、文字叠加、自由画布
 */
import { getState, setSelectedPage, setSelectedElement, updateElement } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { el, throttle, mmToPx } from './utils.js';

function applyImageProps(element, props) {
  const {
    width,
    height,
    rotation,
    flipH,
    flipV,
    x,
    y,
    borderWidth,
    borderColor,
    borderRadius,
    brightness,
    contrast,
    saturate,
  } = props;

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;

  const transforms = [];
  if (rotation) transforms.push(`rotate(${rotation}deg)`);
  if (flipH) transforms.push('scaleX(-1)');
  if (flipV) transforms.push('scaleY(-1)');
  if (x || y) transforms.push(`translate(${x}px, ${y}px)`);

  element.style.transform = transforms.join(' ') || 'none';

  element.style.borderWidth = `${borderWidth}px`;
  element.style.borderColor = borderColor;
  element.style.borderStyle = borderWidth ? 'solid' : 'none';
  element.style.borderRadius = `${borderRadius}px`;

  const filters = [];
  if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
  if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
  if (saturate !== 100) filters.push(`saturate(${saturate}%)`);

  element.style.filter = filters.join(' ') || 'none';
}

let scale = 0.5;
let _lastRenderKey = '';

function getRenderKey() {
  const s = getState();
  return JSON.stringify({
    pc: s.pages.length, pi: s.pages.map(p => p.id),
    pe: s.pages.map(p => p.elements.map(e => `${e.id}:${Math.round(e.x)},${Math.round(e.y)},${Math.round(e.w)},${Math.round(e.h)}|${e.text || ''}|${e.caption || ''}`)),
    pb: s.pages.map(p => JSON.stringify(p.background)),
    sp: s.selectedPageId, se: s.selectedElementId,
    bg: s.theme.bgColor, ac: s.theme.accentColor,
    ic: s.images.length,
    pn: s.pageNumberEnabled, pnp: s.pageNumberPosition, pns: s.pageNumberStyle,
    ht: s.headerText, ft: s.footerText,
  });
}

function renderPageBackground(pageEl, page, scale) {
  const bg = page.background || { type: 'none' };
  if (bg.type === 'solid' && bg.color) {
    pageEl.style.background = bg.color;
  } else if (bg.type === 'gradient' && bg.color && bg.color2) {
    const angle = bg.angle || 135;
    pageEl.style.background = `linear-gradient(${angle}deg, ${bg.color}, ${bg.color2})`;
  } else if (bg.type === 'texture') {
    const patterns = {
      dots: `radial-gradient(circle, #ddd 1px, transparent 1px)`,
      grid: `linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)`,
      lines: `repeating-linear-gradient(0deg, transparent, transparent 10px, #eee 10px, #eee 11px)`,
    };
    pageEl.style.backgroundImage = patterns[bg.texture || 'dots'];
    pageEl.style.backgroundSize = bg.texture === 'grid' ? '20px 20px, 20px 20px' : '20px 20px';
  } else {
    pageEl.style.backgroundColor = getState().theme.bgColor;
  }
}

function renderPageNumber(pageEl, pageIdx, totalPages) {
  const s = getState();
  if (!s.pageNumberEnabled) return;
  const pos = s.pageNumberPosition;
  const style = s.pageNumberStyle;

  let text;
  if (style === 'line') {
    text = `—— ${pageIdx + 1} / ${totalPages} ——`;
  } else {
    text = `${pageIdx + 1}`;
  }

  const numEl = el('div', {
    class: `page-number page-number-${pos}`,
    textContent: text,
  });
  pageEl.appendChild(numEl);
}

function renderHeaderFooter(pageEl) {
  const s = getState();
  if (s.headerText) {
    pageEl.appendChild(el('div', { class: 'page-header', textContent: s.headerText }));
  }
  if (s.footerText) {
    pageEl.appendChild(el('div', { class: 'page-footer', textContent: s.footerText }));
  }
}

function renderImageElement(elem, page, isSelected, scale) {
  const { images } = getState();
  const img = images.find(i => i.id === elem.imageId);
  if (!img) return null;

  // portfolio 模式用 contain（不裁剪），其他模式用 cover
  const useContain = elem.showMeta === true;
  const children = [
    el('img', {
      src: img.previewURL || img.thumbURL || img.objectURL,
      style: { width: '100%', height: '100%', objectFit: useContain ? 'contain' : 'cover' },
    }),
  ];

  // 图注
  if (elem.caption !== undefined && elem.caption !== null) {
    const capStyle = elem.captionStyle || {};
    children.push(el('div', {
      class: 'element-caption',
      style: {
        fontSize: `${(capStyle.fontSize || 10) * scale}px`,
        color: capStyle.color || '#666666',
        position: 'absolute',
        bottom: `-${16 * scale}px`,
        left: 0, right: 0,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      textContent: elem.caption,
    }));
  }

  // 选中手柄
  if (isSelected) {
    children.push(el('div', { class: 'resize-handle' }));
  }

  const wrapper = el('div', {
    class: `preview-element ${isSelected ? 'selected' : ''}`,
    'data-elem-id': elem.id,
    style: {
      left: `${mmToPx(elem.x) * scale}px`,
      top: `${mmToPx(elem.y) * scale}px`,
      width: `${mmToPx(elem.w) * scale}px`,
      height: `${mmToPx(elem.h) * scale}px`,
    },
  }, children);

  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    setSelectedPage(page.id);
    setSelectedElement(elem.id);
  });

  // 元数据块（作品集模式）
  if (elem.showMeta === true) {
    const metaLines = [];

    // 第一行：相机型号
    if (elem.metaCamera) {
      metaLines.push(el('div', {
        class: 'meta-camera meta-editable',
        'data-meta-field': 'camera',
        style: { fontSize: `${11 * scale}px` },
        textContent: elem.metaCamera,
      }));
    }

    // 第二行：拍摄参数
    if (elem.metaParams) {
      metaLines.push(el('div', {
        class: 'meta-params meta-editable',
        'data-meta-field': 'params',
        style: { fontSize: `${9 * scale}px` },
        textContent: elem.metaParams,
      }));
    }

    // 第三行：描述
    const desc = elem.description || img.name.replace(/\.[^.]+$/, '');
    metaLines.push(el('div', {
      class: 'meta-desc meta-editable',
      'data-meta-field': 'description',
      style: { fontSize: `${9 * scale}px` },
      textContent: desc,
    }));

    if (metaLines.length) {
      // 双击编辑每行文字
      metaLines.forEach(line => {
        line.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const field = line.getAttribute('data-meta-field');
          const current = line.textContent;
          const labels = { camera: '设备信息', params: '拍摄参数', description: '图片描述' };
          const newVal = prompt(`编辑${labels[field] || field}:`, current);
          if (newVal !== null) {
            const fieldMap = { camera: 'metaCamera', params: 'metaParams', description: 'description' };
            updateElement(page.id, elem.id, { [fieldMap[field]]: newVal });
          }
        });
      });

      const metaBlock = el('div', {
        class: 'portfolio-meta',
        style: { top: `${mmToPx(elem.y + elem.h) * scale + 4 * scale}px` },
      }, metaLines);
      return [wrapper, metaBlock];
    }
  }

  return wrapper;
}

function renderTextElement(elem, page, isSelected, scale) {
  const s = elem.style || {};
  const children = [
    el('div', {
      style: {
        fontSize: `${(s.fontSize || 14) * scale}px`,
        fontWeight: s.bold ? 'bold' : 'normal',
        fontStyle: s.italic ? 'italic' : 'normal',
        textDecoration: s.underline ? 'underline' : 'none',
        color: s.color || '#ffffff',
        textShadow: s.stroke ? `1px 1px 2px ${s.strokeColor || '#000'}, -1px -1px 2px ${s.strokeColor || '#000'}` : 'none',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        wordBreak: 'break-word',
      },
      textContent: elem.text || '',
    }),
  ];

  if (isSelected) children.push(el('div', { class: 'resize-handle' }));

  const wrapper = el('div', {
    class: `preview-element preview-text-element ${isSelected ? 'selected' : ''}`,
    'data-elem-id': elem.id,
    style: {
      left: `${mmToPx(elem.x) * scale}px`,
      top: `${mmToPx(elem.y) * scale}px`,
      width: `${mmToPx(elem.w) * scale}px`,
      height: `${mmToPx(elem.h) * scale}px`,
    },
  }, children);

  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    setSelectedPage(page.id);
    setSelectedElement(elem.id);
  });

  return wrapper;
}

export function renderPreview() {
  const container = document.getElementById('page-preview');
  if (!container) return;

  // 拖动中跳过重渲染，避免销毁 canvas 导致拖动中断
  if (window.__photoAlbumDragging) return;

  const renderKey = getRenderKey();
  if (renderKey === _lastRenderKey) return;
  _lastRenderKey = renderKey;

  // 保存滚动位置
  const scrollTop = container.scrollTop || container.parentElement?.scrollTop || 0;

  const { pages, selectedPageId, selectedElementId } = getState();
  container.innerHTML = '';

  if (!pages.length) {
    container.innerHTML = '<div class="empty-preview"><div class="empty-icon">📷</div><p>导入图片并点击"排版"开始</p></div>';
    return;
  }

  const { w: defaultPageW, h: defaultPageH } = getPagePixelSize();
  const maxW = container.clientWidth || container.parentElement.clientWidth || 600;
  // 计算所有页面的最大宽度（支持混合方向）
  let maxPageW = defaultPageW;
  pages.forEach(p => {
    if (p.width && p.height) {
      const pw = p.width * 3.7795;
      if (pw > maxPageW) maxPageW = pw;
    }
  });
  scale = Math.min((maxW - 60) / maxPageW, 0.7);
  scale = Math.max(scale, 0.05);

  const fragment = document.createDocumentFragment();

  pages.forEach((page, pageIdx) => {
    // 使用页面自带尺寸（支持混合方向）
    const pageW = (page.width || getState().pageSize.width) * 3.7795;
    const pageH = (page.height || getState().pageSize.height) * 3.7795;
    const pageEl = el('div', {
      class: `preview-page ${page.id === selectedPageId ? 'selected' : ''}`,
      style: { width: `${pageW * scale}px`, height: `${pageH * scale}px` },
    });

    // 页面背景
    renderPageBackground(pageEl, page, scale);

    // 页眉页脚
    renderHeaderFooter(pageEl);

    if (page.isTextPage) {
      const style = page.textStyle || {};
      pageEl.appendChild(el('div', {
        class: 'text-page-content',
        style: {
          fontSize: `${(style.fontSize || 48) * scale}px`,
          fontWeight: style.fontWeight || 'bold',
          textAlign: style.textAlign || 'center',
          color: style.color || getState().theme.accentColor,
        },
        textContent: page.text,
      }));
    } else {
      // 图片或自由画布
      const canvas = el('div', { class: 'page-canvas' });
      page.elements.forEach(elem => {
        const el_ = elem.type === 'text'
          ? renderTextElement(elem, page, elem.id === selectedElementId && page.id === selectedPageId, scale)
          : renderImageElement(elem, page, elem.id === selectedElementId && page.id === selectedPageId, scale);
        if (!el_) return;
        if (Array.isArray(el_)) {
          el_.forEach(child => canvas.appendChild(child));
        } else {
          canvas.appendChild(el_);
        }
      });
      pageEl.appendChild(canvas);
    }

    // 页码
    renderPageNumber(pageEl, pageIdx, pages.length);

    pageEl.addEventListener('click', (e) => {
      if (e.target === pageEl || e.target.classList.contains('page-canvas') || e.target.classList.contains('text-page-content')) {
        setSelectedPage(page.id);
      }
    });

    fragment.appendChild(pageEl);
  });

  container.appendChild(fragment);

  // 恢复滚动位置
  if (scrollTop > 0) {
    const scrollTarget = container.parentElement || container;
    scrollTarget.scrollTop = scrollTop;
  }

  // Apply image properties to preview elements
  const { selectedImageId, selectedImageProps } = getState();
  pages.forEach(page => {
    page.elements.forEach(elem => {
      if (elem.type === 'text') return;
      const element = container.querySelector(`[data-elem-id="${elem.id}"]`);
      if (element) {
        const props = elem.id === selectedImageId ? selectedImageProps : {
          width: elem.width || 100,
          height: elem.height || 100,
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
        };
        applyImageProps(element, props);
      }
    });
  });
}

export const renderPreviewThrottled = throttle(renderPreview, 50);
export function forceRenderPreview() { _lastRenderKey = ''; renderPreview(); }
export function setPreviewScale(s) { scale = s; _lastRenderKey = ''; renderPreview(); }
export function getPreviewScale() { return scale; }
