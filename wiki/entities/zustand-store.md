# Zustand Store

> Single global store managing all editor state — objects, selection, tools, canvas transform, history, clipboard, and grouping.

**Topics:** zustand, store, state, global, hook
**Related:** [[concepts/state-management]], [[concepts/architecture]], [[entities/type-system]]
**Source:** `lib/store.ts`

---

## Overview

`useEditorStore` is a Zustand store created with `create<EditorState>()`. It is the single source of truth for the entire editor. Every component reads from it via hook selectors, and every user action dispatches through its methods.

## Usage Pattern

```typescript
// In any client component:
const { objects, selectedIds, addObject, updateObject } = useEditorStore();
```

No providers, no context wrappers. Zustand handles reactivity via selector-based subscriptions.

## Actions Reference

### Tool & Selection

| Action | Signature | Description |
|--------|-----------|-------------|
| `setCurrentTool` | `(tool: ToolType) => void` | Switch active tool |
| `setSelectedIds` | `(ids: string[]) => void` | Set selection |
| `clearSelection` | `() => void` | Deselect all |

### Object CRUD

| Action | Signature | Description |
|--------|-----------|-------------|
| `addObject` | `(obj: DesignObject) => void` | Add object + snapshot |
| `updateObject` | `(id, updates) => void` | Deep update by ID |
| `deleteObject` | `(id: string) => void` | Deep delete + snapshot |
| `deleteSelected` | `() => void` | Delete all selected (non-locked) |
| `reorderObjects` | `(objects: DesignObject[]) => void` | Replace objects array |

### History

| Action | Signature | Description |
|--------|-----------|-------------|
| `saveToHistory` | `() => void` | Push snapshot to history |
| `undo` | `() => void` | Restore previous snapshot |
| `redo` | `() => void` | Restore next snapshot |

### Clipboard

| Action | Signature | Description |
|--------|-----------|-------------|
| `copySelected` | `() => void` | Deep-clone selected to clipboard |
| `paste` | `() => void` | Clone clipboard with new IDs, offset +20px |
| `duplicate` | `() => void` | Copy + paste in one step |

### Grouping

| Action | Signature | Description |
|--------|-----------|-------------|
| `groupSelected` | `() => void` | Wrap 2+ selected in group |
| `ungroupSelected` | `() => void` | Dissolve selected group |
| `setEnteredGroupId` | `(id: string \| null) => void` | Enter/exit group editing |
| `moveOutOfGroup` | `(childId: string) => void` | Move child out of parent group |

### Layout

| Action | Signature | Description |
|--------|-----------|-------------|
| `alignObjects` | `(direction) => void` | Align selection (6 directions) |
| `distributeObjects` | `(axis) => void` | Distribute 3+ objects evenly |
| `bringToFront` | `() => void` | Move to top of z-order |
| `sendToBack` | `() => void` | Move to bottom of z-order |
| `bringForward` | `() => void` | Move up one z-level |
| `sendBackward` | `() => void` | Move down one z-level |

### Canvas

| Action | Signature | Description |
|--------|-----------|-------------|
| `setCanvas` | `(partial: Partial<CanvasState>) => void` | Update scale/offset |
| `zoomToFit` | `(width, height) => void` | Fit all visible objects in view |
| `setIsDrawing` | `(boolean) => void` | Set drawing state |
| `setDrawingStart` | `(Point \| null) => void` | Set draw origin |

### File I/O

| Action | Signature | Description |
|--------|-----------|-------------|
| `saveToFile` | `() => void` | Download objects as JSON |
| `loadFromFile` | `(json: string) => void` | Import JSON into canvas |

## Internal Helpers

| Function | Purpose |
|----------|---------|
| `deepClone(obj)` | Recursively clone a DesignObject (including children) |
| `cloneNewIds(objects)` | Clone with fresh IDs (for paste/duplicate) |
| `bbox(objects)` | Compute bounding box of object array |
| `snap(state)` | Create history snapshot from current state |
| `save(objects)` | Write to localStorage |
| `load()` | Read from localStorage |
