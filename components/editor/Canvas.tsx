'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';
import { DesignObject, SnapGuide } from '@/lib/types';
import { generateId, pointInRect, distance, rectsOverlap, computeSnapGuides, starPath, polygonPath, getRotatedPoint } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { ContextMenu } from './ContextMenu';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    currentTool, objects, selectedIds, canvas,
    addObject, updateObject, setSelectedIds, clearSelection,
    setIsDrawing, drawingStart, setDrawingStart,
    setCanvas, setCurrentTool,
    copySelected, paste, duplicate,
    groupSelected, ungroupSelected,
    enteredGroupId, setEnteredGroupId,
    undo, redo, saveToHistory,
    bringToFront, sendToBack, bringForward, sendBackward,
    zoomToFit, deleteSelected,
  } = useEditorStore();

  const [tempObject, setTempObject] = useState<DesignObject | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragObjectStarts, setDragObjectStarts] = useState<Record<string, { x: number; y: number }>>({});
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, objX: 0, objY: 0, rotation: 0 });
  const [rotateStart, setRotateStart] = useState({ angle: 0, objRotation: 0 });
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const nudgeHistorySaved = useRef(false);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to keep current values accessible in callbacks without stale closures
  const drawingStartRef = useRef(drawingStart);
  drawingStartRef.current = drawingStart;
  const currentToolRef = useRef(currentTool);
  currentToolRef.current = currentTool;

  const HANDLE_SIZE = 8 / canvas.scale;
  const HANDLE_HIT_SIZE = 16 / canvas.scale;

  // Helper to find the selected object — works for both top-level and group children.
  // Returns { obj, absX, absY } where absX/absY are absolute canvas coordinates.
  const findSelectedObj = useCallback((id: string): { obj: DesignObject; absX: number; absY: number } | null => {
    const top = objects.find(o => o.id === id);
    if (top) return { obj: top, absX: top.x, absY: top.y };
    if (enteredGroupId) {
      const group = objects.find(o => o.id === enteredGroupId);
      if (group?.children) {
        const child = group.children.find(c => c.id === id);
        if (child) return { obj: child, absX: group.x + child.x, absY: group.y + child.y };
      }
    }
    return null;
  }, [objects, enteredGroupId]);

  const screenToCanvas = useCallback((x: number, y: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (x - rect.left - canvas.offsetX) / canvas.scale,
      y: (y - rect.top - canvas.offsetY) / canvas.scale,
    };
  }, [canvas.scale, canvas.offsetX, canvas.offsetY]);

  // Track shift key
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Unrotate a canvas point into the object's local (axis-aligned) space.
  // Applies the inverse rotation matrix (transpose) to convert screen coords to local coords.
  const unrotatePoint = useCallback((px: number, py: number, obj: DesignObject, absX?: number, absY?: number) => {
    const ox = absX ?? obj.x, oy = absY ?? obj.y;
    if (!obj.rotation) return { x: px, y: py };
    const cx = ox + obj.width / 2, cy = oy + obj.height / 2;
    const rad = (obj.rotation * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return {
      x: cos * (px - cx) + sin * (py - cy) + cx,
      y: -sin * (px - cx) + cos * (py - cy) + cy,
    };
  }, []);

  // absX/absY: absolute position on canvas (for group children: group.x + child.x)
  const getResizeHandleAtPoint = useCallback((x: number, y: number, obj: DesignObject, absX?: number, absY?: number): ResizeHandle => {
    const ox = absX ?? obj.x, oy = absY ?? obj.y;
    // Unrotate the mouse point so we can check against axis-aligned handle positions
    const p = unrotatePoint(x, y, obj, ox, oy);
    const handles = [
      { name: 'nw' as const, x: ox, y: oy },
      { name: 'n' as const, x: ox + obj.width / 2, y: oy },
      { name: 'ne' as const, x: ox + obj.width, y: oy },
      { name: 'e' as const, x: ox + obj.width, y: oy + obj.height / 2 },
      { name: 'se' as const, x: ox + obj.width, y: oy + obj.height },
      { name: 's' as const, x: ox + obj.width / 2, y: oy + obj.height },
      { name: 'sw' as const, x: ox, y: oy + obj.height },
      { name: 'w' as const, x: ox, y: oy + obj.height / 2 },
    ];
    for (const h of handles) {
      if (distance(p.x, p.y, h.x, h.y) <= HANDLE_HIT_SIZE) return h.name;
    }
    return null;
  }, [HANDLE_HIT_SIZE, unrotatePoint]);

  // Check rotation handle hit (circle above top-center)
  const isOnRotationHandle = useCallback((x: number, y: number, obj: DesignObject, absX?: number, absY?: number): boolean => {
    const ox = absX ?? obj.x, oy = absY ?? obj.y;
    const p = unrotatePoint(x, y, obj, ox, oy);
    const handleY = oy - 30 / canvas.scale;
    const handleX = ox + obj.width / 2;
    return distance(p.x, p.y, handleX, handleY) <= HANDLE_HIT_SIZE;
  }, [canvas.scale, HANDLE_HIT_SIZE, unrotatePoint]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return; // right-click handled separately
    setContextMenu(null);
    if (editingTextId) { setEditingTextId(null); }
    const point = screenToCanvas(e.clientX, e.clientY);

    if (currentTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvas.offsetX, y: e.clientY - canvas.offsetY });
      return;
    }
    if (currentTool === 'image') { fileInputRef.current?.click(); return; }

    if (currentTool === 'select') {
      // Check rotation handle (works for both top-level and group children)
      if (selectedIds.length === 1) {
        const found = findSelectedObj(selectedIds[0]);
        if (found && !found.obj.locked && isOnRotationHandle(point.x, point.y, found.obj, found.absX, found.absY)) {
          const cx = found.absX + found.obj.width / 2;
          const cy = found.absY + found.obj.height / 2;
          const angle = Math.atan2(point.y - cy, point.x - cx);
          setIsRotating(true);
          setRotateStart({ angle, objRotation: found.obj.rotation });
          saveToHistory();
          return;
        }
      }

      // Check resize handles (works for both top-level and group children)
      if (selectedIds.length === 1) {
        const found = findSelectedObj(selectedIds[0]);
        if (found && !found.obj.locked) {
          const handle = getResizeHandleAtPoint(point.x, point.y, found.obj, found.absX, found.absY);
          if (handle) {
            saveToHistory();
            setIsResizing(true);
            setResizeHandle(handle);
            setResizeStart({ x: point.x, y: point.y, width: found.obj.width, height: found.obj.height, objX: found.obj.x, objY: found.obj.y, rotation: found.obj.rotation || 0 });
            return;
          }
        }
      }

      // Inside a group — handle child selection/drag
      if (enteredGroupId) {
        const group = objects.find(o => o.id === enteredGroupId);
        if (group?.children) {
          const clickedChild = [...group.children].reverse().find(child =>
            child.visible && !child.locked &&
            pointInRect(point.x, point.y, group.x + child.x, group.y + child.y, child.width, child.height)
          );
          if (clickedChild) {
            if (e.shiftKey) {
              const newSelected = selectedIds.includes(clickedChild.id)
                ? selectedIds.filter(id => id !== clickedChild.id)
                : [...selectedIds, clickedChild.id];
              setSelectedIds(newSelected);
            } else {
              const newSelected = selectedIds.includes(clickedChild.id) ? selectedIds : [clickedChild.id];
              setSelectedIds(newSelected);
              saveToHistory();
              setIsDragging(true);
              setDragStart(point);
              const starts: Record<string, { x: number; y: number }> = {};
              for (const id of newSelected) {
                const c = group.children.find(ch => ch.id === id);
                if (c) starts[c.id] = { x: c.x, y: c.y };
              }
              setDragObjectStarts(starts);
            }
            return;
          }
          // Click inside group area but not on a child — deselect
          if (pointInRect(point.x, point.y, group.x, group.y, group.width, group.height)) {
            clearSelection();
            return;
          }
        }
        // Click outside the group — exit group mode
        setEnteredGroupId(null);
      }

      // Check object click
      const clicked = [...objects].reverse().find(obj => {
        if (obj.locked || !obj.visible) return false;
        return pointInRect(point.x, point.y, obj.x, obj.y, obj.width, obj.height);
      });

      if (clicked) {
        if (e.shiftKey) {
          // Shift-click: toggle selection only, no drag
          const newSelected = selectedIds.includes(clicked.id)
            ? selectedIds.filter(id => id !== clicked.id)
            : [...selectedIds, clicked.id];
          setSelectedIds(newSelected);
        } else {
          // Normal click: select and prepare to drag
          const newSelected = selectedIds.includes(clicked.id) ? selectedIds : [clicked.id];
          setSelectedIds(newSelected);
          saveToHistory();
          setIsDragging(true);
          setDragStart(point);
          const starts: Record<string, { x: number; y: number }> = {};
          for (const id of newSelected) {
            const obj = objects.find(o => o.id === id);
            if (obj) starts[obj.id] = { x: obj.x, y: obj.y };
          }
          setDragObjectStarts(starts);
        }
      } else {
        // Start marquee selection
        if (!e.shiftKey) clearSelection();
        setIsMarquee(true);
        setMarqueeStart(point);
        setMarqueeRect(null);
      }
      return;
    }

    // Drawing tools
    setIsDrawing(true);
    setDrawingStart(point);
  }, [currentTool, screenToCanvas, objects, selectedIds, setSelectedIds, clearSelection, setIsDrawing, setDrawingStart, canvas.offsetX, canvas.offsetY, getResizeHandleAtPoint, saveToHistory, editingTextId, isOnRotationHandle, enteredGroupId, setEnteredGroupId, findSelectedObj]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (isPanning) {
      setCanvas({ offsetX: e.clientX - panStart.x, offsetY: e.clientY - panStart.y });
      return;
    }

    if (isRotating && selectedIds.length === 1) {
      const found = findSelectedObj(selectedIds[0]);
      if (found) {
        const cx = found.absX + found.obj.width / 2;
        const cy = found.absY + found.obj.height / 2;
        const angle = Math.atan2(point.y - cy, point.x - cx);
        let deg = rotateStart.objRotation + ((angle - rotateStart.angle) * 180) / Math.PI;
        if (shiftHeld) deg = Math.round(deg / 15) * 15; // snap to 15 degrees
        updateObject(found.obj.id, { rotation: deg });
      }
      return;
    }

    if (isMarquee) {
      const x = Math.min(marqueeStart.x, point.x);
      const y = Math.min(marqueeStart.y, point.y);
      const w = Math.abs(point.x - marqueeStart.x);
      const h = Math.abs(point.y - marqueeStart.y);
      setMarqueeRect({ x, y, w, h });
      // Update selection based on marquee intersection
      const ids = objects.filter(obj =>
        obj.visible && !obj.locked && rectsOverlap(x, y, w, h, obj.x, obj.y, obj.width, obj.height)
      ).map(o => o.id);
      setSelectedIds(ids);
      return;
    }

    if (isResizing && selectedIds.length === 1 && resizeHandle) {
      const found = findSelectedObj(selectedIds[0]);
      const obj = found?.obj;
      if (obj && !obj.locked) {
        // Compute delta in the object's local (unrotated) coordinate space
        const rad = resizeStart.rotation * Math.PI / 180;
        const cosN = Math.cos(-rad), sinN = Math.sin(-rad);
        const rawDx = point.x - resizeStart.x;
        const rawDy = point.y - resizeStart.y;
        const dx = cosN * rawDx - sinN * rawDy;
        const dy = sinN * rawDx + cosN * rawDy;

        let newW = resizeStart.width, newH = resizeStart.height;
        const minSize = 10;
        const aspectRatio = resizeStart.width / resizeStart.height;

        // Compute new dimensions from local-space delta
        switch (resizeHandle) {
          case 'se': newW = resizeStart.width + dx; newH = resizeStart.height + dy; break;
          case 'e': newW = resizeStart.width + dx; break;
          case 's': newH = resizeStart.height + dy; break;
          case 'nw': newW = resizeStart.width - dx; newH = resizeStart.height - dy; break;
          case 'n': newH = resizeStart.height - dy; break;
          case 'ne': newW = resizeStart.width + dx; newH = resizeStart.height - dy; break;
          case 'sw': newW = resizeStart.width - dx; newH = resizeStart.height + dy; break;
          case 'w': newW = resizeStart.width - dx; break;
        }
        newW = Math.max(minSize, newW);
        newH = Math.max(minSize, newH);

        // Aspect ratio lock with shift
        if (shiftHeld && ['nw', 'ne', 'se', 'sw'].includes(resizeHandle)) {
          if (newW / newH > aspectRatio) newW = newH * aspectRatio;
          else newH = newW / aspectRatio;
        }

        // Anchor-pinning: keep the opposite point fixed in world space.
        // Each handle has an anchor (the opposite side) expressed as a fraction of size.
        const anchors: Record<string, [number, number]> = {
          nw: [1, 1], n: [0.5, 1], ne: [0, 1], e: [0, 0.5],
          se: [0, 0], s: [0.5, 0], sw: [1, 0], w: [1, 0.5],
        };
        const [fx, fy] = anchors[resizeHandle];
        const cosA = Math.cos(rad), sinA = Math.sin(rad);

        // Old anchor position in world space
        const oldCx = resizeStart.objX + resizeStart.width / 2;
        const oldCy = resizeStart.objY + resizeStart.height / 2;
        const oldAx = cosA * (fx - 0.5) * resizeStart.width - sinA * (fy - 0.5) * resizeStart.height + oldCx;
        const oldAy = sinA * (fx - 0.5) * resizeStart.width + cosA * (fy - 0.5) * resizeStart.height + oldCy;

        // Where anchor would land with (startX, startY) + new dimensions
        const tmpCx = resizeStart.objX + newW / 2;
        const tmpCy = resizeStart.objY + newH / 2;
        const tmpAx = cosA * (fx - 0.5) * newW - sinA * (fy - 0.5) * newH + tmpCx;
        const tmpAy = sinA * (fx - 0.5) * newW + cosA * (fy - 0.5) * newH + tmpCy;

        // Correct position so anchor stays in place
        const newX = resizeStart.objX + (oldAx - tmpAx);
        const newY = resizeStart.objY + (oldAy - tmpAy);

        updateObject(obj.id, { x: newX, y: newY, width: newW, height: newH });
      }
      return;
    }

    if (isDragging && selectedIds.length > 0) {
      let dx = point.x - dragStart.x;
      let dy = point.y - dragStart.y;

      // Snap guides only for top-level objects (not children inside groups)
      if (!enteredGroupId) {
        const first = dragObjectStarts[selectedIds[0]];
        if (first) {
          const selected = selectedIds.map(id => {
            const s = dragObjectStarts[id];
            const obj = objects.find(o => o.id === id);
            return obj && s ? { ...obj, x: s.x + dx, y: s.y + dy } : null;
          }).filter(Boolean) as DesignObject[];
          if (selected.length > 0) {
            const bbox = {
              x: Math.min(...selected.map(o => o.x)),
              y: Math.min(...selected.map(o => o.y)),
              width: Math.max(...selected.map(o => o.x + o.width)) - Math.min(...selected.map(o => o.x)),
              height: Math.max(...selected.map(o => o.y + o.height)) - Math.min(...selected.map(o => o.y)),
            };
            const { guides, snapDx, snapDy } = computeSnapGuides(selectedIds, objects, bbox);
            dx += snapDx;
            dy += snapDy;
            setSnapGuides(guides);
          }
        }
      }

      // Find objects to move — works for both top-level and group children
      selectedIds.forEach(id => {
        const start = dragObjectStarts[id];
        if (!start) return;
        // For children inside a group, the recursive updateObject handles it
        let found = objects.find(o => o.id === id);
        if (!found && enteredGroupId) {
          const group = objects.find(o => o.id === enteredGroupId);
          found = group?.children?.find(c => c.id === id);
        }
        if (found && !found.locked) {
          updateObject(id, { x: start.x + dx, y: start.y + dy });
        }
      });
      return;
    }

    if (drawingStart) {
      const width = point.x - drawingStart.x;
      const height = point.y - drawingStart.y;
      const toolToType = (tool: string): DesignObject['type'] => {
        switch (tool) {
          case 'rectangle': return 'rectangle'; case 'ellipse': return 'ellipse';
          case 'line': return 'line'; case 'frame': return 'frame';
          case 'text': return 'text'; case 'star': return 'star';
          case 'polygon': return 'polygon'; default: return 'rectangle';
        }
      };
      const newObject: DesignObject = {
        id: generateId(), type: toolToType(currentTool),
        x: width < 0 ? point.x : drawingStart.x, y: height < 0 ? point.y : drawingStart.y,
        width: Math.abs(width), height: Math.abs(height), rotation: 0,
        fill: currentTool === 'frame' ? '#ffffff' : currentTool === 'text' ? '#ffffff' : currentTool === 'line' ? 'none' : '#0d99ff',
        stroke: currentTool === 'frame' ? '#cccccc' : currentTool === 'line' ? '#ffffff' : '#000000',
        strokeWidth: currentTool === 'frame' ? 1 : currentTool === 'line' ? 2 : 0, opacity: 1,
        name: `${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}`,
        visible: true, locked: false,
        text: currentTool === 'text' ? 'Text' : undefined,
        fontSize: currentTool === 'text' ? 16 : undefined,
        points: currentTool === 'star' ? 5 : currentTool === 'polygon' ? 6 : undefined,
      };
      setTempObject(newObject);
    }

    // Cursor for resize handles — rotates with the object's angle
    if (currentTool === 'select' && selectedIds.length === 1 && !isDragging && !isResizing && !isRotating) {
      const found = findSelectedObj(selectedIds[0]);
      if (found && !found.obj.locked) {
        if (isOnRotationHandle(point.x, point.y, found.obj, found.absX, found.absY)) {
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
          return;
        }
        const handle = getResizeHandleAtPoint(point.x, point.y, found.obj, found.absX, found.absY);
        if (handle && canvasRef.current) {
          // Base angle for each handle (degrees, clockwise from north)
          const baseAngles: Record<string, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
          // 4 cursor types cycling every 45°
          const cursorCycle = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];
          const angle = ((baseAngles[handle] + (found.obj.rotation || 0)) % 360 + 360) % 360;
          const idx = Math.round(angle / 45) % 4;
          canvasRef.current.style.cursor = cursorCycle[idx];
        } else if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
      }
    }
  }, [isPanning, panStart, isRotating, rotateStart, shiftHeld, isMarquee, marqueeStart, isResizing, selectedIds, resizeHandle, objects, resizeStart, updateObject, isDragging, drawingStart, currentTool, screenToCanvas, setCanvas, dragStart, dragObjectStarts, getResizeHandleAtPoint, isOnRotationHandle, setSelectedIds, enteredGroupId, findSelectedObj]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanning) { setIsPanning(false); return; }
    if (isRotating) { setIsRotating(false); return; }
    if (isDragging) { setIsDragging(false); setDragObjectStarts({}); setSnapGuides([]); return; }
    if (isResizing) { setIsResizing(false); setResizeHandle(null); return; }
    if (isMarquee) { setIsMarquee(false); setMarqueeRect(null); return; }

    // Use refs to get fresh values (avoids stale closure on fast click)
    const ds = drawingStartRef.current;
    const ct = currentToolRef.current;

    if (ds && ct !== 'select' && ct !== 'hand' && ct !== 'image') {
      const point = screenToCanvas(e.clientX, e.clientY);
      const w = Math.abs(point.x - ds.x);
      const h = Math.abs(point.y - ds.y);

      const toolToType = (tool: string): DesignObject['type'] => {
        switch (tool) {
          case 'rectangle': return 'rectangle'; case 'ellipse': return 'ellipse';
          case 'line': return 'line'; case 'frame': return 'frame';
          case 'text': return 'text'; case 'star': return 'star';
          case 'polygon': return 'polygon'; default: return 'rectangle';
        }
      };

      // Use tempObject if user dragged enough, otherwise create default-sized object on click
      const finalObj = (tempObject && w > 2 && h > 2) ? tempObject : {
        id: generateId(), type: toolToType(ct),
        x: ds.x, y: ds.y,
        width: 100, height: ct === 'line' ? 100 : 100,
        rotation: 0,
        fill: ct === 'frame' ? '#ffffff' : ct === 'text' ? '#ffffff' : '#0d99ff',
        stroke: ct === 'frame' ? '#cccccc' : ct === 'line' ? '#ffffff' : '#000000',
        strokeWidth: ct === 'frame' ? 1 : ct === 'line' ? 2 : 0,
        opacity: 1, name: ct.charAt(0).toUpperCase() + ct.slice(1),
        visible: true, locked: false,
        text: ct === 'text' ? 'Text' : undefined,
        fontSize: ct === 'text' ? 16 : undefined,
        points: ct === 'star' ? 5 : ct === 'polygon' ? 6 : undefined,
      } as DesignObject;

      addObject(finalObj);
      setSelectedIds([finalObj.id]);
      // Don't auto-switch to select — let user keep drawing
      setTempObject(null);
    } else if (tempObject) {
      addObject(tempObject);
      setSelectedIds([tempObject.id]);
      setTempObject(null);
    }

    setIsDrawing(false);
    setDrawingStart(null);
  }, [isPanning, isRotating, isDragging, isResizing, isMarquee, tempObject, setIsDrawing, setDrawingStart, addObject, setSelectedIds, screenToCanvas]);

  // Double-click to enter group or edit text
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (currentTool !== 'select') return;
    const point = screenToCanvas(e.clientX, e.clientY);

    // If inside a group, check for text children to edit
    if (enteredGroupId) {
      const group = objects.find(o => o.id === enteredGroupId);
      if (group?.children) {
        const child = [...group.children].reverse().find(c =>
          c.type === 'text' && c.visible && !c.locked &&
          pointInRect(point.x, point.y, group.x + c.x, group.y + c.y, c.width, c.height || 30)
        );
        if (child) {
          setEditingTextId(child.id);
          setSelectedIds([child.id]);
          setTimeout(() => textInputRef.current?.focus(), 50);
        }
      }
      return;
    }

    // Check for group to enter
    const clickedGroup = [...objects].reverse().find(obj =>
      obj.type === 'group' && obj.visible && !obj.locked &&
      pointInRect(point.x, point.y, obj.x, obj.y, obj.width, obj.height)
    );
    if (clickedGroup && clickedGroup.children) {
      setEnteredGroupId(clickedGroup.id);
      // Select the child under the cursor
      const child = [...clickedGroup.children].reverse().find(c =>
        c.visible && !c.locked &&
        pointInRect(point.x, point.y, clickedGroup.x + c.x, clickedGroup.y + c.y, c.width, c.height)
      );
      setSelectedIds(child ? [child.id] : []);
      return;
    }

    // Check for text to edit
    const clicked = [...objects].reverse().find(obj =>
      obj.type === 'text' && obj.visible && !obj.locked &&
      pointInRect(point.x, point.y, obj.x, obj.y, obj.width, obj.height || 30)
    );
    if (clicked) {
      setEditingTextId(clicked.id);
      setSelectedIds([clicked.id]);
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [currentTool, objects, screenToCanvas, setSelectedIds, enteredGroupId, setEnteredGroupId]);

  // Right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const point = screenToCanvas(e.clientX, e.clientY);
    // Select object under cursor if not already selected
    const clicked = [...objects].reverse().find(obj =>
      obj.visible && !obj.locked && pointInRect(point.x, point.y, obj.x, obj.y, obj.width, obj.height)
    );
    if (clicked && !selectedIds.includes(clicked.id)) {
      setSelectedIds([clicked.id]);
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [objects, selectedIds, setSelectedIds, screenToCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta) {
        switch (e.key.toLowerCase()) {
          case 'c': e.preventDefault(); copySelected(); return;
          case 'v': e.preventDefault(); paste(); return;
          case 'd': e.preventDefault(); duplicate(); return;
          case 'g': e.preventDefault(); e.shiftKey ? ungroupSelected() : groupSelected(); return;
          case 'z': e.preventDefault(); e.shiftKey ? redo() : undo(); return;
          case ']': e.preventDefault(); e.shiftKey ? bringToFront() : bringForward(); return;
          case '[': e.preventDefault(); e.shiftKey ? sendToBack() : sendBackward(); return;
          case '1': e.preventDefault(); {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) zoomToFit(rect.width, rect.height);
          } return;
        }
      }

      // Arrow key nudge — save history once per nudge session (not per keypress)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        if (!nudgeHistorySaved.current) {
          saveToHistory();
          nudgeHistorySaved.current = true;
        }
        if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => { nudgeHistorySaved.current = false; }, 500);

        const nudge = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -nudge : e.key === 'ArrowRight' ? nudge : 0;
        const dy = e.key === 'ArrowUp' ? -nudge : e.key === 'ArrowDown' ? nudge : 0;
        selectedIds.forEach(id => {
          let o = objects.find(x => x.id === id);
          if (!o && enteredGroupId) {
            const group = objects.find(x => x.id === enteredGroupId);
            o = group?.children?.find(c => c.id === id);
          }
          if (o && !o.locked) updateObject(id, { x: o.x + dx, y: o.y + dy });
        });
        return;
      }

      // Tool shortcuts (only when no modifier key held)
      if (!meta) {
        switch (e.key.toLowerCase()) {
          case 'v': setCurrentTool('select'); break;
          case 'r': setCurrentTool('rectangle'); break;
          case 'o': setCurrentTool('ellipse'); break;
          case 'l': setCurrentTool('line'); break;
          case 't': setCurrentTool('text'); break;
          case 'h': case ' ': e.preventDefault(); setCurrentTool('hand'); break;
          case 'f': setCurrentTool('frame'); break;
          case 's': setCurrentTool('star'); break;
          case 'p': setCurrentTool('polygon'); break;
          case 'escape':
            if (enteredGroupId) { setEnteredGroupId(null); clearSelection(); }
            else { clearSelection(); }
            setEditingTextId(null); setContextMenu(null);
            break;
          case 'delete': case 'backspace':
            e.preventDefault();
            deleteSelected();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, objects, setCurrentTool, deleteSelected, copySelected, paste, duplicate, groupSelected, ungroupSelected, undo, redo, bringToFront, sendToBack, bringForward, sendBackward, clearSelection, zoomToFit, saveToHistory, updateObject, enteredGroupId, setEnteredGroupId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newScale = Math.min(Math.max(canvas.scale * delta, 0.1), 10);
    setCanvas({
      scale: newScale,
      offsetX: mouseX - (mouseX - canvas.offsetX) * (newScale / canvas.scale),
      offsetY: mouseY - (mouseY - canvas.offsetY) * (newScale / canvas.scale),
    });
  }, [canvas.scale, canvas.offsetX, canvas.offsetY, setCanvas]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const maxSize = 300;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) { const r = Math.min(maxSize / w, maxSize / h); w *= r; h *= r; }
        const newObj: DesignObject = {
          id: generateId(), type: 'image', x: 100, y: 100, width: w, height: h,
          rotation: 0, fill: '#000000', stroke: '#000000', strokeWidth: 0,
          opacity: 1, name: file.name, visible: true, locked: false,
          src: event.target?.result as string,
        };
        addObject(newObj);
        setSelectedIds([newObj.id]);
        setCurrentTool('select');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [addObject, setSelectedIds, setCurrentTool]);

  // Rendering — handles rotate with the object
  const renderResizeHandles = (obj: DesignObject, absX?: number, absY?: number) => {
    if (!selectedIds.includes(obj.id) || obj.locked) return null;
    const ox = absX ?? obj.x, oy = absY ?? obj.y;
    const handles = [
      { name: 'nw', x: ox, y: oy }, { name: 'n', x: ox + obj.width / 2, y: oy },
      { name: 'ne', x: ox + obj.width, y: oy }, { name: 'e', x: ox + obj.width, y: oy + obj.height / 2 },
      { name: 'se', x: ox + obj.width, y: oy + obj.height }, { name: 's', x: ox + obj.width / 2, y: oy + obj.height },
      { name: 'sw', x: ox, y: oy + obj.height }, { name: 'w', x: ox, y: oy + obj.height / 2 },
    ];
    const hs = HANDLE_SIZE, half = hs / 2;
    const rotHandleY = oy - 30 / canvas.scale;
    const rotHandleX = ox + obj.width / 2;
    // Rotate the entire handles group around the object's center
    const cx = ox + obj.width / 2, cy = oy + obj.height / 2;
    const rotation = obj.rotation || 0;
    return (
      <g className="resize-handles" transform={`rotate(${rotation} ${cx} ${cy})`}>
        <rect x={ox - 2} y={oy - 2} width={obj.width + 4} height={obj.height + 4}
          fill="none" stroke="#0d99ff" strokeWidth={2 / canvas.scale} pointerEvents="none" />
        {handles.map(h => (
          <rect key={h.name} x={h.x - half} y={h.y - half} width={hs} height={hs}
            fill="white" stroke="#0d99ff" strokeWidth={2 / canvas.scale} className="hover:fill-[#0d99ff]" />
        ))}
        {/* Rotation handle */}
        <line x1={ox + obj.width / 2} y1={oy} x2={rotHandleX} y2={rotHandleY}
          stroke="#0d99ff" strokeWidth={1 / canvas.scale} pointerEvents="none" />
        <circle cx={rotHandleX} cy={rotHandleY} r={4 / canvas.scale}
          fill="white" stroke="#0d99ff" strokeWidth={2 / canvas.scale} style={{ cursor: 'grab' }} />
      </g>
    );
  };

  // Multi-select bounding box
  const renderMultiSelectBBox = () => {
    if (selectedIds.length < 2) return null;
    const selected = objects.filter(o => selectedIds.includes(o.id));
    if (selected.length < 2) return null;
    const minX = Math.min(...selected.map(o => o.x));
    const minY = Math.min(...selected.map(o => o.y));
    const maxX = Math.max(...selected.map(o => o.x + o.width));
    const maxY = Math.max(...selected.map(o => o.y + o.height));
    return (
      <rect x={minX - 2} y={minY - 2} width={maxX - minX + 4} height={maxY - minY + 4}
        fill="none" stroke="#0d99ff" strokeWidth={1.5 / canvas.scale}
        strokeDasharray={`${4 / canvas.scale} ${3 / canvas.scale}`} pointerEvents="none" />
    );
  };

  const renderObject = (obj: DesignObject): React.ReactNode => {
    if (!obj.visible) return null;
    const transform = `translate(${obj.x}, ${obj.y}) rotate(${obj.rotation} ${obj.width / 2} ${obj.height / 2})`;

    if (obj.type === 'group' && obj.children) {
      return (
        <g key={obj.id} transform={transform} opacity={obj.opacity}>
          {obj.children.map(child => renderObject({ ...child, visible: obj.visible && child.visible }))}
          {selectedIds.includes(obj.id) && (
            <rect width={obj.width} height={obj.height} fill="none" stroke="#0d99ff"
              strokeWidth={1 / canvas.scale} strokeDasharray={`${4 / canvas.scale} ${4 / canvas.scale}`} pointerEvents="none" />
          )}
        </g>
      );
    }

    let shape = null;
    switch (obj.type) {
      case 'rectangle':
        shape = <rect width={obj.width} height={obj.height} fill={obj.fill} stroke={obj.stroke}
          strokeWidth={obj.strokeWidth} opacity={obj.opacity} rx={obj.borderRadius || 0} />;
        break;
      case 'frame':
        shape = (<>
          <rect width={obj.width} height={obj.height} fill={obj.fill} stroke={obj.stroke}
            strokeWidth={obj.strokeWidth} opacity={obj.opacity} />
          <text x={0} y={-6} fill="#a0a0a0" fontSize={12 / canvas.scale} pointerEvents="none">{obj.name}</text>
        </>);
        break;
      case 'ellipse':
        shape = <ellipse cx={obj.width / 2} cy={obj.height / 2} rx={obj.width / 2} ry={obj.height / 2}
          fill={obj.fill} stroke={obj.stroke} strokeWidth={obj.strokeWidth} opacity={obj.opacity} />;
        break;
      case 'line':
        shape = <line x1={0} y1={0} x2={obj.width} y2={obj.height}
          stroke={obj.stroke || '#ffffff'} strokeWidth={obj.strokeWidth || 2} opacity={obj.opacity} />;
        break;
      case 'text':
        shape = <text x={0} y={obj.fontSize || 16} fill={obj.fill || '#ffffff'}
          fontSize={obj.fontSize || 16} opacity={obj.opacity}>{obj.text || 'Text'}</text>;
        break;
      case 'star': {
        const cx = obj.width / 2, cy = obj.height / 2;
        const outerR = Math.min(obj.width, obj.height) / 2;
        const d = starPath(cx, cy, outerR, outerR * 0.4, obj.points || 5);
        shape = <path d={d} fill={obj.fill} stroke={obj.stroke} strokeWidth={obj.strokeWidth} opacity={obj.opacity} />;
        break;
      }
      case 'polygon': {
        const cx = obj.width / 2, cy = obj.height / 2;
        const r = Math.min(obj.width, obj.height) / 2;
        const d = polygonPath(cx, cy, r, obj.points || 6);
        shape = <path d={d} fill={obj.fill} stroke={obj.stroke} strokeWidth={obj.strokeWidth} opacity={obj.opacity} />;
        break;
      }
      case 'image':
        shape = (
          <foreignObject width={obj.width} height={obj.height}>
            <img src={obj.src} alt={obj.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: obj.opacity, pointerEvents: 'none' }}
              draggable={false} />
          </foreignObject>
        );
        break;
    }
    return <g key={obj.id} transform={transform}>{shape}</g>;
  };

  const allObjects = [...objects, ...(tempObject ? [tempObject] : [])];

  return (
    <div ref={canvasRef}
      className={`flex-1 bg-[#1e1e1e] overflow-hidden relative ${currentTool === 'hand' ? 'pan-mode' : currentTool === 'select' ? 'select-mode' : ''}`}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp} onWheel={handleWheel}
      onPointerLeave={() => {
        if (isPanning) setIsPanning(false);
        if (isDragging) { setIsDragging(false); setDragObjectStarts({}); setSnapGuides([]); }
        if (isResizing) { setIsResizing(false); setResizeHandle(null); }
        if (isRotating) setIsRotating(false);
        if (isMarquee) { setIsMarquee(false); setMarqueeRect(null); }
      }}
      onDoubleClick={handleDoubleClick} onContextMenu={handleContextMenu}
      style={{ cursor: currentTool === 'hand' ? 'grab' : currentTool === 'select' ? 'default' : 'crosshair' }}
    >
      <svg ref={svgRef} width="100%" height="100%"
        style={{ transformOrigin: '0 0', transform: `scale(${canvas.scale}) translate(${canvas.offsetX / canvas.scale}px, ${canvas.offsetY / canvas.scale}px)` }}
        pointerEvents="none">
        <defs>
          <pattern id="grid" width={20} height={20} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.5} fill="#3e3e3e" />
          </pattern>
        </defs>
        <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid)" pointerEvents="none" />

        {allObjects.map(renderObject)}

        {/* Resize + rotation handles for top-level objects */}
        {!enteredGroupId && objects.filter(obj => selectedIds.includes(obj.id) && !obj.locked && selectedIds.length === 1).map(obj => (
          <React.Fragment key={obj.id}>{renderResizeHandles(obj)}</React.Fragment>
        ))}

        {/* Entered group boundary + resize/rotate handles for selected children */}
        {enteredGroupId && (() => {
          const group = objects.find(o => o.id === enteredGroupId);
          if (!group) return null;
          return (
            <>
              <rect x={group.x - 1} y={group.y - 1} width={group.width + 2} height={group.height + 2}
                fill="none" stroke="#0d99ff" strokeWidth={1.5 / canvas.scale}
                strokeDasharray={`${6 / canvas.scale} ${3 / canvas.scale}`}
                pointerEvents="none" opacity={0.5} />
              {group.children?.filter(c => selectedIds.includes(c.id)).map(child => (
                <React.Fragment key={`sel-${child.id}`}>
                  {selectedIds.length === 1 && !child.locked
                    ? renderResizeHandles(child, group.x + child.x, group.y + child.y)
                    : <rect
                        x={group.x + child.x - 1} y={group.y + child.y - 1}
                        width={child.width + 2} height={child.height + 2}
                        fill="none" stroke="#0d99ff" strokeWidth={2 / canvas.scale}
                        pointerEvents="none" />
                  }
                </React.Fragment>
              ))}
            </>
          );
        })()}

        {/* Multi-select bounding box */}
        {renderMultiSelectBBox()}

        {/* Snap guides */}
        {snapGuides.map((g, i) =>
          g.type === 'vertical' ? (
            <line key={`sg${i}`} x1={g.position} y1={-10000} x2={g.position} y2={10000}
              stroke="#ff6b6b" strokeWidth={1 / canvas.scale} strokeDasharray={`${3 / canvas.scale} ${3 / canvas.scale}`} pointerEvents="none" />
          ) : (
            <line key={`sg${i}`} x1={-10000} y1={g.position} x2={10000} y2={g.position}
              stroke="#ff6b6b" strokeWidth={1 / canvas.scale} strokeDasharray={`${3 / canvas.scale} ${3 / canvas.scale}`} pointerEvents="none" />
          )
        )}

        {/* Marquee selection rect */}
        {marqueeRect && (
          <rect x={marqueeRect.x} y={marqueeRect.y} width={marqueeRect.w} height={marqueeRect.h}
            fill="rgba(13,153,255,0.1)" stroke="#0d99ff" strokeWidth={1 / canvas.scale} pointerEvents="none" />
        )}
      </svg>

      {/* Inline text editing overlay */}
      {editingTextId && (() => {
        const found = findSelectedObj(editingTextId);
        if (!found) return null;
        const obj = found.obj;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const left = found.absX * canvas.scale + canvas.offsetX + rect.left;
        const top = found.absY * canvas.scale + canvas.offsetY + rect.top;
        return (
          <input ref={textInputRef} type="text" value={obj.text || ''}
            onChange={(e) => updateObject(obj.id, { text: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTextId(null); }}
            onBlur={() => setEditingTextId(null)}
            className="fixed bg-transparent text-white outline-none border border-[#0d99ff] px-1"
            style={{
              left: `${left}px`, top: `${top}px`,
              fontSize: `${(obj.fontSize || 16) * canvas.scale}px`,
              width: `${Math.max(obj.width * canvas.scale, 100)}px`,
              zIndex: 100,
            }}
          />
        );
      })()}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-[#2c2c2c] px-3 py-2 rounded-md text-sm text-gray-400">
        {Math.round(canvas.scale * 100)}%
      </div>

      {currentTool === 'image' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="bg-[#2c2c2c] px-6 py-4 rounded-lg text-center">
            <Upload size={32} className="mx-auto mb-2 text-gray-400" />
            <p className="text-white">Click to upload an image</p>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
