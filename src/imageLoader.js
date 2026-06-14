/**
 * 图片导入模块
 * 性能优化：
 * - objectURL 避免 dataURL 膨胀
 * - 200px 缩略图用于侧边栏
 * - 中等尺寸预览图用于页面排版（避免解码 100MB+ 原图）
 * - 分批处理让出主线程
 */
import { uid, loadImage, el } from './utils.js';
import { addImages, removeImage, reorderImages, getState } from './state.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
const THUMB_MAX = 200;    // 缩略图最大边长
const PREVIEW_MAX = 2000; // 预览图最大边长（用于排版显示）
const SIZE_WARN_MB = 50;  // 超过此大小显示警告

// 用 createImageBitmap 高效生成缩放版本
async function createResizedBlob(url, maxSize) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: maxSize,
      resizeHeight: maxSize,
      resizeQuality: 'medium',
    });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close(); // 释放 GPU 内存
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(URL.createObjectURL(b)), 'image/jpeg', 0.75);
    });
  } catch (e) {
    console.warn('生成缩放图失败:', e);
    return url; // 回退到原图
  }
}

// 处理文件列表，onProgress(done, total) 可选回调
async function processFiles(files, onProgress) {
  const imageFiles = Array.from(files)
    .filter(f => ACCEPTED_TYPES.includes(f.type))
    .sort((a, b) => a.size - b.size); // 小文件先处理，快速显示

  if (imageFiles.length === 0) return [];

  const results = [];
  const total = imageFiles.length;
  const BATCH = 2; // 每批处理数（大文件需要更少并发）

  for (let i = 0; i < imageFiles.length; i += BATCH) {
    const batch = imageFiles.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(async file => {
      try {
        const objectURL = URL.createObjectURL(file);
        const img = await loadImage(objectURL);

        // 并行生成缩略图和预览图
        const [thumbURL, previewURL] = await Promise.all([
          createResizedBlob(objectURL, THUMB_MAX),
          createResizedBlob(objectURL, PREVIEW_MAX),
        ]);

        return {
          id: uid(),
          name: file.name,
          objectURL,     // 原图（仅用于 PDF 导出）
          previewURL,    // 中等预览（用于排版显示）
          thumbURL,      // 小缩略图（用于侧边栏）
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          size: file.size,
        };
      } catch (e) {
        console.warn('无法加载图片:', file.name, e);
        return null;
      }
    }));

    results.push(...batchResults.filter(Boolean));

    // 报告进度
    const done = Math.min(i + BATCH, total);
    if (onProgress) onProgress(done, total);

    // 每批之间让出主线程
    if (i + BATCH < imageFiles.length) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  // 警告大文件
  const largeFiles = results.filter(r => r.size > SIZE_WARN_MB * 1024 * 1024);
  if (largeFiles.length > 0) {
    const names = largeFiles.map(f => `${f.name} (${(f.size / 1048576).toFixed(0)}MB)`).join('\n');
    console.warn(`以下文件较大，处理可能较慢:\n${names}`);
  }

  return results;
}

// 进度条控制
function showProgress() {
  const bar = document.getElementById('import-progress');
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  bar.classList.remove('hidden');
  fill.style.width = '0%';
  text.textContent = '处理中...';
}

function updateProgress(done, total) {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const pct = Math.round((done / total) * 100);
  fill.style.width = pct + '%';
  text.textContent = `处理中 ${done}/${total}`;
}

function hideProgress() {
  const bar = document.getElementById('import-progress');
  bar.classList.add('hidden');
}

// 初始化图片导入
export function initImageLoader() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const selectBtn = document.getElementById('select-images-btn');

  selectBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const count = Array.from(e.target.files).filter(f =>
      ['image/jpeg','image/png','image/webp','image/gif','image/bmp'].includes(f.type)
    ).length;
    if (count > 0) {
      showProgress();
      const images = await processFiles(e.target.files, updateProgress);
      hideProgress();
      if (images.length) addImages(images);
    }
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    const files = [];
    const entries = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    if (entries.length > 0) {
      for (const entry of entries) {
        const entryFiles = await readEntry(entry);
        files.push(...entryFiles);
      }
    }

    const validFiles = files.filter(f =>
      ['image/jpeg','image/png','image/webp','image/gif','image/bmp'].includes(f.type)
    );
    if (validFiles.length > 0) {
      showProgress();
      const images = await processFiles(files, updateProgress);
      hideProgress();
      if (images.length) addImages(images);
    }
  });
}

function readEntry(entry) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file(file => resolve([file]), () => resolve([]));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const allFiles = [];
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) { resolve(allFiles); return; }
          for (const e of entries) {
            const f = await readEntry(e);
            allFiles.push(...f);
          }
          readBatch();
        }, () => resolve(allFiles));
      };
      readBatch();
    } else {
      resolve([]);
    }
  });
}

// 渲染缩略图列表 — 增量更新
let _thumbContainer = null;
let _renderedThumbIds = [];

export function renderThumbnailList() {
  if (!_thumbContainer) _thumbContainer = document.getElementById('thumbnail-list');
  const container = _thumbContainer;
  const { images } = getState();

  const newIds = images.map(i => i.id);
  const idsChanged = newIds.length !== _renderedThumbIds.length ||
    newIds.some((id, i) => id !== _renderedThumbIds[i]);

  if (!idsChanged) return;
  _renderedThumbIds = newIds;
  container.innerHTML = '';

  if (images.length === 0) {
    container.innerHTML = '<div class="empty-hint">拖拽图片或文件夹到此处</div>';
    return;
  }

  images.forEach((img, idx) => {
    const sizeMB = (img.size / 1048576).toFixed(1);
    const thumb = el('div', { class: 'thumbnail', 'data-id': img.id, draggable: 'true' }, [
      el('img', { src: img.thumbURL, alt: img.name, loading: 'lazy' }),
      el('div', { class: 'thumbnail-info' }, [
        el('span', { class: 'thumbnail-name', textContent: img.name }),
        el('span', { class: 'thumbnail-size', textContent: `${img.width}×${img.height} (${sizeMB}MB)` }),
      ]),
      el('button', {
        class: 'thumbnail-remove',
        textContent: '×',
        title: '删除',
        onClick: (e) => { e.stopPropagation(); removeImage(img.id); },
      }),
    ]);

    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', idx.toString());
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
    thumb.addEventListener('dragover', (e) => { e.preventDefault(); thumb.classList.add('drag-over'); });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-over'));
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      thumb.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      if (!isNaN(fromIdx) && fromIdx !== idx) {
        reorderImages(fromIdx, idx);
        _renderedThumbIds = [];
        renderThumbnailList();
      }
    });

    container.appendChild(thumb);
  });
}
