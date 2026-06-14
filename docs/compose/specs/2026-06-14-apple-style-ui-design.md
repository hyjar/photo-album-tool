# Apple-Style UI Design Spec

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/apple-style-ui-redesign.md)

## [S1] Problem

The current UI is functional but lacks visual polish. It needs a refined Apple-inspired aesthetic with:
- Cleaner typography and spacing
- Frosted glass effects (backdrop-filter)
- Micro-interactions (hover states, click feedback)
- Smooth transitions
- Refined shadows and depth
- Better visual hierarchy

## [S2] Design Language

### Color System
- **Primary**: System blue (#007AFF) with subtle gradients
- **Background**: Light mode (#F5F5F7) / Dark mode (#1D1D1F)
- **Surface**: Frosted glass effect with blur(20px) and opacity
- **Text**: SF Pro hierarchy (primary #1D1D1F, secondary #86868B, tertiary #AEAEB2)
- **Shadows**: Multi-layer soft shadows for depth

### Typography
- **Font**: SF Pro Display / SF Pro Text (system fallback: -apple-system, BlinkMacSystemFont)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)
- **Scale**: 11px (caption), 13px (body small), 14px (body), 16px (title), 18px (headline), 24px (large title)

### Spacing
- **Base unit**: 4px
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48

### Border Radius
- **Small**: 6px (buttons, inputs)
- **Medium**: 10px (cards, sections)
- **Large**: 14px (modals, panels)
- **Extra Large**: 18px (feature cards)

## [S3] Component Design

### Header Toolbar
- Height: 52px
- Background: rgba(255,255,255,0.82) with backdrop-filter: blur(40px) saturate(180%)
- Border: 0.5px solid rgba(0,0,0,0.12)
- Buttons: 32px height, 8px border-radius, smooth transitions
- Primary buttons: Gradient background (#007AFF to #0056CC)
- Hover: Scale 1.02, shadow enhancement
- Active: Scale 0.98

### Sidebar
- Width: 280px
- Background: rgba(255,255,255,0.82) with backdrop-filter: blur(40px) saturate(180%)
- Border-right: 0.5px solid rgba(0,0,0,0.12)
- Sections: Collapsible with smooth height animation
- Section headers: SF Pro Semibold, 13px, uppercase tracking

### Template Cards
- Grid: 2 columns, 8px gap
- Card: 44px height, 8px border-radius
- Background: rgba(0,0,0,0.04)
- Hover: Background rgba(0,0,0,0.08), scale 1.02
- Active: Blue border, blue background tint
- Icon: 20px, centered
- Label: 11px, SF Pro Medium

### Preview Pages
- Background: White
- Shadow: 0 2px 20px rgba(0,0,0,0.08)
- Border-radius: 2px
- Selected: 2px solid #007AFF with glow effect
- Hover: Shadow enhancement
- Page number: SF Pro Regular, 10px, muted color

### Dialogs
- Overlay: rgba(0,0,0,0.5) with backdrop-filter: blur(8px)
- Dialog: 400px width, 16px border-radius
- Background: White
- Shadow: 0 24px 80px rgba(0,0,0,0.25)
- Animation: Scale from 0.95 to 1, opacity 0 to 1
- Header: SF Pro Semibold, 17px
- Body: SF Pro Regular, 14px

### Buttons
- Height: 32px
- Border-radius: 8px
- Padding: 0 16px
- Font: SF Pro Medium, 13px
- Transition: All 0.2s ease
- Primary: Gradient (#007AFF to #0056CC), white text
- Secondary: rgba(0,0,0,0.04) background, subtle border
- Hover: Scale 1.02, shadow enhancement
- Active: Scale 0.98
- Disabled: 0.5 opacity, no pointer events

### Inputs
- Height: 32px
- Border-radius: 8px
- Border: 1px solid rgba(0,0,0,0.1)
- Background: rgba(0,0,0,0.04)
- Focus: Blue border, subtle glow
- Font: SF Pro Regular, 14px

## [S4] Animation & Transitions

### Micro-interactions
- **Button hover**: Scale 1.05, shadow 0 4px 12px rgba(0,0,0,0.15)
- **Button active**: Scale 0.95
- **Card hover**: Scale 1.05, shadow enhancement
- **Input focus**: Border color transition, subtle glow

### Transitions
- **All elements**: 0.2s ease (default)
- **Height changes**: 0.3s ease (collapsible sections)
- **Page transitions**: 0.3s ease (dialog open/close)
- **Color changes**: 0.15s ease (theme toggle)

### Shadows
- **Level 1**: 0 1px 4px rgba(0,0,0,0.1) (subtle)
- **Level 2**: 0 4px 16px rgba(0,0,0,0.12) (medium)
- **Level 3**: 0 8px 32px rgba(0,0,0,0.15) (prominent)
- **Level 4**: 0 24px 80px rgba(0,0,0,0.25) (dialog/modal)

## [S5] Dark Mode Adaptations

### Colors
- **Background**: #1D1D1F
- **Surface**: rgba(255,255,255,0.08) with backdrop-filter: blur(20px)
- **Text**: Primary #F5F5F7, Secondary #86868B, Tertiary #6E6E73
- **Borders**: rgba(255,255,255,0.1)
- **Accent**: #0A84FF (system blue dark)

### Shadows
- Enhanced shadows for better contrast
- Subtle glow effects on interactive elements

## [S6] Implementation Approach

### CSS Structure
1. Update CSS variables for new color system
2. Add backdrop-filter styles for frosted glass
3. Update component styles with new dimensions and radii
4. Add transition and animation properties
5. Implement micro-interactions via :hover and :active states
6. Update dark mode variables

### Key Files
- `src/style.css` - Main stylesheet (primary changes)
- `index.html` - Minor structural updates if needed
- `src/main.js` - Add animation classes if needed

### Scope
- Pure CSS/HTML changes (no JavaScript logic changes)
- Maintain all existing functionality
- Preserve dark mode support
- Keep responsive behavior