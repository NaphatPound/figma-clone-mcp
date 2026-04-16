import { DesignObject } from './types';

// ---------- Types ----------

export type CodeFormat = 'react-tailwind' | 'html-css' | 'svg';

export interface CodeGenResult {
  code: string;
  format: CodeFormat;
  componentName?: string;
  cssVariables?: Record<string, string>;
  usedColors: string[];
  usedFonts: string[];
}

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'fontSize' | 'borderRadius' | 'opacity' | 'strokeWidth';
  source: string; // object name that uses this
}

export interface DesignMetadata {
  objectCount: number;
  typeBreakdown: Record<string, number>;
  boundingBox: { x: number; y: number; width: number; height: number };
  usedColors: string[];
  usedFontSizes: number[];
  layerDepth: number;
  hasGroups: boolean;
  hasText: boolean;
  hasImages: boolean;
}

// ---------- Helpers ----------

function indent(str: string, level: number): string {
  return str.split('\n').map(l => '  '.repeat(level) + l).join('\n');
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, '_$&') || 'Component';
}

function toPascalCase(name: string): string {
  return sanitizeName(name)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function cssColor(hex: string, opacity: number): string {
  if (hex === 'none' || hex === 'transparent') return 'transparent';
  if (opacity < 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hex;
}

function bbox(objects: DesignObject[]): { x: number; y: number; width: number; height: number } {
  if (!objects.length) return { x: 0, y: 0, width: 0, height: 0 };
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const o of objects) {
    x1 = Math.min(x1, o.x);
    y1 = Math.min(y1, o.y);
    x2 = Math.max(x2, o.x + o.width);
    y2 = Math.max(y2, o.y + o.height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function collectColors(objects: DesignObject[]): string[] {
  const colors = new Set<string>();
  for (const o of objects) {
    if (o.fill && o.fill !== 'none' && o.fill !== 'transparent') colors.add(o.fill);
    if (o.stroke && o.stroke !== 'none' && o.stroke !== 'transparent' && o.strokeWidth > 0) colors.add(o.stroke);
    if (o.children) collectColors(o.children).forEach(c => colors.add(c));
  }
  return [...colors];
}

function collectFontSizes(objects: DesignObject[]): number[] {
  const sizes = new Set<number>();
  for (const o of objects) {
    if (o.type === 'text' && o.fontSize) sizes.add(o.fontSize);
    if (o.children) collectFontSizes(o.children).forEach(s => sizes.add(s));
  }
  return [...sizes].sort((a, b) => a - b);
}

function maxDepth(objects: DesignObject[], depth = 1): number {
  let max = depth;
  for (const o of objects) {
    if (o.children) max = Math.max(max, maxDepth(o.children, depth + 1));
  }
  return max;
}

// ---------- React + Tailwind ----------

function objectToJsx(obj: DesignObject, originX: number, originY: number, level: number): string {
  if (!obj.visible) return '';

  const x = Math.round(obj.x - originX);
  const y = Math.round(obj.y - originY);
  const w = Math.round(obj.width);
  const h = Math.round(obj.height);

  const posStyle = `left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;`;
  const transform = obj.rotation ? ` transform: rotate(${obj.rotation}deg);` : '';
  const opacity = obj.opacity < 1 ? ` opacity: ${obj.opacity};` : '';

  switch (obj.type) {
    case 'rectangle': {
      const radius = obj.borderRadius ? ` border-radius: ${obj.borderRadius}px;` : '';
      const bg = obj.fill !== 'none' ? ` background: ${obj.fill};` : '';
      const border = obj.strokeWidth > 0 ? ` border: ${obj.strokeWidth}px solid ${obj.stroke};` : '';
      return indent(`{/* ${obj.name} */}\n<div style={{ position: 'absolute', ${posStyle}${bg}${border}${radius}${transform}${opacity} }} />`, level);
    }
    case 'ellipse':
      return indent(`{/* ${obj.name} */}\n<div style={{ position: 'absolute', ${posStyle} background: ${obj.fill}, borderRadius: '50%',${obj.strokeWidth > 0 ? ` border: '${obj.strokeWidth}px solid ${obj.stroke}',` : ''}${transform}${opacity} }} />`, level);
    case 'text':
      return indent(`{/* ${obj.name} */}\n<span style={{ position: 'absolute', ${posStyle} color: ${obj.fill !== 'none' ? `'${obj.fill}'` : "'#fff'"}, fontSize: ${obj.fontSize || 16},${transform}${opacity} }}>${obj.text || ''}</span>`, level);
    case 'line': {
      const stroke = obj.stroke !== 'none' ? obj.stroke : '#fff';
      return indent(`{/* ${obj.name} */}\n<svg style={{ position: 'absolute', left: ${x}, top: ${y}, width: ${w || 1}, height: ${h || 1},${transform}${opacity} }}>\n  <line x1="0" y1="0" x2="${w}" y2="${h}" stroke="${stroke}" strokeWidth={${obj.strokeWidth || 2}} />\n</svg>`, level);
    }
    case 'star':
    case 'polygon': {
      const points = obj.points || (obj.type === 'star' ? 5 : 6);
      const cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) / 2;
      let pathPoints: string;
      if (obj.type === 'star') {
        const inner = r * 0.4;
        const pts: string[] = [];
        for (let i = 0; i < points * 2; i++) {
          const angle = (Math.PI * i) / points - Math.PI / 2;
          const rad = i % 2 === 0 ? r : inner;
          pts.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
        }
        pathPoints = pts.join(' ');
      } else {
        const pts: string[] = [];
        for (let i = 0; i < points; i++) {
          const angle = (2 * Math.PI * i) / points - Math.PI / 2;
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        pathPoints = pts.join(' ');
      }
      return indent(`{/* ${obj.name} */}\n<svg style={{ position: 'absolute', left: ${x}, top: ${y}, width: ${w}, height: ${h},${transform}${opacity} }}>\n  <polygon points="${pathPoints}" fill="${obj.fill}" stroke="${obj.stroke}" strokeWidth={${obj.strokeWidth}} />\n</svg>`, level);
    }
    case 'frame':
    case 'group': {
      const children = (obj.children || [])
        .filter(c => c.visible)
        .map(c => objectToJsx(c, 0, 0, level + 1))
        .filter(Boolean)
        .join('\n');
      const bg = obj.fill !== 'transparent' && obj.fill !== 'none' ? ` background: '${obj.fill}',` : '';
      return indent(`{/* ${obj.name} */}\n<div style={{ position: 'absolute', ${posStyle}${bg}${transform}${opacity} overflow: 'hidden' }}>\n${children}\n</div>`, level);
    }
    case 'image':
      return indent(`{/* ${obj.name} */}\n<img src="${obj.src || ''}" alt="${obj.name}" style={{ position: 'absolute', ${posStyle} objectFit: 'cover',${transform}${opacity} }} />`, level);
    default:
      return indent(`{/* ${obj.name} (${obj.type}) */}\n<div style={{ position: 'absolute', ${posStyle}${transform}${opacity} }} />`, level);
  }
}

export function generateReactTailwind(objects: DesignObject[], componentName?: string): CodeGenResult {
  const visible = objects.filter(o => o.visible);
  const b = bbox(visible);
  const name = componentName ? toPascalCase(componentName) : 'DesignComponent';

  const children = visible
    .map(o => objectToJsx(o, b.x, b.y, 2))
    .filter(Boolean)
    .join('\n');

  const code = `export default function ${name}() {
  return (
    <div style={{ position: 'relative', width: ${Math.round(b.width)}, height: ${Math.round(b.height)} }}>
${children}
    </div>
  );
}`;

  return {
    code,
    format: 'react-tailwind',
    componentName: name,
    usedColors: collectColors(visible),
    usedFonts: [],
  };
}

// ---------- HTML + CSS ----------

function objectToCssHtml(obj: DesignObject, originX: number, originY: number): { html: string; css: string } {
  if (!obj.visible) return { html: '', css: '' };

  const cls = `obj-${sanitizeName(obj.name).toLowerCase()}-${obj.id.slice(-6)}`;
  const x = Math.round(obj.x - originX);
  const y = Math.round(obj.y - originY);
  const w = Math.round(obj.width);
  const h = Math.round(obj.height);

  let styles = `  position: absolute;\n  left: ${x}px;\n  top: ${y}px;\n  width: ${w}px;\n  height: ${h}px;`;
  if (obj.rotation) styles += `\n  transform: rotate(${obj.rotation}deg);`;
  if (obj.opacity < 1) styles += `\n  opacity: ${obj.opacity};`;

  switch (obj.type) {
    case 'rectangle': {
      if (obj.fill !== 'none') styles += `\n  background: ${obj.fill};`;
      if (obj.strokeWidth > 0) styles += `\n  border: ${obj.strokeWidth}px solid ${obj.stroke};`;
      if (obj.borderRadius) styles += `\n  border-radius: ${obj.borderRadius}px;`;
      return { html: `  <!-- ${obj.name} -->\n  <div class="${cls}"></div>`, css: `.${cls} {\n${styles}\n}` };
    }
    case 'ellipse': {
      styles += `\n  background: ${obj.fill};\n  border-radius: 50%;`;
      if (obj.strokeWidth > 0) styles += `\n  border: ${obj.strokeWidth}px solid ${obj.stroke};`;
      return { html: `  <!-- ${obj.name} -->\n  <div class="${cls}"></div>`, css: `.${cls} {\n${styles}\n}` };
    }
    case 'text': {
      if (obj.fill !== 'none') styles += `\n  color: ${obj.fill};`;
      styles += `\n  font-size: ${obj.fontSize || 16}px;`;
      return { html: `  <!-- ${obj.name} -->\n  <span class="${cls}">${obj.text || ''}</span>`, css: `.${cls} {\n${styles}\n}` };
    }
    case 'frame':
    case 'group': {
      if (obj.fill !== 'transparent' && obj.fill !== 'none') styles += `\n  background: ${obj.fill};`;
      styles += `\n  overflow: hidden;`;
      const childResults = (obj.children || []).filter(c => c.visible).map(c => objectToCssHtml(c, 0, 0));
      const childHtml = childResults.map(r => r.html).filter(Boolean).join('\n');
      const childCss = childResults.map(r => r.css).filter(Boolean).join('\n\n');
      return {
        html: `  <!-- ${obj.name} -->\n  <div class="${cls}">\n${childHtml}\n  </div>`,
        css: `.${cls} {\n${styles}\n}\n\n${childCss}`,
      };
    }
    case 'image':
      styles += `\n  object-fit: cover;`;
      return { html: `  <!-- ${obj.name} -->\n  <img class="${cls}" src="${obj.src || ''}" alt="${obj.name}" />`, css: `.${cls} {\n${styles}\n}` };
    default: {
      if (obj.fill !== 'none') styles += `\n  background: ${obj.fill};`;
      return { html: `  <!-- ${obj.name} -->\n  <div class="${cls}"></div>`, css: `.${cls} {\n${styles}\n}` };
    }
  }
}

export function generateHtmlCss(objects: DesignObject[]): CodeGenResult {
  const visible = objects.filter(o => o.visible);
  const b = bbox(visible);

  const results = visible.map(o => objectToCssHtml(o, b.x, b.y));
  const htmlParts = results.map(r => r.html).filter(Boolean).join('\n');
  const cssParts = results.map(r => r.css).filter(Boolean).join('\n\n');

  const code = `<style>
.design-container {
  position: relative;
  width: ${Math.round(b.width)}px;
  height: ${Math.round(b.height)}px;
}

${cssParts}
</style>

<div class="design-container">
${htmlParts}
</div>`;

  return {
    code,
    format: 'html-css',
    usedColors: collectColors(visible),
    usedFonts: [],
  };
}

// ---------- SVG ----------

function objectToSvgElement(obj: DesignObject): string {
  if (!obj.visible) return '';

  const transform = obj.rotation
    ? ` transform="rotate(${obj.rotation} ${obj.x + obj.width / 2} ${obj.y + obj.height / 2})"`
    : '';
  const opacity = obj.opacity < 1 ? ` opacity="${obj.opacity}"` : '';
  const fill = obj.fill !== 'none' ? obj.fill : 'none';
  const stroke = obj.strokeWidth > 0 ? obj.stroke : 'none';
  const sw = obj.strokeWidth > 0 ? ` stroke-width="${obj.strokeWidth}"` : '';

  switch (obj.type) {
    case 'rectangle': {
      const rx = obj.borderRadius ? ` rx="${obj.borderRadius}"` : '';
      return `  <!-- ${obj.name} -->\n  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${fill}" stroke="${stroke}"${sw}${rx}${transform}${opacity} />`;
    }
    case 'ellipse':
      return `  <!-- ${obj.name} -->\n  <ellipse cx="${obj.x + obj.width / 2}" cy="${obj.y + obj.height / 2}" rx="${obj.width / 2}" ry="${obj.height / 2}" fill="${fill}" stroke="${stroke}"${sw}${transform}${opacity} />`;
    case 'line':
      return `  <!-- ${obj.name} -->\n  <line x1="${obj.x}" y1="${obj.y}" x2="${obj.x + obj.width}" y2="${obj.y + obj.height}" stroke="${stroke !== 'none' ? stroke : '#fff'}"${sw || ' stroke-width="2"'}${transform}${opacity} />`;
    case 'text':
      return `  <!-- ${obj.name} -->\n  <text x="${obj.x}" y="${obj.y + (obj.fontSize || 16)}" fill="${fill !== 'none' ? fill : '#fff'}" font-size="${obj.fontSize || 16}"${transform}${opacity}>${obj.text || ''}</text>`;
    case 'star':
    case 'polygon': {
      const pts = obj.points || (obj.type === 'star' ? 5 : 6);
      const cx = obj.x + obj.width / 2, cy = obj.y + obj.height / 2;
      const r = Math.min(obj.width, obj.height) / 2;
      let pointsStr: string;
      if (obj.type === 'star') {
        const inner = r * 0.4;
        const coords: string[] = [];
        for (let i = 0; i < pts * 2; i++) {
          const angle = (Math.PI * i) / pts - Math.PI / 2;
          const rad = i % 2 === 0 ? r : inner;
          coords.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
        }
        pointsStr = coords.join(' ');
      } else {
        const coords: string[] = [];
        for (let i = 0; i < pts; i++) {
          const angle = (2 * Math.PI * i) / pts - Math.PI / 2;
          coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        pointsStr = coords.join(' ');
      }
      return `  <!-- ${obj.name} -->\n  <polygon points="${pointsStr}" fill="${fill}" stroke="${stroke}"${sw}${opacity} />`;
    }
    case 'frame':
    case 'group': {
      const children = (obj.children || []).map(c => {
        const shifted = { ...c, x: c.x + obj.x, y: c.y + obj.y };
        return objectToSvgElement(shifted);
      }).filter(Boolean).join('\n');
      return `  <!-- ${obj.name} -->\n  <g${transform}${opacity}>\n${children}\n  </g>`;
    }
    case 'image':
      return `  <!-- ${obj.name} -->\n  <image href="${obj.src || ''}" x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}"${transform}${opacity} />`;
    default:
      return `  <!-- ${obj.name} -->\n  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${fill}"${transform}${opacity} />`;
  }
}

export function generateSvg(objects: DesignObject[]): CodeGenResult {
  const visible = objects.filter(o => o.visible);
  const b = bbox(visible);

  const elements = visible.map(o => objectToSvgElement(o)).filter(Boolean).join('\n');

  const code = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${Math.round(b.x)} ${Math.round(b.y)} ${Math.round(b.width)} ${Math.round(b.height)}" width="${Math.round(b.width)}" height="${Math.round(b.height)}">
${elements}
</svg>`;

  return {
    code,
    format: 'svg',
    usedColors: collectColors(visible),
    usedFonts: [],
  };
}

// ---------- Code generation dispatcher ----------

export function generateCode(objects: DesignObject[], format: CodeFormat, componentName?: string): CodeGenResult {
  switch (format) {
    case 'react-tailwind': return generateReactTailwind(objects, componentName);
    case 'html-css': return generateHtmlCss(objects);
    case 'svg': return generateSvg(objects);
  }
}

// ---------- Metadata & Tokens ----------

export function extractMetadata(objects: DesignObject[]): DesignMetadata {
  const typeCounts: Record<string, number> = {};
  let total = 0;
  const countDeep = (objs: DesignObject[]) => {
    for (const o of objs) {
      typeCounts[o.type] = (typeCounts[o.type] || 0) + 1;
      total++;
      if (o.children) countDeep(o.children);
    }
  };
  countDeep(objects);

  return {
    objectCount: total,
    typeBreakdown: typeCounts,
    boundingBox: bbox(objects),
    usedColors: collectColors(objects),
    usedFontSizes: collectFontSizes(objects),
    layerDepth: maxDepth(objects),
    hasGroups: objects.some(o => o.type === 'group' || o.type === 'frame'),
    hasText: objects.some(o => o.type === 'text' || o.children?.some(c => c.type === 'text')),
    hasImages: objects.some(o => o.type === 'image' || o.children?.some(c => c.type === 'image')),
  };
}

export function extractDesignTokens(objects: DesignObject[]): DesignToken[] {
  const tokens: DesignToken[] = [];
  const seen = new Set<string>();

  const walk = (objs: DesignObject[]) => {
    for (const o of objs) {
      if (o.fill && o.fill !== 'none' && o.fill !== 'transparent') {
        const key = `color:${o.fill}`;
        if (!seen.has(key)) { seen.add(key); tokens.push({ name: `color-${o.fill.replace('#', '')}`, value: o.fill, type: 'color', source: o.name }); }
      }
      if (o.stroke && o.stroke !== 'none' && o.stroke !== 'transparent' && o.strokeWidth > 0) {
        const key = `color:${o.stroke}`;
        if (!seen.has(key)) { seen.add(key); tokens.push({ name: `color-${o.stroke.replace('#', '')}`, value: o.stroke, type: 'color', source: o.name }); }
      }
      if (o.type === 'text' && o.fontSize) {
        const key = `fontSize:${o.fontSize}`;
        if (!seen.has(key)) { seen.add(key); tokens.push({ name: `font-size-${o.fontSize}`, value: `${o.fontSize}px`, type: 'fontSize', source: o.name }); }
      }
      if (o.borderRadius) {
        const key = `radius:${o.borderRadius}`;
        if (!seen.has(key)) { seen.add(key); tokens.push({ name: `radius-${o.borderRadius}`, value: `${o.borderRadius}px`, type: 'borderRadius', source: o.name }); }
      }
      if (o.opacity < 1) {
        const key = `opacity:${o.opacity}`;
        if (!seen.has(key)) { seen.add(key); tokens.push({ name: `opacity-${Math.round(o.opacity * 100)}`, value: `${o.opacity}`, type: 'opacity', source: o.name }); }
      }
      if (o.strokeWidth > 0) {
        const key = `strokeWidth:${o.strokeWidth}`;
        if (!seen.has(key)) { seen.add(key); tokens.push({ name: `stroke-${o.strokeWidth}`, value: `${o.strokeWidth}px`, type: 'strokeWidth', source: o.name }); }
      }
      if (o.children) walk(o.children);
    }
  };
  walk(objects);
  return tokens;
}

// ---------- Design context (like Figma MCP get_design_context) ----------

export function generateDesignContext(
  objects: DesignObject[],
  options?: { nodeId?: string; format?: CodeFormat }
): {
  code: CodeGenResult;
  metadata: DesignMetadata;
  tokens: DesignToken[];
  hints: string[];
  objects: DesignObject[];
} {
  // If nodeId specified, find that subtree
  let targetObjects = objects;
  if (options?.nodeId) {
    const found = findObjectDeep(objects, options.nodeId);
    if (found) {
      targetObjects = found.children ? found.children : [found];
    }
  }

  const visible = targetObjects.filter(o => o.visible);
  const format = options?.format || 'react-tailwind';
  const code = generateCode(visible, format);
  const metadata = extractMetadata(visible);
  const tokens = extractDesignTokens(visible);

  // Generate contextual hints
  const hints: string[] = [];
  if (metadata.hasGroups) hints.push('Design contains groups/frames — consider using flex/grid layout instead of absolute positioning.');
  if (metadata.hasText) hints.push('Text elements found — map font sizes to your project\'s typography scale.');
  if (metadata.hasImages) hints.push('Image elements found — replace src URLs with your project\'s asset imports.');
  if (tokens.filter(t => t.type === 'color').length > 5) hints.push('Many colors used — consider mapping to a design token system or CSS variables.');
  if (metadata.layerDepth > 3) hints.push('Deep nesting detected — consider flattening the component hierarchy.');
  if (metadata.objectCount > 20) hints.push('Large design — consider breaking into smaller sub-components.');

  return { code, metadata, tokens, hints, objects: visible };
}

function findObjectDeep(objects: DesignObject[], id: string): DesignObject | undefined {
  for (const o of objects) {
    if (o.id === id) return o;
    if (o.children) {
      const found = findObjectDeep(o.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
