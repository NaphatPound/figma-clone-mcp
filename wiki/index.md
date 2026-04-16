# Figma Clone — Wiki Index

> LLM-maintained knowledge base for the Figma Clone design editor.

Last updated: 2026-04-16

---

## Concepts

Architectural patterns, design decisions, and data flows.

- [Architecture Overview](concepts/architecture.md) — Stack, directory structure, data flow, dark theme
- [State Management](concepts/state-management.md) — Zustand single store, undo/redo, persistence, immutability
- [Canvas Rendering](concepts/canvas-rendering.md) — Dual SVG layers, interactions, keyboard shortcuts, snap guides
- [Design-to-Code Pipeline](concepts/design-to-code.md) — Code generation, MCP tools, output formats, contextual hints
- [Design Tokens](concepts/design-tokens.md) — Token extraction, CSS variables, deduplication, app theme vs canvas tokens

## Entities

Concrete components, modules, APIs, and tools.

- [MCP Server](entities/mcp-server.md) — Stdio MCP server v2.0.0 with 11 tools (5 design-to-code + 6 CRUD)
- [Code Generation Engine](entities/codegen-engine.md) — Converts DesignObject[] to React/HTML/SVG code
- [API Routes](entities/api-routes.md) — REST endpoints for object CRUD and design export
- [Zustand Store](entities/zustand-store.md) — Global state with 25+ actions for the entire editor
- [Canvas Component](entities/canvas-component.md) — SVG drawing surface handling all user interactions (~700 lines)
- [Type System](entities/type-system.md) — DesignObject, ToolType, CanvasState, and other shared types

## Sources

Summaries of key source files with cross-references.

- [mcp-server.ts](sources/mcp-server-ts.md) — MCP server entry point, 11 tools, stdio transport
- [lib/codegen.ts](sources/codegen-ts.md) — Code generation engine, 8 exports, 350 lines
- [lib/store.ts](sources/store-ts.md) — Zustand store, 25+ actions, localStorage + history
- [components/editor/Canvas.tsx](sources/canvas-tsx.md) — Canvas component, ~700 lines, SVG rendering + interaction
- [lib/types.ts](sources/types-ts.md) — Type definitions, 5 exports, 51 lines

## Quick Reference

| What | Where |
|------|-------|
| Run dev server | `npm run dev` (port 3000) |
| Run MCP server | `npm run mcp` |
| Build | `npm run build` |
| State store | `lib/store.ts` → `useEditorStore()` |
| Types | `lib/types.ts` |
| Code generation | `lib/codegen.ts` |
| API base | `/api/objects` (CRUD), `/api/design` (export) |
| Canvas | `components/editor/Canvas.tsx` |
| Theme variables | `app/globals.css` |
