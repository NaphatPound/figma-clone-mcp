# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Figma-like design editor built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, and Zustand 5. Single-page client-side app with SVG-based canvas rendering.

## Commands

```bash
npm run dev      # Start dev server (default port 3000)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint with next/core-web-vitals + typescript presets
```

## Architecture

**Single-page editor** — `app/page.tsx` is a client component that composes five editor panels:
- **Canvas** (`components/editor/Canvas.tsx`) — SVG drawing surface handling draw/select/drag/resize/pan/zoom. Largest component (~700 lines). Uses dual SVG layers for rendering and hit detection.
- **Toolbar** — Vertical tool selector (select/frame/rectangle/ellipse/line/text/hand/image)
- **TopBar** — Undo/redo and zoom controls
- **LayersPanel** — Object list with visibility/lock toggles
- **PropertiesPanel** — Position, size, fill, stroke, opacity editors for selected objects

**State management** — All editor state lives in a single Zustand store (`lib/store.ts`). No prop drilling; components access state via `useEditorStore()` hook with destructured selectors. State includes: current tool, design objects array, selection, canvas transform (zoom/pan), drawing state, and undo/redo history.

**Data flow:** User interaction on Canvas -> Zustand action -> immutable state update -> reactive re-render of SVG and panels.

**Type system** — `lib/types.ts` defines `ToolType` (8 tools), `DesignObject` (shapes with position/size/rotation/fill/stroke/opacity/visibility/lock), and `CanvasState` (scale + offset).

**Utilities** — `lib/utils.ts` provides `cn()` (clsx + tailwind-merge), `generateId()`, geometry helpers (`pointInRect`, `distance`, `getRotatedPoint`), and `hexToRgba()`.

## Key Conventions

- All editor components use `'use client'` directive
- Path alias: `@/*` maps to project root
- Dark theme via CSS custom properties in `globals.css` (`--background: #1e1e1e`, `--accent-color: #0d99ff`, etc.)
- Tailwind config extends theme with these CSS variable colors
- Keyboard shortcuts defined in Canvas.tsx useEffect: V (select), R (rectangle), O (ellipse), L (line), T (text), H (hand), F (frame), Delete (remove)
- Object IDs use format `obj_{timestamp}_{random}` via `generateId()`
- History is array-based: `history: DesignObject[][]` with `historyIndex` for undo/redo
