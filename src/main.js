/**
 * 摄影集排版工具 — 主入口
 * 新增：裁剪模式、自由画布、版式预设、跨页、背景、页码、页眉页脚
 */
import {
  subscribe, getState, undo, redo, canUndo, canRedo,
  setTemplate, setFitMode, toggleDarkMode, setOrientation, setPageSize, setTheme,
  setPageNumber, setHeaderFooter, setPageBackground,
  addTextOverlay, toggleCaptions,
  savePreset, deletePreset, renamePreset, applyPreset, setPages,
} from './state.js';
import { initImageLoader, renderThumbnailList } from './imageLoader.js';
import { autoLayout, addTitlePage, addChapterPage, getPagePixelSize, createFreeCanvasPage } from './layoutEngine.js';
// createFreeCanvasPage 来自 layoutEngine，避免与 state 混淆
import { initEditor } from './editor.js';
import { renderPreview, forceRenderPreview } from './preview.js';
import { exportPDF } from './pdfExporter.js';
import { saveProject, loadProject, showToast } from './projectSave.js';
import { A4_WIDTH_MM, A4_HEIGHT_MM, debounce, el } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initImageLoader();
  initEditor();
  initToolbar();
  initTemplateSelector();
  initFitMode();
  initThemeControls();
  initBackgroundControls();
  initPageNumberControls();
  initHeaderFooter();
  initPresets();
  initExportDialog();
  initKeyboardShortcuts();

  const debouncedUpdate = debounce(() => {
    renderThumbnailList();
    forceRenderPreview();
    updateToolbarState();
  }, 80);
  subscribe(debouncedUpdate);

  renderThumbnailList();
  forceRenderPreview();
  restoreDarkMode();

  // 暴露全局 API（用于自动化测试）
  window.__photoAlbum = {
    getState,
    exportPDF,
    autoLayout,
  };
});

// ====== 工具栏 ======
function initToolbar() {
  document.getElementById('btn-auto-layout').addEventListener('click', () => {
    const { images } = getState();
    if (!images.length) { showToast('请先导入图片'); return; }
    autoLayout();
    showToast('排版完成');
  });
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-save').addEventListener('click', saveProject);
  document.getElementById('btn-load').addEventListener('click', loadProject);
  document.getElementById('btn-export').addEventListener('click', () => {
    document.getElementById('export-dialog').classList.add('visible');
  });
  document.getElementById('btn-dark-mode').addEventListener('click', () => {
    toggleDarkMode();
    localStorage.setItem('photo-album-dark-mode', getState().darkMode);
  });
  document.getElementById('btn-add-title').addEventListener('click', () => {
    const text = prompt('请输入标题文字:', '我的摄影集');
    if (text) { addTitlePage(text); showToast('已添加标题页'); }
  });
  document.getElementById('btn-add-chapter').addEventListener('click', () => {
    const text = prompt('请输入章节标题:', '第一章');
    if (text) { addChapterPage(text); showToast('已添加章节页'); }
  });
  document.getElementById('btn-orientation').addEventListener('click', () => {
    const { orientation } = getState();
    setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait');
  });

  // 自由画布
  document.getElementById('btn-free-canvas').addEventListener('click', () => {
    const { pages } = getState();
    const newPage = createFreeCanvasPage();
    pages.push(newPage);
    setPages(pages);
    showToast('已添加自由画布页');
  });

  // 图注
  document.getElementById('btn-captions').addEventListener('click', () => {
    toggleCaptions();
    showToast('已切换图注显示');
  });

  // 文字叠加
  document.getElementById('btn-text-overlay').addEventListener('click', () => {
    const { selectedPageId, pages } = getState();
    if (!selectedPageId || pages.find(p => p.id === selectedPageId)?.isTextPage) {
      showToast('请先选中一个图片页面');
      return;
    }
    addTextOverlay(selectedPageId);
    showToast('已添加文字叠加，双击编辑');
  });
}

function updateToolbarState() {
  document.getElementById('btn-undo').disabled = !canUndo();
  document.getElementById('btn-redo').disabled = !canRedo();
  const { orientation, darkMode, images, pages } = getState();
  document.getElementById('btn-orientation').textContent = orientation === 'portrait' ? '竖向' : '横向';
  document.getElementById('btn-dark-mode').textContent = darkMode ? '☀️' : '🌙';
  document.getElementById('image-count').textContent = images.length ? `${images.length} 张` : '';
  document.getElementById('page-count').textContent = pages.length ? `${pages.length} 页` : '';
}

// ====== 模板 ======
function initTemplateSelector() {
  const btns = document.querySelectorAll('.template-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.template;
      setTemplate(t);
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 显示/隐藏裁剪模式选项
      const fitGroup = document.getElementById('fit-mode-group');
      if (fitGroup) fitGroup.style.display = t === 'single' ? 'flex' : 'none';
      if (getState().images.length > 0) autoLayout();
    });
  });
}

// ====== 裁剪模式 ======
function initFitMode() {
  const cover = document.getElementById('fit-cover');
  const contain = document.getElementById('fit-contain');
  if (cover) cover.addEventListener('click', () => { setFitMode('cover'); updateFitUI(); if (getState().images.length) autoLayout(); });
  if (contain) contain.addEventListener('click', () => { setFitMode('contain'); updateFitUI(); if (getState().images.length) autoLayout(); });
  updateFitUI();
}
function updateFitUI() {
  const { fitMode } = getState();
  const cover = document.getElementById('fit-cover');
  const contain = document.getElementById('fit-contain');
  if (cover) cover.classList.toggle('active', fitMode === 'cover');
  if (contain) contain.classList.toggle('active', fitMode === 'contain');
}

// ====== 主题 ======
function initThemeControls() {
  document.getElementById('theme-bg-color').addEventListener('input', e => setTheme({ bgColor: e.target.value }));
  document.getElementById('theme-accent-color').addEventListener('input', e => setTheme({ accentColor: e.target.value }));
  document.getElementById('theme-spacing').addEventListener('input', e => setTheme({ spacing: parseInt(e.target.value) }));
  document.getElementById('theme-padding').addEventListener('input', e => setTheme({ padding: parseInt(e.target.value) }));
  document.getElementById('page-size-select').addEventListener('change', e => {
    const v = e.target.value;
    if (v === 'a4') setPageSize({ width: A4_WIDTH_MM, height: A4_HEIGHT_MM });
    else if (v === 'a3') setPageSize({ width: 297, height: 420 });
    else if (v === 'letter') setPageSize({ width: 215.9, height: 279.4 });
    if (getState().images.length) autoLayout();
  });
}

// ====== 页面背景 ======
function initBackgroundControls() {
  document.getElementById('bg-type').addEventListener('change', e => {
    updateBackgroundUI(e.target.value);
  });
  document.getElementById('bg-apply').addEventListener('click', () => {
    const { selectedPageId } = getState();
    if (!selectedPageId) { showToast('请先选中一个页面'); return; }
    const type = document.getElementById('bg-type').value;
    const bg = { type };
    if (type === 'solid') bg.color = document.getElementById('bg-color').value;
    if (type === 'gradient') {
      bg.color = document.getElementById('bg-color').value;
      bg.color2 = document.getElementById('bg-color2').value;
      bg.angle = parseInt(document.getElementById('bg-angle').value) || 135;
    }
    if (type === 'texture') bg.texture = document.getElementById('bg-texture').value;
    setPageBackground(selectedPageId, bg);
    showToast('背景已更新');
  });
}
function updateBackgroundUI(type) {
  document.getElementById('bg-solid-opts').style.display = type === 'solid' ? 'flex' : 'none';
  document.getElementById('bg-gradient-opts').style.display = type === 'gradient' ? 'flex' : 'none';
  document.getElementById('bg-texture-opts').style.display = type === 'texture' ? 'flex' : 'none';
}

// ====== 页码 ======
function initPageNumberControls() {
  document.getElementById('pn-enabled').addEventListener('change', e => {
    setPageNumber({ pageNumberEnabled: e.target.checked });
  });
  document.getElementById('pn-position').addEventListener('change', e => {
    setPageNumber({ pageNumberPosition: e.target.value });
  });
  document.getElementById('pn-style').addEventListener('change', e => {
    setPageNumber({ pageNumberStyle: e.target.value });
  });
}

// ====== 页眉页脚 ======
function initHeaderFooter() {
  document.getElementById('header-text').addEventListener('input', e => {
    setHeaderFooter(e.target.value, getState().footerText);
  });
  document.getElementById('footer-text').addEventListener('input', e => {
    setHeaderFooter(getState().headerText, e.target.value);
  });
}

// ====== 版式预设 ======
function initPresets() {
  document.getElementById('btn-save-preset').addEventListener('click', () => {
    const { selectedPageId, pages } = getState();
    if (!selectedPageId) { showToast('请先选中一个页面'); return; }
    const page = pages.find(p => p.id === selectedPageId);
    if (!page || !page.elements.length) { showToast('页面没有图片元素'); return; }
    const name = prompt('预设名称:', `预设${getState().presets.length + 1}`);
    if (name) { savePreset(name, page); showToast('预设已保存'); }
  });
  document.getElementById('btn-apply-preset').addEventListener('click', () => {
    const sel = document.getElementById('preset-select');
    const { selectedPageId, pages } = getState();
    if (!sel.value) { showToast('请选择一个预设'); return; }
    if (!selectedPageId) { showToast('请先选中一个页面'); return; }
    const idx = pages.findIndex(p => p.id === selectedPageId);
    applyPreset(sel.value, idx);
    showToast('预设已应用');
  });
  document.getElementById('btn-delete-preset').addEventListener('click', () => {
    const sel = document.getElementById('preset-select');
    if (!sel.value) return;
    deletePreset(sel.value);
    showToast('预设已删除');
  });

  // 预设列表更新
  subscribe(() => {
    const sel = document.getElementById('preset-select');
    if (!sel) return;
    const { presets } = getState();
    sel.innerHTML = '<option value="">-- 选择预设 --</option>';
    presets.forEach(p => {
      sel.appendChild(el('option', { value: p.id, textContent: `${p.name} (${p.imageCount}张)` }));
    });
  });
}

// ====== 导出 ======
function initExportDialog() {
  const dialog = document.getElementById('export-dialog');
  document.getElementById('export-close').addEventListener('click', () => dialog.classList.remove('visible'));
  document.getElementById('export-cancel').addEventListener('click', () => dialog.classList.remove('visible'));
  document.getElementById('export-confirm').addEventListener('click', async () => {
    const fileName = document.getElementById('export-filename').value.trim() || undefined;
    const startPage = parseInt(document.getElementById('export-start').value) || 1;
    const endPage = parseInt(document.getElementById('export-end').value) || undefined;
    dialog.classList.remove('visible');
    showToast('正在导出 PDF...');
    try {
      await exportPDF({ startPage, endPage, fileName });
      showToast('PDF 导出完成');
    } catch (e) {
      console.error('导出失败:', e);
      showToast('导出失败: ' + e.message);
    }
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.classList.remove('visible'); });
}

// ====== 快捷键 ======
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) { e.preventDefault(); redo(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveProject(); }
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); loadProject(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedPageId, selectedElementId, pages } = getState();
      if (selectedPageId && selectedElementId) {
        const page = pages.find(p => p.id === selectedPageId);
        if (page) {
          page.elements = page.elements.filter(el => el.id !== selectedElementId);
          setPages(pages);
        }
      }
    }
  });
}

function restoreDarkMode() {
  if (localStorage.getItem('photo-album-dark-mode') === 'true') toggleDarkMode();
}
