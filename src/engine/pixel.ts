/**
 * Tiny pixel-art toolkit. Everything is drawn with integer rects and
 * scanline-filled polygons so edges stay crisp (no anti-aliasing).
 */

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];

export function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(c: Ctx, x: number, y: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Scanline-fill a convex polygon with pixel-exact edges. */
export function poly(c: Ctx, pts: Pt[], color: string) {
  c.fillStyle = color;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const y0 = Math.round(minY);
  const y1 = Math.round(maxY);
  for (let y = y0; y < y1; y++) {
    const sy = y + 0.5;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
        const x = a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    if (hi >= lo) {
      const xa = Math.round(lo);
      const xb = Math.round(hi);
      if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
    }
  }
}

/** Bresenham line, 1px. */
export function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, color: string) {
  c.fillStyle = color;
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function outline(c: Ctx, pts: Pt[], color: string) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    line(c, a[0], a[1], b[0], b[1], color);
  }
}

/** Filled ellipse (pixel-exact) for shadows and leaves. */
export function ellipse(c: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  c.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.0001)));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

// ───────── colour helpers ─────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
const cache = new Map<string, string>();
/** amt in [-1, 1]: negative darkens (toward a cool purple), positive lightens (toward warm). */
export function shade(hex: string, amt: number): string {
  const key = hex + amt;
  const hit = cache.get(key);
  if (hit) return hit;
  const [r, g, b] = hexToRgb(hex);
  let out: string;
  if (amt < 0) {
    const t = -amt;
    out = rgbToHex(r + (40 - r) * t * 0.9, g + (24 - g) * t * 0.9, b + (70 - b) * t * 0.9);
  } else {
    out = rgbToHex(r + (255 - r) * amt, g + (240 - g) * amt, b + (205 - b) * amt);
  }
  cache.set(key, out);
  return out;
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const INK = '#2b1d3a';
