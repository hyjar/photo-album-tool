/**
 * 自动排版引擎
 * 支持：网格、单页大图、拼贴、时间线
 */
import { uid, mmToPx, A4_WIDTH_MM, A4_HEIGHT_MM } from './utils.js';
import { getState, setPages } from './state.js';

// 获取当前页面像素尺寸
export function getPagePixelSize() {
  const { pageSize, orientation } = getState();
  let w = pageSize.width;
  let h = pageSize.height;
  if (orientation === 'landscape') [w, h] = [h, w];
  return { w: mmToPx(w), h: mmToPx(h) };
}

// ============ 网格布局 ============
function layoutGrid(images, pageW, pageH, cols = 3) {
  if (images.length === 0) return [];
  const pages = [];
  const padding = getState().theme.padding;
  const spacing = getState().theme.spacing;
  const usableW = pageW - padding * 2;
  const usableH = pageH - padding * 2;
  const cellW = (usableW - spacing * (cols - 1)) / cols;

  // 计算每页能放多少行
  const rows = [];
  let currentRow = [];
  let currentRowH = 0;

  for (const img of images) {
    const cellH = cellW / img.aspectRatio;
    currentRow.push({ ...img, cellH });
    currentRowH = Math.max(currentRowH, cellH);

    if (currentRow.length === cols) {
      rows.push({ items: currentRow, height: currentRowH });
      currentRow = [];
      currentRowH = 0;
    }
  }
  if (currentRow.length > 0) {
    const maxH = Math.max(...currentRow.map(i => i.cellH));
    rows.push({ items: currentRow, height: maxH });
  }

  // 分页
  let currentPageElements = [];
  let y = padding;
  const elements = [];

  for (const row of rows) {
    if (y + row.height > pageH - padding && currentPageElements.length > 0) {
      pages.push({ id: uid(), elements: currentPageElements });
      currentPageElements = [];
      y = padding;
    }

    let x = padding;
    for (const item of row.items) {
      const scaledH = row.height;
      const scaledW = scaledH * item.aspectRatio;
      currentPageElements.push({
        id: uid(),
        imageId: item.id,
        x, y,
        w: scaledW,
        h: scaledH,
      });
      x += scaledW + spacing;
    }
    y += row.height + spacing;
  }

  if (currentPageElements.length > 0) {
    pages.push({ id: uid(), elements: currentPageElements });
  }

  return pages;
}

// ============ 经典单页大图 ============
function layoutSingle(images, pageW, pageH) {
  const pages = [];
  const padding = getState().theme.padding;
  const usableW = pageW - padding * 2;
  const usableH = pageH - padding * 2;

  for (const img of images) {
    let w, h;
    if (img.aspectRatio > usableW / usableH) {
      w = usableW;
      h = usableW / img.aspectRatio;
    } else {
      h = usableH;
      w = usableH * img.aspectRatio;
    }
    const x = padding + (usableW - w) / 2;
    const y = padding + (usableH - h) / 2;

    pages.push({
      id: uid(),
      elements: [{ id: uid(), imageId: img.id, x, y, w, h }],
    });
  }
  return pages;
}

// ============ 拼贴风格 ============
function layoutCollage(images, pageW, pageH) {
  if (images.length === 0) return [];
  const pages = [];
  const padding = getState().theme.padding;
  const spacing = getState().theme.spacing;
  const usableW = pageW - padding * 2;
  const usableH = pageH - padding * 2;

  // 每页放 2~6 张图，根据图片数量动态调整
  const perPage = Math.min(6, Math.max(2, Math.ceil(images.length / 3)));

  for (let i = 0; i < images.length; i += perPage) {
    const pageImages = images.slice(i, i + perPage);
    const elements = [];
    const n = pageImages.length;

    if (n === 1) {
      // 单图居中
      const img = pageImages[0];
      let w, h;
      if (img.aspectRatio > usableW / usableH) {
        w = usableW * 0.8;
        h = w / img.aspectRatio;
      } else {
        h = usableH * 0.8;
        w = h * img.aspectRatio;
      }
      elements.push({
        id: uid(), imageId: img.id,
        x: padding + (usableW - w) / 2,
        y: padding + (usableH - h) / 2,
        w, h,
      });
    } else if (n === 2) {
      // 左右并排
      const gap = spacing;
      const cellW = (usableW - gap) / 2;
      pageImages.forEach((img, idx) => {
        const h = Math.min(cellW / img.aspectRatio, usableH);
        const w = h * img.aspectRatio;
        elements.push({
          id: uid(), imageId: img.id,
          x: padding + idx * (cellW + gap) + (cellW - w) / 2,
          y: padding + (usableH - h) / 2,
          w, h,
        });
      });
    } else if (n === 3) {
      // 上1下2
      const top = pageImages[0];
      const topH = usableH * 0.55;
      const topW = Math.min(topH * top.aspectRatio, usableW);
      elements.push({
        id: uid(), imageId: top.id,
        x: padding + (usableW - topW) / 2,
        y: padding,
        w: topW, h: topH,
      });
      const bottomY = padding + topH + spacing;
      const bottomH = usableH - topH - spacing;
      const cellW = (usableW - spacing) / 2;
      pageImages.slice(1).forEach((img, idx) => {
        const h = Math.min(bottomH, cellW / img.aspectRatio);
        const w = h * img.aspectRatio;
        elements.push({
          id: uid(), imageId: img.id,
          x: padding + idx * (cellW + spacing) + (cellW - w) / 2,
          y: bottomY + (bottomH - h) / 2,
          w, h,
        });
      });
    } else {
      // 2列不规则网格
      const cols = 2;
      const cellW = (usableW - spacing) / cols;
      let y = padding;
      let col = 0;
      let colY = [padding, padding];

      pageImages.forEach((img) => {
        const c = colY[0] <= colY[1] ? 0 : 1;
        const h = Math.min(cellW / img.aspectRatio, usableH * 0.5);
        const w = h * img.aspectRatio;
        elements.push({
          id: uid(), imageId: img.id,
          x: padding + c * (cellW + spacing) + (cellW - w) / 2,
          y: colY[c],
          w, h,
        });
        colY[c] += h + spacing;
      });
    }

    pages.push({ id: uid(), elements });
  }
  return pages;
}

// ============ 时间线布局 ============
function layoutTimeline(images, pageW, pageH) {
  if (images.length === 0) return [];
  const pages = [];
  const padding = getState().theme.padding;
  const spacing = getState().theme.spacing;
  const usableW = pageW - padding * 2;
  const usableH = pageH - padding * 2;

  // 每页 3~4 张图，垂直排列，中间有时间线连接
  const perPage = 3;

  for (let i = 0; i < images.length; i += perPage) {
    const pageImages = images.slice(i, i + perPage);
    const elements = [];
    const n = pageImages.length;
    const cellH = (usableH - spacing * (n - 1)) / n;

    pageImages.forEach((img, idx) => {
      const maxW = usableW * 0.7;
      let w, h;
      if (img.aspectRatio > maxW / cellH) {
        w = maxW;
        h = w / img.aspectRatio;
      } else {
        h = cellH;
        w = h * img.aspectRatio;
      }

      // 交替左右
      const isLeft = idx % 2 === 0;
      const x = isLeft
        ? padding + (usableW * 0.35 - w) / 2
        : padding + usableW * 0.65 + (usableW * 0.35 - w) / 2;
      const y = padding + idx * (cellH + spacing) + (cellH - h) / 2;

      elements.push({ id: uid(), imageId: img.id, x, y, w, h });
    });

    pages.push({ id: uid(), elements });
  }
  return pages;
}

// ============ 主排版函数 ============
export function autoLayout() {
  const { images, template } = getState();
  if (images.length === 0) return;

  const { w: pageW, h: pageH } = getPagePixelSize();
  let pages;

  switch (template) {
    case 'single':
      pages = layoutSingle(images, pageW, pageH);
      break;
    case 'collage':
      pages = layoutCollage(images, pageW, pageH);
      break;
    case 'timeline':
      pages = layoutTimeline(images, pageW, pageH);
      break;
    case 'grid':
    default:
      pages = layoutGrid(images, pageW, pageH);
      break;
  }

  setPages(pages);
  return pages;
}

// 添加文字页面
export function addTitlePage(text, style = {}) {
  const { pages } = getState();
  const titlePage = {
    id: uid(),
    isTextPage: true,
    text: text || '摄影集',
    textStyle: {
      fontSize: 48,
      fontWeight: 'bold',
      textAlign: 'center',
      color: getState().theme.accentColor,
      ...style,
    },
    elements: [],
  };
  pages.unshift(titlePage);
  setPages(pages);
}

export function addChapterPage(text, style = {}) {
  const { pages } = getState();
  const chapterPage = {
    id: uid(),
    isTextPage: true,
    text: text || '章节标题',
    textStyle: {
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      color: getState().theme.accentColor,
      ...style,
    },
    elements: [],
  };
  pages.push(chapterPage);
  setPages(pages);
}
