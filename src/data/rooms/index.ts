import type { RoomDef } from '../../core/types';
import { stakeholdersRoom } from './stakeholders';

/** Rooms that have been built. Add new RoomDefs here. */
export const PLAYABLE: Record<string, RoomDef> = {
  [stakeholdersRoom.id]: stakeholdersRoom,
};

export type Theme = 'pm' | 'ux' | 'research' | 'eng' | 'chaos' | 'balance';

/** Subject tags. A room's theme is flavour only: it no longer decides where the room sits. */
export const THEMES: Record<Theme, { label: string }> = {
  pm: { label: 'Product & Mgmt' },
  ux: { label: 'UX/UI Design' },
  research: { label: 'Research' },
  eng: { label: 'Engineering' },
  chaos: { label: 'Pure Chaos' },
  balance: { label: 'Work-Life Balance' },
};

export interface CatalogEntry {
  id: string;
  name: string;
  theme: Theme;
}

export interface Tier {
  name: string;
  blurb: string;
  /** 1 (calm) to 5 (mayhem) drives the chaos meter. 0 means perfectly balanced. */
  chaos: number;
  rooms: CatalogEntry[];
}

const r = (id: string, name: string, theme: Theme): CatalogEntry => ({ id, name, theme });

/**
 * The company, by difficulty. Every tier mixes subjects so players never sit in one theme
 * for several rooms in a row, and the chaos ramps up tier by tier.
 * Unbuilt rooms show as "coming soon" in the lobby.
 */
export const TIERS: Tier[] = [
  {
    name: 'Calm Before the Standup',
    blurb: 'Everyone is on mute. Nothing is on fire. Yet.',
    chaos: 1,
    rooms: [
      r('stakeholders', 'Stakeholders Room', 'pm'),
      r('design-studio', 'Design Studio', 'ux'),
      r('research-lab', 'User Research Lab', 'research'),
      r('pm', 'PM Room', 'pm'),
      r('engineers', 'Engineers Room', 'eng'),
    ],
  },
  {
    name: 'Slightly Misaligned',
    blurb: 'The pixels are fine. The people are not.',
    chaos: 2,
    rooms: [
      r('wireframe', 'Wireframe Room', 'ux'),
      r('sprint-planning', 'Sprint Planning Room', 'pm'),
      r('persona', 'Persona Room', 'research'),
      r('handoff', 'Developer Handoff Room', 'eng'),
      r('accessibility', 'Accessibility Room', 'ux'),
    ],
  },
  {
    name: 'Per My Last Email',
    blurb: 'Meetings are breeding. Feedback is arriving in bulk.',
    chaos: 3,
    rooms: [
      r('prototyping', 'Prototyping Room', 'ux'),
      r('sprint-review', 'Sprint Review Room', 'pm'),
      r('usability', 'Usability Testing Room', 'research'),
      r('qa', 'QA Room', 'eng'),
      r('design-system', 'Design System Room', 'ux'),
      r('journey', 'Journey Mapping Room', 'research'),
    ],
  },
  {
    name: 'Everything Is P0',
    blurb: 'Priorities have been replaced by vibes and deadlines.',
    chaos: 4,
    rooms: [
      r('roadmap', 'Roadmap Room', 'pm'),
      r('design-review', 'Design Review Room', 'ux'),
      r('analytics', 'Analytics Room', 'research'),
      r('incident', 'Production Incident Room', 'eng'),
      r('scope-creep', 'Scope Creep Room', 'chaos'),
      r('ceo', "CEO's Office", 'pm'),
    ],
  },
  {
    name: 'Product Chaos',
    blurb: 'Abandon all roadmaps, ye who enter here.',
    chaos: 5,
    rooms: [
      r('endless-feedback', 'Endless Feedback Room', 'chaos'),
      r('responsive', 'Responsive Design Room', 'eng'),
      r('impossible-deadline', 'Impossible Deadline Room', 'chaos'),
      r('nobody-asked', 'Feature Nobody Asked For Room', 'chaos'),
      r('impossible-brief', 'The Impossible Brief', 'chaos'),
    ],
  },
  {
    name: 'Work-Life Balance (Allegedly)',
    blurb: 'Windows. Daylight. A real lunch break. Rumour has it this place exists.',
    chaos: 0,
    rooms: [
      r('quiet-room', 'The Quiet Room', 'balance'),
      r('inbox-zero', 'Inbox Zero Rooftop', 'balance'),
      r('lunch-break', 'The Actual Lunch Break', 'balance'),
    ],
  },
];

/** Flat list in play order. */
export const CATALOG: CatalogEntry[] = TIERS.flatMap((t) => t.rooms);
