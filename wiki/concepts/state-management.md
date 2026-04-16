# State Management

> All editor state lives in a single Zustand store with immutable updates, undo/redo history, and localStorage persistence.

**Topics:** zustand, state, undo-redo, history, persistence
**Related:** [[entities/zustand-store]], [[concepts/architecture]], [[sources/store-ts]]

---

## Single Store Pattern

The entire application state is managed by one Zustand store defined in `lib/store.ts`. Components access it via `useEditorStore()` with destructured selectors:

```typescript
const { objects, selectedIds, updateObject } = useEditorStore();
```

No React context, no prop drilling, no multiple stores.

## State Shape

| Field | Type | Purpose |
|-------|------|---------|
| `currentTool` | `ToolType` | Active drawing/interaction tool |
| `objects` | `DesignObject[]` | All design objects on canvas |
| `selectedIds` | `string[]` | Currently selected object IDs |
| `canvas` | `CanvasState` | Zoom scale + pan offset |
| `isDrawing` | `boolean` | Whether user is mid-draw |
| `drawingStart` | `Point \| null` | Starting point of current draw |
| `history` | `DesignObject[][]` | Undo/redo history stack |
| `historyIndex` | `number` | Current position in history |
| `clipboard` | `DesignObject[]` | Copied objects for paste |
| `enteredGroupId` | `string \| null` | Currently entered group for editing |

## Undo/Redo

History is implemented as an array of snapshots:

- `history: DesignObject[][]` — each entry is a deep-cloned copy of the full `objects` array.
- `historyIndex` — pointer to the current state in the history array.
- `saveToHistory()` — called before mutating operations to push a snapshot.
- `undo()` — decrements `historyIndex` and restores that snapshot.
- `redo()` — increments `historyIndex` and restores that snapshot.

When a new action is performed after an undo, the forward history is truncated (standard undo tree behavior).

## Persistence

Two persistence mechanisms:

1. **localStorage** — The `save()` function writes `objects` to `localStorage` after every mutation. The `load()` function reads it on store initialization.
2. **Server sync** — `useServerSync()` hook pushes state to `/api/objects/sync` on changes, and the server writes it to `data/objects.json` on disk.

## Immutability

All state updates return new objects/arrays. The `deepClone()` helper creates fresh copies of objects (including nested `children` for groups). The `cloneNewIds()` helper creates copies with new IDs for paste/duplicate operations.

## Object Operations

| Action | What it does |
|--------|-------------|
| `addObject` | Appends to `objects`, saves to history |
| `updateObject` | Deep-updates by ID (works inside groups too) |
| `deleteObject` | Deep-removes by ID, cleans selection |
| `deleteSelected` | Removes all selected unlocked objects |
| `groupSelected` | Wraps 2+ selected objects in a group |
| `ungroupSelected` | Dissolves a group, restores children to root |
| `reorderObjects` | Replaces the objects array (for drag-reorder) |
| `alignObjects` | Aligns selected objects (left/center/right/top/middle/bottom) |
| `distributeObjects` | Distributes 3+ objects evenly on an axis |
| `bringToFront/sendToBack/bringForward/sendBackward` | Z-order operations |
