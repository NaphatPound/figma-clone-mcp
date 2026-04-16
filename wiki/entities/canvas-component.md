# Canvas Component

> The central SVG drawing surface (~700 lines) handling all user interactions: draw, select, drag, resize, rotate, pan, and zoom.

**Topics:** canvas, component, svg, interaction, mouse-events, keyboard
**Related:** [[concepts/canvas-rendering]], [[entities/zustand-store]], [[entities/type-system]]
**Source:** `components/editor/Canvas.tsx`

---

## Overview

`Canvas.tsx` is the largest component in the project. It renders the SVG workspace and handles all mouse/keyboard interactions. It uses dual SVG layers and reads/writes state exclusively through the Zustand store.

## Component Structure

```
<div className="canvas-container">
  <svg>  <!-- Main render layer -->
    <g transform="translate(offset) scale(zoom)">
      <!-- Rendered design objects -->
      <!-- Selection handles -->
      <!-- Snap guides -->
    </g>
  </svg>
  <svg>  <!-- Hit detection layer (invisible) -->
    <g transform="...">
      <!-- Transparent hit targets -->
    </g>
  </svg>
</div>
```

## State Dependencies

The component destructures from `useEditorStore()`:

- `objects`, `selectedIds`, `currentTool` — for rendering
- `canvas` (scale, offsetX, offsetY) — for viewport transform
- `isDrawing`, `drawingStart` — for draw mode tracking
- `addObject`, `updateObject`, `deleteSelected` — for mutations
- `setSelectedIds`, `clearSelection` — for selection management
- `setCanvas` — for pan/zoom updates
- `saveToHistory` — for snapshotting before mutations
- `enteredGroupId` — for group editing mode

## Interaction Modes

The component switches behavior based on `currentTool`:

| Tool | Mouse Down | Mouse Move | Mouse Up |
|------|-----------|-----------|----------|
| `select` | Hit test → start drag/resize/rotate | Move/resize/rotate selected | Commit position |
| `rectangle` | Record start point | Draw preview rect | Create rectangle object |
| `ellipse` | Record start point | Draw preview ellipse | Create ellipse object |
| `line` | Record start point | Draw preview line | Create line object |
| `text` | — | — | Create text object at click |
| `frame` | Record start point | Draw preview frame | Create frame object |
| `star` | Record start point | Draw preview star | Create star object |
| `polygon` | Record start point | Draw preview polygon | Create polygon object |
| `hand` | Record pan origin | Translate canvas | — |
| `image` | Open file picker | — | Create image object |

## Selection Handles

When objects are selected, the component renders:

- **Corner handles** (4) — for resize
- **Edge handles** (4) — for resize on one axis
- **Rotation handle** (1) — circle above the selection, for rotation
- **Bounding box** — dashed outline around selected objects

## Coordinate Conversion

All mouse events are converted from screen coordinates to canvas coordinates:

```typescript
const canvasX = (screenX - canvas.offsetX) / canvas.scale;
const canvasY = (screenY - canvas.offsetY) / canvas.scale;
```

## Keyboard Handling

A `useEffect` registers keydown listeners for tool switching and operations. See [[concepts/canvas-rendering]] for the full shortcut table.

## Cursor States

The component sets cursor via CSS classes:

| Mode | Cursor |
|------|--------|
| Default (drawing tools) | `crosshair` |
| Select tool | `default` |
| Hand tool | `grab` / `grabbing` |
| Over resize handle | `nwse-resize` / `nesw-resize` / etc. |
