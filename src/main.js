/**
 * 摄影集自动排版与导出工具 - 主入口
 */
import { subscribe, getState, undo, redo, canUndo, canRedo, setTemplate, toggleDarkMode, setOrientation, setPageSize, setTheme, setPages } from './state.js';
import { initImageLoader, renderThumbnailList } from './imageLoader.js';
import { autoLayout, addTitlePage, addChapterPage } from './layoutEngine.js';
import { initEditor } from './editor.js';
import { renderPreview, renderPreviewThrottled, forceRenderPreview } from './preview.js';
import { exportPDF } from './pdfExporter.js';
import { saveProject, loadProject, showToast } from './projectSave.js';
import { A4_WIDTH_MM, A4_HEIGHT_MM, debounce } from './utils.js';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  initImageLoader();
  initEditor();
  initToolbar();
  initTemplateSelector();
  initThemeControls();
  initExportDialog();
  initKeyboardShortcuts();

  // 订阅状态变化 — 用 debounce 避免频繁渲染
  const debouncedUpdate = debounce(() => {
    renderThumbnailList();
    forceRenderPreview();
    updateToolbarState();
  }, 80);

  subscribe(debouncedUpdate);

  // 初始渲染
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

// ============ 工具栏 ============
function initToolbar() {
  document.getElementById('btn-auto-layout').addEventListener('click', () => {
    const { images } = getState();
    if (images.length === 0) {
      showToast('请先导入图片');
      return;
    }
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
    if (text) {
      addTitlePage(text);
      showToast('已添加标题页');
    }
  });

  document.getElementById('btn-add-chapter').addEventListener('click', () => {
    const text = prompt('请输入章节标题:', '第一章');
    if (text) {
      addChapterPage(text);
      showToast('已添加章节页');
    }
  });

  document.getElementById('btn-orientation').addEventListener('click', () => {
    const { orientation } = getState();
    setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait');
  });
}

function updateToolbarState() {
  document.getElementById('btn-undo').disabled = !canUndo();
  document.getElementById('btn-redo').disabled = !canRedo();

  const { orientation, darkMode, images, pages } = getState();
  document.getElementById('btn-orientation').textContent = orientation === 'portrait' ? '竖向' : '横向';
  document.getElementById('btn-dark-mode').textContent = darkMode ? '☀️' : '🌙';
  document.getElementById('image-count').textContent = images.length ? `${images.length} 张图片` : '';
  document.getElementById('page-count').textContent = pages.length ? `${pages.length} 页` : '';
}

// ============ 模板选择 ============
function initTemplateSelector() {
  const btns = document.querySelectorAll('.template-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const template = btn.dataset.template;
      setTemplate(template);
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const { images } = getState();
      if (images.length > 0) autoLayout();
    });
  });
}

// ============ 主题控制 ============
function initThemeControls() {
  document.getElementById('theme-bg-color').addEventListener('input', (e) => setTheme({ bgColor: e.target.value }));
  document.getElementById('theme-accent-color').addEventListener('input', (e) => setTheme({ accentColor: e.target.value }));
  document.getElementById('theme-spacing').addEventListener('input', (e) => setTheme({ spacing: parseInt(e.target.value) }));
  document.getElementById('theme-padding').addEventListener('input', (e) => setTheme({ padding: parseInt(e.target.value) }));

  document.getElementById('page-size-select').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'a4') setPageSize({ width: A4_WIDTH_MM, height: A4_HEIGHT_MM });
    else if (val === 'a3') setPageSize({ width: 297, height: 420 });
    else if (val === 'letter') setPageSize({ width: 215.9, height: 279.4 });
    const { images } = getState();
    if (images.length > 0) autoLayout();
  });
}

// ============ 导出对话框 ============
function initExportDialog() {
  const dialog = document.getElementById('export-dialog');

  document.getElementById('export-close').addEventListener('click', () => dialog.classList.remove('visible'));
  document.getElementById('export-cancel').addEventListener('click', () => dialog.classList.remove('visible'));

  document.getElementById('export-confirm').addEventListener('click', async () => {
    const startPage = parseInt(document.getElementById('export-start').value) || 1;
    const endPage = parseInt(document.getElementById('export-end').value) || undefined;
    const quality = parseInt(document.getElementById('export-quality').value) / 100;

    dialog.classList.remove('visible');
    showToast('正在导出 PDF...');

    try {
      await exportPDF({ startPage, endPage, quality });
      showToast('PDF 导出完成');
    } catch (e) {
      console.error('导出失败:', e);
      showToast('导出失败: ' + e.message);
    }
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.classList.remove('visible');
  });
}

// ============ 键盘快捷键 ============
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      redo();
    }
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveProject();
    }
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      loadProject();
    }
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
  const saved = localStorage.getItem('photo-album-dark-mode');
  if (saved === 'true') {
    toggleDarkMode();
  }
}
