# Type System

> TypeScript type definitions that model all design objects, tools, and canvas state.

**Topics:** typescript, types, interfaces, design-object, tool
**Related:** [[concepts/architecture]], [[entities/zustand-store]], [[entities/codegen-engine]]
**Source:** `lib/types.ts`

---

## ToolType

```typescript
type ToolType = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'line'
              | 'text' | 'hand' | 'image' | 'star' | 'polygon';
```

Represents the 10 tools available in the toolbar.

## DesignObject

The core data type — every shape/element on the canvas is a `DesignObject`:

```typescript
interface DesignObject {
  id: string;           // Format: "obj_{timestamp}_{random9}"
  type: 'rectangle' | 'ellipse' | 'line' | 'text' | 'frame'
      | 'image' | 'group' | 'star' | 'polygon';
  x: number;            // Position (top-left corner)
  y: number;
  width: number;        // Dimensions
  height: number;
  rotation: number;     // Degrees
  fill: string;         // Hex color or "none"/"transparent"
  stroke: string;       // Hex color or "none"
  strokeWidth: number;  // 0 = no stroke
  opacity: number;      // 0-1
  name: string;         // Layer name (displayed in LayersPanel)
  visible: boolean;     // Whether rendered on canvas
  locked: boolean;      // Whether user can interact

  // Optional type-specific fields:
  children?: DesignObject[];  // For group/frame
  text?: string;              // For text type
  fontSize?: number;          // For text type
  src?: string;               // For image type (data URL or path)
  borderRadius?: number;      // For rectangle type
  points?: number;            // For star (num points) or polygon (num sides)
}
```

### Key Notes

- `type` includes `'group'` which is not a `ToolType` — groups are created via the group action, not drawn directly.
- `children` are positioned relative to the parent group/frame origin.
- `fill: "none"` is used for lines; `fill: "transparent"` for groups.
- `id` format: `obj_{Date.now()}_{random36String}` via `generateId()`.

## Point & Size

```typescript
interface Point { x: number; y: number; }
interface Size { width: number; height: number; }
```

Used for intermediate calculations (drawing, dragging), not stored on objects.

## CanvasState

```typescript
interface CanvasState {
  scale: number;    // Zoom level (1 = 100%)
  offsetX: number;  // Pan horizontal offset (pixels)
  offsetY: number;  // Pan vertical offset (pixels)
}
```

Applied as an SVG `<g>` transform: `translate(offsetX, offsetY) scale(scale)`.

## SnapGuide

```typescript
interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;  // Canvas coordinate of the guide line
}
```

Rendered as dashed lines when objects align during drag.

## HistoryState

```typescript
interface HistoryState {
  objects: DesignObject[];
  selectedIds: string[];
}
```

Used for undo/redo snapshots (though currently only `objects` is stored in the history array).
