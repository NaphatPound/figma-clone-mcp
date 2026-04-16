# lib/codegen.ts

> Source summary for the code generation engine — converts DesignObject arrays to React, HTML, and SVG code.

**Topics:** codegen, source, export, tokens, metadata
**Related:** [[entities/codegen-engine]], [[concepts/design-to-code]], [[concepts/design-tokens]]
**Source:** `lib/codegen.ts`

---

## File Overview

- **Lines:** ~350
- **Dependencies:** `./types` (DesignObject)
- **Exports:** 8 public functions + 5 types

## Sections

1. **Types** (L1-40) — `CodeFormat`, `CodeGenResult`, `DesignToken`, `DesignMetadata` type definitions.
2. **Helpers** (L42-85) — `indent()`, `sanitizeName()`, `toPascalCase()`, `cssColor()`, `bbox()`, `collectColors()`, `collectFontSizes()`, `maxDepth()`.
3. **React + Tailwind** (L87-160) — `objectToJsx()` recursive converter + `generateReactTailwind()` wrapper.
4. **HTML + CSS** (L162-220) — `objectToCssHtml()` converter + `generateHtmlCss()` wrapper.
5. **SVG** (L222-275) — `objectToSvgElement()` converter + `generateSvg()` wrapper.
6. **Dispatcher** (L277-283) — `generateCode()` switch over format enum.
7. **Metadata & Tokens** (L285-340) — `extractMetadata()` and `extractDesignTokens()` deep walkers.
8. **Design Context** (L342-380) — `generateDesignContext()` high-level bundle that combines code + metadata + tokens + hints.

## Key Patterns

- All generators filter to visible objects first, then compute a bounding box as the coordinate origin.
- Object-to-code converters are recursive — they handle `children` for groups/frames.
- Token extraction uses a `seen` set to deduplicate by `type:value` key.
- The `findObjectDeep()` helper enables scoping output to a specific subtree by `nodeId`.
