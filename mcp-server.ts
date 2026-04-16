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
  version: '1.0.0',
});

// --- Tools ---

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
  'List all design objects currently on the canvas',
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
  'Get details of a specific object by ID',
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
  'Update properties of an existing object',
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
    // Remove undefined values
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
