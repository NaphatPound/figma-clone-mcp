import { create } from 'zustand';
import { DesignObject, ToolType, CanvasState } from './types';
import { generateId } from './utils';

const STORAGE_KEY = 'figma-clone-project';

interface EditorState {
  currentTool: ToolType;
  setCurrentTool: (tool: ToolType) => void;
  objects: DesignObject[];
  selectedIds: string[];
  addObject: (object: DesignObject) => void;
  updateObject: (id: string, updates: Partial<DesignObject>) => void;
  deleteSelected: () => void;
  deleteObject: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  reorderObjects: (objects: DesignObject[]) => void;
  canvas: CanvasState;
  setCanvas: (canvas: Partial<CanvasState>) => void;
  isDrawing: boolean;
  drawingStart: { x: number; y: number } | null;
  setIsDrawing: (isDrawing: boolean) => void;
  setDrawingStart: (start: { x: number; y: number } | null) => void;
  history: DesignObject[][];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  clipboard: DesignObject[];
  copySelected: () => void;
  paste: () => void;
  duplicate: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  enteredGroupId: string | null;
  setEnteredGroupId: (id: string | null) => void;
  moveOutOfGroup: (childId: string) => void;
  alignObjects: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeObjects: (axis: 'horizontal' | 'vertical') => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  zoomToFit: (canvasWidth: number, canvasHeight: number) => void;
  saveToFile: () => void;
  loadFromFile: (json: string) => void;
}

function save(objects: DesignObject[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(objects)); } catch { /* */ }
}

function load(): DesignObject[] {
  if (typeof window === 'undefined') return [];
  try { const d = localStorage.getItem(STORAGE_KEY); if (d) return JSON.parse(d); } catch { /* */ }
  return [];
}

function deepClone(obj: DesignObject): DesignObject {
  const c = { ...obj };
  if (obj.children) c.children = obj.children.map(deepClone);
  return c;
}

function cloneNewIds(objects: DesignObject[]): DesignObject[] {
  return objects.map(obj => {
    const c: DesignObject = { ...obj, id: generateId() };
    if (obj.children) c.children = cloneNewIds(obj.children);
    return c;
  });
}

function bbox(objects: DesignObject[]) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const o of objects) { x1 = Math.min(x1, o.x); y1 = Math.min(y1, o.y); x2 = Math.max(x2, o.x + o.width); y2 = Math.max(y2, o.y + o.height); }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function snap(state: EditorState): Pick<EditorState, 'history' | 'historyIndex'> {
  const h = state.history.slice(0, state.historyIndex + 1);
  h.push(state.objects.map(deepClone));
  return { history: h, historyIndex: h.length - 1 };
}

const initial = load();

export const useEditorStore = create<EditorState>((set, get) => ({
  currentTool: 'select',
  objects: initial,
  selectedIds: [],
  canvas: { scale: 1, offsetX: 0, offsetY: 0 },
  isDrawing: false,
  drawingStart: null,
  history: [initial],
  historyIndex: 0,
  clipboard: [],
  enteredGroupId: null,

  setCurrentTool: (tool) => set({ currentTool: tool }),

  addObject: (object) => set((s) => {
    const o = [...s.objects, object]; save(o);
    return { objects: o, ...snap(s) };
  }),

  updateObject: (id, updates) => set((s) => {
    const updateDeep = (objs: DesignObject[]): DesignObject[] =>
      objs.map(x => {
        if (x.id === id) return { ...x, ...updates };
        if (x.children) return { ...x, children: updateDeep(x.children) };
        return x;
      });
    const o = updateDeep(s.objects); save(o);
    return { objects: o };
  }),

  deleteObject: (id) => set((s) => {
    const deleteDeep = (objs: DesignObject[]): DesignObject[] =>
      objs.filter(x => x.id !== id).map(x =>
        x.children ? { ...x, children: deleteDeep(x.children) } : x
      );
    const o = deleteDeep(s.objects); save(o);
    return { objects: o, selectedIds: s.selectedIds.filter(x => x !== id), ...snap(s) };
  }),

  deleteSelected: () => set((s) => {
    const ids = new Set(s.selectedIds);
    const findSelected = (objs: DesignObject[]): DesignObject[] =>
      objs.flatMap(x => {
        if (ids.has(x.id) && !x.locked) return [x];
        if (x.children) return findSelected(x.children);
        return [];
      });
    const del = findSelected(s.objects);
    if (!del.length) return s;
    const dids = new Set(del.map(x => x.id));
    const removeDeep = (objs: DesignObject[]): DesignObject[] =>
      objs.filter(x => !dids.has(x.id)).map(x =>
        x.children ? { ...x, children: removeDeep(x.children) } : x
      );
    const o = removeDeep(s.objects); save(o);
    return { objects: o, selectedIds: [], ...snap(s) };
  }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  reorderObjects: (objects) => set((s) => { save(objects); return { objects, ...snap(s) }; }),

  setCanvas: (canvas) => set((s) => ({ canvas: { ...s.canvas, ...canvas } })),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setDrawingStart: (start) => set({ drawingStart: start }),
  saveToHistory: () => set((s) => snap(s)),

  undo: () => set((s) => {
    if (s.historyIndex <= 0) return s;
    const i = s.historyIndex - 1;
    const o = s.history[i].map(deepClone); save(o);
    return { objects: o, historyIndex: i };
  }),

  redo: () => set((s) => {
    if (s.historyIndex >= s.history.length - 1) return s;
    const i = s.historyIndex + 1;
    const o = s.history[i].map(deepClone); save(o);
    return { objects: o, historyIndex: i };
  }),

  copySelected: () => set((s) => ({
    clipboard: s.objects.filter(o => s.selectedIds.includes(o.id)).map(deepClone),
  })),

  paste: () => set((s) => {
    if (!s.clipboard.length) return s;
    const c = cloneNewIds(s.clipboard).map(o => ({ ...o, x: o.x + 20, y: o.y + 20 }));
    const o = [...s.objects, ...c]; save(o);
    return { objects: o, selectedIds: c.map(x => x.id), ...snap(s) };
  }),

  duplicate: () => set((s) => {
    const sel = s.objects.filter(o => s.selectedIds.includes(o.id));
    if (!sel.length) return s;
    const c = cloneNewIds(sel).map(o => ({ ...o, x: o.x + 20, y: o.y + 20 }));
    const o = [...s.objects, ...c]; save(o);
    return { objects: o, selectedIds: c.map(x => x.id), ...snap(s) };
  }),

  groupSelected: () => set((s) => {
    const sel = s.objects.filter(o => s.selectedIds.includes(o.id));
    if (sel.length < 2) return s;
    const b = bbox(sel);
    const children = sel.map(o => deepClone({ ...o, x: o.x - b.x, y: o.y - b.y }));
    const group: DesignObject = {
      id: generateId(), type: 'group', x: b.x, y: b.y, width: b.width, height: b.height,
      rotation: 0, fill: 'transparent', stroke: 'transparent', strokeWidth: 0,
      opacity: 1, name: 'Group', visible: true, locked: false, children,
    };
    const ids = new Set(s.selectedIds);
    let idx = 0;
    for (let i = s.objects.length - 1; i >= 0; i--) { if (ids.has(s.objects[i].id)) { idx = i; break; } }
    const rest = s.objects.filter(o => !ids.has(o.id));
    const adj = Math.min(idx, rest.length);
    const o = [...rest.slice(0, adj), group, ...rest.slice(adj)]; save(o);
    return { objects: o, selectedIds: [group.id], ...snap(s) };
  }),

  ungroupSelected: () => set((s) => {
    if (s.selectedIds.length !== 1) return s;
    const g = s.objects.find(o => o.id === s.selectedIds[0]);
    if (!g || g.type !== 'group' || !g.children) return s;
    const ug = g.children.map(c => ({ ...c, x: c.x + g.x, y: c.y + g.y }));
    const i = s.objects.indexOf(g);
    const o = [...s.objects.slice(0, i), ...ug, ...s.objects.slice(i + 1)]; save(o);
    return { objects: o, selectedIds: ug.map(x => x.id), enteredGroupId: null, ...snap(s) };
  }),

  setEnteredGroupId: (id) => set({ enteredGroupId: id }),

  moveOutOfGroup: (childId) => set((s) => {
    const group = s.objects.find(o => o.type === 'group' && o.children?.some(c => c.id === childId));
    if (!group || !group.children) return s;
    const child = group.children.find(c => c.id === childId);
    if (!child) return s;
    const absChild: DesignObject = { ...child, x: child.x + group.x, y: child.y + group.y };
    const remainingAbs = group.children
      .filter(c => c.id !== childId)
      .map(c => ({ ...c, x: c.x + group.x, y: c.y + group.y }));
    const idx = s.objects.indexOf(group);
    // If 1 or fewer children left, dissolve the group entirely
    if (remainingAbs.length <= 1) {
      const o = [...s.objects.slice(0, idx), ...remainingAbs, absChild, ...s.objects.slice(idx + 1)]; save(o);
      return { objects: o, selectedIds: [absChild.id], enteredGroupId: null, ...snap(s) };
    }
    // Recalculate group bounds from remaining children
    const b = bbox(remainingAbs);
    const newChildren = remainingAbs.map(c => ({ ...c, x: c.x - b.x, y: c.y - b.y }));
    const updatedGroup: DesignObject = { ...group, x: b.x, y: b.y, width: b.width, height: b.height, children: newChildren };
    const o = [...s.objects.slice(0, idx), updatedGroup, absChild, ...s.objects.slice(idx + 1)]; save(o);
    return { objects: o, selectedIds: [absChild.id], enteredGroupId: updatedGroup.id, ...snap(s) };
  }),

  alignObjects: (dir) => set((s) => {
    const sel = s.objects.filter(o => s.selectedIds.includes(o.id));
    if (sel.length < 2) return s;
    const b = bbox(sel);
    const u: Record<string, Partial<DesignObject>> = {};
    for (const o of sel) {
      switch (dir) {
        case 'left': u[o.id] = { x: b.x }; break;
        case 'center': u[o.id] = { x: b.x + b.width / 2 - o.width / 2 }; break;
        case 'right': u[o.id] = { x: b.x + b.width - o.width }; break;
        case 'top': u[o.id] = { y: b.y }; break;
        case 'middle': u[o.id] = { y: b.y + b.height / 2 - o.height / 2 }; break;
        case 'bottom': u[o.id] = { y: b.y + b.height - o.height }; break;
      }
    }
    const o = s.objects.map(x => u[x.id] ? { ...x, ...u[x.id] } : x); save(o);
    return { objects: o, ...snap(s) };
  }),

  distributeObjects: (axis) => set((s) => {
    const sel = s.objects.filter(o => s.selectedIds.includes(o.id));
    if (sel.length < 3) return s;
    const sorted = [...sel].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
    const f = sorted[0], l = sorted[sorted.length - 1];
    const span = axis === 'horizontal' ? (l.x + l.width) - f.x : (l.y + l.height) - f.y;
    const size = sorted.reduce((a, o) => a + (axis === 'horizontal' ? o.width : o.height), 0);
    const gap = (span - size) / (sorted.length - 1);
    const u: Record<string, Partial<DesignObject>> = {};
    let pos = axis === 'horizontal' ? f.x : f.y;
    for (const o of sorted) {
      u[o.id] = axis === 'horizontal' ? { x: pos } : { y: pos };
      pos += (axis === 'horizontal' ? o.width : o.height) + gap;
    }
    const o = s.objects.map(x => u[x.id] ? { ...x, ...u[x.id] } : x); save(o);
    return { objects: o, ...snap(s) };
  }),

  bringToFront: () => set((s) => {
    if (!s.selectedIds.length) return s;
    const ids = new Set(s.selectedIds);
    const o = [...s.objects.filter(x => !ids.has(x.id)), ...s.objects.filter(x => ids.has(x.id))]; save(o);
    return { objects: o, ...snap(s) };
  }),
  sendToBack: () => set((s) => {
    if (!s.selectedIds.length) return s;
    const ids = new Set(s.selectedIds);
    const o = [...s.objects.filter(x => ids.has(x.id)), ...s.objects.filter(x => !ids.has(x.id))]; save(o);
    return { objects: o, ...snap(s) };
  }),
  bringForward: () => set((s) => {
    if (!s.selectedIds.length) return s;
    const a = [...s.objects];
    for (let i = a.length - 2; i >= 0; i--) {
      if (s.selectedIds.includes(a[i].id) && !s.selectedIds.includes(a[i + 1].id))
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
    }
    save(a); return { objects: a, ...snap(s) };
  }),
  sendBackward: () => set((s) => {
    if (!s.selectedIds.length) return s;
    const a = [...s.objects];
    for (let i = 1; i < a.length; i++) {
      if (s.selectedIds.includes(a[i].id) && !s.selectedIds.includes(a[i - 1].id))
        [a[i - 1], a[i]] = [a[i], a[i - 1]];
    }
    save(a); return { objects: a, ...snap(s) };
  }),

  zoomToFit: (cw, ch) => set((s) => {
    const vis = s.objects.filter(o => o.visible);
    if (!vis.length) return { canvas: { scale: 1, offsetX: 0, offsetY: 0 } };
    const b = bbox(vis);
    const p = 60;
    const sc = Math.min(Math.max(Math.min((cw - p * 2) / b.width, (ch - p * 2) / b.height), 0.1), 10);
    return { canvas: { scale: sc, offsetX: (cw - b.width * sc) / 2 - b.x * sc, offsetY: (ch - b.height * sc) / 2 - b.y * sc } };
  }),

  saveToFile: () => {
    const { objects } = get();
    const blob = new Blob([JSON.stringify(objects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'figma-clone-project.json'; a.click();
    URL.revokeObjectURL(url);
  },

  loadFromFile: (json) => set((s) => {
    try {
      const objects = JSON.parse(json) as DesignObject[];
      save(objects);
      return { objects, selectedIds: [], ...snap(s) };
    } catch { return s; }
  }),
}));
