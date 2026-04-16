# lib/store.ts

> Source summary for the Zustand store — single global state store with 25+ actions for the entire editor.

**Topics:** zustand, source, state, store, actions
**Related:** [[entities/zustand-store]], [[concepts/state-management]]
**Source:** `lib/store.ts`

---

## File Overview

- **Lines:** ~337
- **Dependencies:** `zustand`, `./types`, `./utils`
- **Exports:** `useEditorStore` (single named export)

## Sections

1. **Imports & constants** (L1-6) — Storage key `figma-clone-project`.
2. **EditorState interface** (L8-48) — 30+ fields and methods defining the full store shape.
3. **Internal helpers** (L50-84) — `save()`, `load()`, `deepClone()`, `cloneNewIds()`, `bbox()`, `snap()`.
4. **Store creation** (L88-336) — `create<EditorState>()` with all action implementations.

## Action Categories

- **L100-116** — Object CRUD (`addObject`, `updateObject`, `deleteObject`, `deleteSelected`)
- **L146-149** — Selection management
- **L151-154** — Canvas state + drawing state
- **L156-167** — History (undo/redo)
- **L169-187** — Clipboard (copy/paste/duplicate)
- **L189-241** — Grouping (group/ungroup/enter/moveOut)
- **L243-278** — Layout (align/distribute)
- **L280-310** — Z-order (bringToFront/sendToBack/bringForward/sendBackward)
- **L312-318** — Viewport (zoomToFit)
- **L320-336** — File I/O (saveToFile/loadFromFile)

## Key Patterns

- Every mutating action calls `save(o)` for localStorage persistence.
- Most mutating actions call `snap(s)` to push a history snapshot.
- `updateObject` and `deleteObject` use recursive `Deep` variants to work inside groups.
- `groupSelected` computes a bounding box, offsets children relative to it, and inserts the group at the highest selected object's z-index.
