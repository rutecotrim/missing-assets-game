import type { ItemDef } from '../core/types';

/**
 * Every item in the game. Items are global (not per-room) so they can travel:
 * `persist: true` items stay in the inventory when the player escapes a room.
 * To add an item: add it here, give it an icon in engine/icons.ts, then
 * hand it out from a room's rules with `{ do: 'give', item: '...' }`.
 */
const list: ItemDef[] = [
  {
    id: 'meeting_notes',
    name: 'Meeting notes',
    kind: 'document',
    icon: 'notes',
    desc: 'Notes from the last alignment sync. 80% doodles, 20% action items.',
    examine:
      "ALIGNMENT SYNC (14 attendees, 0 decisions)\n• Derek: \"Let's circle back.\" (Derek has not been awake since.)\n• Derek's exec badge opens the room PC. Derek needs coffee first.\n• The cabinet passcode lives in the Alignment doc. Page 2 is \"on paper somewhere\".\n• Brenda needs something to squeeze. Please. Urgently.\n• Action: whoever printed the user flow, please scan it. The flatbed works.",
    nope: ['The notes have no opinion on this. Unusual for notes.'],
  },
  {
    id: 'mug',
    name: 'Mug',
    kind: 'tool',
    icon: 'mug',
    desc: "A mug reading \"World's Okayest Designer\". Empty, thankfully.",
    examine: 'There is a faint ring of coffee at the bottom. It has been there since Q1.',
    nope: ['The mug politely holds nothing.'],
  },
  {
    id: 'coffee',
    name: 'Hot coffee',
    kind: 'tool',
    icon: 'coffee',
    desc: 'Fresh, black and aggressively strong. Could wake an executive.',
    examine: 'It smells like deadlines and good intentions.',
  },
  {
    id: 'usb',
    name: 'USB stick',
    kind: 'digital',
    icon: 'usb',
    persist: true,
    desc: 'A USB stick labelled "FINAL_v7_REAL_final2".',
    examine:
      'In pencil underneath: "Q3 deck backup. DO NOT LOSE. — PM Priya". It looks like it would fit more than one computer, in more than one room.',
    nope: [
      'You wave the USB stick around. Nothing plugs in. It only works one way. Or three.',
      'Wrong port. Of course it was the wrong port.',
    ],
  },
  {
    id: 'user_flow',
    name: 'User flow',
    kind: 'clue',
    icon: 'flow',
    desc: 'A crumpled printed user flow. Someone tore out the checkout step, but the rest is readable.',
    examine:
      'Landing → Sign up → ??? → Delight.\nIn the footer: "p.2 of Stakeholder_Alignment_FINAL_v7 — scan me into the PDF." That was page two.',
  },
  {
    id: 'stress_ball',
    name: 'Stress ball',
    kind: 'funny',
    icon: 'ball',
    desc: 'A stress ball printed with "DEADLINE EDITION". It squeezes back.',
    examine: 'Someone has bitten it. Several times.',
  },
  {
    id: 'rubber_duck',
    name: 'Rubber duck',
    kind: 'funny',
    icon: 'duck',
    persist: true,
    collectible: true,
    desc: 'A debugging duck. Excellent listener, terrible at feedback.',
    examine: 'It has heard things in this room that no duck should hear.',
  },
  {
    id: 'golden_sticky',
    name: 'Golden sticky note',
    kind: 'funny',
    icon: 'golden',
    persist: true,
    collectible: true,
    desc: 'Awarded for exceptional stakeholder alignment. Legally worthless.',
    examine: 'It says "GOOD JOB" in a handwriting you don\'t recognise. It feels strangely powerful.',
  },
  {
    id: 'badge',
    name: 'Executive badge',
    kind: 'key',
    icon: 'badge',
    persist: true,
    desc: "Derek's all-access badge. His photo is from 2011. He had hair.",
    examine: 'Access level: EVERYTHING. Expiry: never. Competence level: unverified.',
    nope: ['The badge beeps in a "you wish" kind of way.'],
  },
  {
    id: 'biscuits',
    name: 'Emergency biscuits',
    kind: 'funny',
    icon: 'biscuits',
    collectible: true,
    desc: 'Emergency biscuits for emergency meetings. Expired in 2022.',
    examine: 'Stakeholders will still eat them. Stakeholders have seen worse.',
  },
  {
    id: 'exit_key',
    name: 'Exit key',
    kind: 'key',
    icon: 'key',
    desc: 'A brass key tagged "ROOM B — DO NOT LOSE (again)".',
    examine: 'It has seen some things. Most of them were roadmap reviews.',
    nope: ['A key wants a lock. This is not a lock.'],
  },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map((i) => [i.id, i]));
