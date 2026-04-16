export type ToolType = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'hand' | 'image' | 'star' | 'polygon';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DesignObject {
  id: string;
  type: 'rectangle' | 'ellipse' | 'line' | 'text' | 'frame' | 'image' | 'group' | 'star' | 'polygon';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  name: string;
  visible: boolean;
  locked: boolean;
  children?: DesignObject[];
  text?: string;
  fontSize?: number;
  src?: string;
  borderRadius?: number;
  points?: number; // number of points for star, sides for polygon
}

export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
}

export interface HistoryState {
  objects: DesignObject[];
  selectedIds: string[];
}
