import { NextResponse } from 'next/server';
import { setObjects } from '@/lib/server-state';
import { DesignObject } from '@/lib/types';

export async function POST(request: Request) {
  const body = await request.json();
  const objects = body.objects as DesignObject[];
  const version = setObjects(objects);
  return NextResponse.json({ version });
}
