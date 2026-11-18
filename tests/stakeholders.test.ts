import { describe, expect, it } from 'vitest';
import { Session, freshRoomState } from '../src/core/session';
import { stakeholdersRoom } from '../src/data/rooms/stakeholders';
import { ITEMS } from '../src/data/items';
import type { GameEvent } from '../src/core/types';

function start(carry: string[] = []) {
  const events: GameEvent[] = [];
  const s = new Session(stakeholdersRoom, freshRoomState(stakeholdersRoom, carry), (e) => events.push(e));
  /** Click through all pending narration, picking `choices` for dialogue menus. */
  const drain = (pick = 0) => {
    let guard = 50;
    while (s.beat && guard--) {
      if (s.beat.kind === 'modal') s.closeModal();
      else if (s.beat.kind === 'node') {
        const node = s.dialogueNode(s.beat);
        const vis = s.visibleChoices(node);
        s.next(vis.length ? vis[Math.min(pick, vis.length - 1)].index : undefined);
      } else s.next();
    }
  };
  return { s, events, drain };
}

describe('data integrity', () => {
  it('every item referenced anywhere exists', () => {
    const json = JSON.stringify(stakeholdersRoom);
    const ids = [...json.matchAll(/"(?:item|give|take|gives|a|b)":"([a-z_]+)"/g)].map((m) => m[1]);
    for (const id of ids) {
      if (ITEMS[id]) continue;
      // `a`/`b` also match unrelated keys; only fail for things that look like items
      if (/^[a-z_]+$/.test(id) && !['x', 'y', 'w', 'd'].includes(id)) expect(ITEMS[id], id).toBeDefined();
    }
  });
  it('every object stand tile is inside the room', () => {
    for (const o of stakeholdersRoom.objects) {
      if (o.npc) continue;
      expect(o.stand.x).toBeGreaterThanOrEqual(0);
      expect(o.stand.y).toBeLessThan(stakeholdersRoom.size.d);
    }
  });
});

describe('Stakeholders Room', () => {
  it('can be escaped by following the intended chain', () => {
    const { s, drain } = start();
    const click = (id: string) => (s.inspect(id), drain());
    const use = (item: string, id: string) => {
      expect(s.has(item), `has ${item}`).toBe(true);
      s.useItemOn(item, id);
      drain();
    };

    click('sofa'); // usb
    click('bin'); // user flow
    expect(s.has('user_flow')).toBe(true);

    click('table'); // notes
    click('table'); // mug
    use('mug', 'counter');
    expect(s.has('coffee')).toBe(true);
    use('coffee', 'derek');
    expect(s.has('badge')).toBe(true);

    // USB before the badge must NOT work
    s.useItemOn('usb', 'pc');
    drain();
    expect(s.flag('usb_in')).toBe(false);

    use('badge', 'pc');
    use('usb', 'pc');
    expect(s.flag('usb_in')).toBe(true);
    use('user_flow', 'printer');
    expect(s.flag('scanned')).toBe(true);
    expect(s.has('user_flow')).toBe(true); // reusable
    click('pc');
    expect(s.flag('saw_code')).toBe(true);

    // wrong code first
    expect(s.tryCode('cab', '1234').ok).toBe(false);
    s.inspect('cabinet');
    expect(s.beat?.kind).toBe('modal');
    expect(s.tryCode('cab', '4172').ok).toBe(true);
    drain();
    expect(s.has('exit_key')).toBe(true);

    expect(s.escaped).toBe(false);
    use('exit_key', 'exit_door');
    expect(s.escaped).toBe(true);
  });

  it('keeps persistent items for later rooms', () => {
    const { s, drain } = start();
    s.inspect('sofa');
    drain();
    s.inspect('plant');
    drain();
    s.inspect('whiteboard');
    drain();
    expect(s.carryOut().sort()).toEqual(['rubber_duck', 'usb']);
  });

  it('rewards the optional stress ball → Brenda → golden sticky note', () => {
    const { s, drain } = start();
    s.inspect('chair_wobbly');
    drain();
    s.useItemOn('stress_ball', 'brenda');
    drain();
    expect(s.has('golden_sticky')).toBe(true);
    expect(s.has('stress_ball')).toBe(false);
  });

  it('wrong uses give feedback and keep the item', () => {
    const { s, drain, events } = start();
    s.inspect('sofa');
    drain();
    expect(s.useItemOn('usb', 'exit_door')).toBe(false);
    expect(s.has('usb')).toBe(true);
    expect(events.some((e) => e.type === 'use-result' && !e.ok)).toBe(true);
  });

  it('the cabinet rejects wrong codes with quips', () => {
    const { s } = start();
    s.inspect('cabinet');
    expect(s.tryCode('cab', '1234').quip).toMatch(/obvious/i);
    expect(s.tryCode('cab', '9999').ok).toBe(false);
  });
});

describe('backpack size', () => {
  it('uses the room slot count and refuses overflow', () => {
    expect(start().s.capacity).toBe(12);
    const small = { ...stakeholdersRoom, slots: 2 };
    const s = new Session(small, freshRoomState(small, []));
    expect(s.addItem('usb')).toBe(true);
    expect(s.addItem('mug')).toBe(true);
    expect(s.addItem('badge')).toBe(false);
    expect(s.inventory).toEqual(['usb', 'mug']);
  });
});
