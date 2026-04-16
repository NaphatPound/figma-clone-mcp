'use client';

import { ToolType } from '@/lib/types';
import {
  MousePointer2, Square, Circle, Minus, Type, Hand, Frame, Image, Star, Hexagon,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const tools: { type: ToolType; icon: React.ElementType; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select (V)' },
  { type: 'frame', icon: Frame, label: 'Frame (F)' },
  { type: 'rectangle', icon: Square, label: 'Rectangle (R)' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
  { type: 'star', icon: Star, label: 'Star (S)' },
  { type: 'polygon', icon: Hexagon, label: 'Polygon (P)' },
  { type: 'line', icon: Minus, label: 'Line (L)' },
  { type: 'text', icon: Type, label: 'Text (T)' },
  { type: 'hand', icon: Hand, label: 'Hand (H)' },
  { type: 'image', icon: Image, label: 'Image' },
];

export function Toolbar() {
  const { currentTool, setCurrentTool } = useEditorStore();

  return (
    <div className="flex flex-col gap-1 p-2 bg-[#2c2c2c] border-r border-[#3e3e3e]">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.type}
            onClick={() => setCurrentTool(tool.type)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-md transition-colors',
              currentTool === tool.type
                ? 'bg-[#0d99ff] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#3e3e3e]'
            )}
            title={tool.label}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
