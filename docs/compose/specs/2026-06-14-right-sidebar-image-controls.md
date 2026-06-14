# Right Sidebar Image Controls Design Spec

## [S1] Problem

The current UI only has a left sidebar for page/theme controls. Users need a way to control individual image properties (size, rotation, position, etc.) when an image is selected on a page. A right sidebar that appears on demand provides this functionality without cluttering the main interface.

## [S2] Solution Overview

Add a right sidebar panel that:
- Appears when an image element is selected in the preview area
- Disappears when no image is selected
- Contains controls for image properties
- Matches the Apple-style design language

## [S3] Panel Structure

### Layout
- Width: 280px (same as left sidebar)
- Position: Fixed on right side, between toolbar and bottom
- Animation: Slide in from right with 0.3s ease transition
- Background: Frosted glass (same as left sidebar)

### Sections
1. **Image Info** - Filename, dimensions, file size
2. **Size Controls** - Width/Height inputs with lock ratio toggle
3. **Transform Controls** - Rotation angle, flip horizontal/vertical
4. **Position Controls** - X/Y offset inputs
5. **Border Controls** - Border width, color, radius
6. **Filter Controls** - Brightness, contrast, saturation sliders

## [S4] Control Details

### Size Controls
- Width input (px) with label
- Height input (px) with label
- Lock ratio toggle button (🔗 icon)
- When locked: changing width auto-updates height proportionally

### Transform Controls
- Rotation angle input (degrees) with slider
- Flip horizontal button (↔)
- Flip vertical button (↕)

### Position Controls
- X offset input (px)
- Y offset input (px)
- "Center" button to reset to page center

### Border Controls
- Border width input (px)
- Border color picker
- Border radius input (px)

### Filter Controls
- Brightness slider (0-200%, default 100%)
- Contrast slider (0-200%, default 100%)
- Saturate slider (0-200%, default 100%)
- "Reset" button to restore defaults

## [S5] Behavior

### Panel Visibility
- Panel hidden by default
- Panel slides in when an image element is selected
- Panel slides out when selection is cleared
- Panel updates to show selected image's current values

### Data Flow
1. User selects image in preview
2. Right sidebar appears with image's current properties
3. User adjusts a control
4. Update event dispatched to state
5. Preview re-renders with new property values

### State Integration
- Add `selectedImageProps` to state store
- Subscribe to selection changes
- Dispatch property updates on control changes

## [S6] CSS Styling

### Panel Container
```css
.right-sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  backdrop-filter: blur(40px) saturate(180%);
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
}

.right-sidebar.visible {
  transform: translateX(0);
}
```

### Control Groups
- Each section wrapped in `.sidebar-section` (reuses existing styles)
- Section headers match left sidebar style
- Inputs, sliders, buttons use existing control styles

## [S7] Files to Modify

- `index.html` - Add right sidebar HTML structure
- `src/style.css` - Add right sidebar styles
- `src/state.js` - Add image property state management
- `src/editor.js` - Add image selection handling
- `src/preview.js` - Apply image properties to preview elements
- `src/main.js` - Initialize right sidebar controls

## [S8] Testing

- Verify panel appears when image selected
- Verify panel disappears when selection cleared
- Verify all controls update image properties
- Verify lock ratio works correctly
- Verify filters apply visually
- Verify dark mode works
- Verify responsive behavior