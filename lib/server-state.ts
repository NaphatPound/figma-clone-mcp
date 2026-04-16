import fs from 'fs';
import path from 'path';
import { DesignObject } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'objects.json');

interface ServerState {
  objects: DesignObject[];
  version: number;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getState(): ServerState {
  ensureDataDir();
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { objects: [], version: 0 };
  }
}

function setState(state: ServerState) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export function setObjects(objects: DesignObject[]): number {
  const state = getState();
  const newVersion = state.version + 1;
  setState({ objects, version: newVersion });
  return newVersion;
}

export function addObject(obj: DesignObject): number {
  const state = getState();
  state.objects.push(obj);
  state.version++;
  setState(state);
  return state.version;
}

export function serverUpdateObject(id: string, updates: Partial<DesignObject>): number {
  const state = getState();
  const updateDeep = (objs: DesignObject[]): DesignObject[] =>
    objs.map(x => {
      if (x.id === id) return { ...x, ...updates };
      if (x.children) return { ...x, children: updateDeep(x.children) };
      return x;
    });
  state.objects = updateDeep(state.objects);
  state.version++;
  setState(state);
  return state.version;
}

export function serverDeleteObject(id: string): number {
  const state = getState();
  const deleteDeep = (objs: DesignObject[]): DesignObject[] =>
    objs.filter(x => x.id !== id).map(x =>
      x.children ? { ...x, children: deleteDeep(x.children) } : x
    );
  state.objects = deleteDeep(state.objects);
  state.version++;
  setState(state);
  return state.version;
}
