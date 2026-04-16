# MCP Server

> Stdio-based MCP server (v2.0.0) that exposes design-to-code tools and canvas CRUD operations for AI agent integration.

**Topics:** mcp, server, ai-agent, tools, stdio
**Related:** [[concepts/design-to-code]], [[entities/codegen-engine]], [[entities/api-routes]]
**Source:** `mcp-server.ts`

---

## Overview

The MCP (Model Context Protocol) server lets AI agents like Claude Code programmatically read designs, generate code, and manipulate the canvas. It communicates over stdio using JSON-RPC and proxies all operations through the Next.js API routes.

## Configuration

- **Entry point:** `mcp-server.ts`
- **Run command:** `npm run mcp` → `node --import tsx mcp-server.ts`
- **Protocol:** MCP over stdio (StdioServerTransport)
- **API base:** `FIGMA_CLONE_API_URL` env var or `http://localhost:3000/api`

## Tools — Design-to-Code (Figma MCP-style)

### `get_design_context`
Primary tool. Returns generated code, metadata, design tokens, and contextual hints.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `nodeId` | string? | — | Target specific object by ID |
| `format` | enum? | `react-tailwind` | `react-tailwind`, `html-css`, or `svg` |

### `get_metadata`
Returns object counts, type breakdown, bounding box, colors, font sizes, layer depth, and boolean flags for groups/text/images. No parameters.

### `export_code`
Exports design as production code.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | enum? | `react-tailwind` | Output format |
| `componentName` | string? | — | Name for React component |
| `nodeId` | string? | — | Export specific subtree |

### `get_variable_defs`
Extracts design tokens as CSS custom properties grouped by type. No parameters.

### `search_design`
Finds objects by name, type, or color.

| Param | Type | Description |
|-------|------|-------------|
| `query` | string? | Name substring match |
| `type` | enum? | Filter by object type |
| `color` | string? | Filter by fill/stroke hex |

## Tools — Canvas CRUD

### `create_object`
Creates a new design object. Required: `type`, `x`, `y`. Optional: `width`, `height`, `fill`, `stroke`, `strokeWidth`, `opacity`, `rotation`, `name`, `text`, `fontSize`, `borderRadius`, `points`.

### `list_objects`
Lists all objects with name, type, ID, position, size, and visibility/lock status.

### `get_object`
Returns full JSON details of one object by ID.

### `update_object`
Updates any property of an existing object by ID.

### `delete_object`
Deletes one object by ID.

### `clear_canvas`
Removes all objects via the sync endpoint.

## Architecture

```
AI Agent (Claude Code, etc.)
  ↕ stdio (JSON-RPC)
MCP Server (mcp-server.ts)
  ↕ HTTP fetch
Next.js API Routes (/api/objects, /api/design)
  ↕ read/write
Server State (data/objects.json)
```
