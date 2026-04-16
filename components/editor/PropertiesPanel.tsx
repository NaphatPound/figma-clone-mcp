'use client';

import { useEditorStore } from '@/lib/store';
import { useState, useEffect, useRef } from 'react';

export function PropertiesPanel() {
  const { objects, selectedIds, updateObject, enteredGroupId } = useEditorStore();
  const [localValues, setLocalValues] = useState({
    x: 0, y: 0, width: 100, height: 100,
    fill: '#0d99ff', stroke: '#000000', strokeWidth: 0, opacity: 1,
    name: '', text: '', fontSize: 16, rotation: 0,
    borderRadius: 0, points: 5,
  });

  // Search top-level and inside groups
  const findObject = (id: string) => {
    const top = objects.find(o => o.id === id);
    if (top) return top;
    for (const o of objects) {
      if (o.children) {
        const child = o.children.find(c => c.id === id);
        if (child) return child;
      }
    }
    return undefined;
  };

  const selectedObject = findObject(selectedIds[0]);
  const focusedInput = useRef<string | null>(null);

  // Get group rotation for children inside groups (effective rotation = group + child)
  const parentGroup = enteredGroupId ? objects.find(o => o.id === enteredGroupId) : null;
  const groupRotation = parentGroup?.rotation || 0;

  // Sync from store to local — but skip fields the user is actively editing
  useEffect(() => {
    if (selectedObject) {
      setLocalValues(prev => {
        const effectiveRotation = parentGroup
          ? Math.round(groupRotation + (selectedObject.rotation || 0))
          : Math.round(selectedObject.rotation);
        const next = {
          x: Math.round(selectedObject.x), y: Math.round(selectedObject.y),
          width: Math.round(selectedObject.width), height: Math.round(selectedObject.height),
          fill: selectedObject.fill, stroke: selectedObject.stroke,
          strokeWidth: selectedObject.strokeWidth, opacity: selectedObject.opacity,
          name: selectedObject.name, text: selectedObject.text || '',
          fontSize: selectedObject.fontSize || 16, rotation: effectiveRotation,
          borderRadius: selectedObject.borderRadius || 0,
          points: selectedObject.points || (selectedObject.type === 'star' ? 5 : 6),
        };
        // If user is focused on an input, keep their local value for that field
        if (focusedInput.current && focusedInput.current in prev) {
          return { ...next, [focusedInput.current]: prev[focusedInput.current as keyof typeof prev] };
        }
        return next;
      });
    }
  }, [selectedObject, parentGroup, groupRotation]);

  const handleChange = (key: string, value: string | number) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    if (selectedObject && !selectedObject.locked) {
      // For rotation of children inside groups, subtract parent rotation
      if (key === 'rotation' && parentGroup) {
        updateObject(selectedObject.id, { rotation: (value as number) - groupRotation });
      } else {
        updateObject(selectedObject.id, { [key]: value });
      }
    }
  };

  if (!selectedObject) {
    return (
      <div className="w-64 bg-[#2c2c2c] border-l border-[#3e3e3e] p-4">
        <p className="text-sm text-gray-500 text-center">Select an object to edit properties</p>
      </div>
    );
  }

  const inp = 'w-full bg-[#1e1e1e] border border-[#3e3e3e] rounded px-2 py-1 text-sm text-white focus:border-[#0d99ff] focus:outline-none';

  const inputProps = (key: string) => ({
    onFocus: () => { focusedInput.current = key; },
    onBlur: () => { focusedInput.current = null; },
  });

  return (
    <div className="w-64 bg-[#2c2c2c] border-l border-[#3e3e3e] flex flex-col">
      <div className="p-3 border-b border-[#3e3e3e]">
        <h2 className="text-sm font-medium text-gray-300">Properties</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Name</label>
          <input type="text" value={localValues.name} onChange={(e) => handleChange('name', e.target.value)} {...inputProps('name')} className={inp} />
        </div>

        {/* Position */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Position</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">X</label>
              <input type="number" value={localValues.x} onChange={(e) => handleChange('x', Number(e.target.value))} {...inputProps('x')} className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Y</label>
              <input type="number" value={localValues.y} onChange={(e) => handleChange('y', Number(e.target.value))} {...inputProps('y')} className={inp} />
            </div>
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Size</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">W</label>
              <input type="number" value={localValues.width} onChange={(e) => handleChange('width', Number(e.target.value))} {...inputProps('width')} className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-500">H</label>
              <input type="number" value={localValues.height} onChange={(e) => handleChange('height', Number(e.target.value))} {...inputProps('height')} className={inp} />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Rotation</label>
          <div className="flex items-center gap-2">
            <input type="number" value={localValues.rotation}
              onChange={(e) => handleChange('rotation', Number(e.target.value))} className={inp} />
            <span className="text-xs text-gray-500">deg</span>
          </div>
        </div>

        {/* Corner Radius (for rectangles) */}
        {selectedObject.type === 'rectangle' && (
          <div>
            <label className="text-xs text-gray-400 block mb-2">Corner Radius</label>
            <input type="number" value={localValues.borderRadius} min={0}
              onChange={(e) => handleChange('borderRadius', Number(e.target.value))} className={inp} />
          </div>
        )}

        {/* Points (for star/polygon) */}
        {(selectedObject.type === 'star' || selectedObject.type === 'polygon') && (
          <div>
            <label className="text-xs text-gray-400 block mb-2">
              {selectedObject.type === 'star' ? 'Points' : 'Sides'}
            </label>
            <input type="number" value={localValues.points} min={3} max={20}
              onChange={(e) => handleChange('points', Number(e.target.value))} className={inp} />
          </div>
        )}

        {/* Fill */}
        {selectedObject.type !== 'group' && (
          <div>
            <label className="text-xs text-gray-400 block mb-2">Fill</label>
            <div className="flex items-center gap-2">
              <input type="color" value={localValues.fill}
                onChange={(e) => handleChange('fill', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 flex-shrink-0" />
              <input type="text" value={localValues.fill}
                onChange={(e) => handleChange('fill', e.target.value)} className={`flex-1 ${inp}`} />
            </div>
          </div>
        )}

        {/* Stroke */}
        {selectedObject.type !== 'group' && (
          <div>
            <label className="text-xs text-gray-400 block mb-2">Stroke</label>
            <div className="flex items-center gap-2">
              <input type="color" value={localValues.stroke}
                onChange={(e) => handleChange('stroke', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 flex-shrink-0" />
              <input type="text" value={localValues.stroke}
                onChange={(e) => handleChange('stroke', e.target.value)} className={`flex-1 ${inp}`} />
            </div>
            <div className="mt-1">
              <label className="text-xs text-gray-500">Width</label>
              <input type="number" value={localValues.strokeWidth} min={0}
                onChange={(e) => handleChange('strokeWidth', Number(e.target.value))} className={inp} />
            </div>
          </div>
        )}

        {/* Text */}
        {selectedObject.type === 'text' && (
          <div>
            <label className="text-xs text-gray-400 block mb-2">Text</label>
            <input type="text" value={localValues.text}
              onChange={(e) => handleChange('text', e.target.value)} className={inp} />
            <div className="mt-1">
              <label className="text-xs text-gray-500">Font Size</label>
              <input type="number" value={localValues.fontSize} min={1}
                onChange={(e) => handleChange('fontSize', Number(e.target.value))} className={inp} />
            </div>
          </div>
        )}

        {/* Opacity */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Opacity</label>
          <input type="range" value={localValues.opacity}
            onChange={(e) => handleChange('opacity', Number(e.target.value))}
            className="w-full" min={0} max={1} step={0.01} />
          <span className="text-xs text-gray-500">{Math.round(localValues.opacity * 100)}%</span>
        </div>

        {/* Info */}
        <div className="pt-2 border-t border-[#3e3e3e]">
          <p className="text-xs text-gray-500">Type: {selectedObject.type}</p>
          <p className="text-xs text-gray-500 truncate">ID: {selectedObject.id}</p>
        </div>
      </div>
    </div>
  );
}
