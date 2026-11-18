import type { ObjectDef } from '../core/types';
import type { Session } from '../core/session';
import type { Gfx } from './iso';
import { faces } from './iso';
import { INK, ellipse, line, outline, px, rect, shade } from './pixel';
import type { Pt } from './pixel';
import { drawRects } from './characters';
import type { R } from './characters';

/** Everything a prop painter needs. */
export interface PropCtx {
  g: Gfx;
  o: ObjectDef;
  s: Session;
  t: number;
  flag(name: string): boolean;
  has(item: string): boolean;
}

type Painter = (p: PropCtx) => void;

const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

// ───────────────────────── FLOOR PROPS ─────────────────────────

const chair: Painter = ({ g, o }) => {
  const { x, y } = o.pos!;
  const north = y < 3;
  const palette = ['#e0605a', '#e9b44c', '#3fb7a8', '#7b6bd6', '#ee8a4e'];
  const cushion = palette[hash(o.id) % palette.length];
  for (const [lx, ly] of [
    [0.22, 0.22],
    [0.78, 0.22],
    [0.22, 0.78],
    [0.78, 0.78],
  ]) {
    line(g.c, ...g.p(x + lx, y + ly, 0), ...g.p(x + lx, y + ly, 6), '#4a4458');
  }
  const back = () => g.box(x + 0.16, north ? y + 0.12 : y + 0.74, 0.68, 0.14, 13, 9, shade(cushion, -0.1));
  if (north) back();
  g.box(x + 0.14, y + 0.14, 0.72, 0.72, 3, 6, cushion);
  if (!north) back();
};

const chairTipped: Painter = ({ g, o, flag }) => {
  const { x, y } = o.pos!;
  g.box(x + 0.16, y + 0.55, 0.68, 0.38, 3, 0, '#c9564f');
  g.box(x + 0.16, y + 0.2, 0.68, 0.16, 12, 0, '#e0605a');
  for (const lx of [0.22, 0.78]) line(g.c, ...g.p(x + lx, y + 0.2, 10), ...g.p(x + lx, y - 0.1, 16), '#4a4458');
  if (!flag('got_ball')) {
    const [bx, by] = g.p(x + 0.85, y + 0.78, 0);
    ellipse(g.c, bx, by - 3, 3, 3, INK);
    ellipse(g.c, bx, by - 3, 2, 2, '#ff5d8f');
    px(g.c, bx - 1, by - 4, '#ffc2d6');
  }
};

const table: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  const wood = faces('#b9794a');
  for (const [lx, ly] of [
    [0.15, 0.15],
    [3.7, 0.15],
    [0.15, 1.7],
    [3.7, 1.7],
  ]) {
    g.box(x + lx, y + ly, 0.15, 0.15, 11, 0, '#6e4a36');
  }
  g.box(x + 0.02, y + 0.02, 3.96, 1.96, 3, 11, wood);
  const Z = 14;
  // scattered paper
  g.flat(x + 0.4, y + 0.35, 0.55, 0.4, Z, '#f4efe6', '#cfc6b4');
  g.flat(x + 0.55, y + 0.5, 0.55, 0.4, Z, '#fff8e8', '#cfc6b4');
  g.flat(x + 1.5, y + 1.25, 0.5, 0.35, Z, '#ffe27a', '#d2b24a');
  g.flat(x + 2.55, y + 0.3, 0.45, 0.5, Z, '#bfe6ff', '#8bb6d4');
  // notes (hidden once collected)
  if (!flag('got_notes')) {
    g.flat(x + 2.0, y + 0.85, 0.55, 0.45, Z, '#fffbe6', INK);
    const [nx, ny] = g.p(x + 2.2, y + 1.0, Z);
    px(g.c, nx - 2, ny, '#e8453c');
    px(g.c, nx, ny, '#3a6ea5');
    px(g.c, nx + 1, ny - 1, '#3a6ea5');
    px(g.c, nx - 1, ny + 1, '#8a8a8a');
  }
  // laptop (closed)
  g.box(x + 3.05, y + 0.35, 0.6, 0.45, 2, Z, '#9aa3b5');
  // speakerphone
  g.box(x + 1.85, y + 0.35, 0.34, 0.34, 1.5, Z, '#2d2a3a');
  const [sx, sy] = g.p(x + 2.02, y + 0.52, Z + 2);
  px(g.c, sx, sy, Math.floor(t * 2) % 2 ? '#ff5d5d' : '#7a2a2a');
  // decorative mugs + croissant
  const mug = (mx: number, my: number, col: string) => {
    g.box(mx, my, 0.22, 0.22, 4, Z, col);
  };
  mug(x + 1.0, y + 0.9, '#e8453c');
  mug(x + 3.4, y + 1.3, '#f1e6d2');
  if (!flag('got_mug')) {
    mug(x + 0.85, y + 1.3, '#3fb7a8');
    const [mx, my] = g.p(x + 1.12, y + 1.4, Z + 3);
    px(g.c, mx, my, '#3fb7a8');
    px(g.c, mx, my + 1, '#3fb7a8');
  }
  const [cx, cy] = g.p(x + 2.9, y + 1.45, Z);
  ellipse(g.c, cx, cy - 1, 3, 2, INK);
  ellipse(g.c, cx, cy - 1, 2, 1, '#e8a75a');
};

const derek: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  const awake = flag('derek_awake');
  const leather = '#8c2f39';
  // chair base star
  for (const [lx, ly] of [
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.85],
    [0.8, 0.85],
  ]) {
    line(g.c, ...g.p(x + 0.5, y + 0.5, 3), ...g.p(x + lx, y + ly, 0), '#3a3547');
  }
  g.box(x + 0.1, y + 0.08, 0.8, 0.18, 24, 5, leather); // tall back
  g.box(x + 0.1, y + 0.12, 0.8, 0.8, 4, 4, shade(leather, 0.1)); // seat
  // Derek himself (seated, facing the viewer)
  const [ax, ay] = g.p(x + 0.5, y + 0.62, 8);
  const sway = awake ? 0 : Math.round(Math.sin(t * 1.4) * 1);
  const suit = '#2c3e66';
  const r: R[] = [
    // legs
    [-4, -2, 8, 3, '#222c4a'],
    [-4, 1, 3, 5, '#222c4a'],
    [1, 1, 3, 5, '#222c4a'],
    [-4, 6, 3, 1, '#2a1f2a'],
    [1, 6, 3, 1, '#2a1f2a'],
    // torso
    [-5 + sway, -12, 10, 11, suit],
    [-1 + sway, -12, 2, 8, '#ffffff'],
    [0 + sway, -11, 1, 8, '#e8453c'],
    // arms
    [-7 + sway, -11, 2, 8, suit],
    [5 + sway, -11, 2, 8, suit],
    [-7 + sway, -3, 2, 2, '#f0c7a0'],
    [5 + sway, -3, 2, 2, '#f0c7a0'],
    // head
    [-4 + sway * 2, -21, 8, 9, '#f0c7a0'],
    [-4 + sway * 2, -22, 8, 2, '#8a8a92'],
    [-5 + sway * 2, -19, 1, 3, '#8a8a92'],
    [4 + sway * 2, -19, 1, 3, '#8a8a92'],
  ];
  if (!awake) {
    r.push([-3 + sway * 2, -17, 2, 1, INK], [1 + sway * 2, -17, 2, 1, INK]); // closed eyes
    r.push([-1 + sway * 2, -14, 2, 2, '#8a2d3a']); // open mouth
    r.push([1 + sway * 2, -12, 1, 2, '#bfe6ff']); // drool
    // badge dangling
    r.push([-3 + sway, -12, 1, 4, '#ffd23f'], [2 + sway, -12, 1, 4, '#ffd23f'], [-1 + sway, -8, 3, 4, '#fff3b0']);
  } else {
    r.push([-3, -18, 1, 2, INK], [1, -18, 1, 2, INK], [-1, -14, 2, 1, '#8a4b3a']);
    r.push([5, -5, 3, 3, '#f1e6d2']); // coffee mug in hand
  }
  drawRects(g.c, ax, ay, r);
  if (!awake) {
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      const zx = ax + 7 + Math.round(k * 7) + (i % 2);
      const zy = ay - 20 - Math.round(k * 14);
      const size = 2 + (i % 2);
      g.c.globalAlpha = 1 - k * 0.8;
      rect(g.c, zx, zy, size + 1, 1, '#fffbe6');
      rect(g.c, zx + size, zy + 1, 1, 1, '#fffbe6');
      rect(g.c, zx + 1, zy + 2, 1, 1, '#fffbe6');
      rect(g.c, zx, zy + 3, size + 1, 1, '#fffbe6');
      g.c.globalAlpha = 1;
    }
  }
};

const sofa: Painter = ({ g, o }) => {
  const { x, y } = o.pos!;
  const base = '#d9992f';
  g.box(x + 0.08, y + 0.1, 1.84, 2.8, 6, 0, shade(base, -0.2));
  g.box(x + 0.08, y + 0.1, 1.84, 0.34, 7, 6, shade(base, -0.05)); // far arm
  for (let i = 0; i < 3; i++) g.box(x + 0.08, y + 0.44 + i * 0.7, 0.5, 0.7, 14, 6, base);
  for (let i = 0; i < 3; i++) g.box(x + 0.58, y + 0.44 + i * 0.7, 1.34, 0.7, 3, 6, shade(base, 0.12));
  g.box(x + 0.08, y + 2.56, 1.84, 0.34, 7, 6, shade(base, -0.05)); // near arm
  // throw pillows
  g.box(x + 0.62, y + 0.55, 0.22, 0.45, 8, 9, '#e0605a');
  g.box(x + 0.62, y + 1.85, 0.22, 0.45, 8, 9, '#3fb7a8');
};

const bin: Painter = ({ g, o, flag }) => {
  const { x, y } = o.pos!;
  g.box(x + 0.22, y + 0.22, 0.56, 0.56, 12, 0, '#6f7488');
  for (const zz of [3, 6, 9]) g.faceRect({ x: x + 0.22, y: y + 0.22, w: 0.56, d: 0.56, z: 0 }, 'left', 0, 1, zz, zz + 1, '#555a6e');
  g.flat(x + 0.27, y + 0.27, 0.46, 0.46, 12, '#2b2438');
  const [tx, ty] = g.p(x + 0.5, y + 0.5, 12);
  if (!flag('got_torn')) {
    rect(g.c, tx - 3, ty - 6, 6, 7, INK);
    rect(g.c, tx - 2, ty - 5, 5, 6, '#fffaf0');
    px(g.c, tx - 1, ty - 4, '#e8453c');
    px(g.c, tx + 1, ty - 3, '#3a6ea5');
    rect(g.c, tx + 3, ty - 4, 2, 5, '#ffe27a');
  }
  rect(g.c, tx - 5, ty - 1, 3, 2, '#ffd23f');
  px(g.c, tx - 5, ty - 1, '#8a5a1a');
};

const pc: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  g.box(x + 0.08, y + 0.1, 0.84, 1.8, 13, 0, '#a07a5b');
  g.faceRect({ x: x + 0.08, y: y + 0.1, w: 0.84, d: 1.8, z: 0 }, 'right', 0.06, 0.94, 1, 11, shade('#a07a5b', -0.38));
  g.box(x + 0.35, y + 0.75, 0.16, 0.4, 3, 13, '#3a3a4a'); // stand
  const mon = { x: x + 0.4, y: y + 0.35, w: 0.12, d: 1.1, z: 16 };
  g.box(mon.x, mon.y, mon.w, mon.d, 12, mon.z, '#262838');
  const on = flag('pc_on');
  const screen = on ? '#35c4e8' : '#1d2440';
  g.faceRect(mon, 'right', 0.07, 0.93, 1.5, 10.5, screen);
  if (on) {
    g.faceRect(mon, 'right', 0.12, 0.5, 6.5, 9.5, '#fff3d6');
    g.faceRect(mon, 'right', 0.55, 0.88, 3, 5.5, '#ffd23f');
    g.faceRect(mon, 'right', 0.12, 0.4, 2.5, 5, '#2f7a96');
    if (flag('usb_in')) g.faceRect(mon, 'right', 0.55, 0.88, 6.5, 9.5, '#7bf0a0');
  } else {
    g.faceRect(mon, 'right', 0.42, 0.58, 4.5, 8, Math.floor(t * 1.5) % 2 ? '#ff5d5d' : '#7a2a2a');
    // sticky note on bezel
    g.faceRect(mon, 'right', 0.78, 0.97, 8.5, 12, '#ffe27a', INK);
  }
  g.box(x + 0.62, y + 0.55, 0.22, 0.7, 1, 13, '#d8d8e6'); // keyboard
  g.box(x + 0.7, y + 1.4, 0.12, 0.16, 1.5, 13, '#d8d8e6'); // mouse
  if (flag('usb_in')) g.box(x + 0.32, y + 1.42, 0.1, 0.3, 2, 18, '#ff8a3d');
};

const printer: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  const b = { x: x + 0.1, y: y + 0.1, w: 0.8, d: 0.8, z: 0 };
  g.box(b.x, b.y, b.w, b.d, 11, 0, '#dcdfe8');
  g.box(b.x - 0.02, b.y - 0.02, 0.84, 0.84, 3, 11, '#b6bacb');
  g.flat(x + 0.2, y + 0.2, 0.6, 0.6, 14, '#8fd3e8');
  g.faceRect(b, 'left', 0.08, 0.5, 5, 9, '#2b3350');
  g.faceRect(b, 'left', 0.12, 0.46, 7, 8, '#7bf0d0');
  const led = flag('scanned') ? '#4cff7a' : Math.floor(t * 1.5) % 2 ? '#ffb347' : '#8a5a1a';
  g.faceRect(b, 'left', 0.62, 0.74, 6, 8, led);
  g.faceRect(b, 'left', 0.2, 0.8, 1.5, 3.5, '#8d92a8'); // paper tray
  g.flat(x + 0.2, y + 0.92, 0.6, 0.28, 2.5, '#ffffff', '#cfd2dc');
  if (flag('scanned')) g.flat(x + 0.28, y + 1.05, 0.44, 0.22, 3, '#fffbe6', '#cfd2dc');
};

const plant: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  g.box(x + 0.26, y + 0.26, 0.48, 0.48, 9, 0, '#c4663a');
  g.box(x + 0.22, y + 0.22, 0.56, 0.56, 2, 9, '#d9784a');
  const [bx, by] = g.p(x + 0.5, y + 0.5, 11);
  const leaves: [number, number, number, number][] = [
    [-7, -9, 5, 8],
    [7, -9, 5, 8],
    [0, -14, 6, 11],
    [-4, -22, 4, 8],
    [4, -21, 4, 8],
    [0, -28, 3, 7],
  ];
  leaves.forEach(([dx, dy, rx, ry], i) => {
    const sway = Math.round(Math.sin(t * 1.3 + i) * 0.7);
    ellipse(g.c, bx + dx + sway, by + dy, rx + 1, ry + 1, INK);
  });
  leaves.forEach(([dx, dy, rx, ry], i) => {
    const sway = Math.round(Math.sin(t * 1.3 + i) * 0.7);
    ellipse(g.c, bx + dx + sway, by + dy, rx, ry, i % 2 ? '#3f9a4f' : '#2f7d43');
    ellipse(g.c, bx + dx + sway - 1, by + dy - 2, Math.max(1, rx - 3), Math.max(1, ry - 4), '#62bf62');
  });
  if (!flag('got_duck')) {
    const dx = bx + 7;
    const dy = by - 13;
    rect(g.c, dx - 1, dy - 1, 6, 5, INK);
    rect(g.c, dx, dy, 4, 3, '#ffd23f');
    rect(g.c, dx + 4, dy + 1, 2, 1, '#ff8a3d');
    px(g.c, dx + 2, dy, INK);
  }
};

const cabinet: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  const b = { x: x + 0.04, y: y + 0.06, w: 1.92, d: 0.88, z: 0 };
  g.box(b.x, b.y, b.w, b.d, 34, 0, '#6f93a8');
  const open = flag('cab_open');
  g.faceRect(b, 'left', 0.03, 0.49, 2, 32, shade('#6f93a8', 0.1), INK);
  if (open) {
    g.faceRect(b, 'left', 0.51, 0.97, 2, 32, '#241a30', INK);
    for (const zz of [10, 20, 30]) g.faceRect(b, 'left', 0.51, 0.97, zz, zz + 1, '#4a3d5c');
    g.faceRect(b, 'left', 0.6, 0.8, 11, 15, '#e8453c');
  } else {
    g.faceRect(b, 'left', 0.51, 0.97, 2, 32, shade('#6f93a8', 0.1), INK);
    // keypad
    g.faceRect(b, 'left', 0.58, 0.9, 12, 26, '#262838', INK);
    g.faceRect(b, 'left', 0.62, 0.86, 20, 24, '#7bf0d0');
    for (let r_ = 0; r_ < 3; r_++)
      for (let c_ = 0; c_ < 3; c_++) {
        const u0 = 0.62 + c_ * 0.085;
        g.faceRect(b, 'left', u0, u0 + 0.05, 13 + r_ * 2.2, 14.6 + r_ * 2.2, '#d8d8e6');
      }
    const led = Math.floor(t * 1.2) % 2 ? '#ff5d5d' : '#7a2a2a';
    g.faceRect(b, 'left', 0.7, 0.78, 26.5, 28, led);
  }
  // handles
  g.faceRect(b, 'left', 0.44, 0.47, 15, 21, '#ffd23f');
  g.faceRect(b, 'left', 0.53, 0.56, 15, 21, '#ffd23f');
  // clutter on top
  g.box(x + 0.25, y + 0.3, 0.5, 0.4, 3, 34, '#fffaf0');
  g.box(x + 1.05, y + 0.35, 0.3, 0.3, 5, 34, '#e0605a');
};

const coffee: Painter = ({ g, o, flag, t }) => {
  const { x, y } = o.pos!;
  const base = { x: x + 0.05, y: y + 0.06, w: 1.9, d: 0.88, z: 0 };
  g.box(base.x, base.y, base.w, base.d, 18, 0, '#8a5a3c');
  g.faceRect(base, 'left', 0.04, 0.48, 2, 16, '#a06b48', INK);
  g.faceRect(base, 'left', 0.52, 0.96, 2, 16, '#a06b48', INK);
  g.box(x, y, 2, 1, 2, 18, '#e3d3b8');
  // machine
  const m = { x: x + 0.25, y: y + 0.18, w: 0.8, d: 0.6, z: 20 };
  g.box(m.x, m.y, m.w, m.d, 14, m.z, '#3b3f55');
  g.box(m.x - 0.02, m.y - 0.02, 0.84, 0.64, 3, 34, '#e0605a');
  g.faceRect(m, 'left', 0.1, 0.9, 10, 12.5, '#262838');
  g.faceRect(m, 'left', 0.14, 0.62, 10.6, 12, '#7bf0d0');
  g.faceRect(m, 'left', 0.7, 0.8, 10.8, 11.8, '#ff5d5d');
  g.faceRect(m, 'left', 0.4, 0.6, 3, 8, '#16131f'); // spout recess
  const cup = !flag('got_mug') ? 0 : 1;
  if (cup) g.box(x + 0.58, y + 0.6, 0.2, 0.2, 4, 20, '#f1e6d2');
  // steam
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.5 + i * 0.5) % 1;
    const [sx, sy] = g.p(x + 0.65, y + 0.5, 38);
    g.c.globalAlpha = 0.7 * (1 - k);
    rect(g.c, sx + i * 2 - 1 + Math.round(Math.sin(t * 3 + i) * 1), sy - Math.round(k * 10), 1, 2, '#ffffff');
    g.c.globalAlpha = 1;
  }
  // sugar jar + cups
  g.box(x + 1.35, y + 0.3, 0.22, 0.22, 7, 20, '#bfe6ff');
  g.box(x + 1.1, y + 0.55, 0.16, 0.16, 5, 20, '#fffaf0');
  g.box(x + 1.5, y + 0.58, 0.16, 0.16, 5, 20, '#fffaf0');
};

const pizza: Painter = ({ g, o }) => {
  const { x, y } = o.pos!;
  g.box(x + 0.15, y + 0.2, 0.7, 0.62, 2.5, 0, '#d9a35f');
  g.box(x + 0.15, y + 0.2, 0.7, 0.1, 7, 2.5, '#e6b878');
  g.flat(x + 0.25, y + 0.35, 0.5, 0.4, 2.5, '#f4c75a');
  const [px_, py_] = g.p(x + 0.5, y + 0.55, 2.5);
  px(g.c, px_ - 1, py_, '#c9382d');
  px(g.c, px_ + 2, py_ + 1, '#c9382d');
  px(g.c, px_ - 3, py_ + 1, '#4f8f3f');
};

const balloons: Painter = ({ g, o, t }) => {
  const { x, y } = o.pos!;
  g.box(x + 0.4, y + 0.4, 0.22, 0.22, 3, 0, '#555a6e');
  const [bx, by] = g.p(x + 0.5, y + 0.5, 3);
  const bs: [number, number, string, boolean][] = [
    [-9, -34, '#ff5d8f', false],
    [0, -42, '#ffd23f', false],
    [9, -33, '#3fb7a8', false],
    [-2, -23, '#9b7bff', true],
  ];
  bs.forEach(([dx, dy, col, sad], i) => {
    const bob = Math.round(Math.sin(t * 1.8 + i * 1.7) * 1.2);
    line(g.c, bx, by, bx + dx, by + dy + 5 + (sad ? 3 : 0) + bob, '#8a8a98');
    const rx = sad ? 3 : 5;
    const ry = sad ? 4 : 6;
    const cy = by + dy + bob + (sad ? 3 : 0);
    ellipse(g.c, bx + dx, cy, rx + 1, ry + 1, INK);
    ellipse(g.c, bx + dx, cy, rx, ry, col);
    px(g.c, bx + dx - 2, cy - 2, '#ffffff');
    px(g.c, bx + dx - 2, cy - 3, '#ffffff');
  });
};

const npcPlaceholder: Painter = () => {};

// ───────────────────────── WALL PROPS ─────────────────────────

function wallBox(o: ObjectDef) {
  const w = o.wall!;
  return { side: w.side, u0: w.at * 16, u1: (w.at + w.w) * 16, z0: w.z, z1: w.z + w.h };
}

const windowP: Painter = ({ g, o, t }) => {
  const { side, u0, u1, z0, z1 } = wallBox(o);
  g.wallRect(side, u0 - 1, u1 + 1, z0 - 1, z1 + 1, '#fff3d6', INK);
  const sky = ['#6fc3ee', '#86cef2', '#9cd8f4', '#b4e2f6'];
  const bandH = (z1 - z0 - 4) / sky.length;
  sky.forEach((c, i) => g.wallRect(side, u0 + 2, u1 - 2, z1 - 2 - (i + 1) * bandH, z1 - 2 - i * bandH, c));
  // skyline
  const bl: [number, number, number][] = [
    [0.05, 0.16, 11],
    [0.2, 0.15, 17],
    [0.38, 0.14, 9],
    [0.55, 0.18, 14],
    [0.8, 0.14, 19],
  ];
  const span = u1 - u0 - 4;
  for (const [fx, fw, hh] of bl) {
    const a = u0 + 2 + fx * span;
    g.wallRect(side, a, a + fw * span, z0 + 3, z0 + 3 + hh, '#5c7fa8');
    for (let wz = z0 + 6; wz < z0 + 1 + hh; wz += 4) g.wallRect(side, a + 2, a + 4, wz, wz + 1, '#ffe9a0');
  }
  // drifting cloud
  const cx = u0 + 4 + ((t * 2) % (span - 14));
  g.wallRect(side, cx, cx + 12, z1 - 11, z1 - 8, '#ffffff');
  g.wallRect(side, cx + 3, cx + 9, z1 - 8, z1 - 6, '#ffffff');
  // mullions
  g.wallRect(side, (u0 + u1) / 2 - 1, (u0 + u1) / 2 + 1, z0, z1, '#fff3d6');
  g.wallRect(side, u0, u1, (z0 + z1) / 2 - 1, (z0 + z1) / 2 + 1, '#fff3d6');
  // sill + pigeon
  g.wallRect(side, u0 - 3, u1 + 3, z0 - 4, z0 - 1, '#e8d2a8', INK);
  const pu = u0 + 5;
  g.wallRect(side, pu, pu + 8, z0 - 1, z0 + 4, '#9aa0ab', INK);
  g.wallRect(side, pu + 7, pu + 10, z0 + 3, z0 + 7, '#9aa0ab', INK);
  g.wallRect(side, pu + 9, pu + 10, z0 + 5, z0 + 6, INK);
};

const projector: Painter = ({ g, o }) => {
  const { side, u0, u1, z0, z1 } = wallBox(o);
  g.wallRect(side, u0 - 2, u1 + 2, z0 - 2, z1 + 2, '#2b2438', INK);
  g.wallRect(side, u0, u1, z0, z1, '#f7f5f0');
  g.wallRect(side, u0 + 3, u1 - 3, z1 - 11, z1 - 4, '#ff8a3d'); // headline
  g.wallRect(side, u0 + 6, u0 + 30, z1 - 9, z1 - 8, '#fff3d6');
  g.wallRect(side, u0 + 3, u0 + 28, z1 - 16, z1 - 14, '#b8b2c4');
  g.wallRect(side, u0 + 3, u0 + 22, z1 - 20, z1 - 18, '#b8b2c4');
  // bar chart going up and to the right (of course)
  const bars = ['#3fb7a8', '#ff5d8f', '#ffd23f', '#9b7bff'];
  bars.forEach((col, i) => g.wallRect(side, u0 + 22 + i * 4 + 12, u0 + 25 + i * 4 + 12, z0 + 3, z0 + 5 + i * 3, col));
  g.wallRect(side, u0 - 2, u1 + 2, z1 + 2, z1 + 5, '#8d92a8', INK); // roll
};

const clock: Painter = ({ g, o, t }) => {
  const { side, u0, u1, z0, z1 } = wallBox(o);
  const cu = (u0 + u1) / 2;
  const cz = (z0 + z1) / 2;
  const R = 7;
  const oct: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    oct.push([cu + Math.cos(a) * R * 1.15, cz + Math.sin(a) * R]);
  }
  g.wallPoly(side, oct, '#fffdf4', INK);
  const h = (a: number, len: number, col: string) =>
    line(g.c, ...g.wp(side, cu, cz), ...g.wp(side, cu + Math.sin(a) * len * 1.1, cz + Math.cos(a) * len), col);
  h((5 / 12) * Math.PI * 2 + 0.5, 3, INK);
  h(-0.1, 5, INK);
  const tick = Math.floor(t) % 2 ? '#ff5d5d' : '#fffdf4';
  const [sx, sy] = g.wp(side, cu + 3, cz + 3);
  px(g.c, sx, sy, tick);
};

const whiteboard: Painter = ({ g, o, flag }) => {
  const { side, u0, u1, z0, z1 } = wallBox(o);
  g.wallRect(side, u0 - 2, u1 + 2, z0 - 4, z1 + 2, '#c8ccd8', INK);
  g.wallRect(side, u0, u1, z0, z1, '#fbfbf7');
  // heading
  g.wallRect(side, u0 + 5, u0 + 38, z1 - 7, z1 - 5, '#e8453c');
  const lines: [number, number, string][] = [
    [8, 40, '#3a6ea5'],
    [8, 52, '#3a6ea5'],
    [8, 34, '#3a6ea5'],
  ];
  lines.forEach(([a, b, col], i) => {
    const zz = z1 - 12 - i * 5;
    g.wallRect(side, u0 + a - 3, u0 + a - 1, zz, zz + 2, '#e8453c');
    g.wallRect(side, u0 + a, u0 + b, zz, zz + 1, col);
  });
  g.wallRect(side, u0 + 8, u0 + 20, z1 - 29, z1 - 28, '#2d9c5a');
  // sticky notes
  const stickies = ['#ffe27a', '#ff9ec2', '#9fd8ff', '#b8f0a8', '#ffe27a'];
  stickies.forEach((col, i) => {
    const su = u1 - 52 + (i % 3) * 14 + (i > 2 ? 6 : 0);
    const sz = z1 - 10 - Math.floor(i / 3) * 12 - (i % 2);
    g.wallRect(side, su, su + 10, sz - 9, sz, col, shade(col, -0.3));
    g.wallRect(side, su + 2, su + 8, sz - 4, sz - 3, shade(col, -0.35));
  });
  // marker tray
  g.wallRect(side, u0 - 2, u1 + 2, z0 - 7, z0 - 4, '#a9aebd', INK);
  g.wallRect(side, u0 + 8, u0 + 20, z0 - 5, z0 - 3, '#e8453c');
  g.wallRect(side, u0 + 22, u0 + 32, z0 - 5, z0 - 3, '#3a6ea5');
  if (!flag('got_tape')) {
    const tu = u1 - 20;
    g.wallPoly(
      side,
      [
        [tu, z0 - 4],
        [tu + 3, z0 + 3],
        [tu + 9, z0 + 3],
        [tu + 12, z0 - 4],
      ],
      '#f1deb4',
      INK,
    );
    g.wallRect(side, tu + 4, tu + 8, z0 - 2, z0, '#b89e6a');
  }
};

const poster: Painter = ({ g, o }) => {
  const { side, u0, u1, z0, z1 } = wallBox(o);
  g.wallRect(side, u0 - 1, u1 + 1, z0 - 1, z1 + 1, INK);
  g.wallRect(side, u0, u1, z0, z1, '#ffe7ae');
  const cu = (u0 + u1) / 2;
  const cz = z1 - 12;
  g.wallRect(side, cu - 8, cu + 8, cz - 6, cz + 6, '#ee9a4e', INK);
  g.wallPoly(side, [[cu - 8, cz + 6], [cu - 6, cz + 11], [cu - 3, cz + 6]], '#ee9a4e', INK);
  g.wallPoly(side, [[cu + 8, cz + 6], [cu + 6, cz + 11], [cu + 3, cz + 6]], '#ee9a4e', INK);
  g.wallRect(side, cu - 5, cu - 3, cz, cz + 2, INK);
  g.wallRect(side, cu + 3, cu + 5, cz, cz + 2, INK);
  g.wallRect(side, cu - 1, cu + 1, cz - 2, cz - 1, '#ff7f8f');
  g.wallRect(side, u0 + 5, u1 - 5, z0 + 4, z0 + 6, '#4a3a5a');
  g.wallRect(side, u0 + 8, u1 - 8, z0 + 8, z0 + 9, '#4a3a5a');
};

const door: Painter = ({ g, o, flag, t }) => {
  const { side, u0, u1, z0, z1 } = wallBox(o);
  const open = flag('door_unlocked');
  g.wallRect(side, u0 - 3, u1 + 3, z0, z1 + 3, '#5a3626', INK);
  if (open) {
    g.wallRect(side, u0, u1, z0, z1, '#fff6d0');
    g.wallRect(side, u0 + 3, u1 - 3, z0, z1 - 4, '#ffffff');
    // door leaf swung inward
    g.wallPoly(side, [[u0, z0], [u0 + 7, z0 + 3], [u0 + 7, z1 - 1], [u0, z1]], '#c8742f', INK);
    g.c.globalAlpha = 0.3 + 0.1 * Math.sin(t * 3);
    g.flat(8, 0, 1.5, 2.2, 0, '#fff6c0');
    g.c.globalAlpha = 1;
  } else {
    g.wallRect(side, u0, u1, z0, z1, '#d4833f');
    const mid = (u0 + u1) / 2;
    for (const [a, b] of [
      [u0 + 3, mid - 2],
      [mid + 2, u1 - 3],
    ]) {
      g.wallRect(side, a, b, z0 + 4, z0 + 22, shade('#d4833f', -0.15), shade('#d4833f', -0.4));
      g.wallRect(side, a, b, z0 + 27, z1 - 5, shade('#d4833f', -0.15), shade('#d4833f', -0.4));
    }
    g.wallRect(side, u1 - 8, u1 - 5, z0 + 22, z0 + 26, '#ffd23f', INK); // handle
    g.wallRect(side, u1 - 8, u1 - 5, z0 + 18, z0 + 20, '#262838'); // keyhole
  }
  // exit sign
  g.wallRect(side, (u0 + u1) / 2 - 10, (u0 + u1) / 2 + 10, z1 + 5, z1 + 12, '#1f8f4f', INK);
  const sx = (u0 + u1) / 2 - 7;
  for (let i = 0; i < 4; i++) g.wallRect(side, sx + i * 4, sx + i * 4 + 2, z1 + 7, z1 + 10, '#e9ffe9');
};

// ───────────────────────── DECALS ─────────────────────────

export function rugDecal(g: Gfx, pos: { x: number; y: number }, size: { w: number; d: number }) {
  const { x, y } = pos;
  const { w, d } = size;
  const layers: [number, string][] = [
    [0, '#7a2f3a'],
    [0.14, '#e8c47a'],
    [0.26, '#c4513f'],
    [0.5, '#b04535'],
  ];
  for (const [inset, col] of layers) {
    g.flat(x + inset, y + inset, w - inset * 2, d - inset * 2, 0, col);
  }
  // diamond motif
  const cx = x + w / 2;
  const cy = y + d / 2;
  for (let i = -2; i <= 2; i++) {
    const [px_, py_] = g.p(cx + i * 0.7, cy + (i % 2 ? 0.18 : -0.18), 0);
    rect(g.c, px_ - 1, py_, 3, 1, '#f3d58a');
    px(g.c, px_, py_ - 1, '#f3d58a');
    px(g.c, px_, py_ + 1, '#f3d58a');
  }
  outline(g.c, [g.p(x, y), g.p(x + w, y), g.p(x + w, y + d), g.p(x, y + d)] as Pt[], '#5a2330');
}

export function scrapsDecal(g: Gfx, pos: { x: number; y: number }) {
  const spots: [number, number, string][] = [
    [0.2, 0.3, '#fffaf0'],
    [0.6, 0.6, '#ffe27a'],
    [0.4, 0.8, '#fffaf0'],
  ];
  for (const [dx, dy, col] of spots) {
    const [sx, sy] = g.p(pos.x + dx, pos.y + dy, 0);
    rect(g.c, sx, sy, 3, 2, shade(col, -0.35));
    rect(g.c, sx, sy - 1, 3, 1, col);
  }
}

export const PROPS: Record<string, Painter> = {
  chair,
  chair_tipped: chairTipped,
  table,
  derek,
  sofa,
  bin,
  pc,
  printer,
  plant,
  cabinet,
  coffee,
  pizza,
  balloons,
  npc: npcPlaceholder,
  window: windowP,
  projector,
  clock,
  whiteboard,
  poster,
  door,
};
