/**
 * 摄影集排版工具 — 主入口
 * 新增：裁剪模式、自由画布、版式预设、跨页、背景、页码、页眉页脚
 */
import {
  subscribe, getState, undo, redo, canUndo, canRedo,
  setTemplate, setFitMode, toggleDarkMode, setOrientation, setPageSize, setTheme,
  setPageNumber, setHeaderFooter, setPageBackground,
  addTextOverlay, toggleCaptions,
  savePreset, deletePreset, renamePreset, applyPreset, setPages, setAutoOrient,
  updateImageProps, setLockRatio, resetImageFilters, updateElement,
  setGridColumns, setClassificationEnabled, setClassificationMode,
  setClassificationResults, setAllPageBackgrounds,
  swapElements, toggleElementSelection, clearElementSelection,
  setHeaderStyle, setFooterStyle, setWatermark,
} from './state.js';
import { classifyAllImages, clearClassificationCache, CATEGORY_LABELS, ORIENTATION_LABELS, CATEGORY_COLORS, ORIENTATION_COLORS } from './classifier.js';
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
  initRightSidebar();
  initClassification();
  initGridColumns();
  initApplyAllBackgrounds();
  initWatermark();

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
    showInputDialog('请输入标题文字:', '我的摄影集', (text) => {
      if (text) { addTitlePage(text); showToast('已添加标题页'); }
    });
  });
  document.getElementById('btn-add-chapter').addEventListener('click', () => {
    showInputDialog('请输入章节标题:', '第一章', (text) => {
      if (text) { addChapterPage(text); showToast('已添加章节页'); }
    });
  });
  document.getElementById('btn-orientation').addEventListener('click', () => {
    const { orientation } = getState();
    setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait');
  });

  // 竖横自适应
  document.getElementById('btn-auto-orient').addEventListener('click', () => {
    const { autoOrient } = getState();
    setAutoOrient(!autoOrient);
    const { images } = getState();
    if (images.length) {
      autoLayout();
      showToast(autoOrient ? '已关闭自适应' : '竖图竖放、横图横放');
    }
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
  const { orientation, darkMode, images, pages, autoOrient } = getState();
  document.getElementById('btn-orientation').textContent = orientation === 'portrait' ? '竖向' : '横向';
  document.getElementById('btn-dark-mode').textContent = darkMode ? '☀️' : '🌙';
  document.getElementById('image-count').textContent = images.length ? `${images.length} 张` : '';
  document.getElementById('page-count').textContent = pages.length ? `${pages.length} 页` : '';
  document.getElementById('btn-auto-orient').classList.toggle('active', autoOrient);
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
      // 显示/隐藏网格列数选项（仅网格模式）
      const gridGroup = document.getElementById('grid-columns-group');
      if (gridGroup) gridGroup.style.display = t === 'grid' ? 'flex' : 'none';
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

  // 页眉页脚样式
  const headerFontSize = document.getElementById('header-font-size');
  const headerColor = document.getElementById('header-color');
  const footerFontSize = document.getElementById('footer-font-size');
  const footerColor = document.getElementById('footer-color');

  headerFontSize?.addEventListener('change', () => {
    setHeaderStyle({ fontSize: parseInt(headerFontSize.value) });
  });
  headerColor?.addEventListener('input', () => {
    setHeaderStyle({ color: headerColor.value });
  });
  footerFontSize?.addEventListener('change', () => {
    setFooterStyle({ fontSize: parseInt(footerFontSize.value) });
  });
  footerColor?.addEventListener('input', () => {
    setFooterStyle({ color: footerColor.value });
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
  const qualitySlider = document.getElementById('export-quality');
  const qualityLabel = document.getElementById('export-quality-label');

  // 质量滑块实时更新
  qualitySlider?.addEventListener('input', () => {
    qualityLabel.textContent = qualitySlider.value + '%';
  });

  document.getElementById('export-close').addEventListener('click', () => dialog.classList.remove('visible'));
  document.getElementById('export-cancel').addEventListener('click', () => dialog.classList.remove('visible'));
  document.getElementById('export-confirm').addEventListener('click', async () => {
    const fileName = document.getElementById('export-filename').value.trim() || undefined;
    const startPage = parseInt(document.getElementById('export-start').value) || 1;
    const endPage = parseInt(document.getElementById('export-end').value) || undefined;
    const quality = parseInt(qualitySlider?.value || '92') / 100;
    const renderScale = parseInt(document.getElementById('export-scale')?.value || '2');

    dialog.classList.remove('visible');

    // 创建浮动进度条
    const overlay = document.createElement('div');
    overlay.className = 'export-progress-overlay';
    overlay.innerHTML = `
      <div class="export-progress-box">
        <div class="export-progress-icon">📄</div>
        <div class="export-progress-title">正在导出 PDF</div>
        <div class="export-progress-bar">
          <div class="export-progress-fill" style="width:0%"></div>
        </div>
        <div class="export-progress-text">准备中...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    const fill = overlay.querySelector('.export-progress-fill');
    const text = overlay.querySelector('.export-progress-text');

    try {
      await exportPDF({
        startPage, endPage, fileName, quality, renderScale,
        onProgress: (pct) => {
          if (fill) fill.style.width = pct + '%';
          if (text) text.textContent = `正在渲染第 ${pct} 页...`;
        }
      });
      text.textContent = '导出完成！';
      fill.style.width = '100%';
      setTimeout(() => overlay.remove(), 1200);
      showToast('PDF 导出完成');
    } catch (e) {
      console.error('导出失败:', e);
      text.textContent = '导出失败';
      setTimeout(() => overlay.remove(), 2000);
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

// ====== 右侧面板 ======
function initRightSidebar() {
  const sidebar = document.getElementById('right-sidebar');
  const closeBtn = document.getElementById('close-right-sidebar');

  // Close button
  closeBtn?.addEventListener('click', () => {
    sidebar?.classList.remove('visible');
    document.querySelector('.main-content')?.classList.remove('shifted');
  });

  // Size controls
  const widthInput = document.getElementById('img-width');
  const heightInput = document.getElementById('img-height');
  const lockRatioBtn = document.getElementById('img-lock-ratio');

  widthInput?.addEventListener('input', (e) => {
    updateImageProps({ width: parseInt(e.target.value) || 100 });
  });

  heightInput?.addEventListener('input', (e) => {
    updateImageProps({ height: parseInt(e.target.value) || 100 });
  });

  lockRatioBtn?.addEventListener('click', () => {
    const { lockRatio } = getState();
    setLockRatio(!lockRatio);
    lockRatioBtn.classList.toggle('active', !lockRatio);
  });

  // Rotation controls
  const rotationSlider = document.getElementById('img-rotation');
  const rotationInput = document.getElementById('img-rotation-input');

  rotationSlider?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    rotationInput.value = value;
    updateImageProps({ rotation: value });
  });

  rotationInput?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 0;
    rotationSlider.value = value;
    updateImageProps({ rotation: value });
  });

  // Flip controls
  document.getElementById('img-flip-h')?.addEventListener('click', () => {
    const { selectedImageProps } = getState();
    updateImageProps({ flipH: !selectedImageProps.flipH });
  });

  document.getElementById('img-flip-v')?.addEventListener('click', () => {
    const { selectedImageProps } = getState();
    updateImageProps({ flipV: !selectedImageProps.flipV });
  });

  // Position controls
  document.getElementById('img-x')?.addEventListener('input', (e) => {
    updateImageProps({ x: parseInt(e.target.value) || 0 });
  });

  document.getElementById('img-y')?.addEventListener('input', (e) => {
    updateImageProps({ y: parseInt(e.target.value) || 0 });
  });

  document.getElementById('btn-center-h')?.addEventListener('click', () => {
    const { selectedPageId, selectedElementId, pages, pageSize } = getState();
    if (!selectedPageId || !selectedElementId) return;
    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;
    const elem = page.elements.find(e => e.id === selectedElementId);
    if (!elem) return;
    const pw = page.width || pageSize.width;
    updateElement(selectedPageId, selectedElementId, { x: Math.round(((pw - elem.w) / 2) * 10) / 10 });
  });
  document.getElementById('btn-center-v')?.addEventListener('click', () => {
    const { selectedPageId, selectedElementId, pages, pageSize } = getState();
    if (!selectedPageId || !selectedElementId) return;
    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;
    const elem = page.elements.find(e => e.id === selectedElementId);
    if (!elem) return;
    const ph = page.height || pageSize.height;
    updateElement(selectedPageId, selectedElementId, { y: Math.round(((ph - elem.h) / 2) * 10) / 10 });
  });

  // Border controls
  document.getElementById('img-border-width')?.addEventListener('input', (e) => {
    updateImageProps({ borderWidth: parseInt(e.target.value) || 0 });
  });

  document.getElementById('img-border-color')?.addEventListener('input', (e) => {
    updateImageProps({ borderColor: e.target.value });
  });

  document.getElementById('img-border-radius')?.addEventListener('input', (e) => {
    updateImageProps({ borderRadius: parseInt(e.target.value) || 0 });
  });

  // Filter controls
  document.getElementById('img-brightness')?.addEventListener('input', (e) => {
    updateImageProps({ brightness: parseInt(e.target.value) });
  });

  document.getElementById('img-contrast')?.addEventListener('input', (e) => {
    updateImageProps({ contrast: parseInt(e.target.value) });
  });

  document.getElementById('img-saturate')?.addEventListener('input', (e) => {
    updateImageProps({ saturate: parseInt(e.target.value) });
  });

  document.getElementById('img-reset-filters')?.addEventListener('click', () => {
    resetImageFilters();
  });

  // Subscribe to state changes to update UI
  subscribe(() => {
    updateRightSidebarUI();
  });
}

function updateRightSidebarUI() {
  const { selectedImageId, selectedImageProps, lockRatio } = getState();

  if (!selectedImageId) return;

  // Update size controls
  const widthInput = document.getElementById('img-width');
  const heightInput = document.getElementById('img-height');
  const lockRatioBtn = document.getElementById('img-lock-ratio');

  if (widthInput) widthInput.value = selectedImageProps.width;
  if (heightInput) heightInput.value = selectedImageProps.height;
  if (lockRatioBtn) lockRatioBtn.classList.toggle('active', lockRatio);

  // Update rotation controls
  const rotationSlider = document.getElementById('img-rotation');
  const rotationInput = document.getElementById('img-rotation-input');

  if (rotationSlider) rotationSlider.value = selectedImageProps.rotation;
  if (rotationInput) rotationInput.value = selectedImageProps.rotation;

  // Update flip buttons
  document.getElementById('img-flip-h')?.classList.toggle('active', selectedImageProps.flipH);
  document.getElementById('img-flip-v')?.classList.toggle('active', selectedImageProps.flipV);

  // Update position controls
  const xInput = document.getElementById('img-x');
  const yInput = document.getElementById('img-y');

  if (xInput) xInput.value = selectedImageProps.x;
  if (yInput) yInput.value = selectedImageProps.y;

  // Update border controls
  const borderWidthInput = document.getElementById('img-border-width');
  const borderColorInput = document.getElementById('img-border-color');
  const borderRadiusInput = document.getElementById('img-border-radius');

  if (borderWidthInput) borderWidthInput.value = selectedImageProps.borderWidth;
  if (borderColorInput) borderColorInput.value = selectedImageProps.borderColor;
  if (borderRadiusInput) borderRadiusInput.value = selectedImageProps.borderRadius;

  // Update filter controls
  const brightnessSlider = document.getElementById('img-brightness');
  const contrastSlider = document.getElementById('img-contrast');
  const saturateSlider = document.getElementById('img-saturate');

  if (brightnessSlider) brightnessSlider.value = selectedImageProps.brightness;
  if (contrastSlider) contrastSlider.value = selectedImageProps.contrast;
  if (saturateSlider) saturateSlider.value = selectedImageProps.saturate;

  // Update image info
  const { images } = getState();
  const image = images.find(img => img.id === selectedImageId);
  if (image) {
    document.getElementById('img-filename').textContent = image.name || '-';
    document.getElementById('img-dimensions').textContent = `${image.width}×${image.height}`;
  }
}

// ====== 智能分类 ======
function initClassification() {
  const enabledCb = document.getElementById('classify-enabled');
  const modeSelect = document.getElementById('classify-mode');
  const classifyBtn = document.getElementById('btn-classify');
  const sortBtn = document.getElementById('btn-sort-by-class');
  const controls = document.getElementById('classify-controls');

  if (!enabledCb) return;

  enabledCb.addEventListener('change', () => {
    setClassificationEnabled(enabledCb.checked);
    controls.style.display = enabledCb.checked ? '' : 'none';
    if (enabledCb.checked) runClassification();
  });

  modeSelect?.addEventListener('change', () => {
    setClassificationMode(modeSelect.value);
    if (getState().classification.enabled) runClassification();
  });

  classifyBtn?.addEventListener('click', () => {
    clearClassificationCache();
    runClassification();
  });

  sortBtn?.addEventListener('click', () => {
    if (getState().images.length) autoLayout();
  });

  function runClassification() {
    const { images } = getState();
    if (!images.length) return;
    const results = classifyAllImages(images);
    setClassificationResults(results);
    updateClassifySummary();
  }

  function updateClassifySummary() {
    const summary = document.getElementById('classify-summary');
    if (!summary) return;
    const { classification, images } = getState();
    if (!classification.enabled || !images.length) {
      summary.innerHTML = '';
      return;
    }

    const counts = {};
    for (const img of images) {
      const r = classification.results[img.id];
      if (r) {
        const key = r.orientation + (classification.mode !== 'orientation' ? '/' + (r.category || 'general') : '');
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    summary.innerHTML = Object.entries(counts).map(([key, count]) => {
      const parts = key.split('/');
      const orientLabel = ORIENTATION_LABELS[parts[0]] || parts[0];
      const catLabel = parts[1] ? CATEGORY_LABELS[parts[1]] || parts[1] : '';
      const color = ORIENTATION_COLORS[parts[0]] || '#95a5a6';
      return `<span class="classify-tag" style="background:${color}">${orientLabel}${catLabel ? '·' + catLabel : ''} ${count}</span>`;
    }).join('');
  }

  // 初始同步 UI
  const initState = getState();
  if (initState.classification.enabled) {
    enabledCb.checked = true;
    controls.style.display = '';
    updateClassifySummary();
  }
}

// ====== 网格列数 ======
function initGridColumns() {
  const group = document.getElementById('grid-columns-group');
  const btn2 = document.getElementById('grid-cols-2');
  const btn3 = document.getElementById('grid-cols-3');

  if (!btn2 || !btn3) return;

  btn2.addEventListener('click', () => {
    setGridColumns(2);
    btn2.classList.add('active');
    btn3.classList.remove('active');
    if (getState().images.length) autoLayout();
  });

  btn3.addEventListener('click', () => {
    setGridColumns(3);
    btn3.classList.add('active');
    btn2.classList.remove('active');
    if (getState().images.length) autoLayout();
  });

  // 模板切换时显示/隐藏
  subscribe(() => {
    const { template } = getState();
    group.style.display = template === 'grid' ? '' : 'none';
  });
}

// ====== 应用到所有页 ======
function initApplyAllBackgrounds() {
  const btn = document.getElementById('bg-apply-all');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const type = document.getElementById('bg-type')?.value || 'none';
    if (type === 'none') {
      setAllPageBackgrounds({ type: 'none' });
      showToast('已清除所有页面背景');
      return;
    }

    const bg = { type };
    if (type === 'solid') {
      bg.color = document.getElementById('bg-color')?.value || '#ffffff';
    } else if (type === 'gradient') {
      bg.color = document.getElementById('bg-color')?.value || '#667eea';
      bg.color2 = document.getElementById('bg-color2')?.value || '#764ba2';
      bg.angle = parseInt(document.getElementById('bg-angle')?.value || '135');
    } else if (type === 'texture') {
      bg.texture = document.getElementById('bg-texture')?.value || 'dots';
    }

    setAllPageBackgrounds(bg);
    showToast('背景已应用到所有页面');
  });
}

// ====== 输入对话框 ======
function showInputDialog(title, defaultValue, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay visible';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3>${title}</h3>
      <button class="dialog-close">×</button>
    </div>
    <div class="dialog-body">
      <input type="text" class="text-input" value="${defaultValue || ''}" style="width:100%">
    </div>
    <div class="dialog-footer">
      <button class="btn-secondary cancel-btn">取消</button>
      <button class="btn-primary confirm-btn">确定</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = dialog.querySelector('input');
  input.focus();
  input.select();

  const close = () => overlay.remove();

  dialog.querySelector('.dialog-close').addEventListener('click', close);
  dialog.querySelector('.cancel-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  dialog.querySelector('.confirm-btn').addEventListener('click', () => {
    const value = input.value.trim();
    close();
    if (value) callback(value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = input.value.trim();
      close();
      if (value) callback(value);
    }
    if (e.key === 'Escape') close();
  });
}

// ====== 水印设置 ======
function initWatermark() {
  const enabledCb = document.getElementById('wm-enabled');
  const controls = document.getElementById('wm-controls');
  const textInput = document.getElementById('wm-text');
  const fontSizeInput = document.getElementById('wm-font-size');
  const colorInput = document.getElementById('wm-color');
  const opacityInput = document.getElementById('wm-opacity');
  const opacityLabel = document.getElementById('wm-opacity-label');
  const rotationInput = document.getElementById('wm-rotation');
  const rotationLabel = document.getElementById('wm-rotation-label');
  const spacingInput = document.getElementById('wm-spacing');
  const fontSelect = document.getElementById('wm-font');

  if (!enabledCb) return;

  // 启用/禁用
  enabledCb.addEventListener('change', () => {
    setWatermark({ enabled: enabledCb.checked });
    controls.style.display = enabledCb.checked ? '' : 'none';
  });

  // 文字
  textInput?.addEventListener('input', () => {
    setWatermark({ text: textInput.value });
  });

  // 字号
  fontSizeInput?.addEventListener('input', () => {
    setWatermark({ fontSize: parseInt(fontSizeInput.value) });
  });

  // 颜色
  colorInput?.addEventListener('input', () => {
    setWatermark({ color: colorInput.value });
  });

  // 透明度
  opacityInput?.addEventListener('input', () => {
    const val = parseInt(opacityInput.value);
    opacityLabel.textContent = val + '%';
    setWatermark({ opacity: val / 100 });
  });

  // 角度
  rotationInput?.addEventListener('input', () => {
    const val = parseInt(rotationInput.value);
    rotationLabel.textContent = val + '°';
    setWatermark({ rotation: val });
  });

  // 间距
  spacingInput?.addEventListener('input', () => {
    setWatermark({ spacing: parseInt(spacingInput.value) });
  });

  // 字体
  fontSelect?.addEventListener('change', () => {
    setWatermark({ fontFamily: fontSelect.value });
  });

  // 初始同步 UI
  const { watermark } = getState();
  if (watermark.enabled) {
    enabledCb.checked = true;
    controls.style.display = '';
  }
  if (textInput) textInput.value = watermark.text || '© 摄影集';
  if (fontSizeInput) fontSizeInput.value = watermark.fontSize || 24;
  if (colorInput) colorInput.value = watermark.color || '#000000';
  if (opacityInput) opacityInput.value = Math.round((watermark.opacity || 0.15) * 100);
  if (opacityLabel) opacityLabel.textContent = Math.round((watermark.opacity || 0.15) * 100) + '%';
  if (rotationInput) rotationInput.value = watermark.rotation || -30;
  if (rotationLabel) rotationLabel.textContent = (watermark.rotation || -30) + '°';
  if (spacingInput) spacingInput.value = watermark.spacing || 200;
  if (fontSelect) fontSelect.value = watermark.fontFamily || 'system-ui';
}
