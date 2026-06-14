/**
 * 富文本编辑器模块
 * 提供内联 contenteditable 编辑 —— 编辑器紧贴目标元素旁边
 */

let _activeEditor = null;

/**
 * 创建内联编辑器（紧贴目标元素旁边）
 * @param {HTMLElement} targetElement - 目标元素
 * @param {Object} options - { value, onChange, multiline, rich }
 * @returns {{ destroy: Function }}
 */
export function createInlineEditor(targetElement, options = {}) {
  const { value = '', onChange, multiline = false, rich = false } = options;

  // 如果已有活跃编辑器，先销毁
  if (_activeEditor) _activeEditor.destroy();

  // 获取目标元素在页面中的位置
  const rect = targetElement.getBoundingClientRect();

  // 创建浮动容器
  const container = document.createElement('div');
  container.className = 'inline-editor-float';

  // 定位到目标元素右侧，如果右侧空间不足则定位到左侧
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const editorW = rich ? 360 : 280;
  const editorH = rich ? 200 : 120;

  let left = rect.right + 8;
  let top = rect.top;

  // 右侧空间不足，放左侧
  if (left + editorW > viewportW - 16) {
    left = rect.left - editorW - 8;
  }
  // 左侧也不够，就放在下方
  if (left < 16) {
    left = Math.max(16, rect.left);
    top = rect.bottom + 8;
  }
  // 下方空间不足，放上方
  if (top + editorH > viewportH - 16) {
    top = Math.max(16, rect.top - editorH - 8);
  }
  // 保证不超出视口
  top = Math.max(16, Math.min(top, viewportH - editorH - 16));
  left = Math.max(16, Math.min(left, viewportW - editorW - 16));

  container.style.left = left + 'px';
  container.style.top = top + 'px';

  // 富文本工具栏
  let toolbar = null;
  if (rich) {
    toolbar = createToolbar(null); // editor 后面再设置
    container.appendChild(toolbar);
  }

  // 编辑区
  const editor = document.createElement('div');
  editor.className = 'inline-editor-content';
  editor.contentEditable = 'true';
  editor.innerHTML = value || '';
  if (multiline) {
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.minHeight = '60px';
  }
  container.appendChild(editor);

  // 工具栏绑定编辑器
  if (toolbar) bindToolbarToEditor(toolbar, editor);

  // 按钮区
  const actions = document.createElement('div');
  actions.className = 'inline-editor-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'inline-editor-btn';
  cancelBtn.textContent = '取消';
  cancelBtn.addEventListener('click', () => destroy());

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'inline-editor-btn primary';
  confirmBtn.textContent = '确定';
  confirmBtn.addEventListener('click', () => {
    const newValue = editor.innerHTML;
    if (onChange) onChange(newValue);
    destroy();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  container.appendChild(actions);

  document.body.appendChild(container);
  editor.focus();

  // 选中全部文本
  const range = document.createRange();
  range.selectNodeContents(editor);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // 键盘事件
  function onKeyDown(e) {
    if (e.key === 'Escape') destroy();
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      const newValue = editor.innerHTML;
      if (onChange) onChange(newValue);
      destroy();
    }
  }
  editor.addEventListener('keydown', onKeyDown);

  // 点击外部关闭
  function onOutsideClick(e) {
    if (!container.contains(e.target) && e.target !== targetElement) {
      // 先提交再关闭
      const newValue = editor.innerHTML;
      if (onChange) onChange(newValue);
      destroy();
    }
  }
  setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 50);

  function destroy() {
    if (_activeEditor === api) _activeEditor = null;
    container.remove();
    document.removeEventListener('mousedown', onOutsideClick);
  }

  const api = { destroy };
  _activeEditor = api;
  return api;
}

/**
 * 创建富文本工具栏（不绑定编辑器）
 */
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-toolbar-inline';

  const buttons = [
    { cmd: 'bold', label: 'B', title: '加粗' },
    { cmd: 'italic', label: 'I', title: '斜体', style: 'font-style:italic' },
    { cmd: 'underline', label: 'U', title: '下划线', style: 'text-decoration:underline' },
  ];

  buttons.forEach(({ cmd, label, title, style }) => {
    const btn = document.createElement('button');
    btn.className = 'rich-toolbar-btn';
    btn.textContent = label;
    btn.title = title;
    if (style) btn.style.cssText = style;
    btn.dataset.cmd = cmd;
    toolbar.appendChild(btn);
  });

  // 字号
  const sizeSelect = document.createElement('select');
  sizeSelect.className = 'rich-toolbar-select';
  sizeSelect.title = '字号';
  [10, 12, 14, 16, 18, 24, 36, 48, 72].forEach(size => {
    const opt = document.createElement('option');
    opt.value = size;
    opt.textContent = size + 'px';
    if (size === 16) opt.selected = true;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.dataset.role = 'fontSize';
  toolbar.appendChild(sizeSelect);

  // 字体
  const fontSelect = document.createElement('select');
  fontSelect.className = 'rich-toolbar-select';
  fontSelect.title = '字体';
  [
    { value: 'system-ui', label: '默认' },
    { value: '"PingFang SC","Microsoft YaHei"', label: '黑体' },
    { value: 'SimSun,"Songti SC"', label: '宋体' },
    { value: 'serif', label: '衬线' },
    { value: 'sans-serif', label: '无衬线' },
    { value: 'monospace', label: '等宽' },
  ].forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    fontSelect.appendChild(opt);
  });
  fontSelect.dataset.role = 'fontName';
  toolbar.appendChild(fontSelect);

  // 颜色
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'rich-toolbar-color';
  colorInput.value = '#000000';
  colorInput.title = '文字颜色';
  colorInput.dataset.role = 'foreColor';
  toolbar.appendChild(colorInput);

  return toolbar;
}

/**
 * 绑定工具栏到编辑器
 */
function bindToolbarToEditor(toolbar, editor) {
  // 命令按钮
  toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // 防止编辑器失焦
      document.execCommand(btn.dataset.cmd, false, null);
      editor.focus();
    });
  });

  // 字号
  const sizeSelect = toolbar.querySelector('[data-role="fontSize"]');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      document.execCommand('fontSize', false, '7');
      editor.querySelectorAll('font[size="7"]').forEach(el => {
        el.removeAttribute('size');
        el.style.fontSize = sizeSelect.value + 'px';
      });
      editor.focus();
    });
  }

  // 字体
  const fontSelect = toolbar.querySelector('[data-role="fontName"]');
  if (fontSelect) {
    fontSelect.addEventListener('change', () => {
      document.execCommand('fontName', false, fontSelect.value);
      editor.focus();
    });
  }

  // 颜色
  const colorInput = toolbar.querySelector('[data-role="foreColor"]');
  if (colorInput) {
    colorInput.addEventListener('input', () => {
      document.execCommand('foreColor', false, colorInput.value);
      editor.focus();
    });
  }
}

/**
 * 销毁当前活跃的编辑器
 */
export function destroyActiveEditor() {
  if (_activeEditor) {
    _activeEditor.destroy();
    _activeEditor = null;
  }
}
