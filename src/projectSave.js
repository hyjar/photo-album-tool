/**
 * 项目状态保存/加载模块
 * 保存为 JSON 配置文件，支持随时恢复进度
 */
import { exportState, importState, getState } from './state.js';
import { formatDate } from './utils.js';

const PROJECT_FILE_HANDLE = 'photo-album-project-handle';

// 保存项目
export async function saveProject() {
  const data = exportState();
  const json = JSON.stringify(data, null, 2);
  const fileName = `摄影集项目_${formatDate()}.json`;

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: '项目配置文件',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      showToast('项目已保存');
    } else {
      // 回退：下载文件
      downloadJSON(data, fileName);
      showToast('项目已下载');
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      downloadJSON(data, fileName);
    }
  }
}

// 加载项目
export async function loadProject() {
  try {
    let file;
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: '项目配置文件',
          accept: { 'application/json': ['.json'] },
        }],
      });
      file = await handle.getFile();
    } else {
      file = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => resolve(input.files[0]);
        input.click();
      });
    }

    if (!file) return;

    const text = await file.text();
    const saved = JSON.parse(text);

    // 需要用户重新选择图片文件夹来恢复图片数据
    if (saved.images && saved.images.length > 0) {
      const hasDataURLs = saved.images.some(img => img.dataURL && img.dataURL.startsWith('data:'));
      if (!hasDataURLs) {
        const proceed = confirm(
          `项目包含 ${saved.images.length} 张图片。\n` +
          '图片数据未保存在配置文件中，请选择原始图片文件夹以恢复。'
        );
        if (proceed) {
          await loadProjectWithImages(saved);
          return;
        }
      }
    }

    importState(saved, {});
    showToast('项目已加载');
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('加载项目失败:', e);
      showToast('加载失败: ' + e.message);
    }
  }
}

// 带图片恢复的项目加载
async function loadProjectWithImages(saved) {
  try {
    let files;
    if ('showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker();
      files = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.type.startsWith('image/')) {
            files.push(file);
          }
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      files = await new Promise((resolve) => {
        input.onchange = () => resolve(Array.from(input.files).filter(f => f.type.startsWith('image/')));
        input.click();
      });
    }

    // 建立文件名到 dataURL 的映射
    const imageMap = {};
    for (const file of files) {
      const dataURL = await readFileAsDataURL(file);
      imageMap[file.name] = dataURL;
    }

    importState(saved, imageMap);
    showToast(`项目已加载，恢复了 ${files.length} 张图片`);
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('恢复图片失败:', e);
      importState(saved, {});
      showToast('项目已加载（图片需手动重新导入）');
    }
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 下载 JSON 文件
function downloadJSON(data, fileName) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// Toast 提示
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export { showToast };
