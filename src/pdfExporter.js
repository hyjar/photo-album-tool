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
  const { pages, images, pageSize } = getState();

  if (!pages.length) { alert('没有可导出的页面'); return; }

  const total = pages.length;
  const from = Math.max(1, Math.min(startPage, total));
  const to = endPage ? Math.min(endPage, total) : total;

  // 第一页尺寸：使用页面自带尺寸或全局尺寸
  const firstPage = pages[from - 1];
  const fpW = firstPage.width || pageSize.width;
  const fpH = firstPage.height || pageSize.height;
  const fpOrient = fpW > fpH ? 'l' : 'p';

  const pdf = new PDFClass({
    orientation: fpOrient,
    unit: 'mm', format: [Math.min(fpW, fpH), Math.max(fpW, fpH)],
  });

  let first = true;

  for (let i = from - 1; i < to; i++) {
    const page = pages[i];
    if (!page) continue;
    // 使用页面自带尺寸（支持混合方向）
    const pw = page.width || pageSize.width;
    const ph = page.height || pageSize.height;
    const pOrient = pw > ph ? 'l' : 'p';

    if (!first) pdf.addPage([Math.min(pw, ph), Math.max(pw, ph)], pOrient);
    first = false;

    const pagePixelW = pw * 3.7795;
    const pagePixelH = ph * 3.7795;
    const scaleX = pw / pagePixelW;
    const scaleY = ph / pagePixelH;

    // 背景
    renderBackground(pdf, page.background, pw, ph);

    // 页眉页脚
    renderHeaderFooter(pdf, pw);

    if (page.isTextPage) {
      const text = page.text || '';
      const style = page.textStyle || {};
      pdf.setFontSize(style.fontSize || 48);
      pdf.setTextColor(style.color || '#000000');
      const align = style.textAlign || 'center';
      const x = align === 'center' ? pw / 2 : (align === 'right' ? pw - 10 : 10);
      pdf.text(text, x, ph / 2, { align });
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
              const centerX = elem.x * scaleX + (elem.w * scaleX) / 2;
              let metaY = (elem.y + elem.h) * scaleY + 6;
              const maxTextW = pw * 0.85;

              // 第一行：相机型号
              if (elem.metaCamera) {
                pdf.setFontSize(10);
                pdf.setTextColor(30, 30, 30);
                pdf.text(elem.metaCamera, centerX, metaY, { align: 'center', maxWidth: maxTextW });
                metaY += 5;
              }

              // 第二行：拍摄参数
              if (elem.metaParams) {
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                pdf.text(elem.metaParams, centerX, metaY, { align: 'center' });
                metaY += 5;
              }

              // 第三行：描述
              const desc = elem.description || img.name.replace(/\.[^.]+$/, '');
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
    renderPageNumber(pdf, i - from + 1, to - from + 1, pw, ph);
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
