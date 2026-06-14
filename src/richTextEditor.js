/**
 * 富文本编辑器模块
 * 提供内联 contenteditable 编辑和浮动工具栏
 */

let _activeEditor = null;

/**
 * 创建内联编辑器
 * @param {HTMLElement} targetElement - 目标元素
 * @param {Object} options - { value, onChange, multiline, rich }
 * @returns {{ destroy: Function }}
 */
export function createInlineEditor(targetElement, options = {}) {
  const { value = '', onChange, multiline = false, rich = false } = options;

  // 如果已有活跃编辑器，先销毁
  if (_activeEditor) _activeEditor.destroy();

  const overlay = document.createElement('div');
  overlay.className = 'inline-editor-overlay';

  const editor = document.createElement('div');
  editor.className = 'inline-editor-content';
  editor.contentEditable = 'true';
  editor.innerHTML = value || '';
  if (multiline) {
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.minHeight = '60px';
  }

  overlay.appendChild(editor);

  // 富文本工具栏
  if (rich) {
    const toolbar = createToolbar(editor);
    overlay.insertBefore(toolbar, editor);
  }

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
  overlay.appendChild(actions);

  document.body.appendChild(overlay);
  editor.focus();

  // 选中全部文本
  const range = document.createRange();
  range.selectNodeContents(editor);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // ESC 退出
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

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) destroy();
  });

  function destroy() {
    if (_activeEditor === this) _activeEditor = null;
    overlay.remove();
  }

  const api = { destroy: destroy.bind(api) };
  _activeEditor = api;
  return api;
}

/**
 * 创建富文本工具栏
 */
function createToolbar(editor) {
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-toolbar';

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
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.execCommand(cmd, false, null);
      editor.focus();
    });
    toolbar.appendChild(btn);
  });

  // 字号选择
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
  sizeSelect.addEventListener('change', () => {
    document.execCommand('fontSize', false, '7'); // 用 7 作为临时值
    // 然后替换为实际大小
    const fontElements = editor.querySelectorAll('font[size="7"]');
    fontElements.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = sizeSelect.value + 'px';
    });
    editor.focus();
  });
  toolbar.appendChild(sizeSelect);

  // 字体选择
  const fontSelect = document.createElement('select');
  fontSelect.className = 'rich-toolbar-select';
  fontSelect.title = '字体';
  const fonts = [
    { value: 'system-ui', label: '系统默认' },
    { value: '"PingFang SC", "Microsoft YaHei"', label: '中文黑体' },
    { value: 'SimSun, "Songti SC"', label: '中文宋体' },
    { value: 'serif', label: '衬线体' },
    { value: 'sans-serif', label: '无衬线体' },
    { value: 'monospace', label: '等宽体' },
  ];
  fonts.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    opt.style.fontFamily = value;
    fontSelect.appendChild(opt);
  });
  fontSelect.addEventListener('change', () => {
    document.execCommand('fontName', false, fontSelect.value);
    editor.focus();
  });
  toolbar.appendChild(fontSelect);

  // 颜色选择
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'rich-toolbar-color';
  colorInput.value = '#000000';
  colorInput.title = '文字颜色';
  colorInput.addEventListener('input', () => {
    document.execCommand('foreColor', false, colorInput.value);
    editor.focus();
  });
  toolbar.appendChild(colorInput);

  // 对齐按钮
  const aligns = [
    { cmd: 'justifyLeft', label: '≡', title: '左对齐' },
    { cmd: 'justifyCenter', label: '≡', title: '居中', style: 'text-align:center' },
    { cmd: 'justifyRight', label: '≡', title: '右对齐', style: 'text-align:right' },
  ];
  aligns.forEach(({ cmd, label, title, style }) => {
    const btn = document.createElement('button');
    btn.className = 'rich-toolbar-btn';
    btn.textContent = label;
    btn.title = title;
    if (style) btn.style.cssText = style;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.execCommand(cmd, false, null);
      editor.focus();
    });
    toolbar.appendChild(btn);
  });

  return toolbar;
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
