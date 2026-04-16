# Code Generation Engine

> Converts DesignObject arrays into React+Tailwind, HTML+CSS, or SVG code with metadata and design token extraction.

**Topics:** codegen, react, html, svg, export, tokens
**Related:** [[concepts/design-to-code]], [[concepts/design-tokens]], [[entities/mcp-server]], [[entities/api-routes]]
**Source:** `lib/codegen.ts`

---

## Overview

The codegen engine is the core of the design-to-code pipeline. It takes an array of `DesignObject` from the canvas and produces usable code in three formats, plus metadata and design tokens.

## Exported Functions

### Code Generation

| Function | Input | Output |
|----------|-------|--------|
| `generateCode(objects, format, componentName?)` | `DesignObject[]` + format enum | `CodeGenResult` |
| `generateReactTailwind(objects, componentName?)` | `DesignObject[]` | React component code |
| `generateHtmlCss(objects)` | `DesignObject[]` | HTML + embedded CSS |
| `generateSvg(objects)` | `DesignObject[]` | SVG markup |

### Analysis

| Function | Input | Output |
|----------|-------|--------|
| `extractMetadata(objects)` | `DesignObject[]` | `DesignMetadata` |
| `extractDesignTokens(objects)` | `DesignObject[]` | `DesignToken[]` |
| `generateDesignContext(objects, options?)` | `DesignObject[]` | Full context bundle |

## CodeGenResult Type

```typescript
interface CodeGenResult {
  code: string;           // Generated source code
  format: CodeFormat;     // Which format was used
  componentName?: string; // React component name (if applicable)
  cssVariables?: Record<string, string>;
  usedColors: string[];
  usedFonts: string[];
}
```

## Object-to-Code Mapping

### React + Tailwind

Each object becomes an absolutely-positioned element relative to the design's bounding box:

| DesignObject Type | JSX Output |
|-------------------|-----------|
| `rectangle` | `<div>` with background, border, border-radius |
| `ellipse` | `<div>` with `borderRadius: '50%'` |
| `text` | `<span>` with color, fontSize |
| `line` | `<svg><line>` |
| `star` / `polygon` | `<svg><polygon>` with computed points |
| `frame` / `group` | `<div>` container with nested children |
| `image` | `<img>` with objectFit: cover |

### HTML + CSS

Same mapping but with separate CSS classes (`.obj-{name}-{id}`) and a `<style>` block.

### SVG

Direct mapping to SVG elements (`<rect>`, `<ellipse>`, `<line>`, `<text>`, `<polygon>`, `<g>`, `<image>`).

## Bounding Box Calculation

All formats compute the bounding box of visible objects first, then position elements relative to that origin. The generated container has the exact width/height of the bounding box.

## Design Context Bundle

`generateDesignContext()` is the high-level function that produces everything at once:

```typescript
{
  code: CodeGenResult,        // Generated code
  metadata: DesignMetadata,   // Object analysis
  tokens: DesignToken[],      // CSS variables
  hints: string[],            // Adaptation suggestions
  objects: DesignObject[],    // The visible objects used
}
```

It optionally accepts a `nodeId` to scope the output to a specific subtree.
