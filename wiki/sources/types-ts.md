# lib/types.ts

> Source summary for the TypeScript type definitions — all shared interfaces and type aliases for the editor.

**Topics:** types, source, typescript, interfaces
**Related:** [[entities/type-system]], [[concepts/architecture]]
**Source:** `lib/types.ts`

---

## File Overview

- **Lines:** ~51
- **Dependencies:** none
- **Exports:** 5 types/interfaces

## Definitions

| Export | Kind | Lines | Description |
|--------|------|-------|-------------|
| `ToolType` | type alias | L1 | Union of 10 tool strings |
| `Point` | interface | L3-6 | `{ x, y }` coordinate pair |
| `Size` | interface | L8-11 | `{ width, height }` dimension pair |
| `DesignObject` | interface | L13-34 | Core design element with 15 required + 5 optional fields |
| `CanvasState` | interface | L36-40 | Viewport state `{ scale, offsetX, offsetY }` |
| `SnapGuide` | interface | L42-45 | Alignment guide `{ type, position }` |
| `HistoryState` | interface | L47-50 | Snapshot `{ objects, selectedIds }` |

## Notes

- `DesignObject.type` includes `'group'` which is not in `ToolType` — groups are created programmatically.
- `Point` and `Size` are used for transient calculations, not persisted on objects.
- `HistoryState` is defined but the store currently only uses `DesignObject[][]` for history (without selectedIds).
