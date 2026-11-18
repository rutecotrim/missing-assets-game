import type { Dialogue, ObjectDef, RoomDef, Rule } from '../../core/types';

/**
 * THE STAKEHOLDERS ROOM — the first playable room.
 *
 * Solution path (spoilers!):
 *   sofa → USB stick          whiteboard → tape        bin → torn user flow
 *   tape + torn flow → user flow (taped)
 *   table → notes, then a mug   mug → coffee machine → coffee
 *   coffee → Derek → exec badge   badge → PC (unlocks it)
 *   USB → PC     user flow → printer-scanner (page 2 arrives)
 *   PC now shows the cabinet passcode → cabinet → exit key → door
 * Optional: rubber duck (plant), stress ball (wobbly chair) → Brenda → golden
 * sticky note, biscuits (cabinet), and a daft duck+ball combination.
 */

const say = (text: string, who?: string) => ({ do: 'say' as const, text, who });
const set = (flag: string) => ({ do: 'set' as const, flag });
const give = (item: string) => ({ do: 'give' as const, item });
const take = (item: string) => ({ do: 'take' as const, item });

/** Search-style rule list: each entry yields once, then a closing line. */
function searchable(steps: { flag: string; text: string; item?: string }[], done: string): Rule[] {
  const rules: Rule[] = steps.map((s) => ({
    when: { not: { flag: s.flag } },
    do: [say(s.text), ...(s.item ? [give(s.item)] : []), set(s.flag)],
  }));
  rules.push({ do: [say(done)] });
  return rules;
}

function chair(id: string, x: number, y: number, extra: Partial<ObjectDef> = {}): ObjectDef {
  return {
    id,
    name: 'Meeting chair',
    sprite: 'chair',
    pos: { x, y },
    size: { w: 1, d: 1 },
    h: 20,
    stand: { x, y: y < 3 ? 1 : 6 },
    look: [{ do: [say('An ergonomic chair that has never once been ergonomic.')] }],
    ...extra,
  };
}

const objects: ObjectDef[] = [
  // ── walls ──
  {
    id: 'window',
    name: 'Window',
    sprite: 'window',
    wall: { side: 'right', at: 3.3, w: 1.6, z: 22, h: 34 },
    stand: { x: 4, y: 1 },
    look: [
      {
        do: [say('Fourteen floors up. A pigeon on the ledge is judging your decisions. Fair.')],
      },
    ],
  },
  {
    id: 'projector',
    name: 'Projector screen',
    sprite: 'projector',
    wall: { side: 'right', at: 5.2, w: 2.3, z: 26, h: 32 },
    stand: { x: 6, y: 1 },
    look: [
      {
        do: [
          say('Slide 1: "MAKE IT POP". Slide 2: "MAKE IT POP (MORE)". There is no slide 3. There was never going to be a slide 3.'),
        ],
      },
    ],
    nope: 'The screen has been shown worse things than that.',
  },
  {
    id: 'clock',
    name: 'Wall clock',
    sprite: 'clock',
    wall: { side: 'right', at: 1.6, w: 0.9, z: 48, h: 14 },
    stand: { x: 2, y: 1 },
    look: [{ do: [say('The clock reads 4:59 PM. It has always read 4:59 PM. Nobody has ever been allowed to leave at 5.')] }],
  },
  {
    id: 'whiteboard',
    name: 'Whiteboard',
    sprite: 'whiteboard',
    wall: { side: 'left', at: 1.3, w: 3.5, z: 18, h: 36 },
    stand: { x: 1, y: 3 },
    look: searchable(
      [
        {
          flag: 'got_tape',
          text: 'The board: "Q3 PRIORITIES — 1) Make it pop. 2) Do it faster. 3) Everything (P0)." Taped to the frame: a spare roll of masking tape.',
          item: 'tape',
        },
      ],
      '"Everything (P0)" is still up there. Someone has added "(but also P1)".',
    ),
    nope: "You hold it up to the whiteboard. It's already too full to take any more feedback.",
  },
  {
    id: 'poster',
    name: 'Motivational poster',
    sprite: 'poster',
    wall: { side: 'left', at: 5.6, w: 1.5, z: 28, h: 28 },
    stand: { x: 1, y: 6 },
    look: [{ do: [say('"HANG IN THERE." The cat on the poster looks like it has seen the Q3 roadmap.')] }],
  },
  {
    id: 'exit_door',
    name: 'Exit door',
    sprite: 'door',
    wall: { side: 'right', at: 8, w: 1.5, z: 0, h: 52 },
    stand: { x: 8, y: 1 },
    look: [
      { when: { flag: 'door_unlocked' }, do: [{ do: 'sfx', name: 'door' }, { do: 'escape' }] },
      {
        do: [
          say('Locked. A sign reads: "ROOM B is booked until 2031 for ALIGNMENT (mandatory)". The keyhole looks very brass-shaped.'),
        ],
      },
    ],
    use: {
      exit_key: [
        {
          do: [
            take('exit_key'),
            set('door_unlocked'),
            { do: 'sfx', name: 'unlock' },
            say('Click. The door swings open and a gust of fresh, meeting-free air hits you. "Alignment is overrated anyway."'),
            { do: 'sfx', name: 'door' },
            { do: 'escape' },
          ],
        },
      ],
    },
    nope: 'The door shrugs. It wants a key. A physical, brassy key.',
  },

  // ── furniture ──
  {
    id: 'plant',
    name: 'Office plant',
    sprite: 'plant',
    pos: { x: 0, y: 0 },
    size: { w: 1, d: 1 },
    h: 34,
    stand: { x: 1, y: 1 },
    look: searchable(
      [
        {
          flag: 'got_duck',
          text: 'A very healthy plant. Artificial, but nobody has told the plant. Something yellow is squeaking in the leaves... a rubber duck!',
          item: 'rubber_duck',
        },
      ],
      'The plant stares back. It has attended too many offsites.',
    ),
    use: {
      coffee: [
        {
          do: [
            { do: 'fx', kind: 'puff' },
            say('You hold the hot cup over the plant. It leans away in horror. Even plants have boundaries. You keep the coffee.'),
          ],
        },
      ],
    },
    nope: 'The plant leans away. It did not ask for this.',
  },
  {
    id: 'cabinet',
    name: 'Supply cabinet',
    sprite: 'cabinet',
    pos: { x: 1, y: 0 },
    size: { w: 2, d: 1 },
    h: 34,
    stand: { x: 2, y: 1 },
    look: [
      { when: { flag: 'cab_open' }, do: [say('Empty now, except for dust and a "Q3 Budget Request" stamped DENIED.')] },
      { do: [{ do: 'keypad', id: 'cab' }] },
    ],
    nope: 'The cabinet has a keypad. It is not interested in your item. It wants digits.',
  },
  {
    id: 'counter',
    name: 'Barista-9000',
    sprite: 'coffee',
    pos: { x: 5, y: 0 },
    size: { w: 2, d: 1 },
    h: 30,
    stand: { x: 5, y: 1 },
    look: [{ do: [say('The Barista-9000. Its display reads: "PLEASE INSERT MUG". It sounds nervous.')] }],
    use: {
      mug: [
        {
          do: [
            take('mug'),
            give('coffee'),
            { do: 'sfx', name: 'coffee' },
            { do: 'fx', kind: 'sparkle' },
            say('The machine groans, hisses, and finally produces something black, hot and unreasonably strong.'),
          ],
        },
      ],
    },
    nope: 'The machine only accepts mugs. And the occasional prayer.',
  },
  {
    id: 'table',
    name: 'Conference table',
    sprite: 'table',
    pos: { x: 3, y: 3 },
    size: { w: 4, d: 2 },
    h: 14,
    stand: { x: 2, y: 3 },
    look: searchable(
      [
        {
          flag: 'got_notes',
          text: 'A battlefield: cold coffee rings, half-eaten croissants, a 900-slide printout. Something stapled and heavily doodled sticks out. The meeting notes!',
          item: 'meeting_notes',
        },
        {
          flag: 'got_mug',
          text: 'Beneath a dead agenda, one mug has survived the whole sprint.',
          item: 'mug',
        },
      ],
      'Nothing else. Just the lingering smell of unresolved action items.',
    ),
    nope: 'You place it on the table. The table has seen worse. Nothing happens.',
  },
  chair('chair_n1', 3, 2),
  chair('chair_n2', 4, 2),
  chair('chair_n3', 6, 2),
  chair('chair_s1', 3, 5),
  chair('chair_s2', 5, 5),
  {
    ...chair('chair_wobbly', 6, 5, { name: 'Wobbly chair' }),
    sprite: 'chair_tipped',
    look: searchable(
      [
        {
          flag: 'got_ball',
          text: 'This chair has been tipped over since the Great Reorg. Under it, rolled into a corner: a stress ball marked "DEADLINE EDITION".',
          item: 'stress_ball',
        },
      ],
      'You set the chair upright. It falls over again. It has a point to make.',
    ),
  },
  {
    id: 'derek',
    name: 'Derek, VP of Everything',
    sprite: 'derek',
    pos: { x: 7, y: 3 },
    size: { w: 1, d: 1 },
    h: 30,
    stand: { x: 8, y: 3 },
    look: [
      { when: { flag: 'derek_awake' }, do: [{ do: 'talk', dialogue: 'derek_chat' }] },
      {
        do: [
          { do: 'sfx', name: 'sleepy' },
          say('Derek is out cold mid-sentence. His executive badge swings from his lanyard with every snore. He mumbles: "...synergy...". Something strong and hot might wake him.'),
        ],
      },
    ],
    use: {
      coffee: [
        {
          when: { not: { flag: 'derek_awake' } },
          do: [take('coffee'), set('derek_awake'), { do: 'fx', kind: 'sparkle' }, { do: 'talk', dialogue: 'derek_wakes' }],
        },
      ],
      biscuits: [
        {
          do: [say('Derek eats the biscuit without opening an eye. "...approved," he murmurs. You keep the tin. You are not a monster.')],
        },
      ],
    },
    nope: 'Derek slumbers on. He has been unimpressed by better offers.',
  },
  {
    id: 'sofa',
    name: 'Sofa',
    sprite: 'sofa',
    pos: { x: 0, y: 6 },
    size: { w: 2, d: 3 },
    h: 20,
    stand: { x: 2, y: 7 },
    look: searchable(
      [
        {
          flag: 'got_usb',
          text: "You dig between the cushions: crumbs, a coin from a country that no longer exists, regret... and a USB stick labelled \"FINAL_v7_REAL_final2\".",
          item: 'usb',
        },
      ],
      'The cushions have nothing left to give. Only the dent of somebody’s 4-hour workshop.',
    ),
  },
  {
    id: 'bin',
    name: 'Wastepaper bin',
    sprite: 'bin',
    pos: { x: 2, y: 8 },
    size: { w: 1, d: 1 },
    h: 14,
    stand: { x: 3, y: 8 },
    look: searchable(
      [
        {
          flag: 'got_torn',
          text: "Crumpled paper, a banana peel, and half a printed user flow. Somebody really did not like the checkout step. You fish out both halves.",
          item: 'torn_flow',
        },
      ],
      'Only the banana peel remains. At this point it is load-bearing.',
    ),
  },
  {
    id: 'pc',
    name: 'Room PC',
    sprite: 'pc',
    pos: { x: 9, y: 3 },
    size: { w: 1, d: 2 },
    h: 26,
    stand: { x: 8, y: 4 },
    look: [
      {
        when: { all: [{ flag: 'pc_on' }, { flag: 'usb_in' }, { flag: 'scanned' }] },
        do: [set('saw_code'), { do: 'screen', id: 'pc' }],
      },
      { when: { flag: 'pc_on' }, do: [{ do: 'screen', id: 'pc' }] },
      {
        do: [
          say('The meeting-room PC. The screen says: "TAP EXEC BADGE TO UNLOCK". A sticky note adds: "Password: ask Derek". Derek is asleep.'),
        ],
      },
    ],
    use: {
      badge: [
        {
          when: { not: { flag: 'pc_on' } },
          do: [
            set('pc_on'),
            { do: 'sfx', name: 'beep' },
            { do: 'fx', kind: 'sparkle' },
            say('Beep! The PC wakes up with the enthusiasm of someone who has been asked to "just quickly" do something.'),
            { do: 'screen', id: 'pc' },
          ],
        },
        { do: [{ do: 'screen', id: 'pc' }] },
      ],
      usb: [
        {
          when: { all: [{ flag: 'pc_on' }, { not: { flag: 'usb_in' } }] },
          do: [
            set('usb_in'),
            { do: 'sfx', name: 'beep' },
            { do: 'fx', kind: 'sparkle' },
            say("You plug the USB stick in on the first try. Statistically, this has never happened before. Don't question it."),
            { do: 'screen', id: 'pc' },
          ],
        },
        {
          when: { flag: 'usb_in' },
          do: [say("It's already plugged in. The PC is full of USB sticks and regret.")],
        },
        {
          do: [
            { do: 'sfx', name: 'bad' },
            say('The screen is locked, so the USB port stays dark and unmoved. The PC wants a badge first.'),
          ],
        },
      ],
    },
    nope: 'The PC beeps in a way that means "no".',
  },
  {
    id: 'printer',
    name: 'Printer-scanner',
    sprite: 'printer',
    pos: { x: 9, y: 6 },
    size: { w: 1, d: 1 },
    h: 20,
    stand: { x: 8, y: 6 },
    look: [
      { when: { flag: 'scanned' }, do: [say('The printer glows smugly. For once, it did its job. Let us not talk about it.')] },
      { do: [say('A multifunction printer-scanner. 40% of all office misery. The display reads: "PLACE DOCUMENT ON GLASS".')] },
    ],
    use: {
      user_flow: [
        {
          when: { not: { flag: 'scanned' } },
          do: [
            set('scanned'),
            { do: 'sfx', name: 'beep' },
            { do: 'fx', kind: 'sparkle' },
            say('You lay the taped-up user flow on the glass. The scanner hums, thinks about it, and beeps: "SCAN COMPLETE — Stakeholder_Alignment_FINAL_v7.pdf (page 2) sent to room PC." You take your flow back.'),
          ],
        },
        { do: [say('It has already been scanned once. The printer refuses to do the same thing twice. Typical.')] },
      ],
      torn_flow: [
        { do: [say('The printer rejects it. "PAPER JAM: the paper is already in two pieces." You feel seen.')] },
      ],
    },
    nope: 'The printer flashes "PC LOAD LETTER". Nobody knows what that means.',
  },
  {
    id: 'pizza',
    name: 'Pizza box',
    sprite: 'pizza',
    pos: { x: 8, y: 8 },
    size: { w: 1, d: 1 },
    h: 8,
    solid: false,
    stand: { x: 7, y: 8 },
    look: [{ do: [say('The Q2 kickoff pizza. One slice left. It is Q4.')] }],
  },
  {
    id: 'balloons',
    name: 'Balloons',
    sprite: 'balloons',
    pos: { x: 9, y: 8 },
    size: { w: 1, d: 1 },
    h: 44,
    stand: { x: 8, y: 9 },
    look: [{ do: [say('"CONGRATS ON SHIPPING!" Nothing has shipped. One balloon is slowly deflating, like morale.')] }],
  },

  // ── people ──
  {
    id: 'brenda',
    name: 'Brenda, Stakeholder',
    sprite: 'npc',
    stand: { x: 0, y: 0 },
    h: 28,
    npc: {
      startsAt: { x: 4, y: 7 },
      patrol: [
        { x: 4, y: 7 },
        { x: 8, y: 7 },
      ],
      skin: '#f1c9a5',
      hair: '#7b2d26',
      hairStyle: 'long',
      shirt: '#e8453c',
      pants: '#2b2d42',
      lanyard: true,
    },
    look: [{ do: [{ do: 'talk', dialogue: 'brenda' }] }],
    use: {
      stress_ball: [
        {
          when: { not: { flag: 'brenda_happy' } },
          do: [take('stress_ball'), set('brenda_happy'), { do: 'talk', dialogue: 'brenda_thanks' }],
        },
      ],
      squeezy_duck: [
        {
          when: { not: { flag: 'brenda_happy' } },
          do: [take('squeezy_duck'), set('brenda_happy'), { do: 'talk', dialogue: 'brenda_thanks_duck' }],
        },
      ],
    },
    nope: "Brenda glances at it. \"Is that for the deck? Make it bigger.\"",
  },
  {
    id: 'sam',
    name: 'Sam, Intern',
    sprite: 'npc',
    stand: { x: 0, y: 0 },
    h: 28,
    npc: {
      startsAt: { x: 2, y: 4 },
      skin: '#c68a5b',
      hair: '#2a1b12',
      hairStyle: 'curly',
      shirt: '#3fb7a8',
      pants: '#4b5d8a',
      glasses: true,
      facing: { front: true, right: true },
    },
    look: [{ do: [{ do: 'talk', dialogue: 'sam' }] }],
    nope: 'Sam looks at it nervously. "Is that mine? Do I need to present it?"',
  },
];

const dialogues: Dialogue[] = [
  {
    id: 'derek_wakes',
    start: [{ node: 'a' }],
    nodes: {
      a: { who: 'Derek', text: "Wha— I wasn't sleeping. I was visualising the roadmap with my eyes closed.", next: 'b' },
      b: { who: 'Derek', text: 'Ooh. Coffee. Bless you. ...Wait, who are you?', next: 'c' },
      c: { who: 'You', text: "The designer. You invited me to a 'quick sync'. Three hours ago.", next: 'd' },
      d: {
        who: 'Derek',
        text: "Right! Great energy. Look, the room PC needs my badge. Take it. I never log in anyway. Oh, and there's a code for the supply cabinet in the Alignment doc. Security is a journey.",
        do: [give('badge')],
      },
    },
  },
  {
    id: 'derek_chat',
    start: [{ node: 'hi' }],
    nodes: {
      hi: {
        who: 'Derek',
        text: "Hm? Oh, it's you. Great energy. Anything on your mind? I have seven minutes before my next 'quick sync'.",
        choices: [
          { text: 'Any advice?', next: 'advice' },
          { text: 'About that cabinet...', next: 'cab' },
          { text: "Nope. Carry on, Derek.", next: 'bye' },
        ],
      },
      advice: {
        who: 'Derek',
        text: "Always say 'let's take this offline'. It works on every problem, including fire.",
        next: 'hi',
      },
      cab: {
        who: 'Derek',
        text: "The code's in the Alignment PDF. On the PC. Page two, I think? Page two is... on paper somewhere. Do you have a USB? Everybody has a USB. Nobody has the right one.",
        next: 'hi',
      },
      bye: { who: 'Derek', text: "Love that. Let's circle back. *eyes drift closed*" },
    },
  },
  {
    id: 'brenda',
    start: [{ when: { flag: 'brenda_happy' }, node: 'happy' }, { node: 'intro' }],
    nodes: {
      intro: {
        who: 'Brenda',
        text: "Oh good, a designer! Can you make the logo bigger? Also smaller? I'm just SO aligned right now. AARGH.",
        choices: [
          { text: 'You seem stressed.', next: 'stressed' },
          { text: 'Any idea how to get out of here?', next: 'out' },
          { text: 'Just passing through.', next: 'bye' },
        ],
      },
      stressed: {
        who: 'Brenda',
        text: "Stressed? I'm FINE. Nine meetings today, every one could have been an email about a different meeting. If only I had something to squeeze...",
        next: 'intro',
      },
      out: {
        who: 'Brenda',
        text: "Out? Nobody leaves Room B without alignment! Derek has the badge, the cabinet has a key, and I have a meeting in four minutes. Ask Sam, the intern. He reads every Slack channel.",
        next: 'intro',
      },
      bye: { who: 'Brenda', text: "Great! Please send me the file. In the shared folder. The other shared folder." },
      happy: {
        who: 'Brenda',
        text: '*squeeze* ...mmm. This is the most productive I have felt all quarter. You should be CEO.',
        choices: [{ text: 'Glad to help.', next: 'bye2' }],
      },
      bye2: { who: 'Brenda', text: 'Let me know when you have bandwidth to ideate!' },
    },
  },
  {
    id: 'brenda_thanks',
    start: [{ node: 'a' }],
    nodes: {
      a: { who: 'Brenda', text: '*squeeeeeze* Oh. OH. That is so much better. I can see colours again.', next: 'b' },
      b: {
        who: 'Brenda',
        text: 'Here, take this. It was stuck to my shoe since the offsite. They say it is a "Golden Sticky Note" for alignment excellence.',
        do: [give('golden_sticky')],
      },
    },
  },
  {
    id: 'brenda_thanks_duck',
    start: [{ node: 'a' }],
    nodes: {
      a: { who: 'Brenda', text: '*squeak* ...a stress ball AND a duck? You are the most thoughtful person on this entire floor.', next: 'b' },
      b: {
        who: 'Brenda',
        text: 'Here, take this. It was stuck to my shoe since the offsite. A "Golden Sticky Note". Apparently for alignment excellence.',
        do: [give('golden_sticky')],
      },
    },
  },
  {
    id: 'sam',
    start: [{ node: 'hi' }],
    nodes: {
      hi: {
        who: 'Sam',
        text: "Hi! I'm Sam, the intern. I've been in this meeting since Tuesday. Is it still Tuesday?",
        choices: [
          { text: "I'm stuck. Any hints?", next: 'hintA', when: { not: { flag: 'got_usb' } } },
          { text: "I'm stuck. Any hints?", next: 'hintB', when: { all: [{ flag: 'got_usb' }, { not: { flag: 'pc_on' } }] } },
          {
            text: "I'm stuck. Any hints?",
            next: 'hintC',
            when: { all: [{ flag: 'pc_on' }, { not: { flag: 'saw_code' } }] },
          },
          { text: "I'm stuck. Any hints?", next: 'hintD', when: { flag: 'saw_code' } },
          { text: 'Who are you again?', next: 'who' },
          { text: 'Good luck, Sam.', next: 'bye' },
        ],
      },
      hintA: {
        who: 'Sam',
        text: "Honestly? Search stuff. Sofa cushions are a goldmine. Tables, bins, plants, wobbly chairs... I once found a lost deadline in the ficus.",
        next: 'hi',
      },
      hintB: {
        who: 'Sam',
        text: "The room PC wants an exec badge. Derek has one. He's asleep, so, er, something hot and bitter might help? There's a machine by the projector screen. It takes mugs.",
        next: 'hi',
      },
      hintC: {
        who: 'Sam',
        text: "If the PC says a page is missing, maybe it's on paper somewhere? The printer-scanner is right there. And things that tear... can be taped. I think. I'm an intern.",
        next: 'hi',
      },
      hintD: {
        who: 'Sam',
        text: 'Code on the screen... cabinet... key... door. Easy! (It will not be easy. It never is.)',
        next: 'hi',
      },
      who: {
        who: 'Sam',
        text: "I'm the intern. I was hired to 'help with research'. So far I have researched where to get oat milk. Also: Brenda looks stressed. She'd probably trade you something for a squeeze.",
        next: 'hi',
      },
      bye: { who: 'Sam', text: "Thanks! If you find a way out... can you tell the others it's still Tuesday?" },
    },
  },
];

export const stakeholdersRoom: RoomDef = {
  id: 'stakeholders',
  name: 'The Stakeholders Room',
  category: 'Product & Management',
  tagline: 'The meeting that could have been an email.',
  objective: 'Find a way out of the alignment meeting.',
  size: { w: 10, d: 10 },
  palette: {
    floorA: '#5f8f9b',
    floorB: '#58848f',
    wallRight: '#f3d6a1',
    wallLeft: '#e8b08a',
    trim: '#a8613d',
    slab: '#3a2a4b',
  },
  spawn: { x: 5, y: 8 },
  intro: [
    "Mmm... where am I? The 'quick sync' you joined at 14:00 is now into its fourth hour, and the door has locked itself behind you.",
    'A sign reads: "ROOM B is booked until 2031." Time to escape. Click around, collect things, then drag items from your inventory onto stuff — or onto each other — and see what happens.',
  ],
  objects,
  dialogues,
  keypads: [
    {
      id: 'cab',
      title: 'SUPPLY CABINET',
      code: '4172',
      quips: {
        '1234': 'Too obvious. Even for stakeholders.',
        '0000': "Default passcode? In THIS economy?",
        '1111': '...really?',
        '2031': 'The room is booked until 2031. Sadly, not the code.',
        '4321': 'Counting down is not a strategy.',
      },
      success: [
        set('cab_open'),
        give('exit_key'),
        give('biscuits'),
        { do: 'fx', kind: 'sparkle', at: 'cabinet' },
        say('The cabinet clunks open. Inside: a brass key tagged "ROOM B" and a tin of emergency biscuits. Priorities.'),
      ],
    },
  ],
  screens: [
    {
      id: 'pc',
      title: 'ROOM-B-PC  —  Desktop',
      views: [
        {
          when: { all: [{ flag: 'usb_in' }, { flag: 'scanned' }] },
          lines: [
            '> opening **Stakeholder_Alignment_FINAL_v7.pdf**',
            '',
            'PAGE 1 / 2   "Alignment is a journey. Please do not ask where it ends."',
            '',
            'PAGE 2 / 2   (scanned)',
            '   SUPPLY CABINET PASSCODE:',
            '   **4 · 1 · 7 · 2**',
            '   (Do not share. Share with Brenda.)',
          ],
          chips: [{ text: 'USB: connected' }, { text: 'SCAN: merged' }],
        },
        {
          when: { flag: 'usb_in' },
          lines: [
            '> opening **Stakeholder_Alignment_FINAL_v7.pdf**',
            '',
            'PAGE 1 / 2   "Alignment is a journey. Please do not ask where it ends."',
            '',
            'PAGE 2 / 2   **[ FILE NOT FOUND ]**',
            '   Note in footer: "Page 2 exists on paper somewhere."',
            '   Hint: the scanner can send pages to this PC.',
          ],
          chips: [{ text: 'USB: connected' }, { text: 'SCAN: waiting' }],
        },
        {
          when: { flag: 'scanned' },
          lines: [
            '> new file: **Scan_0001.png** (user flow, bottom footer: "p.2")',
            '',
            'It looks like part of a document. The main file is nowhere to be found.',
            'Maybe it lives on a USB stick somewhere in this room.',
          ],
          chips: [{ text: 'USB: empty' }, { text: 'SCAN: received' }],
        },
        {
          lines: [
            'Welcome back, **Derek**.',
            '',
            '3 unread:  "Re: Re: Re: Fwd: Alignment"',
            '           "Quick sync? (30 min)"',
            '           "URGENT: new brand colour"',
            '',
            'No removable media detected.',
          ],
          chips: [{ text: 'USB: empty' }, { text: 'SCAN: none' }],
        },
      ],
    },
  ],
  optional: ['rubber_duck', 'golden_sticky', 'biscuits'],
  decals: [
    { sprite: 'rug', pos: { x: 2, y: 2 }, size: { w: 6, d: 4 } },
    { sprite: 'scraps', pos: { x: 1, y: 7 }, size: { w: 1, d: 1 } },
    { sprite: 'scraps', pos: { x: 6, y: 8 }, size: { w: 1, d: 1 } },
  ],
};
