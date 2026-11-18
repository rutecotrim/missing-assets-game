import type { RoomDef } from '../../core/types';
import { stakeholdersRoom } from './stakeholders';

/** Rooms that have been built. Add new RoomDefs here. */
export const PLAYABLE: Record<string, RoomDef> = {
  [stakeholdersRoom.id]: stakeholdersRoom,
};

export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
}

/** The whole company, in play order. Unbuilt rooms show as "coming soon" in the lobby. */
export const CATALOG: CatalogEntry[] = [
  { id: 'stakeholders', name: 'Stakeholders Room', category: 'Product & Management' },
  { id: 'pm', name: 'PM Room', category: 'Product & Management' },
  { id: 'sprint-planning', name: 'Sprint Planning Room', category: 'Product & Management' },
  { id: 'sprint-review', name: 'Sprint Review Room', category: 'Product & Management' },
  { id: 'roadmap', name: 'Roadmap Room', category: 'Product & Management' },
  { id: 'ceo', name: "CEO's Office", category: 'Product & Management' },
  { id: 'design-studio', name: 'Design Studio', category: 'UX/UI Design' },
  { id: 'wireframe', name: 'Wireframe Room', category: 'UX/UI Design' },
  { id: 'prototyping', name: 'Prototyping Room', category: 'UX/UI Design' },
  { id: 'design-system', name: 'Design System Room', category: 'UX/UI Design' },
  { id: 'design-review', name: 'Design Review Room', category: 'UX/UI Design' },
  { id: 'accessibility', name: 'Accessibility Room', category: 'UX/UI Design' },
  { id: 'research-lab', name: 'User Research Lab', category: 'Research & Testing' },
  { id: 'usability', name: 'Usability Testing Room', category: 'Research & Testing' },
  { id: 'persona', name: 'Persona Room', category: 'Research & Testing' },
  { id: 'journey', name: 'Journey Mapping Room', category: 'Research & Testing' },
  { id: 'analytics', name: 'Analytics Room', category: 'Research & Testing' },
  { id: 'engineers', name: 'Engineers Room', category: 'Engineering & Delivery' },
  { id: 'handoff', name: 'Developer Handoff Room', category: 'Engineering & Delivery' },
  { id: 'qa', name: 'QA Room', category: 'Engineering & Delivery' },
  { id: 'incident', name: 'Production Incident Room', category: 'Engineering & Delivery' },
  { id: 'responsive', name: 'Responsive Design Room', category: 'Engineering & Delivery' },
  { id: 'scope-creep', name: 'Scope Creep Room', category: 'Product Chaos' },
  { id: 'endless-feedback', name: 'Endless Feedback Room', category: 'Product Chaos' },
  { id: 'impossible-deadline', name: 'Impossible Deadline Room', category: 'Product Chaos' },
  { id: 'nobody-asked', name: 'Feature Nobody Asked For Room', category: 'Product Chaos' },
  { id: 'impossible-brief', name: 'The Impossible Brief', category: 'Product Chaos' },
];
