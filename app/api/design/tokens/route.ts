import { NextResponse } from 'next/server';
import { getState } from '@/lib/server-state';
import { extractDesignTokens } from '@/lib/codegen';

export async function GET() {
  const state = getState();
  const tokens = extractDesignTokens(state.objects);

  // Group by type
  const grouped: Record<string, typeof tokens> = {};
  for (const t of tokens) {
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(t);
  }

  // Generate CSS variables
  const cssVars = tokens.map(t => `  --${t.name}: ${t.value};`).join('\n');
  const cssOutput = `:root {\n${cssVars}\n}`;

  return NextResponse.json({ tokens, grouped, css: cssOutput });
}
