/**
 * PDF 导出
 * 新增：页面背景、页码、页眉页脚、图注、文字叠加
 */
import { getState } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { formatDate } from './utils.js';

const PDF_MAX_DIM = 3000;
const PDF_QUALITY = 0.85;
let jsPDF = null;

async function loadJsPDF() {
  if (jsPDF) return jsPDF;
  try {
    const module = await import('jspdf');
    jsPDF = module.jsPDF || module.default;
    return jsPDF;
  } catch (e) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
      s.onload = () => { jsPDF = window.jspdf.jsPDF; resolve(jsPDF); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}

async function imageToPDFDataURL(src) {
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);
    let w = bitmap.width, h = bitmap.height;
    if (w > PDF_MAX_DIM || h > PDF_MAX_DIM) {
      const r = Math.min(PDF_MAX_DIM / w, PDF_MAX_DIM / h);
      w = Math.round(w * r); h = Math.round(h * r);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', PDF_QUALITY);
  } catch { return null; }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function renderBackground(pdf, bg, pageW, pageH) {
  if (!bg || bg.type === 'none') return;
  if (bg.type === 'solid' && bg.color) {
    const [r, g, b] = hexToRgb(bg.color);
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, pageH, 'F');
  } else if (bg.type === 'gradient' && bg.color && bg.color2) {
    // 简化：用纯色近似渐变
    const [r, g, b] = hexToRgb(bg.color);
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, pageH, 'F');
  }
}

function renderPageNumber(pdf, idx, total, pageW, pageH) {
  const s = getState();
  if (!s.pageNumberEnabled) return;
  const pos = s.pageNumberPosition;
  const text = s.pageNumberStyle === 'line' ? `—— ${idx + 1} / ${total} ——` : `${idx + 1}`;
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  let x = pageW / 2, align = 'center';
  if (pos === 'bottom-left') { x = 10; align = 'left'; }
  else if (pos === 'bottom-right') { x = pageW - 10; align = 'right'; }
  pdf.text(text, x, pageH - 5, { align });
}

function renderHeaderFooter(pdf, pageW) {
  const s = getState();
  if (s.headerText) {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(s.headerText, pageW / 2, 6, { align: 'center' });
  }
  if (s.footerText) {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(s.footerText, pageW / 2, getPagePixelSize().h * (getState().pageSize.height / getPagePixelSize().h) - 8, { align: 'center' });
  }
}

export async function exportPDF(options = {}) {
  const { startPage = 1, endPage = null, fileName = null, returnBlob = false } = options;
  const PDFClass = await loadJsPDF();
  const { pages, images, pageSize, orientation } = getState();

  if (!pages.length) { alert('没有可导出的页面'); return; }

  const total = pages.length;
  const from = Math.max(1, Math.min(startPage, total));
  const to = endPage ? Math.min(endPage, total) : total;

  const pdf = new PDFClass({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm', format: [pageSize.width, pageSize.height],
  });

  let first = true;
  const { w: pagePixelW, h: pagePixelH } = getPagePixelSize();
  const scaleX = pageSize.width / pagePixelW;
  const scaleY = pageSize.height / pagePixelH;

  for (let i = from - 1; i < to; i++) {
    const page = pages[i];
    if (!page) continue;
    if (!first) pdf.addPage([pageSize.width, pageSize.height], orientation === 'landscape' ? 'l' : 'p');
    first = false;

    // 背景
    renderBackground(pdf, page.background, pageSize.width, pageSize.height);

    // 页眉页脚
    renderHeaderFooter(pdf, pageSize.width);

    if (page.isTextPage) {
      const text = page.text || '';
      const style = page.textStyle || {};
      pdf.setFontSize(style.fontSize || 48);
      pdf.setTextColor(style.color || '#000000');
      const align = style.textAlign || 'center';
      const x = align === 'center' ? pageSize.width / 2 : (align === 'right' ? pageSize.width - 10 : 10);
      pdf.text(text, x, pageSize.height / 2, { align });
    } else {
      for (const elem of page.elements) {
        if (elem.type === 'text') {
          // 文字叠加
          const s = elem.style || {};
          pdf.setFontSize(s.fontSize || 14);
          const c = hexToRgb(s.color || '#ffffff');
          pdf.setTextColor(c[0], c[1], c[2]);
          const ex = elem.x * scaleX;
          const ey = elem.y * scaleY + (elem.h * scaleY) / 2;
          pdf.text(elem.text || '', ex + (elem.w * scaleX) / 2, ey, { align: 'center' });
        } else {
          // 图片
          const img = images.find(im => im.id === elem.imageId);
          if (!img) continue;
          try {
            const dataURL = await imageToPDFDataURL(img.objectURL);
            if (!dataURL) continue;
            pdf.addImage(dataURL, 'JPEG',
              elem.x * scaleX, elem.y * scaleY,
              elem.w * scaleX, elem.h * scaleY,
              undefined, 'FAST');
            // 图注
            if (elem.caption) {
              pdf.setFontSize(8);
              pdf.setTextColor(100, 100, 100);
              pdf.text(elem.caption,
                elem.x * scaleX + (elem.w * scaleX) / 2,
                (elem.y + elem.h) * scaleY + 4,
                { align: 'center' });
            }
            // 元数据（作品集模式）
            if (elem.showMeta === true) {
              const exif = img.exif || {};
              const centerX = elem.x * scaleX + (elem.w * scaleX) / 2;
              let metaY = (elem.y + elem.h) * scaleY + 6;
              const maxTextW = pageSize.width * 0.85;

              // 第一行：相机型号
              if (exif.camera) {
                pdf.setFontSize(10);
                pdf.setTextColor(30, 30, 30);
                const cameraText = exif.camera + (exif.lens ? ` · ${exif.lens}` : '');
                pdf.text(cameraText, centerX, metaY, { align: 'center', maxWidth: maxTextW });
                metaY += 5;
              }

              // 第二行：拍摄参数
              const params = [exif.aperture, exif.shutter, exif.iso, exif.focalLength].filter(Boolean);
              if (params.length) {
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                pdf.text(params.join(' · '), centerX, metaY, { align: 'center' });
                metaY += 5;
              }

              // 第三行：描述（从文件名自动生成或用户编辑）
              const desc = elem.description || img.description || img.name.replace(/\.[^.]+$/, '');
              if (desc) {
                pdf.setFontSize(9);
                pdf.setTextColor(60, 60, 60);
                pdf.text(desc, centerX, metaY, { align: 'center', maxWidth: maxTextW });
              }
            }
          } catch (e) { console.warn('导出失败:', img.name, e); }
        }
      }
    }

    // 页码
    renderPageNumber(pdf, i - from + 1, to - from + 1, pageSize.width, pageSize.height);
  }

  let defaultName = fileName || `摄影集_${formatDate()}`;
  if (!defaultName.endsWith('.pdf')) defaultName += '.pdf';
  if (returnBlob) return pdf.output('blob');
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const w = await handle.createWritable();
      await w.write(pdf.output('blob'));
      await w.close();
    } else {
      pdf.save(defaultName);
    }
  } catch (e) {
    if (e.name !== 'AbortError') pdf.save(defaultName);
  }
}
