import { NextResponse } from 'next/server';
import { getState } from '@/lib/server-state';
import { generateDesignContext, CodeFormat } from '@/lib/codegen';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nodeId = url.searchParams.get('nodeId') || undefined;
  const format = (url.searchParams.get('format') as CodeFormat) || 'react-tailwind';

  const state = getState();
  if (!state.objects.length) {
    return NextResponse.json({ error: 'Canvas is empty' }, { status: 404 });
  }

  const context = generateDesignContext(state.objects, { nodeId, format });

  return NextResponse.json({
    code: context.code.code,
    format: context.code.format,
    componentName: context.code.componentName,
    metadata: context.metadata,
    tokens: context.tokens,
    hints: context.hints,
    objectCount: context.objects.length,
  });
}
