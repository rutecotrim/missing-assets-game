import type {
  Beat,
  Cond,
  DChoice,
  DNode,
  Dialogue,
  Effect,
  GameEvent,
  ItemDef,
  KeypadDef,
  ObjectDef,
  Recipe,
  RoomDef,
  RoomState,
  Rule,
  ScreenDef,
  ScreenView,
} from './types';
import { ITEMS } from '../data/items';
import { RECIPES } from '../data/recipes';

export const INVENTORY_SIZE = 16;

export function freshRoomState(room: RoomDef, carry: string[]): RoomState {
  const hidden: Record<string, boolean> = {};
  for (const o of room.objects) if (o.hidden) hidden[o.id] = true;
  return { flags: {}, inventory: [...carry], hidden, seen: [] };
}

const GENERIC_NOPE = [
  "That doesn't seem to do anything. Yet.",
  'Nothing happens. Classic.',
  "You try it. The universe shrugs.",
  'Not quite. But you get points for creativity.',
  "It doesn't fit. Metaphorically and literally.",
];

/**
 * The rules engine. Pure game logic: no DOM, no canvas. The renderer and
 * the UI subscribe via `emit` and read state; tests drive it directly.
 */
export class Session {
  readonly room: RoomDef;
  state: RoomState;
  /** Pending narration / dialogue / modal beats. The first one is "current". */
  beats: Beat[] = [];
  escaped = false;
  private emit: (e: GameEvent) => void;
  private objects: Map<string, ObjectDef>;
  private dialogues: Map<string, Dialogue>;
  private nopeCursor = 0;

  constructor(room: RoomDef, state: RoomState, emit: (e: GameEvent) => void = () => {}) {
    this.room = room;
    this.state = state;
    this.emit = emit;
    this.objects = new Map(room.objects.map((o) => [o.id, o]));
    this.dialogues = new Map(room.dialogues.map((d) => [d.id, d]));
  }

  // ─────────── queries ───────────

  item(id: string): ItemDef {
    const it = ITEMS[id];
    if (!it) throw new Error(`Unknown item "${id}"`);
    return it;
  }
  object(id: string): ObjectDef {
    const o = this.objects.get(id);
    if (!o) throw new Error(`Unknown object "${id}"`);
    return o;
  }
  isHidden(id: string): boolean {
    return !!this.state.hidden[id];
  }
  flag(name: string): boolean | number {
    return this.state.flags[name] ?? false;
  }
  has(item: string): boolean {
    return this.state.inventory.includes(item);
  }
  get inventory(): string[] {
    return this.state.inventory;
  }
  get beat(): Beat | null {
    return this.beats[0] ?? null;
  }
  get busy(): boolean {
    return this.beats.length > 0;
  }
  keypad(id: string): KeypadDef {
    const k = this.room.keypads.find((x) => x.id === id);
    if (!k) throw new Error(`Unknown keypad "${id}"`);
    return k;
  }
  screenView(id: string): { def: ScreenDef; view: ScreenView } {
    const def = this.room.screens.find((s) => s.id === id);
    if (!def) throw new Error(`Unknown screen "${id}"`);
    const view = def.views.find((v) => this.test(v.when)) ?? def.views[def.views.length - 1];
    return { def, view };
  }
  dialogueNode(beat: Extract<Beat, { kind: 'node' }>): DNode {
    const dlg = this.dialogues.get(beat.dialogue);
    const node = dlg?.nodes[beat.node];
    if (!node) throw new Error(`Unknown dialogue node ${beat.dialogue}.${beat.node}`);
    return node;
  }
  visibleChoices(node: DNode): { choice: DChoice; index: number }[] {
    return (node.choices ?? [])
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => this.test(choice.when));
  }

  test(c?: Cond): boolean {
    if (!c) return true;
    if ('flag' in c) return !!this.state.flags[c.flag];
    if ('has' in c) return this.has(c.has);
    if ('not' in c) return !this.test(c.not);
    if ('all' in c) return c.all.every((x) => this.test(x));
    return c.any.some((x) => this.test(x));
  }

  // ─────────── player verbs ───────────

  /** Click / inspect an object. */
  inspect(objectId: string): void {
    const obj = this.object(objectId);
    if (!this.state.seen.includes(objectId)) this.state.seen.push(objectId);
    const rule = obj.look.find((r) => this.test(r.when));
    if (rule) this.run(rule.do, objectId);
    this.changed();
  }

  /** Drop an inventory item on an object in the room. */
  useItemOn(itemId: string, objectId: string): boolean {
    if (!this.has(itemId)) return false;
    const obj = this.object(objectId);
    const rule = obj.use?.[itemId]?.find((r) => this.test(r.when));
    if (rule) {
      this.run(rule.do, objectId);
      this.emit({ type: 'use-result', ok: true, item: itemId, object: objectId });
      this.changed();
      return true;
    }
    const item = this.item(itemId);
    const line =
      obj.nope ?? item.nope?.[this.nopeCursor++ % item.nope.length] ?? GENERIC_NOPE[this.nopeCursor++ % GENERIC_NOPE.length];
    this.emit({ type: 'sfx', name: 'bad' });
    this.emit({ type: 'fx', kind: 'puff', at: objectId });
    this.emit({ type: 'use-result', ok: false, item: itemId, object: objectId });
    this.queueLine('You', line);
    this.changed();
    return false;
  }

  recipeFor(a: string, b: string): Recipe | undefined {
    return RECIPES.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
  }

  /** Combine two inventory items. */
  combine(a: string, b: string): boolean {
    if (a === b || !this.has(a) || !this.has(b)) return false;
    const r = this.recipeFor(a, b);
    if (!r) {
      this.emit({ type: 'sfx', name: 'bad' });
      this.emit({ type: 'combine-result', ok: false, a, b });
      this.emit({ type: 'toast', text: `${this.item(a).name} + ${this.item(b).name}: no luck.`, tone: 'bad' });
      this.queueLine('You', "Those two don't go together. Not even with enough duct tape.");
      this.changed();
      return false;
    }
    for (const id of r.consume ?? [r.a, r.b]) this.removeItem(id);
    this.addItem(r.gives);
    this.emit({ type: 'sfx', name: 'combine' });
    this.emit({ type: 'combine-result', ok: true, a, b, gives: r.gives });
    this.queueLine('You', r.say);
    this.changed();
    return true;
  }

  // ─────────── beats (narration, dialogue, modals) ───────────

  /** Advance past the current beat. `choice` is an index into node.choices. */
  next(choice?: number): void {
    const beat = this.beat;
    if (!beat) return;
    this.emit({ type: 'sfx', name: 'click' });
    if (beat.kind === 'node') {
      const node = this.dialogueNode(beat);
      this.beats.shift();
      if (node.choices && node.choices.length) {
        const c = choice !== undefined ? node.choices[choice] : undefined;
        if (!c || !this.test(c.when)) {
          this.beats.unshift(beat); // invalid choice: stay put
        } else {
          if (c.do) this.run(c.do);
          if (c.next) this.enterNode(beat.dialogue, c.next, true);
        }
      } else if (node.next) {
        this.enterNode(beat.dialogue, node.next, true);
      }
    } else {
      this.beats.shift();
    }
    this.afterBeatChange();
  }

  /** Called by the UI when a modal (screen/keypad) is dismissed. */
  closeModal(): void {
    if (this.beat?.kind === 'modal') {
      this.beats.shift();
      this.afterBeatChange();
    }
  }

  /** Called by the keypad UI. Returns true when the code was right. */
  tryCode(id: string, code: string): { ok: boolean; quip?: string } {
    const k = this.keypad(id);
    if (code === k.code) {
      this.emit({ type: 'sfx', name: 'unlock' });
      this.beats.shift(); // close the keypad modal
      this.run(k.success);
      this.afterBeatChange();
      this.changed();
      return { ok: true };
    }
    this.emit({ type: 'sfx', name: 'bad' });
    return { ok: false, quip: k.quips?.[code] };
  }

  private afterBeatChange() {
    // A new node beat at the front must run its effects exactly once.
    this.emit({ type: 'beat' });
    this.changed();
  }

  private enterNode(dialogueId: string, nodeId: string, front: boolean) {
    const beat: Beat = { kind: 'node', dialogue: dialogueId, node: nodeId };
    if (front) this.beats.unshift(beat);
    else this.beats.push(beat);
    const node = this.dialogueNode(beat);
    if (node.do) this.run(node.do);
  }

  /** Show a line of narration (used by Examine buttons etc.). */
  narrate(who: string, text: string) {
    this.queueLine(who, text);
    this.changed();
  }

  private queueLine(who: string, text: string) {
    this.beats.push({ kind: 'line', who, text });
    this.emit({ type: 'beat' });
  }

  // ─────────── effects ───────────

  run(effects: Effect[], at?: string): void {
    for (const e of effects) this.apply(e, at);
  }

  private apply(e: Effect, at?: string) {
    switch (e.do) {
      case 'say':
        this.queueLine(e.who ?? 'You', e.text);
        break;
      case 'give':
        this.addItem(e.item, at);
        break;
      case 'take':
        this.removeItem(e.item);
        break;
      case 'set':
        this.state.flags[e.flag] = e.to ?? true;
        break;
      case 'reveal':
        delete this.state.hidden[e.object];
        this.emit({ type: 'fx', kind: 'sparkle', at: e.object });
        break;
      case 'hide':
        this.state.hidden[e.object] = true;
        break;
      case 'toast':
        this.emit({ type: 'toast', text: e.text, tone: e.tone ?? 'info' });
        break;
      case 'talk': {
        const d = this.dialogues.get(e.dialogue);
        if (!d) throw new Error(`Unknown dialogue "${e.dialogue}"`);
        const start = d.start.find((s) => this.test(s.when));
        if (start) {
          const beat: Beat = { kind: 'node', dialogue: d.id, node: start.node };
          this.beats.push(beat);
          const node = this.dialogueNode(beat);
          // Effects of the opening node run when it is first queued.
          if (node.do) this.run(node.do);
          this.emit({ type: 'beat' });
        }
        break;
      }
      case 'screen':
        this.beats.push({ kind: 'modal', modal: 'screen', id: e.id });
        this.emit({ type: 'beat' });
        break;
      case 'keypad':
        this.beats.push({ kind: 'modal', modal: 'keypad', id: e.id });
        this.emit({ type: 'beat' });
        break;
      case 'sfx':
        this.emit({ type: 'sfx', name: e.name });
        break;
      case 'fx':
        this.emit({ type: 'fx', kind: e.kind, at: e.at ?? at });
        break;
      case 'escape':
        this.escaped = true;
        this.emit({ type: 'escape' });
        break;
    }
  }

  // ─────────── inventory ───────────

  addItem(id: string, from?: string): boolean {
    if (this.has(id)) return false;
    if (this.state.inventory.length >= INVENTORY_SIZE) {
      this.emit({ type: 'toast', text: 'Inventory full! Drop a hobby first.', tone: 'bad' });
      return false;
    }
    this.state.inventory.push(id);
    this.emit({ type: 'sfx', name: 'pickup' });
    this.emit({ type: 'gain', item: id, from });
    this.emit({ type: 'toast', text: `Got: ${this.item(id).name}`, tone: 'good' });
    return true;
  }

  removeItem(id: string) {
    const i = this.state.inventory.indexOf(id);
    if (i >= 0) {
      this.state.inventory.splice(i, 1);
      this.emit({ type: 'lose', item: id });
    }
  }

  /** Items that leave the room with the player when they escape. */
  carryOut(): string[] {
    return this.state.inventory.filter((id) => ITEMS[id]?.persist);
  }

  private changed() {
    this.emit({ type: 'state' });
  }
}

export type { Rule };
