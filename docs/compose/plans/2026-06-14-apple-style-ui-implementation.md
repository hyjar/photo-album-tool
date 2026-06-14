# Apple-Style UI Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/apple-style-ui-redesign.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing photography album layout tool's UI into a refined Apple-inspired design with frosted glass effects, micro-interactions, and polished animations.

**Architecture:** Pure CSS/HTML changes to the existing codebase. No JavaScript logic modifications. Maintain all existing functionality while enhancing visual design.

**Tech Stack:** CSS3 (backdrop-filter, transitions, transforms), HTML5, vanilla JavaScript (for animation classes if needed)

---

## File Structure

- `src/style.css` - Main stylesheet (primary changes)
- `index.html` - Minor structural updates if needed
- `src/main.js` - Add animation classes if needed (minimal changes)

---

### Task 1: Update CSS Variables and Base Styles

**Covers:** [S2]

**Files:**
- Modify: `src/style.css:1-50`

- [ ] **Step 1: Update CSS variables for Apple color system**

```css
:root {
  /* Apple Color System */
  --system-blue: #007AFF;
  --system-blue-dark: #0056CC;
  --system-green: #34C759;
  --system-red: #FF3B30;
  --system-orange: #FF9500;
  --system-yellow: #FFCC00;
  
  /* Light Mode */
  --bg-primary: #F5F5F7;
  --bg-secondary: rgba(255,255,255,0.82);
  --bg-tertiary: rgba(0,0,0,0.04);
  --text-primary: #1D1D1F;
  --text-secondary: #86868B;
  --text-tertiary: #AEAEB2;
  --border-color: rgba(0,0,0,0.12);
  
  /* Shadows */
  --shadow-level-1: 0 1px 4px rgba(0,0,0,0.1);
  --shadow-level-2: 0 4px 16px rgba(0,0,0,0.12);
  --shadow-level-3: 0 8px 32px rgba(0,0,0,0.15);
  --shadow-level-4: 0 24px 80px rgba(0,0,0,0.25);
  
  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  /* Layout */
  --toolbar-height: 52px;
  --sidebar-width: 280px;
}
```

- [ ] **Step 2: Update dark mode variables**

```css
.dark {
  --bg-primary: #1D1D1F;
  --bg-secondary: rgba(255,255,255,0.08);
  --bg-tertiary: rgba(255,255,255,0.06);
  --text-primary: #F5F5F7;
  --text-secondary: #86868B;
  --text-tertiary: #6E6E73;
  --border-color: rgba(255,255,255,0.1);
  
  /* Enhanced shadows for dark mode */
  --shadow-level-1: 0 1px 4px rgba(0,0,0,0.2);
  --shadow-level-2: 0 4px 16px rgba(0,0,0,0.25);
  --shadow-level-3: 0 8px 32px rgba(0,0,0,0.3);
  --shadow-level-4: 0 24px 80px rgba(0,0,0,0.4);
}
```

- [ ] **Step 3: Update base body styles**

```css
body {
  font-family: var(--font-family);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 4: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update CSS variables for Apple color system and spacing"
```

---

### Task 2: Update Header Toolbar with Frosted Glass

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:59-131`

- [ ] **Step 1: Update toolbar styles**

```css
.toolbar {
  height: var(--toolbar-height);
  background: var(--bg-secondary);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-bottom: 0.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  box-shadow: var(--shadow-level-1);
  z-index: 100;
  position: sticky;
  top: 0;
}
```

- [ ] **Step 2: Update button styles**

```css
.tool-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-normal);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.tool-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.tool-btn:hover::after {
  opacity: 1;
}

.tool-btn:active {
  transform: scale(0.95);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn:disabled::after {
  display: none;
}

.tool-btn.primary {
  background: linear-gradient(135deg, var(--system-blue), var(--system-blue-dark));
  color: white;
  box-shadow: var(--shadow-level-1);
}

.tool-btn.primary:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-level-2);
}

.tool-btn.primary:active {
  transform: scale(0.95);
}
```

- [ ] **Step 3: Update title and status badge**

```css
.app-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-right: var(--space-3);
  letter-spacing: -0.3px;
}

.status-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  letter-spacing: 0.2px;
}
```

- [ ] **Step 4: Update toolbar divider**

```css
.toolbar-divider {
  width: 0.5px;
  height: 20px;
  background: var(--border-color);
  margin: 0 var(--space-1);
}
```

- [ ] **Step 5: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update header toolbar with frosted glass and micro-interactions"
```

---

### Task 3: Update Sidebar with Frosted Glass

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:138-205`

- [ ] **Step 1: Update sidebar styles**

```css
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-right: 0.5px solid var(--border-color);
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.sidebar-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 0.5px solid var(--border-color);
  box-shadow: var(--shadow-level-1);
}
```

- [ ] **Step 2: Update section headers**

```css
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.section-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

- [ ] **Step 3: Update small button**

```css
.small-btn {
  background: var(--system-blue);
  color: white;
  border: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.small-btn:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-level-1);
}

.small-btn:active {
  transform: scale(0.95);
}
```

- [ ] **Step 4: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update sidebar with frosted glass and section cards"
```

---

### Task 4: Update Template Cards

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:316-352`

- [ ] **Step 1: Update template grid**

```css
.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
```

- [ ] **Step 2: Update template buttons**

```css
.template-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-2);
  background: var(--bg-tertiary);
  border: 1.5px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.template-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,122,255,0.1), rgba(0,86,204,0.1));
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.template-btn:hover {
  border-color: var(--system-blue);
  transform: scale(1.05);
  box-shadow: var(--shadow-level-1);
}

.template-btn:hover::after {
  opacity: 1;
}

.template-btn:active {
  transform: scale(0.95);
}

.template-btn.active {
  border-color: var(--system-blue);
  background: rgba(0,122,255,0.08);
}

.template-btn.active::after {
  opacity: 1;
}

.template-icon {
  font-size: 20px;
  z-index: 1;
}

.template-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  z-index: 1;
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update template cards with micro-interactions"
```

---

### Task 5: Update Preview Pages

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:397-449`

- [ ] **Step 1: Update main content area**

```css
.main-content {
  flex: 1;
  overflow: auto;
  padding: var(--space-6);
  display: flex;
  justify-content: center;
  background: var(--bg-primary);
}
```

- [ ] **Step 2: Update preview page styles**

```css
.preview-page {
  position: relative;
  background: white;
  box-shadow: var(--shadow-level-3);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  flex-shrink: 0;
}

.preview-page:hover {
  box-shadow: var(--shadow-level-4);
  transform: translateY(-2px);
}

.preview-page.selected {
  box-shadow: 0 0 0 2px var(--system-blue), var(--shadow-level-4);
}
```

- [ ] **Step 3: Update page number**

```css
.page-number {
  position: absolute;
  bottom: var(--space-2);
  right: var(--space-2);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  z-index: 10;
}

.dark .page-number {
  background: rgba(0,0,0,0.6);
  color: var(--text-tertiary);
}
```

- [ ] **Step 4: Update preview elements**

```css
.preview-element {
  position: absolute;
  overflow: hidden;
  border-radius: var(--radius-sm);
  cursor: move;
  transition: all var(--transition-fast);
}

.preview-element:hover {
  box-shadow: 0 0 0 2px rgba(0,122,255,0.5);
}

.preview-element.selected {
  box-shadow: 0 0 0 2px var(--system-blue);
}
```

- [ ] **Step 5: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update preview pages with enhanced shadows and interactions"
```

---

### Task 6: Update Dialogs

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:518-635`

- [ ] **Step 1: Update dialog overlay**

```css
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-slow);
}

.dialog-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}
```

- [ ] **Step 2: Update dialog styles**

```css
.dialog {
  background: var(--bg-secondary);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-level-4);
  width: 400px;
  max-width: 90vw;
  transform: scale(0.95);
  transition: transform var(--transition-slow);
  border: 0.5px solid var(--border-color);
}

.dialog-overlay.visible .dialog {
  transform: scale(1);
}
```

- [ ] **Step 3: Update dialog header**

```css
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 0.5px solid var(--border-color);
}

.dialog-header h3 {
  font-size: 17px;
  font-weight: 600;
}

.dialog-close {
  background: var(--bg-tertiary);
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--space-1);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.dialog-close:hover {
  background: var(--border-color);
  transform: scale(1.1);
}

.dialog-close:active {
  transform: scale(0.9);
}
```

- [ ] **Step 4: Update dialog body and footer**

```css
.dialog-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 0.5px solid var(--border-color);
}

.btn-primary {
  background: linear-gradient(135deg, var(--system-blue), var(--system-blue-dark));
  color: white;
  border: none;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-level-1);
}

.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-level-2);
}

.btn-primary:active {
  transform: scale(0.95);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-normal);
}

.btn-secondary:hover {
  background: var(--border-color);
  transform: scale(1.05);
}

.btn-secondary:active {
  transform: scale(0.95);
}
```

- [ ] **Step 5: Update input fields**

```css
.dialog-field input[type="number"],
.dialog-field input[type="text"] {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all var(--transition-fast);
  width: 100%;
}

.dialog-field input[type="number"]:focus,
.dialog-field input[type="text"]:focus {
  outline: none;
  border-color: var(--system-blue);
  box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
}
```

- [ ] **Step 6: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update dialogs with frosted glass and micro-interactions"
```

---

### Task 7: Update Form Controls

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:354-396`, `src/style.css:724-750`

- [ ] **Step 1: Update control rows**

```css
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.control-row span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 50px;
}
```

- [ ] **Step 2: Update color inputs**

```css
.control-row input[type="color"] {
  width: 32px;
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0;
  transition: all var(--transition-fast);
}

.control-row input[type="color"]:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-level-1);
}
```

- [ ] **Step 3: Update select inputs**

```css
.control-row select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.control-row select:focus {
  outline: none;
  border-color: var(--system-blue);
  box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
}
```

- [ ] **Step 4: Update text inputs**

```css
.text-input {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  transition: all var(--transition-fast);
}

.text-input:focus {
  outline: none;
  border-color: var(--system-blue);
  box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
}
```

- [ ] **Step 5: Update fit mode buttons**

```css
.fit-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.fit-btn:hover {
  border-color: var(--system-blue);
  transform: scale(1.05);
}

.fit-btn:active {
  transform: scale(0.95);
}

.fit-btn.active {
  background: var(--system-blue);
  border-color: var(--system-blue);
  color: white;
}
```

- [ ] **Step 6: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update form controls with focus states and micro-interactions"
```

---

### Task 8: Update Drop Zone and Thumbnails

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:178-314`

- [ ] **Step 1: Update drop zone**

```css
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  min-height: 120px;
  transition: all var(--transition-normal);
  background: var(--bg-tertiary);
}

.drop-zone.dragover {
  border-color: var(--system-blue);
  background: rgba(0,122,255,0.05);
  transform: scale(1.02);
}
```

- [ ] **Step 2: Update thumbnails**

```css
.thumbnail {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: all var(--transition-normal);
  position: relative;
  border: 1px solid transparent;
}

.thumbnail:hover {
  background: var(--border-color);
  border-color: var(--system-blue);
  transform: translateX(4px);
}

.thumbnail.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.thumbnail.drag-over {
  border: 2px solid var(--system-blue);
  background: rgba(0,122,255,0.05);
}

.thumbnail img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-level-1);
}

.thumbnail-remove {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  background: var(--system-red);
  color: white;
  border: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all var(--transition-fast);
}

.thumbnail-remove:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-level-1);
}

.thumbnail:hover .thumbnail-remove {
  display: flex;
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update drop zone and thumbnails with micro-interactions"
```

---

### Task 9: Update Toast Notifications

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:636-656`

- [ ] **Step 1: Update toast styles**

```css
.toast {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--text-primary);
  color: var(--bg-primary);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-level-3);
  opacity: 0;
  transition: all var(--transition-slow);
  z-index: 2000;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update toast notifications with enhanced styling"
```

---

### Task 10: Update Empty States

**Covers:** [S3]

**Files:**
- Modify: `src/style.css:498-516`

- [ ] **Step 1: Update empty preview**

```css
.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
  opacity: 0.5;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.empty-preview p {
  font-size: 16px;
  font-weight: 500;
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/style.css
git commit -m "feat: update empty states with subtle animation"
```

---

### Task 11: Add Global Transitions and Polish

**Covers:** [S4]

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add global transition utility classes**

```css
/* Transition utilities */
.transition-all {
  transition: all var(--transition-normal);
}

.transition-fast {
  transition: all var(--transition-fast);
}

.transition-slow {
  transition: all var(--transition-slow);
}

/* Scale utilities */
.scale-hover {
  transition: transform var(--transition-normal);
}

.scale-hover:hover {
  transform: scale(1.05);
}

.scale-hover:active {
  transform: scale(0.95);
}
```

- [ ] **Step 2: Update scrollbar styles**

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/style.css
git commit -m "feat: add global transitions and polish scrollbar styles"
```

---

### Task 12: Verify Implementation

**Covers:** [S6]

**Files:**
- None (verification only)

- [ ] **Step 1: Start development server**

```bash
npm run dev
```

- [ ] **Step 2: Verify visual changes in browser**

Check:
- Header toolbar has frosted glass effect
- Sidebar sections have card-like appearance
- Buttons have micro-interactions (scale on hover/active)
- Dialogs have frosted glass overlay
- Preview pages have enhanced shadows
- Dark mode works correctly

- [ ] **Step 3: Test all functionality**

Verify:
- Image import works
- Template selection works
- Theme controls work
- Page background controls work
- Export dialog works
- Dark mode toggle works
- All buttons are functional

- [ ] **Step 4: Run linting if available**

```bash
npm run lint
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Apple-style UI redesign"
```

---

## Summary

This plan transforms the existing UI into a refined Apple-inspired design with:

1. **Frosted glass effects** on toolbar and sidebar
2. **Micro-interactions** (scale, shadow changes) on all interactive elements
3. **Enhanced shadows** for depth and hierarchy
4. **Smooth transitions** for all state changes
5. **Apple color system** with system blue accent
6. **Refined typography** with proper weights and spacing
7. **Polished form controls** with focus states
8. **Enhanced dialogs** with backdrop blur
9. **Improved empty states** with subtle animations
10. **Consistent dark mode** support

All changes are CSS-only, maintaining full backward compatibility with existing functionality.