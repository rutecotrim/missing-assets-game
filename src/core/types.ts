/**
 * Data schemas for Missing Assets.
 *
 * Everything a designer needs to author a room lives here as plain data:
 * items, recipes, objects, dialogues, keypads and screens. The engine
 * (session.ts) interprets them; the renderer only draws them.
 */

// ───────────────────────── Conditions ─────────────────────────

export type Cond =
  | { flag: string }
  | { has: string }
  | { not: Cond }
  | { all: Cond[] }
  | { any: Cond[] };

// ───────────────────────── Effects ─────────────────────────
// Effects are the verbs of the game. A Rule runs a list of them in order.

export type Tone = 'good' | 'bad' | 'info';

export type Effect =
  | { do: 'say'; text: string; who?: string }
  | { do: 'give'; item: string }
  | { do: 'take'; item: string }
  | { do: 'set'; flag: string; to?: boolean | number }
  | { do: 'reveal'; object: string }
  | { do: 'hide'; object: string }
  | { do: 'toast'; text: string; tone?: Tone }
  | { do: 'talk'; dialogue: string }
  | { do: 'screen'; id: string }
  | { do: 'keypad'; id: string }
  | { do: 'sfx'; name: SfxName }
  | { do: 'fx'; kind: 'sparkle' | 'puff'; at?: string }
  | { do: 'escape' };

export type SfxName =
  | 'click'
  | 'pickup'
  | 'good'
  | 'bad'
  | 'combine'
  | 'unlock'
  | 'beep'
  | 'door'
  | 'sleepy'
  | 'coffee';

/** First rule whose `when` holds is the one that runs. */
export interface Rule {
  when?: Cond;
  do: Effect[];
}

// ───────────────────────── Items ─────────────────────────

export type ItemKind = 'key' | 'document' | 'digital' | 'tool' | 'clue' | 'funny';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Key into the icon painter table. */
  icon: string;
  /** Short description shown in the inventory panel. */
  desc: string;
  /** Longer text shown when the player presses Examine. */
  examine?: string;
  /** Survives leaving the room (e.g. a USB stick that works in another room). */
  persist?: boolean;
  /** Optional collectible, tracked on the profile and shown in the lobby. */
  collectible?: boolean;
  /** Funny lines used when the item is used on something that doesn't care. */
  nope?: string[];
}

export interface Recipe {
  a: string;
  b: string;
  /** Items consumed by the combination (default: both). */
  consume?: string[];
  gives: string;
  say: string;
  /** Marks a combination that is a joke / non-essential. */
  optional?: boolean;
}

// ───────────────────────── Room objects ─────────────────────────

export interface Tile {
  x: number;
  y: number;
}

export interface ObjectDef {
  id: string;
  name: string;
  /** Painter id in engine/props.ts. */
  sprite: string;
  /** Floor objects: top-left tile and footprint in whole tiles. */
  pos?: Tile;
  size?: { w: number; d: number };
  /** Visual height in pixels (also used for click hit-testing). */
  h?: number;
  /** Wall objects: which wall, where along it (tiles), and extent. */
  wall?: { side: 'left' | 'right'; at: number; w: number; z: number; h: number };
  /** Tile the player walks to before interacting. */
  stand: Tile;
  /** Does it block walking? (floor objects default to true) */
  solid?: boolean;
  /** Starts hidden until revealed by an effect. */
  hidden?: boolean;
  /** NPC appearance (makes the object a character). */
  npc?: CharacterLook & { patrol?: Tile[]; sleeping?: boolean; startsAt: Tile; facing?: Facing };
  /** Clicking: first matching rule runs. */
  look: Rule[];
  /** Item dropped on the object: itemId → rules. */
  use?: Record<string, Rule[]>;
  /** Shown when an item doesn't work here (overrides generic funny lines). */
  nope?: string;
}

export type Facing = { front: boolean; right: boolean };

export interface CharacterLook {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'curly' | 'cap' | 'slick';
  shirt: string;
  pants: string;
  glasses?: boolean;
  tie?: string;
  lanyard?: boolean;
  /** Pixel height boost, e.g. a taller VP. */
  tall?: number;
}

// ───────────────────────── Dialogue ─────────────────────────

export interface DChoice {
  text: string;
  next?: string;
  when?: Cond;
  do?: Effect[];
}

export interface DNode {
  who: string;
  text: string;
  do?: Effect[];
  next?: string;
  choices?: DChoice[];
}

export interface Dialogue {
  id: string;
  /** First matching entry picks the opening node. */
  start: { when?: Cond; node: string }[];
  nodes: Record<string, DNode>;
}

// ───────────────────────── Modals ─────────────────────────

export interface KeypadDef {
  id: string;
  title: string;
  code: string;
  /** Funny responses to well-known wrong guesses. */
  quips?: Record<string, string>;
  success: Effect[];
}

export interface ScreenView {
  when?: Cond;
  /** Lines of text; `**x**` highlights. */
  lines: string[];
  /** Small status chips at the bottom of the window. */
  chips?: { text: string; when?: Cond }[];
}

export interface ScreenDef {
  id: string;
  title: string;
  views: ScreenView[];
}

// ───────────────────────── Rooms ─────────────────────────

export interface RoomPalette {
  floorA: string;
  floorB: string;
  rugA?: string;
  rugB?: string;
  wallRight: string;
  wallLeft: string;
  trim: string;
  slab: string;
}

export interface RoomDef {
  id: string;
  name: string;
  category: string;
  tagline: string;
  /** Shown in the HUD. */
  objective: string;
  size: { w: number; d: number };
  palette: RoomPalette;
  spawn: Tile;
  intro: string[];
  objects: ObjectDef[];
  dialogues: Dialogue[];
  keypads: KeypadDef[];
  screens: ScreenDef[];
  /** Items the room hides that don't block progress. */
  optional: string[];
  /** Flat, non-interactive floor decals (rugs, scattered paper). */
  decals: Decal[];
}

export interface Decal {
  sprite: string;
  pos: Tile;
  size: { w: number; d: number };
}

// ───────────────────────── Save / state ─────────────────────────

export interface RoomState {
  flags: Record<string, boolean | number>;
  inventory: string[];
  hidden: Record<string, boolean>;
  seen: string[];
}

export interface Profile {
  completed: string[];
  carry: string[];
  collection: string[];
  rooms: Record<string, RoomState>;
  muted: boolean;
}

// ───────────────────────── Events & beats ─────────────────────────

export type Beat =
  | { kind: 'line'; who: string; text: string }
  | { kind: 'node'; dialogue: string; node: string }
  | { kind: 'modal'; modal: 'screen' | 'keypad'; id: string };

export type GameEvent =
  | { type: 'sfx'; name: SfxName }
  | { type: 'toast'; text: string; tone: Tone }
  | { type: 'gain'; item: string; from?: string }
  | { type: 'lose'; item: string }
  | { type: 'fx'; kind: 'sparkle' | 'puff'; at?: string }
  | { type: 'state' }
  | { type: 'beat' }
  | { type: 'escape' }
  | { type: 'use-result'; ok: boolean; item: string; object: string }
  | { type: 'combine-result'; ok: boolean; a: string; b: string; gives?: string };
