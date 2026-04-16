# Design Tokens

> Design tokens are extracted from canvas objects and emitted as CSS custom properties, enabling consistent theming across implementations.

**Topics:** tokens, css-variables, colors, typography, theming
**Related:** [[concepts/design-to-code]], [[entities/codegen-engine]], [[entities/api-routes]]

---

## What Are Design Tokens

Design tokens are the smallest units of a design system — named values for colors, font sizes, border radii, opacities, and stroke widths. The codegen engine scans all canvas objects and extracts unique tokens.

## Token Types

| Type | Example Name | Example Value | Extracted From |
|------|-------------|---------------|----------------|
| `color` | `--color-0d99ff` | `#0d99ff` | Object `fill` or `stroke` |
| `fontSize` | `--font-size-16` | `16px` | Text object `fontSize` |
| `borderRadius` | `--radius-8` | `8px` | Rectangle `borderRadius` |
| `opacity` | `--opacity-50` | `0.5` | Object `opacity` (when < 1) |
| `strokeWidth` | `--stroke-2` | `2px` | Object `strokeWidth` (when > 0) |

## Token Structure

Each token in the API response:

```typescript
interface DesignToken {
  name: string;      // CSS variable name (e.g. "color-0d99ff")
  value: string;     // CSS value (e.g. "#0d99ff")
  type: string;      // Token category
  source: string;    // Name of the object this was first found on
}
```

## CSS Output

The `/api/design/tokens` endpoint returns tokens grouped by type and a ready-to-use CSS block:

```css
:root {
  --color-0d99ff: #0d99ff;
  --color-ff0000: #ff0000;
  --font-size-16: 16px;
  --font-size-24: 24px;
  --radius-8: 8px;
  --opacity-50: 0.5;
}
```

## Deduplication

Tokens are deduplicated by a `type:value` key. If multiple objects use `#0d99ff` as a fill, only one `color-0d99ff` token is emitted. The `source` field records the first object that used the value.

## App-Level Theme Tokens

The app itself uses CSS variables for its dark theme (defined in `globals.css`):

| Variable | Value | Usage |
|----------|-------|-------|
| `--background` | `#1e1e1e` | App background |
| `--foreground` | `#ffffff` | Primary text |
| `--panel-bg` | `#2c2c2c` | Panel backgrounds |
| `--border-color` | `#3e3e3e` | Borders |
| `--accent-color` | `#0d99ff` | Active states, selection |
| `--text-secondary` | `#a0a0a0` | Muted labels |

These are separate from the design tokens extracted from canvas objects — the app theme is for the editor UI, while design tokens describe what the user has designed on the canvas.
