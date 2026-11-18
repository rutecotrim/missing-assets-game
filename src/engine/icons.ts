import { drawRects } from './characters';
import type { R } from './characters';

/** 16×16 pixel-art item icons, painted from rect lists with an ink outline. */
const ICONS: Record<string, R[]> = {
  notes: [
    [3, 2, 10, 12, '#fffaf0'],
    [3, 2, 10, 2, '#e8453c'],
    [5, 6, 6, 1, '#3a6ea5'],
    [5, 8, 4, 1, '#8a8a8a'],
    [5, 10, 6, 1, '#3a6ea5'],
    [10, 11, 3, 3, '#ffe27a'],
  ],
  mug: [
    [3, 4, 8, 9, '#3fb7a8'],
    [11, 6, 3, 4, '#3fb7a8'],
    [12, 7, 1, 2, '#2b1d3a'],
    [4, 5, 6, 2, '#2a8579'],
    [5, 8, 2, 1, '#fffaf0'],
  ],
  coffee: [
    [3, 5, 8, 8, '#f1e6d2'],
    [11, 7, 3, 4, '#f1e6d2'],
    [12, 8, 1, 2, '#2b1d3a'],
    [4, 6, 6, 2, '#5a3626'],
    [5, 1, 1, 2, '#ffffff'],
    [8, 2, 1, 2, '#ffffff'],
    [6, 3, 1, 1, '#ffffff'],
  ],
  usb: [
    [5, 7, 7, 7, '#2f6fd6'],
    [6, 8, 5, 2, '#6fa3ff'],
    [6, 2, 5, 5, '#c8ccd8'],
    [7, 3, 1, 2, '#2b1d3a'],
    [9, 3, 1, 2, '#2b1d3a'],
    [7, 11, 3, 2, '#fffaf0'],
  ],
  tape: [
    [2, 4, 12, 9, '#f1deb4'],
    [5, 6, 6, 5, '#2b1d3a'],
    [6, 7, 4, 3, '#a89870'],
    [11, 11, 4, 2, '#f1deb4'],
  ],
  torn: [
    [2, 3, 6, 11, '#fffaf0'],
    [8, 3, 6, 11, '#f0e6d2'],
    [4, 5, 3, 1, '#3a6ea5'],
    [9, 5, 3, 1, '#3a6ea5'],
    [4, 8, 3, 1, '#e8453c'],
    [9, 9, 3, 1, '#8a8a8a'],
    [7, 4, 1, 2, '#2b1d3a'],
    [8, 7, 1, 2, '#2b1d3a'],
    [7, 11, 1, 2, '#2b1d3a'],
  ],
  flow: [
    [2, 2, 12, 12, '#fffaf0'],
    [3, 3, 4, 3, '#3a6ea5'],
    [9, 7, 4, 3, '#ff8a3d'],
    [4, 10, 4, 3, '#3fb7a8'],
    [7, 4, 2, 1, '#2b1d3a'],
    [10, 6, 1, 1, '#2b1d3a'],
    [6, 10, 1, 1, '#2b1d3a'],
    [7, 7, 2, 1, '#2b1d3a'],
    [7, 8, 1, 1, '#f1deb4'], // tape
    [6, 7, 1, 3, '#f1deb4'],
  ],
  ball: [
    [4, 3, 8, 10, '#ff5d8f'],
    [3, 5, 10, 6, '#ff5d8f'],
    [5, 4, 3, 2, '#ffc2d6'],
    [6, 8, 4, 1, '#c93a6a'],
  ],
  duck: [
    [3, 7, 9, 6, '#ffd23f'],
    [8, 3, 5, 5, '#ffd23f'],
    [13, 5, 2, 2, '#ff8a3d'],
    [10, 4, 1, 1, '#2b1d3a'],
    [5, 9, 4, 2, '#e8b82a'],
    [2, 8, 2, 2, '#ffd23f'],
  ],
  squeezy: [
    [2, 6, 12, 8, '#ff5d8f'],
    [4, 3, 8, 4, '#ffd23f'],
    [12, 5, 3, 2, '#ff8a3d'],
    [9, 4, 1, 1, '#2b1d3a'],
    [4, 9, 3, 2, '#ffc2d6'],
  ],
  golden: [
    [3, 3, 10, 10, '#ffd23f'],
    [3, 3, 10, 2, '#fff09a'],
    [5, 7, 6, 1, '#b8860b'],
    [5, 9, 4, 1, '#b8860b'],
    [11, 11, 2, 2, '#ffec7a'],
    [1, 1, 1, 1, '#fffbe6'],
    [14, 2, 1, 1, '#fffbe6'],
  ],
  badge: [
    [4, 1, 8, 3, '#2b1d3a'],
    [7, 1, 2, 3, '#ffd23f'],
    [3, 4, 10, 11, '#fffaf0'],
    [4, 5, 8, 3, '#8c2f39'],
    [5, 9, 3, 3, '#f0c7a0'],
    [9, 9, 3, 1, '#8a8a8a'],
    [9, 11, 3, 1, '#8a8a8a'],
    [4, 13, 8, 1, '#ffd23f'],
  ],
  biscuits: [
    [2, 6, 12, 8, '#e8453c'],
    [2, 4, 12, 3, '#ffd23f'],
    [4, 8, 8, 4, '#fff3d6'],
    [6, 9, 2, 2, '#b5733a'],
    [9, 9, 2, 2, '#b5733a'],
  ],
  key: [
    [2, 3, 6, 6, '#ffd23f'],
    [4, 5, 2, 2, '#2b1d3a'],
    [7, 6, 7, 2, '#ffd23f'],
    [11, 8, 2, 3, '#ffd23f'],
    [14, 8, 1, 2, '#ffd23f'],
    [3, 4, 2, 1, '#fff09a'],
  ],
};

const cache = new Map<string, string>();

/** Returns a data URL for an icon at 16×16. Scale with `image-rendering: pixelated`. */
export function iconUrl(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  const c = cv.getContext('2d')!;
  drawRects(c, 0, 0, ICONS[name] ?? ICONS.notes);
  const url = cv.toDataURL();
  cache.set(name, url);
  return url;
}

export function iconImg(name: string, cls = ''): HTMLImageElement {
  const img = new Image();
  img.src = iconUrl(name);
  img.className = `pix ${cls}`.trim();
  img.draggable = false;
  img.alt = '';
  return img;
}
