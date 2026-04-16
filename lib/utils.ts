import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DesignObject, SnapGuide } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getRotatedPoint(
  cx: number,
  cy: number,
  x: number,
  y: number,
  angle: number
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const nx = cos * (x - cx) + sin * (y - cy) + cx;
  const ny = cos * (y - cy) - sin * (x - cx) + cy;
  return { x: nx, y: ny };
}

export function pointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const SNAP_THRESHOLD = 5;

export function computeSnapGuides(
  movingIds: string[],
  allObjects: DesignObject[],
  movingBbox: { x: number; y: number; width: number; height: number },
): { guides: SnapGuide[]; snapDx: number; snapDy: number } {
  const others = allObjects.filter(o => !movingIds.includes(o.id) && o.visible && !o.locked);
  if (others.length === 0) return { guides: [], snapDx: 0, snapDy: 0 };

  const mx = movingBbox.x;
  const my = movingBbox.y;
  const mcx = mx + movingBbox.width / 2;
  const mcy = my + movingBbox.height / 2;
  const mr = mx + movingBbox.width;
  const mb = my + movingBbox.height;

  let bestDx = Infinity;
  let bestDy = Infinity;
  const guides: SnapGuide[] = [];

  for (const o of others) {
    const ox = o.x;
    const oy = o.y;
    const ocx = ox + o.width / 2;
    const ocy = oy + o.height / 2;
    const or = ox + o.width;
    const ob = oy + o.height;

    // Vertical snaps (x-axis alignment)
    const vSnaps = [
      { from: mx, to: ox }, { from: mx, to: ocx }, { from: mx, to: or },
      { from: mcx, to: ox }, { from: mcx, to: ocx }, { from: mcx, to: or },
      { from: mr, to: ox }, { from: mr, to: ocx }, { from: mr, to: or },
    ];
    for (const s of vSnaps) {
      const d = s.to - s.from;
      if (Math.abs(d) < SNAP_THRESHOLD && Math.abs(d) <= Math.abs(bestDx)) {
        if (Math.abs(d) < Math.abs(bestDx)) {
          bestDx = d;
          // Clear old vertical guides
          for (let i = guides.length - 1; i >= 0; i--) {
            if (guides[i].type === 'vertical') guides.splice(i, 1);
          }
        }
        guides.push({ type: 'vertical', position: s.to });
      }
    }

    // Horizontal snaps (y-axis alignment)
    const hSnaps = [
      { from: my, to: oy }, { from: my, to: ocy }, { from: my, to: ob },
      { from: mcy, to: oy }, { from: mcy, to: ocy }, { from: mcy, to: ob },
      { from: mb, to: oy }, { from: mb, to: ocy }, { from: mb, to: ob },
    ];
    for (const s of hSnaps) {
      const d = s.to - s.from;
      if (Math.abs(d) < SNAP_THRESHOLD && Math.abs(d) <= Math.abs(bestDy)) {
        if (Math.abs(d) < Math.abs(bestDy)) {
          bestDy = d;
          for (let i = guides.length - 1; i >= 0; i--) {
            if (guides[i].type === 'horizontal') guides.splice(i, 1);
          }
        }
        guides.push({ type: 'horizontal', position: s.to });
      }
    }
  }

  // Deduplicate guides
  const unique = guides.filter((g, i, arr) =>
    arr.findIndex(g2 => g2.type === g.type && g2.position === g.position) === i
  );

  return {
    guides: unique,
    snapDx: Math.abs(bestDx) <= SNAP_THRESHOLD ? bestDx : 0,
    snapDy: Math.abs(bestDy) <= SNAP_THRESHOLD ? bestDy : 0,
  };
}

export function starPath(cx: number, cy: number, outerR: number, innerR: number, numPoints: number): string {
  const pts: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (Math.PI * i) / numPoints - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function polygonPath(cx: number, cy: number, radius: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return `M${pts.join('L')}Z`;
}
