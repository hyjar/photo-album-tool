# Right Sidebar Image Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right sidebar panel that appears when an image is selected, providing controls for image size, rotation, position, border, and filters.

**Architecture:** Add HTML structure for the right sidebar, CSS for styling and animations, and JavaScript for state management and control interactions. The sidebar integrates with the existing editor and preview modules.

**Tech Stack:** HTML5, CSS3 (backdrop-filter, transitions), vanilla JavaScript (ES modules)

---

## File Structure

- `index.html` - Add right sidebar HTML structure
- `src/style.css` - Add right sidebar styles
- `src/state.js` - Add image property state management
- `src/editor.js` - Add image selection handling
- `src/preview.js` - Apply image properties to preview elements
- `src/main.js` - Initialize right sidebar controls

---

### Task 1: Add Right Sidebar HTML Structure

**Covers:** [S3, S4]

**Files:**
- Modify: `index.html:205-216`

- [ ] **Step 1: Add right sidebar HTML after main-content**

```html
    <!-- 预览区 -->
    <div class="main-content">
      <div id="page-preview" class="page-preview">
        <div class="empty-preview">
          <div class="empty-icon">📷</div>
          <p>导入图片并点击"排版"开始创作</p>
        </div>
      </div>
    </div>

    <!-- 右侧图片控制面板 -->
    <aside id="right-sidebar" class="right-sidebar">
      <div class="section-header">
        <h3>图片控制</h3>
        <button id="close-right-sidebar" class="small-btn">✕</button>
      </div>

      <!-- 图片信息 -->
      <section class="sidebar-section">
        <div class="section-header"><h3>图片信息</h3></div>
        <div class="theme-controls">
          <label class="control-row">
            <span>文件名</span>
            <span id="img-filename" class="status-badge">-</span>
          </label>
          <label class="control-row">
            <span>尺寸</span>
            <span id="img-dimensions" class="status-badge">-</span>
          </label>
        </div>
      </section>

      <!-- 尺寸控制 -->
      <section class="sidebar-section">
        <div class="section-header"><h3>尺寸</h3></div>
        <div class="theme-controls">
          <label class="control-row">
            <span>宽度</span>
            <input type="number" id="img-width" min="10" max="2000" class="text-input">
          </label>
          <label class="control-row">
            <span>高度</span>
            <input type="number" id="img-height" min="10" max="2000" class="text-input">
          </label>
          <label class="control-row">
            <span>锁定比例</span>
            <button id="img-lock-ratio" class="fit-btn active">🔗</button>
          </label>
        </div>
      </section>

      <!-- 变换控制 -->
      <section class="sidebar-section">
        <div class="section-header"><h3>变换</h3></div>
        <div class="theme-controls">
          <label class="control-row">
            <span>旋转</span>
            <input type="range" id="img-rotation" min="0" max="360" value="0">
          </label>
          <label class="control-row">
            <span>角度</span>
            <input type="number" id="img-rotation-input" min="0" max="360" value="0" class="text-input">
          </label>
          <label class="control-row">
            <span>翻转</span>
            <div class="fit-btns">
              <button id="img-flip-h" class="fit-btn">↔</button>
              <button id="img-flip-v" class="fit-btn">↕</button>
            </div>
          </label>
        </div>
      </section>

      <!-- 位置控制 -->
      <section class="sidebar-section">
        <div class="section-header"><h3>位置</h3></div>
        <div class="theme-controls">
          <label class="control-row">
            <span>X</span>
            <input type="number" id="img-x" class="text-input">
          </label>
          <label class="control-row">
            <span>Y</span>
            <input type="number" id="img-y" class="text-input">
          </label>
          <button id="img-center" class="small-btn">居中</button>
        </div>
      </section>

      <!-- 边框控制 -->
      <section class="sidebar-section">
        <div class="section-header"><h3>边框</h3></div>
        <div class="theme-controls">
          <label class="control-row">
            <span>宽度</span>
            <input type="number" id="img-border-width" min="0" max="20" value="0" class="text-input">
          </label>
          <label class="control-row">
            <span>颜色</span>
            <input type="color" id="img-border-color" value="#000000">
          </label>
          <label class="control-row">
            <span>圆角</span>
            <input type="number" id="img-border-radius" min="0" max="100" value="0" class="text-input">
          </label>
        </div>
      </section>

      <!-- 滤镜控制 -->
      <section class="sidebar-section">
        <div class="section-header"><h3>滤镜</h3></div>
        <div class="theme-controls">
          <label class="control-row">
            <span>亮度</span>
            <input type="range" id="img-brightness" min="0" max="200" value="100">
          </label>
          <label class="control-row">
            <span>对比度</span>
            <input type="range" id="img-contrast" min="0" max="200" value="100">
          </label>
          <label class="control-row">
            <span>饱和度</span>
            <input type="range" id="img-saturate" min="0" max="200" value="100">
          </label>
          <button id="img-reset-filters" class="small-btn">重置滤镜</button>
        </div>
      </section>
    </aside>
  </main>
```

- [ ] **Step 2: Verify HTML structure**

Open browser and verify:
- Right sidebar HTML exists in DOM
- All control elements have correct IDs
- Layout doesn't break

- [ ] **Step 3: Commit changes**

```bash
git add index.html
git commit -m "feat: add right sidebar HTML structure for image controls"
```

---

### Task 2: Add Right Sidebar CSS Styles

**Covers:** [S6]

**Files:**
- Modify: `src/style.css` (add after existing sidebar styles)

- [ ] **Step 1: Add right sidebar styles**

```css
/* ============ 右侧图片控制面板 ============ */
.right-sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-left: 0.5px solid var(--border-color);
  overflow-y: auto;
  padding: var(--space-4);
  position: fixed;
  right: 0;
  top: var(--toolbar-height);
  bottom: 0;
  transform: translateX(100%);
  transition: transform var(--transition-slow);
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.right-sidebar.visible {
  transform: translateX(0);
}

.right-sidebar .section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.right-sidebar .section-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.right-sidebar .sidebar-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 0.5px solid var(--border-color);
  box-shadow: var(--shadow-level-1);
}
```

- [ ] **Step 2: Update main-content to account for right sidebar**

```css
.main-content {
  flex: 1;
  overflow: auto;
  padding: var(--space-6);
  display: flex;
  justify-content: center;
  background: var(--bg-primary);
  margin-right: 0;
  transition: margin-right var(--transition-slow);
}

.main-content.shifted {
  margin-right: var(--sidebar-width);
}
```

- [ ] **Step 3: Verify styles in browser**

Open browser and verify:
- Right sidebar has frosted glass effect
- Animation works when toggling visibility
- Layout shifts correctly when sidebar appears

- [ ] **Step 4: Commit changes**

```bash
git add src/style.css
git commit -m "feat: add right sidebar CSS styles with frosted glass effect"
```

---

### Task 3: Add Image Property State Management

**Covers:** [S7]

**Files:**
- Modify: `src/state.js`

- [ ] **Step 1: Add image property state to state store**

```javascript
// Add to state.js initial state
const initialState = {
  // ... existing state ...
  selectedImageId: null,
  selectedImageProps: {
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    x: 0,
    y: 0,
    borderWidth: 0,
    borderColor: '#000000',
    borderRadius: 0,
    brightness: 100,
    contrast: 100,
    saturate: 100,
  },
  lockRatio: true,
  originalAspectRatio: 1,
};
```

- [ ] **Step 2: Add state actions for image properties**

```javascript
// Add to state.js actions
export function setSelectedImage(imageId, props) {
  state.selectedImageId = imageId;
  if (props) {
    state.selectedImageProps = { ...state.selectedImageProps, ...props };
    state.originalAspectRatio = props.width / props.height;
  }
  notify();
}

export function clearSelectedImage() {
  state.selectedImageId = null;
  notify();
}

export function updateImageProps(props) {
  if (!state.selectedImageId) return;
  
  const newProps = { ...state.selectedImageProps, ...props };
  
  // Handle lock ratio
  if (state.lockRatio && (props.width || props.height)) {
    if (props.width) {
      newProps.height = Math.round(props.width / state.originalAspectRatio);
    } else if (props.height) {
      newProps.width = Math.round(props.height * state.originalAspectRatio);
    }
  }
  
  state.selectedImageProps = newProps;
  
  // Update the element in pages
  const { pages, selectedPageId } = state;
  const page = pages.find(p => p.id === selectedPageId);
  if (page) {
    const element = page.elements.find(el => el.id === state.selectedImageId);
    if (element) {
      Object.assign(element, newProps);
    }
  }
  
  notify();
}

export function setLockRatio(lock) {
  state.lockRatio = lock;
  if (lock) {
    const { width, height } = state.selectedImageProps;
    state.originalAspectRatio = width / height;
  }
  notify();
}

export function resetImageFilters() {
  state.selectedImageProps = {
    ...state.selectedImageProps,
    brightness: 100,
    contrast: 100,
    saturate: 100,
  };
  notify();
}
```

- [ ] **Step 3: Export new functions**

```javascript
// Add to exports
export {
  // ... existing exports ...
  setSelectedImage,
  clearSelectedImage,
  updateImageProps,
  setLockRatio,
  resetImageFilters,
};
```

- [ ] **Step 4: Commit changes**

```bash
git add src/state.js
git commit -m "feat: add image property state management"
```

---

### Task 4: Add Image Selection Handling

**Covers:** [S7]

**Files:**
- Modify: `src/editor.js`

- [ ] **Step 1: Add image selection handler**

```javascript
// Add to editor.js
import { setSelectedImage, clearSelectedImage } from './state.js';

export function initEditor() {
  // ... existing code ...
  
  // Add click handler for image elements
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.preview-element');
    if (target) {
      const elementId = target.dataset.elementId;
      const pageId = target.closest('.preview-page')?.dataset.pageId;
      
      if (elementId && pageId) {
        const { pages } = getState();
        const page = pages.find(p => p.id === pageId);
        const element = page?.elements.find(el => el.id === elementId);
        
        if (element) {
          setSelectedImage(elementId, {
            width: element.width || 100,
            height: element.height || 100,
            rotation: element.rotation || 0,
            flipH: element.flipH || false,
            flipV: element.flipV || false,
            x: element.x || 0,
            y: element.y || 0,
            borderWidth: element.borderWidth || 0,
            borderColor: element.borderColor || '#000000',
            borderRadius: element.borderRadius || 0,
            brightness: element.brightness || 100,
            contrast: element.contrast || 100,
            saturate: element.saturate || 100,
          });
          
          // Show right sidebar
          document.getElementById('right-sidebar')?.classList.add('visible');
          document.querySelector('.main-content')?.classList.add('shifted');
        }
      }
    } else if (!e.target.closest('.right-sidebar')) {
      // Click outside sidebar and elements - clear selection
      clearSelectedImage();
      document.getElementById('right-sidebar')?.classList.remove('visible');
      document.querySelector('.main-content')?.classList.remove('shifted');
    }
  });
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/editor.js
git commit -m "feat: add image selection handling for right sidebar"
```

---

### Task 5: Add Right Sidebar Control Event Listeners

**Covers:** [S4, S5]

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add right sidebar initialization function**

```javascript
// Add to main.js
import {
  // ... existing imports ...
  updateImageProps,
  setLockRatio,
  resetImageFilters,
  getState,
} from './state.js';

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
  
  document.getElementById('img-center')?.addEventListener('click', () => {
    updateImageProps({ x: 0, y: 0 });
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
```

- [ ] **Step 2: Call initRightSidebar in DOMContentLoaded**

```javascript
// Add to DOMContentLoaded callback
document.addEventListener('DOMContentLoaded', () => {
  // ... existing init calls ...
  initRightSidebar();
});
```

- [ ] **Step 3: Commit changes**

```bash
git add src/main.js
git commit -m "feat: add right sidebar control event listeners"
```

---

### Task 6: Apply Image Properties to Preview Elements

**Covers:** [S5]

**Files:**
- Modify: `src/preview.js`

- [ ] **Step 1: Add image property application function**

```javascript
// Add to preview.js
import { getState } from './state.js';

function applyImageProps(element, props) {
  const {
    width,
    height,
    rotation,
    flipH,
    flipV,
    x,
    y,
    borderWidth,
    borderColor,
    borderRadius,
    brightness,
    contrast,
    saturate,
  } = props;
  
  // Apply size
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  
  // Apply transform
  const transforms = [];
  if (rotation) transforms.push(`rotate(${rotation}deg)`);
  if (flipH) transforms.push('scaleX(-1)');
  if (flipV) transforms.push('scaleY(-1)');
  if (x || y) transforms.push(`translate(${x}px, ${y}px)`);
  
  element.style.transform = transforms.join(' ') || 'none';
  
  // Apply border
  element.style.borderWidth = `${borderWidth}px`;
  element.style.borderColor = borderColor;
  element.style.borderStyle = borderWidth ? 'solid' : 'none';
  element.style.borderRadius = `${borderRadius}px`;
  
  // Apply filters
  const filters = [];
  if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
  if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
  if (saturate !== 100) filters.push(`saturate(${saturate}%)`);
  
  element.style.filter = filters.join(' ') || 'none';
}

// Export for use in other modules
export { applyImageProps };
```

- [ ] **Step 2: Update renderPreview to apply image properties**

```javascript
// Find the renderPreview function and update it
function renderPreview() {
  // ... existing code ...
  
  // After rendering elements, apply image properties
  const { selectedImageId, selectedImageProps } = getState();
  
  elements.forEach(el => {
    const element = previewPage.querySelector(`[data-element-id="${el.id}"]`);
    if (element) {
      // Apply stored properties
      const props = el.id === selectedImageId ? selectedImageProps : {
        width: el.width || 100,
        height: el.height || 100,
        rotation: el.rotation || 0,
        flipH: el.flipH || false,
        flipV: el.flipV || false,
        x: el.x || 0,
        y: el.y || 0,
        borderWidth: el.borderWidth || 0,
        borderColor: el.borderColor || '#000000',
        borderRadius: el.borderRadius || 0,
        brightness: el.brightness || 100,
        contrast: el.contrast || 100,
        saturate: el.saturate || 100,
      };
      
      applyImageProps(element, props);
    }
  });
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/preview.js
git commit -m "feat: apply image properties to preview elements"
```

---

### Task 7: Verify Implementation

**Covers:** [S8]

**Files:**
- None (verification only)

- [ ] **Step 1: Start development server**

```bash
npm run dev
```

- [ ] **Step 2: Verify right sidebar appears**

- Import images
- Click "排版" to layout images
- Click on an image element
- Verify right sidebar slides in from right
- Verify main content shifts left

- [ ] **Step 3: Test size controls**

- Adjust width input
- Verify height updates automatically when lock ratio is on
- Turn off lock ratio
- Verify width and height update independently

- [ ] **Step 4: Test transform controls**

- Adjust rotation slider
- Verify image rotates in preview
- Click flip buttons
- Verify image flips correctly

- [ ] **Step 5: Test position controls**

- Adjust X/Y inputs
- Verify image moves in preview
- Click "居中" button
- Verify image returns to center

- [ ] **Step 6: Test border controls**

- Set border width > 0
- Verify border appears on image
- Change border color
- Verify color updates
- Set border radius
- Verify corners round

- [ ] **Step 7: Test filter controls**

- Adjust brightness slider
- Verify image brightness changes
- Adjust contrast slider
- Verify image contrast changes
- Adjust saturate slider
- Verify image saturation changes
- Click "重置滤镜"
- Verify filters reset to default

- [ ] **Step 8: Test dark mode**

- Toggle dark mode
- Verify right sidebar adapts to dark theme

- [ ] **Step 9: Commit verification**

```bash
git add -A
git commit -m "feat: complete right sidebar image controls implementation"
```

---

## Summary

This plan adds a right sidebar panel with comprehensive image controls:

1. **HTML Structure** - Right sidebar with all control sections
2. **CSS Styling** - Frosted glass effect, smooth animations
3. **State Management** - Image property state with lock ratio support
4. **Selection Handling** - Click to select, auto-show/hide sidebar
5. **Event Listeners** - All control interactions
6. **Preview Application** - Apply properties to preview elements
7. **Verification** - Comprehensive testing of all features

All changes integrate with the existing Apple-style design language and maintain consistency with the left sidebar.