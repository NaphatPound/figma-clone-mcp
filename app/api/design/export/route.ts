import { NextResponse } from 'next/server';
import { getState } from '@/lib/server-state';
import { generateCode, CodeFormat } from '@/lib/codegen';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') as CodeFormat) || 'react-tailwind';
  const componentName = url.searchParams.get('componentName') || undefined;
  const nodeId = url.searchParams.get('nodeId') || undefined;

  const state = getState();
  if (!state.objects.length) {
    return NextResponse.json({ error: 'Canvas is empty' }, { status: 404 });
  }

  let targets = state.objects;
  if (nodeId) {
    const find = (objs: typeof targets): typeof targets => {
      for (const o of objs) {
        if (o.id === nodeId) return o.children ? o.children : [o];
        if (o.children) { const r = find(o.children); if (r.length) return r; }
      }
      return [];
    };
    const found = find(state.objects);
    if (found.length) targets = found;
  }

  const result = generateCode(targets.filter(o => o.visible), format, componentName);

  return NextResponse.json({
    code: result.code,
    format: result.format,
    componentName: result.componentName,
    usedColors: result.usedColors,
  });
}
