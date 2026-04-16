# Canvas Rendering

> The Canvas uses dual SVG layers for rendering objects and hit detection, with mouse/keyboard handlers for draw, select, drag, resize, pan, and zoom.

**Topics:** canvas, svg, rendering, interaction, pan-zoom, hit-detection
**Related:** [[entities/canvas-component]], [[concepts/state-management]], [[entities/type-system]]

---

## Dual SVG Layers

The Canvas component renders two overlapping SVG elements:

1. **Render layer** — Displays all visible design objects with their visual properties (fill, stroke, opacity, rotation, etc.).
2. **Hit-detection layer** — Invisible layer used for mouse interaction. Each object has a transparent hit area that captures mouse events.

This separation allows visual styling to be independent of interaction behavior.

## Supported Interactions

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Draw** | Select a shape tool, click+drag | Creates a new object with dimensions from drag area |
| **Select** | V key or select tool, click | Selects object under cursor |
| **Multi-select** | Shift+click or marquee drag | Adds to / creates selection set |
| **Drag** | Click+drag selected object | Moves selected objects with snap guides |
| **Resize** | Drag corner/edge handles | Resizes selected object |
| **Rotate** | Drag rotation handle | Rotates selected object |
| **Pan** | H key (hand tool) or Space+drag | Translates canvas viewport |
| **Zoom** | Ctrl+scroll or TopBar controls | Scales canvas around cursor |

## Keyboard Shortcuts

Defined in a `useEffect` inside Canvas.tsx:

| Key | Action |
|-----|--------|
| V | Select tool |
| R | Rectangle tool |
| O | Ellipse tool |
| L | Line tool |
| T | Text tool |
| H | Hand (pan) tool |
| F | Frame tool |
| Delete/Backspace | Delete selected |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+D | Duplicate |
| Ctrl+G | Group |
| Ctrl+Shift+G | Ungroup |

## Object Rendering

Each `DesignObject` type maps to an SVG element:

| Object Type | SVG Element | Notes |
|-------------|-------------|-------|
| `rectangle` | `<rect>` | Supports `borderRadius` via `rx` attribute |
| `ellipse` | `<ellipse>` | Uses `cx/cy/rx/ry` |
| `line` | `<line>` | Uses `x1/y1/x2/y2` |
| `text` | `<text>` | Renders `obj.text` with `fontSize` |
| `frame` | `<g>` + `<rect>` | Group container with visible background |
| `group` | `<g>` | Invisible container, children offset relative |
| `star` | `<polygon>` | Points generated from `starPath()` utility |
| `polygon` | `<polygon>` | Points generated from `polygonPath()` utility |
| `image` | `<image>` | Uses `href` from `obj.src` |

## Canvas Transform

The viewport state is stored as `CanvasState`:

```typescript
{ scale: number; offsetX: number; offsetY: number }
```

All objects are rendered inside a `<g transform="translate(offsetX, offsetY) scale(scale)">` group. Screen-to-canvas coordinate conversion uses:

```
canvasX = (screenX - offsetX) / scale
canvasY = (screenY - offsetY) / scale
```

## Snap Guides

When dragging objects, `computeSnapGuides()` from `lib/utils.ts` calculates alignment guides:

- Compares edges and centers of the moving object against all other objects.
- Uses a 5px snap threshold.
- Returns arrays of `SnapGuide` (vertical/horizontal lines) and dx/dy offset corrections.
- Guides are rendered as dashed lines on the canvas.
