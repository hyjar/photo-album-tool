/**
 * 排版引擎
 * 新增：cover/contain、自由画布、跨页大图、页面背景
 */
import { uid, mmToPx, A4_WIDTH_MM, A4_HEIGHT_MM, clamp } from './utils.js';
import { getState, setPages } from './state.js';

// 返回页面尺寸（毫米）— 布局引擎用
export function getPageMmSize() {
  const { pageSize, orientation } = getState();
  let w = pageSize.width;
  let h = pageSize.height;
  if (orientation === 'landscape') [w, h] = [h, w];
  return { w, h };
}

// 返回页面尺寸（像素）— 预览/编辑器用
export function getPagePixelSize() {
  const { w, h } = getPageMmSize();
  return { w: mmToPx(w), h: mmToPx(h) };
}

function getTheme() { return getState().theme; }
function pad() { return getTheme().padding; }
function gap() { return getTheme().spacing; }

// ====== 网格布局 ======
function layoutGrid(images, pageW, pageH) {
  if (!images.length) return [];
  const { fitMode } = getState();
  const pages = [];
  const p = pad(), g = gap();
  const cols = getState().gridColumns || 2;
  const usableW = pageW - p * 2;
  const cellW = (usableW - g * (cols - 1)) / cols;

  if (fitMode === 'cover') {
    // cover 模式：固定行高，图片裁剪填满
    const rowH = cellW * 0.75; // 默认行高为格子宽度的 75%
    let elems = [], y = p;
    for (let i = 0; i < images.length; i += cols) {
      const batch = images.slice(i, i + cols);
      if (y + rowH > pageH - p && elems.length) {
        pages.push({ id: uid(), elements: elems, background: null });
        elems = []; y = p;
      }
      batch.forEach((img, idx) => {
        elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g), y, w: cellW, h: rowH });
      });
      y += rowH + g;
    }
    if (elems.length) pages.push({ id: uid(), elements: elems, background: null });
  } else {
    // contain 模式：自适应行高
    const rows = [];
    let row = [], rowH = 0;
    for (const img of images) {
      const cellH = cellW / img.aspectRatio;
      row.push({ ...img, cellH });
      rowH = Math.max(rowH, cellH);
      if (row.length === cols) { rows.push({ items: row, height: rowH }); row = []; rowH = 0; }
    }
    if (row.length) rows.push({ items: row, height: Math.max(...row.map(i => i.cellH)) });

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
  }
  return pages;
}

// ====== 单页大图（支持 cover/contain + 自适应方向） ======
function layoutSingle(images, pageW, pageH, autoOrient) {
  const { fitMode } = getState();
  const pages = [];
  const p = pad();

  for (const img of images) {
    // 自适应方向：横图横放
    let pw = pageW, ph = pageH;
    if (autoOrient && img.width && img.height && img.width > img.height) {
      pw = pageH; ph = pageW;
    }
    const usableW = pw - p * 2;
    const usableH = ph - p * 2;

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
      // cover — 裁剪填满
      const byWidth_h = pw / img.aspectRatio;
      const byHeight_w = ph * img.aspectRatio;

      if (byWidth_h >= ph) {
        w = pw; h = byWidth_h;
      } else {
        h = ph; w = byHeight_w;
      }
      x = (pw - w) / 2;
      y = (ph - h) / 2;
    }
    pages.push({
      id: uid(),
      width: pw,
      height: ph,
      elements: [{ id: uid(), imageId: img.id, x, y, w, h }],
      background: null,
    });
  }
  return pages;
}

// ====== 拼贴风格 ======
function layoutCollage(images, pageW, pageH) {
  if (!images.length) return [];
  const { fitMode } = getState();
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
      if (fitMode === 'cover') {
        elems.push({ id: uid(), imageId: img.id, x: p, y: p, w: usableW, h: usableH });
      } else {
        let w, h;
        if (img.aspectRatio > usableW / usableH) { w = usableW * 0.8; h = w / img.aspectRatio; }
        else { h = usableH * 0.8; w = h * img.aspectRatio; }
        elems.push({ id: uid(), imageId: img.id, x: p + (usableW - w) / 2, y: p + (usableH - h) / 2, w, h });
      }
    } else if (n === 2) {
      const cellW = (usableW - g) / 2;
      batch.forEach((img, idx) => {
        if (fitMode === 'cover') {
          elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g), y: p, w: cellW, h: usableH });
        } else {
          const h = Math.min(cellW / img.aspectRatio, usableH);
          const w = h * img.aspectRatio;
          elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g) + (cellW - w) / 2, y: p + (usableH - h) / 2, w, h });
        }
      });
    } else if (n === 3) {
      const topH = usableH * 0.55;
      const bottomY = p + topH + g, bottomH = usableH - topH - g;
      const cellW = (usableW - g) / 2;
      if (fitMode === 'cover') {
        elems.push({ id: uid(), imageId: batch[0].id, x: p, y: p, w: usableW, h: topH });
        batch.slice(1).forEach((img, idx) => {
          elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g), y: bottomY, w: cellW, h: bottomH });
        });
      } else {
        const top = batch[0];
        const topW = Math.min(topH * top.aspectRatio, usableW);
        elems.push({ id: uid(), imageId: top.id, x: p + (usableW - topW) / 2, y: p, w: topW, h: topH });
        batch.slice(1).forEach((img, idx) => {
          const h = Math.min(bottomH, cellW / img.aspectRatio);
          const w = h * img.aspectRatio;
          elems.push({ id: uid(), imageId: img.id, x: p + idx * (cellW + g) + (cellW - w) / 2, y: bottomY + (bottomH - h) / 2, w, h });
        });
      }
    } else {
      const cellW = (usableW - g) / 2;
      if (fitMode === 'cover') {
        const cellH = (usableH - g) / 2;
        const positions = [
          { x: p, y: p },
          { x: p + cellW + g, y: p },
          { x: p, y: p + cellH + g },
          { x: p + cellW + g, y: p + cellH + g },
        ];
        batch.slice(0, 4).forEach((img, idx) => {
          const pos = positions[idx];
          elems.push({ id: uid(), imageId: img.id, x: pos.x, y: pos.y, w: cellW, h: cellH });
        });
      } else {
        const colY = [p, p];
        batch.forEach(img => {
          const c = colY[0] <= colY[1] ? 0 : 1;
          const h = Math.min(cellW / img.aspectRatio, usableH * 0.5);
          const w = h * img.aspectRatio;
          elems.push({ id: uid(), imageId: img.id, x: p + c * (cellW + g) + (cellW - w) / 2, y: colY[c], w, h });
          colY[c] += h + g;
        });
      }
    }
    pages.push({ id: uid(), elements: elems, background: null });
  }
  return pages;
}

// ====== 时间线 ======
function layoutTimeline(images, pageW, pageH) {
  if (!images.length) return [];
  const { fitMode } = getState();
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
      const isLeft = idx % 2 === 0;
      if (fitMode === 'cover') {
        // cover：图片填满分配的区域
        const cellW = usableW * 0.45;
        const x = isLeft ? p : p + usableW - cellW;
        const y = p + idx * (cellH + g);
        elems.push({ id: uid(), imageId: img.id, x, y, w: cellW, h: cellH });
      } else {
        // contain：图片适应区域
        const maxW = usableW * 0.7;
        let w, h;
        if (img.aspectRatio > maxW / cellH) { w = maxW; h = w / img.aspectRatio; }
        else { h = cellH; w = h * img.aspectRatio; }
        const x = isLeft ? p + (usableW * 0.35 - w) / 2 : p + usableW * 0.65 + (usableW * 0.35 - w) / 2;
        const y = p + idx * (cellH + g) + (cellH - h) / 2;
        elems.push({ id: uid(), imageId: img.id, x, y, w, h });
      }
    });
    pages.push({ id: uid(), elements: elems, background: null });
  }
  return pages;
}

// ====== 跨页大图（2 页拼接） ======
function layoutCrossPage(images, pageW, pageH) {
  if (!images.length) return [];
  const { fitMode } = getState();
  const pages = [];
  const p = pad(), g = gap();
  const usableW = pageW - p * 2;
  const usableH = pageH - p * 2;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    if (fitMode === 'cover') {
      // cover：图片填满两页
      pages.push({
        id: uid(),
        elements: [{
          id: uid(), imageId: img.id,
          x: p, y: p, w: usableW, h: usableH,
          crossPage: true, crossPageSide: 'left',
        }],
        background: null,
      });
      pages.push({
        id: uid(),
        elements: [{
          id: uid(), imageId: img.id,
          x: p - usableW - g, y: p, w: usableW + g, h: usableH,
          crossPage: true, crossPageSide: 'right',
        }],
        background: null,
      });
    } else {
      // contain：图片适应两页
      const spreadW = pageW * 2 + g;
      let w, h;
      if (img.aspectRatio > spreadW / usableH) {
        w = spreadW;
        h = w / img.aspectRatio;
      } else {
        h = usableH;
        w = h * img.aspectRatio;
      }

      const leftImgW = Math.min(w, pageW);
      pages.push({
        id: uid(),
        elements: [{
          id: uid(), imageId: img.id,
          x: p + (pageW - leftImgW) / 2,
          y: p + (usableH - h) / 2,
          w: leftImgW, h,
          crossPage: true, crossPageSide: 'left',
        }],
        background: null,
      });

      if (w > leftImgW) {
        pages.push({
          id: uid(),
          elements: [{
            id: uid(), imageId: img.id,
            x: p - (w - leftImgW) / 2,
            y: p + (usableH - h) / 2,
            w: Math.min(w - leftImgW + leftImgW * 0.3, pageW),
            h,
            crossPage: true, crossPageSide: 'right',
          }],
          background: null,
        });
      }
    }
  }
  return pages;
}

// ====== 作品集模式（每页一张居中，下方元数据） ======
function layoutPortfolio(images, pageW, pageH, autoOrient) {
  if (!images.length) return [];
  const { fitMode } = getState();
  const pages = [];
  const p = pad();
  const metaAreaH = 20;
  const gapBelowImg = 4;

  for (const img of images) {
    // auto-orient: landscape photos get landscape pages
    let pw = pageW, ph = pageH;
    if (autoOrient && img.width && img.height && img.width > img.height) {
      pw = pageH; ph = pageW;
    }

    const usableW = pw - p * 2;
    const imgAreaH = ph - p * 2 - metaAreaH - gapBelowImg;

    let w, h, x, y;
    if (fitMode === 'cover') {
      // cover：图片填满可用区域
      w = usableW;
      h = imgAreaH;
      x = p;
      y = p;
    } else {
      // contain：图片适应可用区域
      if (img.aspectRatio > usableW / imgAreaH) {
        w = usableW;
        h = w / img.aspectRatio;
      } else {
        h = imgAreaH;
        w = h * img.aspectRatio;
      }
      x = p + (usableW - w) / 2;
      y = p + (imgAreaH - h) / 2;
    }

    const exif = img.exif || {};
    const camera = exif.camera ? exif.camera + (exif.lens ? ` · ${exif.lens}` : '') : '';
    const params = [exif.aperture, exif.shutter, exif.iso, exif.focalLength].filter(Boolean).join(' · ');

    pages.push({
      id: uid(),
      width: pw,
      height: ph,
      elements: [{
        id: uid(),
        imageId: img.id,
        x, y, w, h,
        showMeta: true,
        metaCamera: camera,
        metaParams: params,
        description: img.description || img.name.replace(/\.[^.]+$/, ''),
      }],
      background: null,
    });
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
  const { images, template, autoOrient, classification } = getState();
  if (!images.length) return;
  const { w: pageW, h: pageH } = getPageMmSize();

  // 分类排序：同方向同类型图片集中排列
  let sortedImages = images;
  if (classification.enabled && Object.keys(classification.results).length > 0) {
    sortedImages = sortImagesByClassification(images, classification);
  }

  let pages;

  switch (template) {
    case 'single': pages = layoutSingle(sortedImages, pageW, pageH, autoOrient); break;
    case 'collage': pages = layoutCollage(sortedImages, pageW, pageH); break;
    case 'timeline': pages = layoutTimeline(sortedImages, pageW, pageH); break;
    case 'crosspage': pages = layoutCrossPage(sortedImages, pageW, pageH); break;
    case 'portfolio': pages = layoutPortfolio(sortedImages, pageW, pageH, autoOrient); break;
    case 'grid': default: pages = layoutGrid(sortedImages, pageW, pageH); break;
  }

  // 为每页添加默认背景
  pages.forEach(p => { if (!p.background) p.background = { type: 'none' }; });
  setPages(pages);
  return pages;
}

// 分类排序函数
function sortImagesByClassification(images, classification) {
  const { results, manualOverrides, mode } = classification;
  const orientationOrder = { portrait: 0, landscape: 1, square: 2 };
  const categoryOrder = { portrait: 0, landscape: 1, architecture: 2, macro: 3, animal: 4, food: 5, general: 6 };

  return [...images].sort((a, b) => {
    const ca = manualOverrides[a.id] ? { ...results[a.id], category: manualOverrides[a.id] } : results[a.id] || {};
    const cb = manualOverrides[b.id] ? { ...results[b.id], category: manualOverrides[b.id] } : results[b.id] || {};

    if (mode === 'orientation' || mode === 'both') {
      const oa = orientationOrder[ca.orientation] ?? 3;
      const ob = orientationOrder[cb.orientation] ?? 3;
      if (oa !== ob) return oa - ob;
    }

    if (mode === 'category' || mode === 'both') {
      const catA = categoryOrder[ca.category] ?? 7;
      const catB = categoryOrder[cb.category] ?? 7;
      if (catA !== catB) return catA - catB;
    }

    return 0;
  });
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
