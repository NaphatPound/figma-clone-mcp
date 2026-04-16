'use client';

import { useEditorStore } from '@/lib/store';
import { useEffect, useRef, useCallback } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const {
    selectedIds, objects,
    copySelected, paste, duplicate, deleteSelected,
    groupSelected, ungroupSelected,
    enteredGroupId, moveOutOfGroup,
    bringToFront, sendToBack, bringForward, sendBackward,
    updateObject,
  } = useEditorStore();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    // Use a small delay so the opening right-click event doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick, true);
      document.addEventListener('keydown', handleKey, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, []); // empty deps — stable refs handle changing props

  const close = useCallback(() => onClose(), [onClose]);

  const hasSelection = selectedIds.length > 0;
  const hasMulti = selectedIds.length >= 2;
  const selectedObj = selectedIds.length === 1 ? objects.find(o => o.id === selectedIds[0]) : null;
  const isGroup = selectedObj?.type === 'group';
  const isChildOfGroup = enteredGroupId && selectedIds.length === 1 && (() => {
    const group = objects.find(o => o.id === enteredGroupId);
    return group?.children?.some(c => c.id === selectedIds[0]);
  })();

  const item = (label: string, shortcut: string, action: () => void, disabled = false) => (
    <button
      key={label}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => { action(); close(); }}
      disabled={disabled}
      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:bg-[#3e3e3e] disabled:opacity-30 disabled:cursor-not-allowed text-left"
    >
      <span>{label}</span>
      <span className="text-xs text-gray-500 ml-4">{shortcut}</span>
    </button>
  );

  let dividerCount = 0;
  const makeDivider = () => <div key={`divider-${dividerCount++}`} className="h-px bg-[#3e3e3e] my-1" />;

  return (
    <div ref={ref}
      className="fixed bg-[#2c2c2c] border border-[#3e3e3e] rounded-lg py-1 shadow-xl min-w-[200px]"
      style={{ left: x, top: y, zIndex: 200 }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {item('Copy', '\u2318C', copySelected, !hasSelection)}
      {item('Paste', '\u2318V', paste)}
      {item('Duplicate', '\u2318D', duplicate, !hasSelection)}
      {item('Delete', 'Del', deleteSelected, !hasSelection)}
      {makeDivider()}
      {item('Group', '\u2318G', groupSelected, !hasMulti)}
      {item('Ungroup', '\u2318\u21e7G', ungroupSelected, !isGroup)}
      {item('Move out of Group', '', () => { if (selectedIds[0]) moveOutOfGroup(selectedIds[0]); }, !isChildOfGroup)}
      {makeDivider()}
      {item('Bring to Front', '\u2318\u21e7]', bringToFront, !hasSelection)}
      {item('Bring Forward', '\u2318]', bringForward, !hasSelection)}
      {item('Send Backward', '\u2318[', sendBackward, !hasSelection)}
      {item('Send to Back', '\u2318\u21e7[', sendToBack, !hasSelection)}
      {makeDivider()}
      {item(
        selectedObj?.locked ? 'Unlock' : 'Lock', '',
        () => { if (selectedObj) updateObject(selectedObj.id, { locked: !selectedObj.locked }); },
        !selectedObj
      )}
      {item(
        selectedObj?.visible === false ? 'Show' : 'Hide', '',
        () => { if (selectedObj) updateObject(selectedObj.id, { visible: !selectedObj.visible }); },
        !selectedObj
      )}
    </div>
  );
}
