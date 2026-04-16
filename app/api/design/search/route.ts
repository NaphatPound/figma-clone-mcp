import { NextResponse } from 'next/server';
import { getState } from '@/lib/server-state';
import { DesignObject } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type') || undefined;
  const color = url.searchParams.get('color') || undefined;

  const state = getState();

  const results: DesignObject[] = [];
  const search = (objs: DesignObject[]) => {
    for (const o of objs) {
      let match = true;
      if (query && !o.name.toLowerCase().includes(query.toLowerCase())) match = false;
      if (type && o.type !== type) match = false;
      if (color && o.fill !== color && o.stroke !== color) match = false;
      if (match) results.push(o);
      if (o.children) search(o.children);
    }
  };
  search(state.objects);

  return NextResponse.json({
    results: results.map(o => ({
      id: o.id,
      name: o.name,
      type: o.type,
      x: Math.round(o.x),
      y: Math.round(o.y),
      width: Math.round(o.width),
      height: Math.round(o.height),
      fill: o.fill,
      stroke: o.stroke,
    })),
    count: results.length,
  });
}
