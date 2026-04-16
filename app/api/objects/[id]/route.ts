import { NextResponse } from 'next/server';
import { getState, serverUpdateObject, serverDeleteObject } from '@/lib/server-state';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = getState();
  const findDeep = (objs: typeof state.objects): typeof state.objects[0] | undefined => {
    for (const o of objs) {
      if (o.id === id) return o;
      if (o.children) { const c = findDeep(o.children); if (c) return c; }
    }
    return undefined;
  };
  const obj = findDeep(state.objects);
  if (!obj) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ object: obj, version: state.version });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const version = serverUpdateObject(id, updates);
  return NextResponse.json({ version });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const version = serverDeleteObject(id);
  return NextResponse.json({ version });
}
