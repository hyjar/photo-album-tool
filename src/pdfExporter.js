/**
 * PDF 导出（html2canvas 方案 — 所见即所得，完美支持中文）
 */
import { getState } from './state.js';
import { formatDate } from './utils.js';

let jsPDF = null;
let html2canvas = null;

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

async function loadHtml2canvas() {
  if (html2canvas) return html2canvas;
  try {
    const module = await import('html2canvas');
    html2canvas = module.default || module;
    return html2canvas;
  } catch (e) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => { html2canvas = window.html2canvas; resolve(html2canvas); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}

export async function exportPDF(options = {}) {
  const { startPage = 1, endPage = null, fileName = null, quality = 0.92, renderScale = 2, returnBlob = false, onProgress } = options;
  const PDFClass = await loadJsPDF();
  const h2c = await loadHtml2canvas();
  const { pages, pageSize } = getState();

  if (!pages.length) { alert('没有可导出的页面'); return; }

  const total = pages.length;
  const from = Math.max(1, Math.min(startPage, total));
  const to = endPage ? Math.min(endPage, total) : total;
  const pageCount = to - from + 1;

  // 第一页尺寸
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
    const pw = page.width || pageSize.width;
    const ph = page.height || pageSize.height;
    const pOrient = pw > ph ? 'l' : 'p';

    if (!first) pdf.addPage([Math.min(pw, ph), Math.max(pw, ph)], pOrient);
    first = false;

    // 找到预览中的页面元素
    const pageEls = document.querySelectorAll('.preview-page');
    const pageEl = pageEls[i];
    if (!pageEl) continue;

    // html2canvas 截图
    const canvas = await h2c(pageEl, {
      scale: renderScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', quality);
    pdf.addImage(imgData, 'JPEG', 0, 0, pw, ph);

    // 进度回调
    if (onProgress) {
      const pct = Math.round(((i - from + 2) / pageCount) * 100);
      onProgress(pct);
    }
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
