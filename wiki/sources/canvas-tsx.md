# components/editor/Canvas.tsx

> Source summary for the Canvas component — the largest component (~700 lines), handling all SVG rendering and user interaction.

**Topics:** canvas, source, component, svg, interaction
**Related:** [[entities/canvas-component]], [[concepts/canvas-rendering]], [[entities/zustand-store]]
**Source:** `components/editor/Canvas.tsx`

---

## File Overview

- **Lines:** ~700
- **Dependencies:** React, `useEditorStore`, `lib/types`, `lib/utils`
- **Export:** `Canvas` (named export, client component)

## Logical Sections

1. **Store hooks** — Destructures ~15 values from `useEditorStore()`.
2. **Local state** — `useRef` for SVG element, `useState` for drag state, resize handle, preview shape, context menu position.
3. **Coordinate conversion** — `screenToCanvas(e)` function using current scale and offset.
4. **Mouse handlers** — `onMouseDown`, `onMouseMove`, `onMouseUp` with branching by `currentTool`.
5. **Keyboard handler** — `useEffect` with `keydown` listener for shortcuts.
6. **Wheel handler** — Zoom via `Ctrl+wheel`, pan via plain wheel.
7. **Object renderer** — Recursive function mapping `DesignObject` to SVG elements.
8. **Selection overlay** — Renders handles, bounding box, rotation control.
9. **Snap guides** — Renders alignment guide lines during drag.
10. **JSX return** — Two SVG layers (render + hit-detect) wrapped in a div.

## Key Functions

| Function | Purpose |
|----------|---------|
| `screenToCanvas(e)` | Convert mouse event to canvas coordinates |
| `renderObject(obj)` | Recursively render a DesignObject as SVG |
| `renderSelectionHandles()` | Draw resize/rotate handles for selection |
| `renderSnapGuides()` | Draw alignment guides during drag |
| `handleMouseDown(e)` | Start draw/select/drag/resize/pan |
| `handleMouseMove(e)` | Update draw preview / drag / resize position |
| `handleMouseUp(e)` | Commit the operation to the store |

## Interaction State Machine

The component tracks interaction mode via a combination of `currentTool`, `isDrawing`, and local state flags (`isDragging`, `isResizing`, `isRotating`). The mouse handlers branch on these flags to determine behavior.
