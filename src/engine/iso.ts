import { INK, line, outline, poly, shade } from './pixel';
import type { Ctx, Pt } from './pixel';

export const TW = 32;
export const TH = 16;

export interface Face {
  top: string;
  left: string; // the +y face (down-left on screen)
  right: string; // the +x face (down-right on screen)
}

export function faces(base: string): Face {
  return { top: shade(base, 0.2), left: base, right: shade(base, -0.24) };
}

/**
 * Drawing context bound to a particular room origin. All coordinates are in
 * tile units (floats allowed) with z in pixels.
 */
export class Gfx {
  constructor(
    public c: Ctx,
    public ox: number,
    public oy: number,
  ) {}

  p(x: number, y: number, z = 0): Pt {
    return [Math.round(this.ox + (x - y) * (TW / 2)), Math.round(this.oy + (x + y) * (TH / 2) - z)];
  }

  /** Unproject a screen point onto the floor plane (z = 0). */
  unproject(sx: number, sy: number): { x: number; y: number } {
    const a = (sx - this.ox) / (TW / 2); // x - y
    const b = (sy - this.oy) / (TH / 2); // x + y
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  quad(pts: Pt[], color: string, edge?: string) {
    poly(this.c, pts, color);
    if (edge) outline(this.c, pts, edge);
  }

  /** Isometric box. `z` is the base height, `h` its height. */
  box(x: number, y: number, w: number, d: number, h: number, z: number, f: Face | string, edge: string | null = INK) {
    const col = typeof f === 'string' ? faces(f) : f;
    const T = (px_: number, py: number, pz: number) => this.p(px_, py, pz);
    const top: Pt[] = [T(x, y, z + h), T(x + w, y, z + h), T(x + w, y + d, z + h), T(x, y + d, z + h)];
    const left: Pt[] = [T(x, y + d, z + h), T(x + w, y + d, z + h), T(x + w, y + d, z), T(x, y + d, z)];
    const right: Pt[] = [T(x + w, y, z + h), T(x + w, y + d, z + h), T(x + w, y + d, z), T(x + w, y, z)];
    poly(this.c, left, col.left);
    poly(this.c, right, col.right);
    poly(this.c, top, col.top);
    if (edge) {
      // Silhouette outline + a bright rim on top for that chunky look.
      const sil: Pt[] = [T(x, y, z + h), T(x + w, y, z + h), T(x + w, y, z), T(x + w, y + d, z), T(x, y + d, z), T(x, y + d, z + h)];
      outline(this.c, sil, edge);
      line(this.c, ...T(x, y + d, z + h), ...T(x + w, y + d, z + h), shade(col.top, 0.25));
      line(this.c, ...T(x + w, y + d, z + h), ...T(x + w, y, z + h), shade(col.top, 0.05));
      line(this.c, ...T(x + w, y + d, z + h), ...T(x + w, y + d, z), shade(col.left, -0.35));
    }
  }

  /** A rectangle painted on a box's face. u in [0,1] along the face, z in px from the box base. */
  faceRect(
    b: { x: number; y: number; w: number; d: number; z: number },
    side: 'left' | 'right',
    u0: number,
    u1: number,
    z0: number,
    z1: number,
    color: string,
    edge?: string,
  ) {
    const pt = (u: number, zz: number): Pt =>
      side === 'left' ? this.p(b.x + u * b.w, b.y + b.d, b.z + zz) : this.p(b.x + b.w, b.y + u * b.d, b.z + zz);
    this.quad([pt(u0, z1), pt(u1, z1), pt(u1, z0), pt(u0, z0)], color, edge);
  }

  /** A flat rectangle lying on a horizontal plane at height z. */
  flat(x: number, y: number, w: number, d: number, z: number, color: string, edge?: string) {
    this.quad([this.p(x, y, z), this.p(x + w, y, z), this.p(x + w, y + d, z), this.p(x, y + d, z)], color, edge);
  }

  /** Wall-space point. u in pixels along the wall from the room corner, z up. */
  wp(side: 'left' | 'right', u: number, z: number): Pt {
    return side === 'right'
      ? [Math.round(this.ox + u), Math.round(this.oy + u / 2 - z)]
      : [Math.round(this.ox - u), Math.round(this.oy + u / 2 - z)];
  }

  /** Axis-aligned (in wall space) rectangle on a wall. */
  wallRect(side: 'left' | 'right', u0: number, u1: number, z0: number, z1: number, color: string, edge?: string) {
    this.quad([this.wp(side, u0, z1), this.wp(side, u1, z1), this.wp(side, u1, z0), this.wp(side, u0, z0)], color, edge);
  }

  wallPoly(side: 'left' | 'right', pts: [number, number][], color: string, edge?: string) {
    this.quad(
      pts.map(([u, z]) => this.wp(side, u, z)),
      color,
      edge,
    );
  }
}
