'use client';

import { useEditorStore } from '@/lib/store';
import { useRef, useCallback } from 'react';
import {
  Undo, Redo, ZoomIn, ZoomOut, Maximize, Scan,
  Save, FolderOpen, Image as ImageIcon, FileCode,
} from 'lucide-react';

export function TopBar() {
  const {
    canvas, setCanvas, undo, redo, historyIndex, history,
    saveToFile, loadFromFile, objects,
    zoomToFit,
  } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZoomIn = () => setCanvas({ scale: Math.min(canvas.scale * 1.2, 10) });
  const handleZoomOut = () => setCanvas({ scale: Math.max(canvas.scale / 1.2, 0.1) });
  const handleResetZoom = () => setCanvas({ scale: 1, offsetX: 0, offsetY: 0 });
  const handleZoomToFit = () => {
    const w = window.innerWidth - 60 - 260;
    const h = window.innerHeight - 48;
    zoomToFit(w, h);
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadFromFile(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportSVG = useCallback(() => {
    if (objects.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of objects) {
      if (!obj.visible) continue;
      minX = Math.min(minX, obj.x); minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width); maxY = Math.max(maxY, obj.y + obj.height);
    }
    const pad = 20; minX -= pad; minY -= pad;
    const w = maxX - minX + pad, h = maxY - minY + pad;
    const renderObj = (obj: typeof objects[0]): string => {
      if (!obj.visible) return '';
      const t = `translate(${obj.x}, ${obj.y}) rotate(${obj.rotation} ${obj.width / 2} ${obj.height / 2})`;
      if (obj.type === 'group' && obj.children) return `<g transform="${t}" opacity="${obj.opacity}">${obj.children.map(c => renderObj({ ...c, visible: obj.visible && c.visible })).join('')}</g>`;
      let s = '';
      switch (obj.type) {
        case 'rectangle': s = `<rect width="${obj.width}" height="${obj.height}" fill="${obj.fill}" stroke="${obj.stroke}" stroke-width="${obj.strokeWidth}" opacity="${obj.opacity}" rx="${obj.borderRadius || 0}" />`; break;
        case 'ellipse': s = `<ellipse cx="${obj.width / 2}" cy="${obj.height / 2}" rx="${obj.width / 2}" ry="${obj.height / 2}" fill="${obj.fill}" stroke="${obj.stroke}" stroke-width="${obj.strokeWidth}" opacity="${obj.opacity}" />`; break;
        case 'line': s = `<line x1="0" y1="0" x2="${obj.width}" y2="${obj.height}" stroke="${obj.stroke}" stroke-width="${obj.strokeWidth || 2}" opacity="${obj.opacity}" />`; break;
        case 'text': s = `<text x="0" y="${obj.fontSize || 16}" fill="${obj.fill}" font-size="${obj.fontSize || 16}" opacity="${obj.opacity}">${obj.text || 'Text'}</text>`; break;
        case 'frame': s = `<rect width="${obj.width}" height="${obj.height}" fill="${obj.fill}" stroke="${obj.stroke}" stroke-width="${obj.strokeWidth}" opacity="${obj.opacity}" />`; break;
        default: break;
      }
      return `<g transform="${t}">${s}</g>`;
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}">\n${objects.map(renderObj).join('\n')}\n</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'design.svg'; a.click();
    URL.revokeObjectURL(url);
  }, [objects]);

  const exportPNG = useCallback(() => {
    if (objects.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of objects) {
      if (!obj.visible) continue;
      minX = Math.min(minX, obj.x); minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width); maxY = Math.max(maxY, obj.y + obj.height);
    }
    const pad = 20; minX -= pad; minY -= pad;
    const w = maxX - minX + pad, h = maxY - minY + pad;
    const svgEl = document.querySelector('svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
    clone.setAttribute('width', String(w * 2)); clone.setAttribute('height', String(h * 2));
    clone.style.transform = 'none';
    clone.querySelector('defs')?.remove();
    clone.querySelector('rect[fill="url(#grid)"]')?.remove();
    clone.querySelectorAll('.resize-handles').forEach(el => el.remove());
    const svgString = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
      const ctx = c.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob((blob) => {
        if (!blob) return;
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = u; a.download = 'design.png'; a.click();
        URL.revokeObjectURL(u);
      }, 'image/png');
    };
    img.src = url;
  }, [objects]);

  const btn = 'p-2 hover:bg-[#3e3e3e] rounded disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="h-12 bg-[#2c2c2c] border-b border-[#3e3e3e] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white">Figma Clone</h1>
        <div className="h-6 w-px bg-[#3e3e3e]" />
        <div className="flex items-center gap-1">
          <button onClick={saveToFile} className={btn} title="Save to File (JSON)">
            <Save size={18} className="text-gray-400" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className={btn} title="Open File">
            <FolderOpen size={18} className="text-gray-400" />
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadFile} className="hidden" />
        </div>
        <div className="h-6 w-px bg-[#3e3e3e]" />
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className={btn}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={18} className="text-gray-400" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={btn}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={exportSVG} disabled={objects.length === 0} className={btn} title="Export SVG">
          <FileCode size={18} className="text-gray-400" />
        </button>
        <button onClick={exportPNG} disabled={objects.length === 0} className={btn} title="Export PNG">
          <ImageIcon size={18} className="text-gray-400" />
        </button>
        <div className="h-6 w-px bg-[#3e3e3e]" />
        <button onClick={handleZoomOut} className={btn} title="Zoom Out">
          <ZoomOut size={18} className="text-gray-400" />
        </button>
        <span className="text-sm text-gray-400 w-16 text-center">
          {Math.round(canvas.scale * 100)}%
        </span>
        <button onClick={handleZoomIn} className={btn} title="Zoom In">
          <ZoomIn size={18} className="text-gray-400" />
        </button>
        <button onClick={handleResetZoom} className={btn} title="Reset Zoom">
          <Maximize size={18} className="text-gray-400" />
        </button>
        <button onClick={handleZoomToFit} disabled={objects.length === 0} className={btn} title="Zoom to Fit (Ctrl+1)">
          <Scan size={18} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
