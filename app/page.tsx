'use client';

import { Toolbar } from '@/components/editor/Toolbar';
import { Canvas } from '@/components/editor/Canvas';
import { LayersPanel } from '@/components/editor/LayersPanel';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { TopBar } from '@/components/editor/TopBar';
import { useServerSync } from '@/lib/useServerSync';

export default function Home() {
  useServerSync();
  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <Canvas />
        <div className="flex flex-col">
          <LayersPanel />
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
