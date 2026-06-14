/**
 * PDF 导出模块
 * 使用 jsPDF 生成高质量摄影集 PDF
 * 优化：大图先压缩再嵌入，避免字符串溢出
 */
import { getState } from './state.js';
import { getPagePixelSize } from './layoutEngine.js';
import { pxToMm, formatDate } from './utils.js';

const PDF_MAX_DIM = 3000; // PDF 内图片最大边长（像素）
const PDF_QUALITY = 0.85; // JPEG 压缩质量

let jsPDF = null;

async function loadJsPDF() {
  if (jsPDF) return jsPDF;
  try {
    const module = await import('jspdf');
    jsPDF = module.jsPDF || module.default;
    return jsPDF;
  } catch (e) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
      script.onload = () => { jsPDF = window.jspdf.jsPDF; resolve(jsPDF); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

// 将图片 URL 压缩为适合 PDF 的 dataURL
async function imageToPDFDataURL(src) {
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);

    // 如果图片太大，缩放
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > PDF_MAX_DIM || h > PDF_MAX_DIM) {
      const ratio = Math.min(PDF_MAX_DIM / w, PDF_MAX_DIM / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    // 转为 JPEG dataURL（比 PNG 小很多）
    return canvas.toDataURL('image/jpeg', PDF_QUALITY);
  } catch (e) {
    console.warn('图片处理失败:', e);
    return null;
  }
}

// 主导出函数
export async function exportPDF(options = {}) {
  const {
    startPage = 1,
    endPage = null,
    fileName = null,
    returnBlob = false, // 为 true 时返回 blob 而不保存文件
  } = options;

  const PDFClass = await loadJsPDF();
  const { pages, images, pageSize, orientation, theme } = getState();

  if (pages.length === 0) {
    alert('没有可导出的页面，请先排版。');
    return;
  }

  const total = pages.length;
  const from = Math.max(1, Math.min(startPage, total));
  const to = endPage ? Math.min(endPage, total) : total;

  const pdf = new PDFClass({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageSize.width, pageSize.height],
  });

  let firstPage = true;

  for (let i = from - 1; i < to; i++) {
    const page = pages[i];
    if (!page) continue;

    if (!firstPage) {
      pdf.addPage([pageSize.width, pageSize.height], orientation === 'landscape' ? 'l' : 'p');
    }
    firstPage = false;

    // 背景色
    if (theme.bgColor && theme.bgColor !== '#ffffff') {
      pdf.setFillColor(theme.bgColor);
      pdf.rect(0, 0, pageSize.width, pageSize.height, 'F');
    }

    if (page.isTextPage) {
      const text = page.text || '';
      const style = page.textStyle || {};
      const fontSize = style.fontSize || 48;
      pdf.setFontSize(fontSize);
      pdf.setTextColor(style.color || theme.accentColor || '#000000');
      const align = style.textAlign || 'center';
      const x = align === 'center' ? pageSize.width / 2 : (align === 'right' ? pageSize.width - 10 : 10);
      pdf.text(text, x, pageSize.height / 2, { align });
    } else {
      const { w: pageW, h: pageH } = getPagePixelSize();
      const scaleX = pageSize.width / pageW;
      const scaleY = pageSize.height / pageH;

      for (const elem of page.elements) {
        const img = images.find(im => im.id === elem.imageId);
        if (!img) continue;

        try {
          const dataURL = await imageToPDFDataURL(img.objectURL);
          if (!dataURL) continue;

          const pdfX = elem.x * scaleX;
          const pdfY = elem.y * scaleY;
          const pdfW = elem.w * scaleX;
          const pdfH = elem.h * scaleY;

          pdf.addImage(dataURL, 'JPEG', pdfX, pdfY, pdfW, pdfH, undefined, 'FAST');
        } catch (e) {
          console.warn('图片导出失败:', img.name, e);
        }
      }
    }
  }

  // 保存
  const defaultName = fileName || `摄影集_${formatDate()}.pdf`;

  // 返回 blob 模式（用于测试/自动化）
  if (returnBlob) {
    return pdf.output('blob');
  }

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: 'PDF 文件', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      const blob = pdf.output('blob');
      await writable.write(blob);
      await writable.close();
    } else {
      pdf.save(defaultName);
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      pdf.save(defaultName);
    }
  }
}
