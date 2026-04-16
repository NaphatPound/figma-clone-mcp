# Design-to-Code Pipeline

> The project includes a code generation engine that reads canvas objects and produces React+Tailwind, HTML+CSS, or SVG code, exposed via API routes and MCP tools.

**Topics:** codegen, design-to-code, export, mcp, api
**Related:** [[entities/codegen-engine]], [[entities/mcp-server]], [[entities/api-routes]], [[concepts/design-tokens]]

---

## Overview

This is the Figma MCP-style capability of the project. An AI agent (or any HTTP client) can:

1. Read designs from the canvas.
2. Get generated production code in multiple formats.
3. Extract design tokens as CSS variables.
4. Use the code as a starting point to implement the design in another project.

## Pipeline Flow

```
Canvas Objects (DesignObject[])
  → lib/codegen.ts
    → generateDesignContext()
      ├── generateCode()     → React/HTML/SVG code
      ├── extractMetadata()  → object counts, colors, fonts, bounds
      ├── extractDesignTokens() → CSS variables
      └── hints[]            → contextual adaptation tips
```

## Output Formats

### React + Tailwind (`react-tailwind`)

Generates a React function component with absolute-positioned elements using inline styles. Each `DesignObject` maps to a JSX element:

- Rectangles → `<div>` with background, border, border-radius
- Ellipses → `<div>` with `borderRadius: 50%`
- Text → `<span>` with color and fontSize
- Lines, stars, polygons → inline `<svg>` elements
- Groups/frames → nested `<div>` containers
- Images → `<img>` tags

### HTML + CSS (`html-css`)

Generates standalone HTML with an embedded `<style>` block. Each object gets a unique class name and CSS rules for position, size, colors, etc.

### SVG (`svg`)

Generates a raw `<svg>` element with proper `viewBox` calculated from the bounding box of all visible objects.

## MCP Tools

The MCP server (v2.0.0) exposes five design-to-code tools:

| MCP Tool | API Endpoint | Purpose |
|----------|-------------|---------|
| `get_design_context` | `GET /api/design/context` | Primary tool — returns code + metadata + tokens + hints |
| `get_metadata` | `GET /api/design/metadata` | Object counts, types, colors, bounding box |
| `export_code` | `GET /api/design/export` | Code export with format/component name options |
| `get_variable_defs` | `GET /api/design/tokens` | Design tokens as CSS custom properties |
| `search_design` | `GET /api/design/search` | Find objects by name, type, or color |

## Contextual Hints

`generateDesignContext()` produces hints to help adapt the generated code:

- Groups detected → suggest flex/grid instead of absolute positioning
- Text found → map font sizes to project typography scale
- Images found → replace URLs with project asset imports
- Many colors → consider a design token system
- Deep nesting → flatten component hierarchy
- Large design → break into sub-components

## Usage Example

An AI agent connected via MCP:

```
Agent: Call get_design_context(format: "react-tailwind")
→ Gets React code + tokens + hints
→ Adapts code to target project's component library
→ Writes the adapted component to the target codebase
```
