import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.FIGMA_CLONE_API_URL || 'http://localhost:3000/api';

async function apiCall(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

const server = new McpServer({
  name: 'figma-clone',
  version: '2.0.0',
});

// ============================================================
// READ DESIGN — like Figma MCP get_design_context
// ============================================================

server.tool(
  'get_design_context',
  `Read the current canvas design and get generated code, metadata, design tokens, and contextual hints.
This is the PRIMARY tool for design-to-code workflows. Returns:
- Generated code (React+Tailwind, HTML+CSS, or SVG)
- Design metadata (object counts, bounding box, colors, font sizes)
- Design tokens (colors, spacing, font sizes as CSS variables)
- Contextual hints for adapting the code to your project`,
  {
    nodeId: z.string().optional().describe('Specific object ID to get context for. Omit for entire canvas.'),
    format: z.enum(['react-tailwind', 'html-css', 'svg']).optional().describe('Output code format (default: react-tailwind)'),
  },
  async ({ nodeId, format }) => {
    const params = new URLSearchParams();
    if (nodeId) params.set('nodeId', nodeId);
    if (format) params.set('format', format);
    const data = await apiCall(`/design/context?${params}`);

    const sections = [
      `## Generated Code (${data.format})`,
      '```' + (data.format === 'react-tailwind' ? 'tsx' : data.format === 'html-css' ? 'html' : 'xml'),
      data.code,
      '```',
      '',
      `## Metadata`,
      `- Objects: ${data.objectCount}`,
      `- Bounding box: ${data.metadata.boundingBox.width}x${data.metadata.boundingBox.height} at (${data.metadata.boundingBox.x}, ${data.metadata.boundingBox.y})`,
      `- Types: ${Object.entries(data.metadata.typeBreakdown).map(([k, v]) => `${k}(${v})`).join(', ')}`,
      `- Colors: ${data.metadata.usedColors.join(', ') || 'none'}`,
      `- Font sizes: ${data.metadata.usedFontSizes.join(', ') || 'none'}`,
      `- Layer depth: ${data.metadata.layerDepth}`,
      '',
      `## Design Tokens`,
      ...data.tokens.map((t: { name: string; value: string; type: string; source: string }) =>
        `- \`--${t.name}: ${t.value}\` (${t.type}, from "${t.source}")`
      ),
      '',
      `## Hints`,
      ...data.hints.map((h: string) => `- ${h}`),
    ];

    return { content: [{ type: 'text', text: sections.join('\n') }] };
  }
);

// ============================================================
// GET METADATA — like Figma MCP get_metadata
// ============================================================

server.tool(
  'get_metadata',
  'Get metadata about the current canvas design: object counts, types, colors, fonts, bounding box, and layer structure.',
  {},
  async () => {
    const data = await apiCall('/design/metadata');
    const m = data.metadata;
    const text = [
      `Canvas metadata (version ${data.version}):`,
      `- Total objects: ${m.objectCount}`,
      `- Types: ${Object.entries(m.typeBreakdown).map(([k, v]) => `${k}(${v})`).join(', ')}`,
      `- Bounding box: ${Math.round(m.boundingBox.width)}x${Math.round(m.boundingBox.height)} at (${Math.round(m.boundingBox.x)}, ${Math.round(m.boundingBox.y)})`,
      `- Colors used: ${m.usedColors.join(', ') || 'none'}`,
      `- Font sizes: ${m.usedFontSizes.join(', ') || 'none'}`,
      `- Layer depth: ${m.layerDepth}`,
      `- Has groups/frames: ${m.hasGroups}`,
      `- Has text: ${m.hasText}`,
      `- Has images: ${m.hasImages}`,
    ].join('\n');
    return { content: [{ type: 'text', text }] };
  }
);

// ============================================================
// EXPORT CODE — like Figma MCP design-to-code
// ============================================================

server.tool(
  'export_code',
  `Export the canvas design as production-ready code. Supports multiple formats:
- react-tailwind: React component with inline styles (default)
- html-css: Standalone HTML with embedded CSS
- svg: Raw SVG markup
Optionally target a specific object by ID, or name the output component.`,
  {
    format: z.enum(['react-tailwind', 'html-css', 'svg']).optional().describe('Output format (default: react-tailwind)'),
    componentName: z.string().optional().describe('Name for the generated React component'),
    nodeId: z.string().optional().describe('Export only this object (and its children)'),
  },
  async ({ format, componentName, nodeId }) => {
    const params = new URLSearchParams();
    if (format) params.set('format', format);
    if (componentName) params.set('componentName', componentName);
    if (nodeId) params.set('nodeId', nodeId);
    const data = await apiCall(`/design/export?${params}`);

    const ext = data.format === 'react-tailwind' ? 'tsx' : data.format === 'html-css' ? 'html' : 'svg';
    const text = [
      `Exported as ${data.format}${data.componentName ? ` (component: ${data.componentName})` : ''}:`,
      '',
      '```' + (ext === 'tsx' ? 'tsx' : ext === 'html' ? 'html' : 'xml'),
      data.code,
      '```',
      '',
      `Colors used: ${data.usedColors.join(', ') || 'none'}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }
);

// ============================================================
// GET VARIABLE DEFS — like Figma MCP get_variable_defs
// ============================================================

server.tool(
  'get_variable_defs',
  'Extract design tokens (colors, font sizes, border radii, opacities, stroke widths) from the canvas as CSS custom properties. Use these to map the design to your project\'s token system.',
  {},
  async () => {
    const data = await apiCall('/design/tokens');

    const sections = [
      `## Design Tokens (${data.tokens.length} total)`,
      '',
      '```css',
      data.css,
      '```',
      '',
    ];

    for (const [type, tokens] of Object.entries(data.grouped) as [string, { name: string; value: string; source: string }[]][]) {
      sections.push(`### ${type}`);
      for (const t of tokens) {
        sections.push(`- \`--${t.name}: ${t.value}\` (from "${t.source}")`);
      }
      sections.push('');
    }

    return { content: [{ type: 'text', text: sections.join('\n') }] };
  }
);

// ============================================================
// SEARCH DESIGN — like Figma MCP search_design_system
// ============================================================

server.tool(
  'search_design',
  'Search for objects on the canvas by name, type, or color. Useful for finding specific elements to export or modify.',
  {
    query: z.string().optional().describe('Search by object name (case-insensitive substring match)'),
    type: z.enum(['rectangle', 'ellipse', 'line', 'text', 'frame', 'star', 'polygon', 'image', 'group']).optional().describe('Filter by object type'),
    color: z.string().optional().describe('Filter by fill or stroke color (hex, e.g. "#ff0000")'),
  },
  async ({ query, type, color }) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (type) params.set('type', type);
    if (color) params.set('color', color);
    const data = await apiCall(`/design/search?${params}`);

    if (data.count === 0) {
      return { content: [{ type: 'text', text: 'No matching objects found.' }] };
    }

    const results = data.results.map((o: { id: string; name: string; type: string; x: number; y: number; width: number; height: number; fill: string }) =>
      `- ${o.name} (${o.type}, id: ${o.id}) at (${o.x}, ${o.y}) size ${o.width}x${o.height} fill: ${o.fill}`
    ).join('\n');

    return { content: [{ type: 'text', text: `Found ${data.count} objects:\n${results}` }] };
  }
);

// ============================================================
// CANVAS CRUD — kept from v1 for full control
// ============================================================

server.tool(
  'create_object',
  'Create a design object on the canvas (rectangle, ellipse, text, line, frame, star, polygon)',
  {
    type: z.enum(['rectangle', 'ellipse', 'line', 'text', 'frame', 'star', 'polygon']).describe('Shape type'),
    x: z.number().describe('X position on canvas'),
    y: z.number().describe('Y position on canvas'),
    width: z.number().optional().describe('Width (default 100)'),
    height: z.number().optional().describe('Height (default 100)'),
    fill: z.string().optional().describe('Fill color hex (e.g. "#ff0000")'),
    stroke: z.string().optional().describe('Stroke color hex'),
    strokeWidth: z.number().optional().describe('Stroke width in px'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity 0-1'),
    rotation: z.number().optional().describe('Rotation in degrees'),
    name: z.string().optional().describe('Layer name'),
    text: z.string().optional().describe('Text content (for text type)'),
    fontSize: z.number().optional().describe('Font size (for text type)'),
    borderRadius: z.number().optional().describe('Border radius (for rectangle)'),
    points: z.number().optional().describe('Number of points (star) or sides (polygon)'),
  },
  async (params) => {
    const data = await apiCall('/objects', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return {
      content: [{ type: 'text', text: `Created ${params.type} "${data.object.name}" (id: ${data.object.id}) at (${params.x}, ${params.y})` }],
    };
  }
);

server.tool(
  'list_objects',
  'List all design objects currently on the canvas with their properties',
  {},
  async () => {
    const data = await apiCall('/objects');
    if (data.objects.length === 0) {
      return { content: [{ type: 'text', text: 'Canvas is empty — no objects.' }] };
    }
    const summary = data.objects.map((o: { id: string; type: string; name: string; x: number; y: number; width: number; height: number; visible: boolean; locked: boolean }) =>
      `- ${o.name} (${o.type}, id: ${o.id}) at (${Math.round(o.x)}, ${Math.round(o.y)}) size ${Math.round(o.width)}x${Math.round(o.height)}${!o.visible ? ' [hidden]' : ''}${o.locked ? ' [locked]' : ''}`
    ).join('\n');
    return {
      content: [{ type: 'text', text: `${data.objects.length} objects on canvas:\n${summary}` }],
    };
  }
);

server.tool(
  'get_object',
  'Get full details of a specific object by ID, including all properties',
  {
    id: z.string().describe('Object ID'),
  },
  async ({ id }) => {
    const data = await apiCall(`/objects/${id}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(data.object, null, 2) }],
    };
  }
);

server.tool(
  'update_object',
  'Update properties of an existing object (position, size, colors, visibility, etc.)',
  {
    id: z.string().describe('Object ID to update'),
    x: z.number().optional().describe('New X position'),
    y: z.number().optional().describe('New Y position'),
    width: z.number().optional().describe('New width'),
    height: z.number().optional().describe('New height'),
    fill: z.string().optional().describe('New fill color hex'),
    stroke: z.string().optional().describe('New stroke color hex'),
    strokeWidth: z.number().optional().describe('New stroke width'),
    opacity: z.number().min(0).max(1).optional().describe('New opacity 0-1'),
    rotation: z.number().optional().describe('New rotation in degrees'),
    name: z.string().optional().describe('New layer name'),
    visible: z.boolean().optional().describe('Show/hide'),
    locked: z.boolean().optional().describe('Lock/unlock'),
    text: z.string().optional().describe('New text content'),
    fontSize: z.number().optional().describe('New font size'),
    borderRadius: z.number().optional().describe('New border radius'),
  },
  async ({ id, ...updates }) => {
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await apiCall(`/objects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clean),
    });
    const props = Object.keys(clean).join(', ');
    return {
      content: [{ type: 'text', text: `Updated object ${id}: changed ${props}` }],
    };
  }
);

server.tool(
  'delete_object',
  'Delete an object from the canvas',
  {
    id: z.string().describe('Object ID to delete'),
  },
  async ({ id }) => {
    await apiCall(`/objects/${id}`, { method: 'DELETE' });
    return {
      content: [{ type: 'text', text: `Deleted object ${id}` }],
    };
  }
);

server.tool(
  'clear_canvas',
  'Remove all objects from the canvas',
  {},
  async () => {
    await apiCall('/objects/sync', {
      method: 'POST',
      body: JSON.stringify({ objects: [] }),
    });
    return {
      content: [{ type: 'text', text: 'Canvas cleared — all objects removed.' }],
    };
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
