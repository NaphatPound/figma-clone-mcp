import { NextResponse } from 'next/server';
import { getState } from '@/lib/server-state';
import { extractMetadata } from '@/lib/codegen';

export async function GET() {
  const state = getState();
  const metadata = extractMetadata(state.objects);
  return NextResponse.json({ metadata, version: state.version });
}
