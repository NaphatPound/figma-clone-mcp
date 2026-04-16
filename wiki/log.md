# Operation Log

Append-only record of wiki operations.

---

## [2026-04-16] ingest | Initial wiki creation

Created the full LLM wiki from the current codebase state. Documented:
- 5 concept pages (architecture, state management, canvas rendering, design-to-code pipeline, design tokens)
- 6 entity pages (MCP server, codegen engine, API routes, Zustand store, Canvas component, type system)
- 5 source summary pages (mcp-server.ts, codegen.ts, store.ts, Canvas.tsx, types.ts)

Source: full codebase read of all `lib/`, `components/editor/`, `app/api/`, and root config files.
