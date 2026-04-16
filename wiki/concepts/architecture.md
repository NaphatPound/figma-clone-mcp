# Architecture Overview

> The Figma Clone is a single-page client-side design editor with an SVG canvas, powered by Next.js 15 App Router and a Zustand store.

**Topics:** architecture, next-js, app-router, single-page-app
**Related:** [[concepts/state-management]], [[concepts/canvas-rendering]], [[entities/zustand-store]], [[entities/canvas-component]]

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| UI | React | 19.x |
| Language | TypeScript | 5.6+ |
| Styling | Tailwind CSS | 3.4 |
| State | Zustand | 5.x |
| MCP | @modelcontextprotocol/sdk | 1.29+ |

## Application Structure

```
app/
├── page.tsx              # Single-page editor (client component)
├── layout.tsx            # Root layout
├── globals.css           # CSS variables + dark theme
├── api/
│   ├── objects/          # CRUD endpoints for canvas objects
│   └── design/           # Design-to-code endpoints
components/editor/
├── Canvas.tsx            # SVG drawing surface (~700 lines)
├── Toolbar.tsx           # Tool selector sidebar
├── TopBar.tsx            # Undo/redo + zoom controls
├── LayersPanel.tsx       # Object hierarchy with toggles
├── PropertiesPanel.tsx   # Object property inspector
└── ContextMenu.tsx       # Right-click operations menu
lib/
├── store.ts              # Zustand state (single store, entire app state)
├── types.ts              # TypeScript types (DesignObject, ToolType, etc.)
├── utils.ts              # Geometry helpers, ID generation, class merging
├── codegen.ts            # Code generation engine (React, HTML, SVG)
├── server-state.ts       # Server-side state persistence (JSON file)
└── useServerSync.ts      # Client-server state synchronization hook
```

## Data Flow

```
User interaction on Canvas
  → Zustand action (addObject / updateObject / deleteObject)
    → Immutable state update + history snapshot
      → Reactive re-render of SVG canvas + side panels
        → useServerSync pushes state to server API
```

All state mutations flow through the Zustand store. No prop drilling — components read state via `useEditorStore()` with selector destructuring.

## Client vs Server

The app is primarily client-side. The server provides:

1. **Persistence API** (`/api/objects`) — CRUD for design objects, backed by a JSON file on disk (`data/objects.json`).
2. **Design API** (`/api/design`) — Read-only endpoints that generate code, extract tokens, and return metadata from the persisted design.
3. **MCP Server** (`mcp-server.ts`) — Stdio-based MCP server that exposes both CRUD and design-to-code tools for AI agents.

## Dark Theme

The editor uses a dark theme defined via CSS custom properties in `globals.css`:

| Variable | Value | Usage |
|----------|-------|-------|
| `--background` | `#1e1e1e` | App background |
| `--foreground` | `#ffffff` | Primary text |
| `--panel-bg` | `#2c2c2c` | Side panel backgrounds |
| `--border-color` | `#3e3e3e` | Panel borders |
| `--accent-color` | `#0d99ff` | Selection, active tools |
| `--text-secondary` | `#a0a0a0` | Muted text |

These are mapped into Tailwind via `tailwind.config.ts`.
