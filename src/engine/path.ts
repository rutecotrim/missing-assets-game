export interface Node {
  x: number;
  y: number;
}

/** 8-directional A* on a tile grid. Diagonals may not cut corners. */
export function findPath(w: number, d: number, blocked: (x: number, y: number) => boolean, from: Node, to: Node): Node[] | null {
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < d;
  if (!inb(to.x, to.y) || blocked(to.x, to.y)) return null;
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number) => y * w + x;
  const g = new Map<number, number>([[key(from.x, from.y), 0]]);
  const prev = new Map<number, number>();
  const open: { x: number; y: number; f: number }[] = [{ ...from, f: 0 }];
  const h = (x: number, y: number) => Math.max(Math.abs(x - to.x), Math.abs(y - to.y)) + 0.41 * Math.min(Math.abs(x - to.x), Math.abs(y - to.y));
  const closed = new Set<number>();
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.x === to.x && cur.y === to.y) {
      const out: Node[] = [];
      let k = ck;
      while (k !== key(from.x, from.y)) {
        out.push({ x: k % w, y: Math.floor(k / w) });
        k = prev.get(k)!;
      }
      return out.reverse();
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (!inb(nx, ny) || blocked(nx, ny)) continue;
        if (dx && dy && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
        const cost = (g.get(ck) ?? 0) + (dx && dy ? 1.41 : 1);
        const nk = key(nx, ny);
        if (cost < (g.get(nk) ?? Infinity)) {
          g.set(nk, cost);
          prev.set(nk, ck);
          open.push({ x: nx, y: ny, f: cost + h(nx, ny) });
        }
      }
  }
  return null;
}
