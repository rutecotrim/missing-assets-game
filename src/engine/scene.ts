import type { Session } from '../core/session';
import type { CharacterLook, Facing, GameEvent, ObjectDef, Tile } from '../core/types';
import { Gfx } from './iso';
import { INK, ellipse, line, mulberry32, outline, poly, px, rect, shade } from './pixel';
import type { Ctx, Pt } from './pixel';
import { PROPS, rugDecal, scrapsDecal } from './props';
import type { PropCtx } from './props';
import { PLAYER_LOOK, characterRects, drawRects, drawShadow } from './characters';
import { findPath } from './path';

export const LW = 368;
export const LH = 292;
const WALL_H = 76;
const SLAB = 8;

interface Actor {
  id: string;
  x: number;
  y: number;
  face: Facing;
  look: CharacterLook;
  path: Tile[];
  speed: number;
  walking: boolean;
  phase: number;
  talk: number; // seconds of "talking" animation left
  // npc patrol
  patrol?: Tile[];
  patrolIdx: number;
  wait: number;
  obj?: ObjectDef;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  kind: 'star' | 'dot' | 'puff' | 'x';
}

interface Pending {
  objectId: string;
  itemId?: string;
}

interface Ent {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  draw: () => void;
}

export interface SceneHooks {
  onHover(obj: ObjectDef | null, lx: number, ly: number): void;
  onEscaped(): void;
  onEvent(e: GameEvent): void;
}

export class Scene {
  readonly canvas: HTMLCanvasElement;
  private c: Ctx;
  private bg: HTMLCanvasElement;
  private g: Gfx;
  private bgDirty = true;
  private player: Actor;
  private actors = new Map<string, Actor>();
  private particles: Particle[] = [];
  private pending: Pending | null = null;
  private t = 0;
  private idle = 0;
  private hoverId: string | null = null;
  private hintsOn = false;
  private escapePhase: 0 | 1 | 2 = 0;
  private fade = 0;
  private rafId = 0;
  private last = 0;
  private hits = new Map<string, Pt[]>();
  private bounce = new Map<string, number>();
  private floaters: { text: string; x: number; y: number; life: number; color: string }[] = [];

  constructor(
    private session: Session,
    private hooks: SceneHooks,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LW;
    this.canvas.height = LH;
    this.canvas.className = 'stage-canvas';
    this.c = this.canvas.getContext('2d')!;
    this.c.imageSmoothingEnabled = false;
    this.bg = document.createElement('canvas');
    this.bg.width = LW;
    this.bg.height = LH;
    this.g = new Gfx(this.c, LW / 2, 92);
    const room = session.room;

    this.player = this.makeActor('player', room.spawn.x + 0.5, room.spawn.y + 0.5, PLAYER_LOOK);
    this.player.face = { front: false, right: true };
    for (const o of room.objects) {
      if (o.npc) {
        const a = this.makeActor(o.id, o.npc.startsAt.x + 0.5, o.npc.startsAt.y + 0.5, o.npc);
        a.face = o.npc.facing ?? { front: true, right: false };
        a.patrol = o.npc.patrol;
        a.obj = o;
        this.actors.set(o.id, a);
      }
      this.computeHit(o);
    }
    this.rafId = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
  }

  // ───────────────────────── public API ─────────────────────────

  setHints(on: boolean) {
    this.hintsOn = on;
  }

  /** Logical-canvas coordinates from client coords. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * LW, y: ((clientY - r.top) / r.height) * LH };
  }

  /** Where an object sits on screen in client pixels (for fly-to-inventory animations). */
  objectClientCenter(id: string | undefined): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    let lx = LW / 2;
    let ly = LH / 2;
    const o = id ? this.session.room.objects.find((x) => x.id === id) : undefined;
    if (o) {
      const c = this.objectCenter(o);
      lx = c[0];
      ly = c[1];
    }
    return { x: r.left + (lx / LW) * r.width, y: r.top + (ly / LH) * r.height };
  }

  /** Pointer move over the canvas (also used while dragging an item). */
  hover(clientX: number, clientY: number) {
    const p = this.toLogical(clientX, clientY);
    const o = this.pick(p.x, p.y);
    this.hoverId = o?.id ?? null;
    this.hooks.onHover(o ?? null, clientX, clientY);
  }
  clearHover() {
    this.hoverId = null;
    this.hooks.onHover(null, 0, 0);
  }

  /** Plain click on the stage. */
  click(clientX: number, clientY: number) {
    if (this.session.busy || this.escapePhase) return;
    this.idle = 0;
    const p = this.toLogical(clientX, clientY);
    const o = this.pick(p.x, p.y);
    if (o) return this.approach(o, undefined);
    const t = this.g.unproject(p.x, p.y);
    const tile = { x: Math.floor(t.x), y: Math.floor(t.y) };
    this.pending = null;
    if (!this.walkTo(tile)) this.hooks.onEvent({ type: 'toast', text: "Can't walk there.", tone: 'bad' });
    else this.spawnRing(tile.x + 0.5, tile.y + 0.5);
  }

  /** An inventory item was dropped on the stage. Returns true if it landed on an object. */
  dropItem(itemId: string, clientX: number, clientY: number): boolean {
    if (this.session.busy || this.escapePhase) return false;
    this.idle = 0;
    const p = this.toLogical(clientX, clientY);
    const o = this.pick(p.x, p.y);
    if (!o) return false;
    this.approach(o, itemId);
    return true;
  }

  // ───────────────────────── interaction ─────────────────────────

  private approach(o: ObjectDef, itemId?: string) {
    this.pending = { objectId: o.id, itemId };
    let target: Tile | null = null;
    const me = this.tileOf(this.player);
    if (o.npc) {
      const a = this.actors.get(o.id)!;
      const at = this.tileOf(a);
      target = this.nearestFree(at, me);
    } else {
      target = o.stand;
    }
    if (!target) {
      this.pending = null;
      return;
    }
    if (me.x === target.x && me.y === target.y) {
      this.arrive();
      return;
    }
    if (!this.walkTo(target)) {
      // Unreachable stand tile: interact from where we are rather than getting stuck.
      this.arrive();
    }
  }

  private arrive() {
    const p = this.pending;
    this.pending = null;
    if (!p) return;
    const o = this.session.object(p.objectId);
    const c = o.npc ? this.actors.get(o.id)! : this.centerTile(o);
    this.faceToward(this.player, c.x, c.y);
    if (o.npc) {
      const a = this.actors.get(o.id)!;
      this.faceToward(a, this.player.x, this.player.y);
      a.path = [];
      a.talk = 3;
    }
    this.bounce.set(o.id, 0.35);
    if (p.itemId) this.session.useItemOn(p.itemId, o.id);
    else this.session.inspect(o.id);
  }

  private nearestFree(from: Tile, me: Tile): Tile | null {
    let best: Tile | null = null;
    let bestD = Infinity;
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dy) < 1 || Math.abs(dx) + Math.abs(dy) > 2) continue;
        const t = { x: from.x + dx, y: from.y + dy };
        if (this.isBlocked(t.x, t.y)) continue;
        const d = Math.abs(t.x - me.x) + Math.abs(t.y - me.y) + (Math.abs(dx) + Math.abs(dy)) * 2;
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
    return best;
  }

  // ───────────────────────── world helpers ─────────────────────────

  private makeActor(id: string, x: number, y: number, look: CharacterLook): Actor {
    return { id, x, y, face: { front: true, right: true }, look, path: [], speed: 3.4, walking: false, phase: 0, talk: 0, patrolIdx: 0, wait: 1 + Math.random() * 2 };
  }

  private tileOf(a: { x: number; y: number }): Tile {
    return { x: Math.floor(a.x), y: Math.floor(a.y) };
  }

  private centerTile(o: ObjectDef) {
    if (o.pos && o.size) return { x: o.pos.x + o.size.w / 2, y: o.pos.y + o.size.d / 2 };
    if (o.wall) return o.wall.side === 'right' ? { x: o.wall.at + o.wall.w / 2, y: 0 } : { x: 0, y: o.wall.at + o.wall.w / 2 };
    return { x: o.stand.x + 0.5, y: o.stand.y + 0.5 };
  }

  private isBlocked(x: number, y: number): boolean {
    const r = this.session.room;
    if (x < 0 || y < 0 || x >= r.size.w || y >= r.size.d) return true;
    for (const o of r.objects) {
      if (!o.pos || !o.size || o.npc || o.solid === false || this.session.isHidden(o.id)) continue;
      if (x >= o.pos.x && x < o.pos.x + o.size.w && y >= o.pos.y && y < o.pos.y + o.size.d) return true;
    }
    return false;
  }

  private walkTo(tile: Tile): boolean {
    const r = this.session.room;
    const from = this.tileOf(this.player);
    const path = findPath(r.size.w, r.size.d, (x, y) => this.isBlocked(x, y), from, tile);
    if (!path) return false;
    this.player.path = path;
    return true;
  }

  private faceToward(a: Actor, tx: number, ty: number) {
    const dx = tx - a.x;
    const dy = ty - a.y;
    this.setFacing(a, dx, dy);
  }

  private setFacing(a: Actor, dx: number, dy: number) {
    const sx = dx - dy;
    const sy = dx + dy;
    a.face = { front: sy >= -0.01, right: Math.abs(sx) < 0.01 ? a.face.right : sx > 0 };
  }

  private objectCenter(o: ObjectDef): Pt {
    const hit = this.hits.get(o.id);
    if (!hit) return [LW / 2, LH / 2];
    let sx = 0;
    let sy = 0;
    for (const p of hit) {
      sx += p[0];
      sy += p[1];
    }
    return [sx / hit.length, sy / hit.length];
  }

  // ───────────────────────── hit testing ─────────────────────────

  private computeHit(o: ObjectDef) {
    const g = this.g;
    if (o.pos && o.size && !o.npc) {
      const { x, y } = o.pos;
      const { w, d } = o.size;
      const h = (o.h ?? 16) + 2;
      this.hits.set(o.id, [g.p(x, y, h), g.p(x + w, y, h), g.p(x + w, y, 0), g.p(x + w, y + d, 0), g.p(x, y + d, 0), g.p(x, y + d, h)]);
    } else if (o.wall) {
      const w = o.wall;
      const u0 = w.at * 16;
      const u1 = (w.at + w.w) * 16;
      this.hits.set(o.id, [g.wp(w.side, u0, w.z + w.h), g.wp(w.side, u1, w.z + w.h), g.wp(w.side, u1, w.z), g.wp(w.side, u0, w.z)]);
    }
  }

  private actorHit(a: Actor): Pt[] {
    const [sx, sy] = this.g.p(a.x, a.y);
    return [
      [sx - 8, sy - 30],
      [sx + 8, sy - 30],
      [sx + 8, sy + 2],
      [sx - 8, sy + 2],
    ];
  }

  private inPoly(p: Pt[], x: number, y: number): boolean {
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i];
      const [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  private pick(lx: number, ly: number): ObjectDef | null {
    const room = this.session.room;
    // Front-most first: sort by depth of footprint far corner.
    const cands: { o: ObjectDef; depth: number }[] = [];
    for (const o of room.objects) {
      if (this.session.isHidden(o.id)) continue;
      let poly_: Pt[] | undefined;
      let depth = 0;
      if (o.npc) {
        const a = this.actors.get(o.id)!;
        poly_ = this.actorHit(a);
        depth = a.x + a.y + 1000;
      } else {
        poly_ = this.hits.get(o.id);
        depth = o.pos && o.size ? o.pos.x + o.size.w + o.pos.y + o.size.d : -1;
      }
      if (poly_ && this.inPoly(poly_, lx, ly)) cands.push({ o, depth });
    }
    cands.sort((a, b) => b.depth - a.depth);
    return cands[0]?.o ?? null;
  }

  // ───────────────────────── events from the session ─────────────────────────

  handleEvent(e: GameEvent) {
    if (e.type === 'fx') {
      const o = e.at ? this.session.room.objects.find((x) => x.id === e.at) : undefined;
      const [cx, cy] = o ? this.objectCenter(o) : this.g.p(this.player.x, this.player.y, 20);
      if (e.kind === 'sparkle') this.burst(cx, cy, ['#ffd23f', '#fff3d6', '#ff8a3d', '#7bf0d0'], 'star', 14);
      else this.burst(cx, cy, ['#b8b2c4', '#8d92a8', '#ff5d5d'], 'puff', 8);
    }
    if (e.type === 'gain') {
      const [sx, sy] = this.g.p(this.player.x, this.player.y, 28);
      this.floaters.push({ text: '+1', x: sx, y: sy, life: 1.1, color: '#7bf0d0' });
    }
    if (e.type === 'escape' && !this.escapePhase) this.escapePhase = 1;
    if (e.type === 'use-result' && !e.ok) {
      const o = this.session.object(e.object);
      const [cx, cy] = this.objectCenter(o);
      this.burst(cx, cy, ['#ff5d5d'], 'x', 5);
    }
  }

  // ───────────────────────── particles ─────────────────────────

  private burst(x: number, y: number, colors: string[], kind: Particle['kind'], n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 14 + Math.random() * 34;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 18,
        life: 0.7 + Math.random() * 0.5,
        max: 1.2,
        color: colors[i % colors.length],
        kind,
      });
    }
  }

  private spawnRing(tx: number, ty: number) {
    const [x, y] = this.g.p(tx, ty);
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, color: '#fff3d6', kind: 'dot' });
  }

  // ───────────────────────── update ─────────────────────────

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.t += dt;
    this.idle += dt;
    this.moveActor(this.player, dt);
    if (this.pending && !this.player.path.length && !this.player.walking) this.arrive();

    const talking = this.session.busy;
    for (const a of this.actors.values()) {
      a.talk = Math.max(0, a.talk - dt);
      if (a.patrol && !talking && !this.pending) {
        if (!a.path.length) {
          a.wait -= dt;
          if (a.wait <= 0) {
            a.patrolIdx = (a.patrolIdx + 1) % a.patrol.length;
            const tgt = a.patrol[a.patrolIdx];
            const p = findPath(this.session.room.size.w, this.session.room.size.d, (x, y) => this.isBlocked(x, y), this.tileOf(a), tgt);
            if (p) a.path = p;
            a.wait = 1.5 + Math.random() * 2.5;
          }
        }
        a.speed = 1.6;
        this.moveActor(a, dt);
      } else {
        a.walking = false;
      }
    }

    for (const [k, v] of this.bounce) {
      if (v - dt <= 0) this.bounce.delete(k);
      else this.bounce.set(k, v - dt);
    }

    // particles
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind !== 'dot') p.vy += 70 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 18 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);

    this.updateEscape(dt);
  }

  private updateEscape(dt: number) {
    if (!this.escapePhase) return;
    if (this.escapePhase === 1 && !this.session.busy) {
      const door = this.session.object('exit_door');
      const me = this.tileOf(this.player);
      if (me.x !== door.stand.x || me.y !== door.stand.y) {
        if (!this.player.path.length) {
          const ok = this.walkTo(door.stand);
          if (!ok) this.escapePhase = 2;
        }
      } else if (!this.player.path.length) {
        this.escapePhase = 2;
      }
      if (this.escapePhase === 1 && !this.player.path.length && !this.player.walking) this.escapePhase = 2;
    }
    if (this.escapePhase === 2) {
      // step through the door
      const a = this.player;
      const tx = 8.75;
      const ty = -0.2;
      const dx = tx - a.x;
      const dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.08) {
        a.x += (dx / d) * 2.2 * dt;
        a.y += (dy / d) * 2.2 * dt;
        this.setFacing(a, dx, dy);
        a.walking = true;
        a.phase += dt * 6;
      } else a.walking = false;
      this.fade += dt * (d > 0.5 ? 0.2 : 1.2);
      if (this.fade >= 1) {
        this.escapePhase = 0;
        this.hooks.onEscaped();
      }
    }
  }

  private moveActor(a: Actor, dt: number) {
    if (!a.path.length) {
      a.walking = false;
      return;
    }
    const nx = a.path[0].x + 0.5;
    const ny = a.path[0].y + 0.5;
    const dx = nx - a.x;
    const dy = ny - a.y;
    const d = Math.hypot(dx, dy);
    const step = a.speed * dt;
    this.setFacing(a, dx, dy);
    a.walking = true;
    a.phase += dt * 3.2;
    if (d <= step) {
      a.x = nx;
      a.y = ny;
      a.path.shift();
      if (!a.path.length) a.walking = false;
    } else {
      a.x += (dx / d) * step;
      a.y += (dy / d) * step;
    }
  }

  // ───────────────────────── rendering ─────────────────────────

  private buildBackground() {
    const room = this.session.room;
    const pal = room.palette;
    const W = room.size.w;
    const D = room.size.d;
    const c = this.bg.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, LW, LH);
    const g = new Gfx(c, this.g.ox, this.g.oy);
    const rnd = mulberry32(42);

    // slab (floor thickness)
    g.quad([g.p(0, D, 0), g.p(W, D, 0), g.p(W, D, -SLAB), g.p(0, D, -SLAB)], pal.slab, INK);
    g.quad([g.p(W, 0, 0), g.p(W, D, 0), g.p(W, D, -SLAB), g.p(W, 0, -SLAB)], shade(pal.slab, -0.3), INK);

    // floor
    for (let i = 0; i < W; i++)
      for (let j = 0; j < D; j++) {
        const col = (i + j) % 2 ? pal.floorA : pal.floorB;
        poly(c, [g.p(i, j), g.p(i + 1, j), g.p(i + 1, j + 1), g.p(i, j + 1)], col);
        for (let k = 0; k < 3; k++) {
          const [sx, sy] = g.p(i + 0.15 + rnd() * 0.7, j + 0.15 + rnd() * 0.7);
          px(c, sx, sy, rnd() > 0.5 ? shade(col, 0.1) : shade(col, -0.1));
        }
      }
    // subtle floor edge on the front rims
    outline(c, [g.p(0, D), g.p(W, D), g.p(W, 0)], shade(pal.floorA, -0.45));

    // decals
    for (const d of room.decals) {
      if (d.sprite === 'rug') rugDecal(g, d.pos, d.size);
      if (d.sprite === 'scraps') scrapsDecal(g, d.pos);
    }

    // walls
    const wall = (side: 'left' | 'right', length: number, col: string) => {
      const u1 = length * 16;
      g.wallRect(side, 0, u1, 0, WALL_H, col);
      // wainscot + rail
      g.wallRect(side, 0, u1, 0, 20, shade(col, -0.12));
      g.wallRect(side, 0, u1, 20, 22, shade(col, 0.18));
      g.wallRect(side, 0, u1, 22, 23, shade(col, -0.25));
      // wallpaper stripes
      for (let u = 8; u < u1; u += 16) g.wallRect(side, u, u + 1, 24, WALL_H - 4, shade(col, 0.07));
      for (let u = 16; u < u1; u += 16) g.wallRect(side, u, u + 1, 2, 18, shade(col, -0.2));
      // baseboard
      g.wallRect(side, 0, u1, 0, 3, pal.trim);
      g.wallRect(side, 0, u1, 3, 4, shade(pal.trim, 0.25));
      // top cap
      g.wallRect(side, 0, u1, WALL_H, WALL_H + 3, shade(col, 0.25), INK);
      // outline
      outline(c, [g.wp(side, 0, WALL_H + 3), g.wp(side, u1, WALL_H + 3), g.wp(side, u1, 0), g.wp(side, 0, 0)], INK);
    };
    wall('right', W, pal.wallRight);
    wall('left', D, pal.wallLeft);
    // corner seam
    line(c, ...g.wp('right', 0, 0), ...g.wp('right', 0, WALL_H + 3), INK);
    // wall end caps (thickness)
    g.quad([g.p(W, 0, WALL_H + 3), g.p(W, 0.22, WALL_H + 3), g.p(W, 0.22, 0), g.p(W, 0, 0)], shade(pal.wallRight, -0.3), INK);
    g.quad([g.p(0, D, WALL_H + 3), g.p(0.22, D, WALL_H + 3), g.p(0.22, D, 0), g.p(0, D, 0)], shade(pal.wallLeft, -0.3), INK);

    // sunbeam from the window
    c.globalAlpha = 0.11;
    poly(c, [g.p(3.3, 0.05), g.p(4.9, 0.05), g.p(7.4, 4.4), g.p(5.8, 4.4)], '#fff6c8');
    poly(c, [g.p(3.9, 0.05), g.p(4.3, 0.05), g.p(6.2, 4.4), g.p(5.8, 4.4)], '#ffffff');
    c.globalAlpha = 1;
    this.bgDirty = false;
  }

  private propCtx(o: ObjectDef): PropCtx {
    return {
      g: this.g,
      o,
      s: this.session,
      t: this.t,
      flag: (n) => !!this.session.flag(n),
      has: (i) => this.session.has(i),
    };
  }

  private render() {
    const c = this.c;
    if (this.bgDirty) this.buildBackground();
    c.clearRect(0, 0, LW, LH);
    c.drawImage(this.bg, 0, 0);
    const room = this.session.room;

    // wall-mounted things
    for (const o of room.objects) {
      if (!o.wall || this.session.isHidden(o.id)) continue;
      PROPS[o.sprite]?.(this.propCtx(o));
    }

    // floor entities, depth-sorted
    const ents: Ent[] = [];
    for (const o of room.objects) {
      if (o.wall || o.npc || !o.pos || !o.size || this.session.isHidden(o.id)) continue;
      const bump = this.bounce.get(o.id);
      ents.push({
        id: o.id,
        minX: o.pos.x,
        maxX: o.pos.x + o.size.w,
        minY: o.pos.y,
        maxY: o.pos.y + o.size.d,
        draw: () => {
          if (bump) {
            c.save();
            c.translate(0, -Math.round(Math.sin((bump / 0.35) * Math.PI) * 1.5));
          }
          PROPS[o.sprite]?.(this.propCtx(o));
          if (bump) c.restore();
        },
      });
    }
    const addActor = (a: Actor) =>
      ents.push({ id: a.id, minX: a.x - 0.3, maxX: a.x + 0.3, minY: a.y - 0.3, maxY: a.y + 0.3, draw: () => this.drawActor(a) });
    addActor(this.player);
    for (const a of this.actors.values()) addActor(a);

    for (const e of sortEnts(ents)) e.draw();

    this.drawHints();
    this.drawHover();
    this.drawParticles();

    // vignette + fade
    const gr = c.createRadialGradient(LW / 2, LH / 2 + 10, 120, LW / 2, LH / 2 + 10, 300);
    gr.addColorStop(0, 'rgba(20,10,35,0)');
    gr.addColorStop(1, 'rgba(20,10,35,0.38)');
    c.fillStyle = gr;
    c.fillRect(0, 0, LW, LH);
    if (this.fade > 0) {
      c.fillStyle = `rgba(255,248,220,${Math.min(1, this.fade)})`;
      c.fillRect(0, 0, LW, LH);
    }
  }

  private drawActor(a: Actor) {
    const c = this.c;
    const [sx, sy] = this.g.p(a.x, a.y);
    drawShadow(c, sx, sy - 1);
    const bob = a.walking ? 0 : Math.round(Math.sin(this.t * 2 + a.x * 3) * 0.5 + 0.5) * 0;
    const rects = characterRects(a.look, a.face, { walking: a.walking, step: a.phase, bob, talking: a.talk > 0 && Math.floor(this.t * 6) % 2 === 0 });
    const hop = a.walking ? -(Math.floor(a.phase * 4) % 2) : 0;
    drawRects(c, sx, sy + hop, rects);
    // "!" marker above people you haven't spoken to
    if (a.obj && !this.session.state.seen.includes(a.obj.id)) {
      const by = sy - 36 - Math.round(Math.abs(Math.sin(this.t * 3)) * 2);
      rect(c, sx - 1, by, 3, 6, INK);
      rect(c, sx, by + 1, 1, 3, '#ffd23f');
      rect(c, sx, by + 5, 1, 1, '#ffd23f');
      rect(c, sx - 1, by + 6, 3, 2, INK);
      rect(c, sx, by + 6, 1, 1, '#ffd23f');
    }
  }

  private drawHints() {
    const show = this.hintsOn || this.idle > 40;
    if (!show) return;
    for (const o of this.session.room.objects) {
      if (this.session.isHidden(o.id) || this.session.state.seen.includes(o.id)) continue;
      const [cx, cy] = o.npc ? this.g.p(this.actors.get(o.id)!.x, this.actors.get(o.id)!.y, 34) : this.objectCenter(o);
      const k = (this.t * 1.5 + cx * 0.05) % 1;
      const r = 1 + Math.floor(k * 3);
      const col = k < 0.5 ? '#fff3d6' : '#ffd23f';
      rect(this.c, cx - r, cy, r * 2 + 1, 1, col);
      rect(this.c, cx, cy - r, 1, r * 2 + 1, col);
    }
  }

  private drawHover() {
    if (!this.hoverId || this.session.busy) return;
    const o = this.session.room.objects.find((x) => x.id === this.hoverId);
    if (!o) return;
    const poly_ = o.npc ? this.actorHit(this.actors.get(o.id)!) : this.hits.get(o.id);
    if (!poly_) return;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of poly_) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const pad = 2 + (Math.floor(this.t * 4) % 2);
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    const c = this.c;
    const L = 5;
    const col = '#ffd23f';
    for (const [x, y, sx, sy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ] as [number, number, number, number][]) {
      rect(c, sx > 0 ? x : x - L, y - (sy < 0 ? 0 : 0), L + 1, 1, INK);
      rect(c, x, sy > 0 ? y : y - L, 1, L + 1, INK);
      rect(c, sx > 0 ? x + 1 : x - L, y + (sy > 0 ? 1 : -1), L - 1, 1, col);
      rect(c, x + (sx > 0 ? 1 : -1), sy > 0 ? y + 1 : y - L + 1, 1, L - 1, col);
    }
  }

  private drawParticles() {
    const c = this.c;
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / 0.5));
      c.globalAlpha = a;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (p.kind === 'star') {
        rect(c, x - 1, y, 3, 1, p.color);
        rect(c, x, y - 1, 1, 3, p.color);
      } else if (p.kind === 'puff') {
        ellipse(c, x, y, 2, 2, p.color);
      } else if (p.kind === 'x') {
        px(c, x, y, p.color);
        px(c, x + 1, y + 1, p.color);
        px(c, x - 1, y - 1, p.color);
        px(c, x + 1, y - 1, p.color);
        px(c, x - 1, y + 1, p.color);
      } else {
        // expanding ring on the floor
        const k = 1 - p.life / p.max;
        const rx = Math.round(4 + k * 10);
        const ry = Math.round(rx / 2);
        c.fillStyle = p.color;
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          c.fillRect(Math.round(x + Math.cos(ang) * rx), Math.round(y + Math.sin(ang) * ry), 1, 1);
        }
      }
      c.globalAlpha = 1;
    }
    for (const f of this.floaters) {
      c.globalAlpha = Math.min(1, f.life * 2);
      // tiny pixel "+1"
      rect(c, f.x - 3, f.y, 3, 1, INK);
      rect(c, f.x - 2, f.y - 1, 1, 3, INK);
      rect(c, f.x - 3, f.y, 3, 1, f.color);
      rect(c, f.x - 2, f.y - 1, 1, 3, f.color);
      rect(c, f.x + 1, f.y - 1, 1, 3, f.color);
      c.globalAlpha = 1;
    }
  }
}

/** Painter's algorithm for iso boxes: topological sort on "is behind" relations. */
function sortEnts(ents: Ent[]): Ent[] {
  const eps = 0.001;
  const behind = (a: Ent, b: Ent) => a.maxX <= b.minX + eps || a.maxY <= b.minY + eps;
  const n = ents.length;
  const before: number[][] = ents.map(() => []);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (behind(ents[i], ents[j]) && !behind(ents[j], ents[i])) before[j].push(i);
    }
  const order = ents.map((_, i) => i).sort((a, b) => ents[a].minX + ents[a].minY + ents[a].maxX + ents[a].maxY - (ents[b].minX + ents[b].minY + ents[b].maxX + ents[b].maxY));
  const out: Ent[] = [];
  const state = new Array<number>(n).fill(0);
  const visit = (i: number) => {
    if (state[i]) return;
    state[i] = 1;
    for (const j of before[i]) visit(j);
    out.push(ents[i]);
  };
  for (const i of order) visit(i);
  return out;
}
