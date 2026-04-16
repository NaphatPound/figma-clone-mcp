# API Routes

> Next.js API routes providing CRUD operations for canvas objects and design-to-code endpoints.

**Topics:** api, rest, next-js, routes, endpoints
**Related:** [[entities/mcp-server]], [[entities/codegen-engine]], [[concepts/design-to-code]]
**Source:** `app/api/`

---

## Overview

The API layer has two groups of endpoints:

1. **Object CRUD** (`/api/objects`) — Create, read, update, delete canvas objects.
2. **Design** (`/api/design`) — Read-only endpoints for code generation, metadata, tokens, and search.

Both groups are consumed by the MCP server and can be called directly via HTTP.

## Object CRUD Endpoints

### `GET /api/objects`

Returns all objects and the current version number.

**Response:** `{ objects: DesignObject[], version: number }`

### `POST /api/objects`

Creates a new object. Fills in defaults for missing fields.

**Body:** Partial `DesignObject` (at minimum `type`, `x`, `y`)
**Response:** `{ object: DesignObject, version: number }`

**Defaults:**
- `width/height`: 100
- `fill`: `#0d99ff` (text: `#ffffff`, line: `none`)
- `stroke`: `#000000` (line: `#ffffff`)
- `strokeWidth`: 0 (line: 2)
- `opacity`: 1
- `visible`: true, `locked`: false

### `GET /api/objects/:id`

Returns a single object by ID (searches recursively through groups).

**Response:** `{ object: DesignObject, version: number }`

### `PUT /api/objects/:id`

Updates an object's properties. Partial updates supported.

**Body:** `Partial<DesignObject>`
**Response:** `{ version: number }`

### `DELETE /api/objects/:id`

Deletes an object (recursively through groups).

**Response:** `{ version: number }`

### `POST /api/objects/sync`

Replaces all objects at once (used for bulk sync from client).

**Body:** `{ objects: DesignObject[] }`
**Response:** `{ version: number }`

## Design Endpoints

### `GET /api/design/context`

Primary design-to-code endpoint. Returns generated code, metadata, tokens, and hints.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `nodeId` | query string | — | Scope to specific object |
| `format` | query string | `react-tailwind` | `react-tailwind`, `html-css`, `svg` |

**Response:**
```json
{
  "code": "...",
  "format": "react-tailwind",
  "componentName": "DesignComponent",
  "metadata": { ... },
  "tokens": [ ... ],
  "hints": [ ... ],
  "objectCount": 5
}
```

### `GET /api/design/metadata`

Returns metadata about the canvas design.

**Response:** `{ metadata: DesignMetadata, version: number }`

### `GET /api/design/export`

Exports design as code with options.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | query string | `react-tailwind` | Output format |
| `componentName` | query string | — | React component name |
| `nodeId` | query string | — | Export specific subtree |

**Response:** `{ code: string, format: string, componentName?: string, usedColors: string[] }`

### `GET /api/design/tokens`

Returns design tokens extracted from canvas objects.

**Response:** `{ tokens: DesignToken[], grouped: Record<string, DesignToken[]>, css: string }`

### `GET /api/design/search`

Searches for objects by name, type, or color.

| Param | Type | Description |
|-------|------|-------------|
| `q` | query string | Name substring match (case-insensitive) |
| `type` | query string | Object type filter |
| `color` | query string | Fill or stroke hex color |

**Response:** `{ results: [...], count: number }`

## Server State

All endpoints use `lib/server-state.ts` which persists to `data/objects.json` on disk. State includes an `objects` array and a monotonically incrementing `version` number.
