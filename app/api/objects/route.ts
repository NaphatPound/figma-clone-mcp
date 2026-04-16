import { NextResponse } from 'next/server';
import { getState, addObject } from '@/lib/server-state';
import { DesignObject } from '@/lib/types';

export async function GET() {
  const state = getState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();
  const obj: DesignObject = {
    id: body.id || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: body.type || 'rectangle',
    x: body.x ?? 0,
    y: body.y ?? 0,
    width: body.width ?? 100,
    height: body.height ?? 100,
    rotation: body.rotation ?? 0,
    fill: body.fill ?? (body.type === 'text' ? '#ffffff' : body.type === 'line' ? 'none' : '#0d99ff'),
    stroke: body.stroke ?? (body.type === 'line' ? '#ffffff' : '#000000'),
    strokeWidth: body.strokeWidth ?? (body.type === 'line' ? 2 : 0),
    opacity: body.opacity ?? 1,
    name: body.name ?? (body.type ? body.type.charAt(0).toUpperCase() + body.type.slice(1) : 'Object'),
    visible: body.visible ?? true,
    locked: body.locked ?? false,
    text: body.text,
    fontSize: body.fontSize ?? (body.type === 'text' ? 16 : undefined),
    src: body.src,
    borderRadius: body.borderRadius,
    points: body.points,
    children: body.children,
  };
  const version = addObject(obj);
  return NextResponse.json({ object: obj, version });
}
