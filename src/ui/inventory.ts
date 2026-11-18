import type { Session } from '../core/session';
import { INVENTORY_SIZE } from '../core/session';
import { ITEMS } from '../data/items';
import { iconImg } from '../engine/icons';

export interface InventoryHooks {
  /** Item released over the stage. Return true if it hit an object. */
  dropOnStage(itemId: string, clientX: number, clientY: number): boolean;
  /** Item being dragged over the stage (for hover feedback). */
  dragOverStage(clientX: number, clientY: number, over: boolean, itemId: string | null): void;
  /** Armed item changed (click-to-use mode). */
  armed(itemId: string | null): void;
  /** Where the stage is on screen. */
  isOverStage(clientX: number, clientY: number): boolean;
}

const KIND_LABEL: Record<string, string> = {
  key: 'KEY',
  document: 'DOCUMENT',
  digital: 'DIGITAL',
  tool: 'TOOL',
  clue: 'CLUE',
  funny: 'ODDITY',
};

export class InventoryUI {
  readonly el: HTMLElement;
  private grid: HTMLElement;
  private detail: HTMLElement;
  private count: HTMLElement;
  private selected: string | null = null;
  private armedItem: string | null = null;
  private known = new Set<string>();
  private drag: { id: string; ghost: HTMLElement; startX: number; startY: number; active: boolean; pointerId: number } | null = null;

  constructor(
    private session: Session,
    private hooks: InventoryHooks,
    private say: (text: string) => void,
  ) {
    this.el = document.createElement('aside');
    this.el.className = 'panel inventory';
    this.el.innerHTML = `
      <div class="panel-head"><h2>BACKPACK</h2><span class="count"></span></div>
      <div class="grid" role="list"></div>
      <div class="detail"></div>
      <p class="tip-line">Drag an item onto the room, or onto another item to combine them.</p>`;
    this.grid = this.el.querySelector('.grid')!;
    this.detail = this.el.querySelector('.detail')!;
    this.count = this.el.querySelector('.count')!;
    for (const i of session.inventory) this.known.add(i);
    this.render();
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
  }

  destroy() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    this.drag?.ghost.remove();
  }

  get armedId() {
    return this.armedItem;
  }
  disarm() {
    if (!this.armedItem) return;
    this.armedItem = null;
    this.hooks.armed(null);
    this.render();
  }

  /** Slot element for an item (used for fly-in animations). */
  slotRect(itemId: string): DOMRect | null {
    return this.grid.querySelector(`[data-item="${itemId}"]`)?.getBoundingClientRect() ?? null;
  }

  flash(itemId: string, kind: 'good' | 'bad') {
    const el = this.grid.querySelector(`[data-item="${itemId}"]`);
    if (!el) return;
    el.classList.remove('good', 'bad');
    void (el as HTMLElement).offsetWidth;
    el.classList.add(kind);
    setTimeout(() => el.classList.remove(kind), 700);
  }

  // ───────────── rendering ─────────────

  render() {
    const inv = this.session.inventory;
    if (this.selected && !inv.includes(this.selected)) this.selected = null;
    if (this.armedItem && !inv.includes(this.armedItem)) {
      this.armedItem = null;
      this.hooks.armed(null);
    }
    this.count.textContent = `${inv.length}/${INVENTORY_SIZE}`;
    this.grid.textContent = '';
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const id = inv[i];
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.setAttribute('role', 'listitem');
      if (id) {
        const item = ITEMS[id];
        slot.dataset.item = id;
        slot.classList.add('filled', `k-${item.kind}`);
        if (id === this.selected) slot.classList.add('selected');
        if (id === this.armedItem) slot.classList.add('armed');
        if (!this.known.has(id)) {
          slot.classList.add('pop');
          this.known.add(id);
        }
        slot.title = item.name;
        slot.appendChild(iconImg(item.icon));
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = item.name;
        slot.appendChild(name);
        slot.addEventListener('pointerdown', (e) => this.onDown(e, id));
      }
      this.grid.appendChild(slot);
    }
    this.renderDetail();
  }

  private renderDetail() {
    const d = this.detail;
    d.textContent = '';
    const id = this.selected;
    if (!id) {
      d.innerHTML = `<p class="empty">Click an item to inspect it.<br/>Some things are useful. Some are just… things.</p>`;
      return;
    }
    const it = ITEMS[id];
    const head = document.createElement('div');
    head.className = 'dhead';
    const big = iconImg(it.icon, 'big');
    head.appendChild(big);
    const t = document.createElement('div');
    t.innerHTML = `<h3></h3><span class="tag k-${it.kind}">${KIND_LABEL[it.kind]}${it.persist ? ' · KEEPS' : ''}${it.collectible ? ' · ★' : ''}</span>`;
    t.querySelector('h3')!.textContent = it.name;
    head.appendChild(t);
    d.appendChild(head);
    const p = document.createElement('p');
    p.textContent = it.desc;
    d.appendChild(p);
    const row = document.createElement('div');
    row.className = 'btns';
    if (it.examine) {
      const b = button('Examine', () => this.say(`${it.name}: ${it.examine}`));
      row.appendChild(b);
    }
    const use = button(this.armedItem === id ? 'Cancel' : 'Use on…', () => {
      this.armedItem = this.armedItem === id ? null : id;
      this.hooks.armed(this.armedItem);
      this.render();
    });
    use.classList.toggle('on', this.armedItem === id);
    row.appendChild(use);
    d.appendChild(row);
  }

  // ───────────── pointer drag & drop ─────────────

  private onDown = (e: PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    this.drag = { id, ghost: document.createElement('div'), startX: e.clientX, startY: e.clientY, active: false, pointerId: e.pointerId };
    this.drag.ghost.className = 'drag-ghost';
    this.drag.ghost.appendChild(iconImg(ITEMS[id].icon));
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    if (!d.active && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) {
      d.active = true;
      document.body.appendChild(d.ghost);
      document.body.classList.add('dragging');
      this.grid.querySelector(`[data-item="${d.id}"]`)?.classList.add('lifted');
    }
    if (d.active) {
      d.ghost.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 28}px)`;
      const over = this.hooks.isOverStage(e.clientX, e.clientY);
      this.hooks.dragOverStage(e.clientX, e.clientY, over, d.id);
      const target = this.slotUnder(e.clientX, e.clientY);
      this.grid.querySelectorAll('.slot.target').forEach((s) => s.classList.remove('target'));
      if (target && target.dataset.item !== d.id) target.classList.add('target');
    }
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.ghost.remove();
    document.body.classList.remove('dragging');
    this.grid.querySelectorAll('.lifted, .target').forEach((s) => s.classList.remove('lifted', 'target'));
    this.hooks.dragOverStage(0, 0, false, null);
    if (!d.active) {
      // a plain click selects
      this.selected = this.selected === d.id ? null : d.id;
      this.render();
      return;
    }
    const slot = this.slotUnder(e.clientX, e.clientY);
    if (slot?.dataset.item && slot.dataset.item !== d.id) {
      this.session.combine(d.id, slot.dataset.item);
      return;
    }
    if (this.hooks.isOverStage(e.clientX, e.clientY)) {
      const hit = this.hooks.dropOnStage(d.id, e.clientX, e.clientY);
      if (!hit) this.flash(d.id, 'bad');
      if (!hit) this.say('Nothing there to use it on. Try dropping it on something in the room.');
    }
  };

  private slotUnder(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y)?.closest('.slot') as HTMLElement | null;
    return el && this.grid.contains(el) ? el : null;
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.disarm();
  };
}

function button(label: string, onClick: () => void) {
  const b = document.createElement('button');
  b.className = 'btn small';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
