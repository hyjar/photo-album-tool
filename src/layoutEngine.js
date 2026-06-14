/**
 * 排版引擎
 * 新增：cover/contain、自由画布、跨页大图、页面背景
 */
import { uid, mmToPx, A4_WIDTH_MM, A4_HEIGHT_MM, clamp } from './utils.js';
import { getState, setPages } from './state.js';

export function getPagePixelSize() {
  const { pageSize, orientation } = getState();
  let w = pageSize.width;
  let h = pageSize.height;
  if (orientation === 'landscape') [w, h] = [h, w];
  return { w: mmToPx(w), h: mmToPx(h) };
}

function getTheme() { return getState().theme; }
function pad() { return getTheme().padding; }
function gap() { return getTheme().spacing; }

// ====== 网格布局 ======
function layoutGrid(images, pageW, pageH) {
  if (!images.length) return [];
  const pages = [];
  const p = pad(), g = gap();
  const cols = 2;
  const usableW = pageW - p * 2;
  const cellW = (usableW - g * (cols - 1)) / cols;

  // 构建行
  const rows = [];
  let row = [], rowH = 0;
  for (const img of images) {
    const cellH = cellW / img.aspectRatio;
    row.push({ ...img, cellH });
    rowH = Math.max(rowH, cellH);
    if (row.length === cols) { rows.push({ items: row, height: rowH }); row = []; rowH = 0; }
  }
  if (row.length) rows.push({ items: row, height: Math.max(...row.map(i => i.cellH)) });

  // 分页
  let elems = [], y = p;
  for (const r of rows) {
    if (y + r.height > pageH - p && elems.length) {
      pages.push({ id: uid(), elements: elems, background: null });
      elems = []; y = p;
    }
    let x = p;
    for (const item of r.items) {
      elems.push({ id: uid(), imageId: item.id, x, y, w: r.height * item.aspectRatio, h: r.height });
      x += r.height * item.aspectRatio + g;
    }
    y += r.height + g;
  }
  if (elems.length) pages.push({ id: uid(), elements: elems, background: null });
  return pages;
}

// ====== 单页大图（支持 cover/contain） ======
function layoutSingle(images, pageW, pageH) {
  const { fitMode } = getState();
  const pages = [];
  const p = pad();
  const usableW = pageW - p * 2;
  const usableH = pageH - p * 2;

  for (const img of images) {
    let w, h, x, y;
    if (fitMode === 'contain') {
      // 完整显示，留白边距
      if (img.aspectRatio > usableW / usableH) {
        w = usableW;
        h = w / img.aspectRatio;
      } else {
        h = usableH;
        w = h * img.aspectRatio;
      }
      x = p + (usableW - w) / 2;
      y = p + (usableH - h) / 2;
    } else {
      // cover — 裁剪填满（取较大缩放比，确保完全覆盖）
      const scaleW = usableW / img.aspectRatio; // 以宽度为基准时的高度
      const scaleH = usableH * img.aspectRatio; // 以高度为基准时的宽度
      if (scaleW > usableH) {
        // 宽度基准能覆盖 → 用宽度基准
        w = usableW;
        h = scaleW;
      } else {
        // 高度基准能覆盖 → 用高度基准
        h = usableH;
        w = scaleH;
      }
      x = p + (usableW - w) / 2;
      y = p + (usableH - h) / 2;
    }
    pages.push({
      id: uid(),
      elements: [{ id: uid(), imageId: img.id, x, y, w, h }],
      background: null,
    });
  }
  return pages;
}

// ====== 拼贴风格 ======
function layoutCollage(images, pageW, pageH) {
  if (!images.length) return [];
  const pages = [];
  const p = pad(), g = gap();
  const usableW = pageW - p * 2;
  const usableH = pageH - p * 2;
  const perPage = Math.min(6, Math.max(2, Math.ceil(images.length / 3)));

  for (let i = 0; i < images.length; i += perPage) {
    const batch = images.slice(i, i + perPage);
    const elems = [];
    const n = batch.length;

    if (n === 1) {
      const img = batch[0];
      let w, h;
      if (img.aspectRatio > usableW / usableH) { w = usableW * 0.8; h = w / img.aspectRatio; }
      else { h = usableH * 0.8; w = h * img.aspectRatio; }
      elems.push({ id: uid(), imageId: img.id, x: p + (usableW - w) / 2, y: p + (usableH - h) / 2, w, h });
    } else if (n === 2) {
      const cellW = (usableW - g) / 2;
      batch.forEach((img, idx) => {
        const h = Math.min(cellW / img.aspectRatio, usableH);
        const w = h * img.aspectRatio;
        elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g) + (cellW - w) / 2, y: p + (usableH - h) / 2, w, h });
      });
    } else if (n === 3) {
      const top = batch[0], topH = usableH * 0.55;
      const topW = Math.min(topH * top.aspectRatio, usableW);
      elems.push({ id: uid(), imageId: top.id, x: p + (usableW - topW) / 2, y: p, w: topW, h: topH });
      const bottomY = p + topH + g, bottomH = usableH - topH - g;
      const cellW = (usableW - g) / 2;
      batch.slice(1).forEach((img, idx) => {
        const h = Math.min(bottomH, cellW / img.aspectRatio);
        const w = h * img.aspectRatio;
        elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g) + (cellW - w) / 2, y: bottomY + (bottomH - h) / 2, w, h });
      });
    } else {
      const cellW = (usableW - g) / 2;
      const colY = [p, p];
      batch.forEach(img => {
        const c = colY[0] <= colY[1] ? 0 : 1;
        const h = Math.min(cellW / img.aspectRatio, usableH * 0.5);
        const w = h * img.aspectRatio;
        elems.push({ id: uid(), imageId: img.id, x: p + c * (cellW + g) + (cellW - w) / 2, y: colY[c], w, h });
        colY[c] += h + g;
      });
    }
    pages.push({ id: uid(), elements: elems, background: null });
  }
  return pages;
}

// ====== 时间线 ======
function layoutTimeline(images, pageW, pageH) {
  if (!images.length) return [];
  const pages = [];
  const p = pad(), g = gap();
  const usableW = pageW - p * 2;
  const usableH = pageH - p * 2;
  const perPage = 3;

  for (let i = 0; i < images.length; i += perPage) {
    const batch = images.slice(i, i + perPage);
    const elems = [];
    const cellH = (usableH - g * (batch.length - 1)) / batch.length;

    batch.forEach((img, idx) => {
      const maxW = usableW * 0.7;
      let w, h;
      if (img.aspectRatio > maxW / cellH) { w = maxW; h = w / img.aspectRatio; }
      else { h = cellH; w = h * img.aspectRatio; }
      const isLeft = idx % 2 === 0;
      const x = isLeft ? p + (usableW * 0.35 - w) / 2 : p + usableW * 0.65 + (usableW * 0.35 - w) / 2;
      const y = p + idx * (cellH + g) + (cellH - h) / 2;
      elems.push({ id: uid(), imageId: img.id, x, y, w, h });
    });
    pages.push({ id: uid(), elements: elems, background: null });
  }
  return pages;
}

// ====== 跨页大图（2 页拼接） ======
function layoutCrossPage(images, pageW, pageH) {
  if (!images.length) return [];
  const pages = [];
  const p = pad(), g = gap();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    // 每张图占 2 页
    const spreadW = pageW * 2 + g;
    const usableH = pageH - p * 2;
    let w, h;
    if (img.aspectRatio > spreadW / usableH) {
      w = spreadW;
      h = w / img.aspectRatio;
    } else {
      h = usableH;
      w = h * img.aspectRatio;
    }

    // 左页：图片的左半部分
    const leftPageW = pageW;
    const leftImgW = Math.min(w, leftPageW);
    pages.push({
      id: uid(),
      elements: [{
        id: uid(),
        imageId: img.id,
        x: p + (leftPageW - leftImgW) / 2,
        y: p + (usableH - h) / 2,
        w: leftImgW,
        h,
        crossPage: true,
        crossPageSide: 'left',
      }],
      background: null,
    });

    // 右页：图片的右半部分
    const rightPageW = pageW;
    const rightImgW = Math.min(w - leftImgW + (g * 0), rightPageW);
    if (w > leftImgW) {
      pages.push({
        id: uid(),
        elements: [{
          id: uid(),
          imageId: img.id,
          x: p - (w - leftImgW) / 2,
          y: p + (usableH - h) / 2,
          w: Math.min(w - leftImgW + leftImgW * 0.3, rightPageW),
          h,
          crossPage: true,
          crossPageSide: 'right',
        }],
        background: null,
      });
    }
  }
  return pages;
}

// ====== 自由画布页面 ======
export function createFreeCanvasPage() {
  return {
    id: uid(),
    isFreeCanvas: true,
    elements: [],
    background: null,
  };
}

// ====== 主排版函数 ======
export function autoLayout() {
  const { images, template } = getState();
  if (!images.length) return;
  const { w: pageW, h: pageH } = getPagePixelSize();
  let pages;

  switch (template) {
    case 'single': pages = layoutSingle(images, pageW, pageH); break;
    case 'collage': pages = layoutCollage(images, pageW, pageH); break;
    case 'timeline': pages = layoutTimeline(images, pageW, pageH); break;
    case 'crosspage': pages = layoutCrossPage(images, pageW, pageH); break;
    case 'grid': default: pages = layoutGrid(images, pageW, pageH); break;
  }

  // 为每页添加默认背景
  pages.forEach(p => { if (!p.background) p.background = { type: 'none' }; });
  setPages(pages);
  return pages;
}

// ====== 文字页面 ======
export function addTitlePage(text, style = {}) {
  const { pages } = getState();
  pages.unshift({
    id: uid(), isTextPage: true, text: text || '摄影集',
    textStyle: { fontSize: 48, fontWeight: 'bold', textAlign: 'center', color: getState().theme.accentColor, ...style },
    elements: [], background: { type: 'none' },
  });
  setPages(pages);
}
export function addChapterPage(text, style = {}) {
  const { pages } = getState();
  pages.push({
    id: uid(), isTextPage: true, text: text || '章节标题',
    textStyle: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: getState().theme.accentColor, ...style },
    elements: [], background: { type: 'none' },
  });
  setPages(pages);
}
