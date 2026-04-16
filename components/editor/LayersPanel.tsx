'use client';

import { useEditorStore } from '@/lib/store';
import { DesignObject } from '@/lib/types';
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';

export function LayersPanel() {
  const { objects, selectedIds, setSelectedIds, updateObject, deleteObject, reorderObjects } = useEditorStore();

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // We display layers in reverse (top layer first in the panel)
  const reversed = [...objects].reverse();

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string, e: React.MouseEvent) => {
    // Don't select when clicking action buttons
    if ((e.target as HTMLElement).closest('button')) return;

    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      // Multi-select: toggle
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    } else {
      setSelectedIds([id]);
    }
  };

  // Drag reorder — only the grip handle initiates drag
  const handleGripMouseDown = useCallback((reversedIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragIdx(reversedIdx);

    const startY = e.clientY;
    const rowHeight = 40; // approx row height

    const handleMouseMove = (me: MouseEvent) => {
      const diff = me.clientY - startY;
      const idxOffset = Math.round(diff / rowHeight);
      const newOver = Math.max(0, Math.min(reversed.length - 1, reversedIdx + idxOffset));
      setOverIdx(newOver);
    };

    const handleMouseUp = (me: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const diff = me.clientY - startY;
      const idxOffset = Math.round(diff / rowHeight);
      const targetReversedIdx = Math.max(0, Math.min(reversed.length - 1, reversedIdx + idxOffset));

      if (targetReversedIdx !== reversedIdx) {
        const fromReal = objects.length - 1 - reversedIdx;
        const toReal = objects.length - 1 - targetReversedIdx;
        const newObjects = [...objects];
        const [moved] = newObjects.splice(fromReal, 1);
        newObjects.splice(toReal, 0, moved);
        reorderObjects(newObjects);
      }

      setDragIdx(null);
      setOverIdx(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [reversed.length, objects, reorderObjects]);

  const renderLayerRow = (obj: DesignObject, reversedIdx: number, depth: number) => {
    const isGroup = obj.type === 'group' && obj.children;
    const isExpanded = expandedGroups.has(obj.id);

    return (
      <div key={obj.id}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-2 hover:bg-[#3e3e3e] cursor-pointer border-b border-[#3e3e3e] transition-colors select-none',
            selectedIds.includes(obj.id) && 'bg-[#0d99ff33]',
            depth === 0 && dragIdx === reversedIdx && 'opacity-40',
            depth === 0 && overIdx === reversedIdx && dragIdx !== null && dragIdx !== reversedIdx && 'border-t-2 border-t-[#0d99ff]',
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onMouseDown={(e) => handleSelect(obj.id, e)}
        >
          {/* Expand/collapse toggle for groups */}
          {isGroup ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleGroup(obj.id); }}
              className="p-0.5 hover:bg-[#4e4e4e] rounded flex-shrink-0 text-gray-400"
            >
              {isExpanded
                ? <ChevronDown size={14} />
                : <ChevronRight size={14} />
              }
            </button>
          ) : (
            <div className="w-[18px] flex-shrink-0" />
          )}

          {/* Grip handle — only for top-level objects */}
          {depth === 0 && (
            <div
              className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 flex-shrink-0"
              onMouseDown={(e) => handleGripMouseDown(reversedIdx, e)}
            >
              <GripVertical size={14} />
            </div>
          )}

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {obj.type === 'image' && obj.src ? (
              <img
                src={obj.src}
                alt={obj.name}
                className="w-4 h-4 rounded-sm flex-shrink-0 object-cover"
              />
            ) : obj.type === 'group' ? (
              <div className="w-4 h-4 rounded-sm flex-shrink-0 border border-dashed border-gray-500 flex items-center justify-center">
                <span className="text-[8px] text-gray-500">G</span>
              </div>
            ) : (
              <div
                className="w-4 h-4 rounded-sm flex-shrink-0"
                style={{ backgroundColor: obj.fill }}
              />
            )}
            <span className="text-sm text-gray-300 truncate">{obj.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateObject(obj.id, { visible: !obj.visible });
              }}
              className="p-1 hover:bg-[#4e4e4e] rounded"
              title={obj.visible ? 'Hide' : 'Show'}
            >
              {obj.visible ? (
                <Eye size={14} className="text-gray-400" />
              ) : (
                <EyeOff size={14} className="text-gray-600" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateObject(obj.id, { locked: !obj.locked });
              }}
              className="p-1 hover:bg-[#4e4e4e] rounded"
              title={obj.locked ? 'Unlock' : 'Lock'}
            >
              {obj.locked ? (
                <Lock size={14} className="text-gray-400" />
              ) : (
                <Unlock size={14} className="text-gray-600" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteObject(obj.id);
              }}
              className="p-1 hover:bg-[#4e4e4e] rounded text-red-400 hover:text-red-300"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Render children if group is expanded */}
        {isGroup && isExpanded && obj.children!.map((child) =>
          renderLayerRow(child, -1, depth + 1)
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-[#2c2c2c] border-l border-[#3e3e3e] flex flex-col">
      <div className="p-3 border-b border-[#3e3e3e]">
        <h2 className="text-sm font-medium text-gray-300">Layers</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {reversed.map((obj, reversedIdx) => renderLayerRow(obj, reversedIdx, 0))}
        {objects.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No layers yet. Start drawing!
          </div>
        )}
      </div>
    </div>
  );
}
