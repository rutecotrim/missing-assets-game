import '@fontsource/press-start-2p';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './style.css';

import { Session, freshRoomState } from './core/session';
import type { GameEvent, Profile, RoomDef } from './core/types';
import { CATALOG, PLAYABLE } from './data/rooms';
import { ITEMS } from './data/items';
import { Scene, LH, LW } from './engine/scene';
import { audio } from './engine/audio';
import { iconImg } from './engine/icons';
import { InventoryUI } from './ui/inventory';
import { DialogueUI } from './ui/dialogue';
import { openKeypad, openScreen } from './ui/overlays';
import { confirmDialog, howToPlay } from './ui/dialogs';

// ───────────────────────── profile ─────────────────────────

const SAVE_KEY = 'missing-assets:v1';

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { completed: [], carry: [], collection: [], rooms: {}, muted: false, ...JSON.parse(raw) };
  } catch {
    /* private mode etc. */
  }
  return { completed: [], carry: [], collection: [], rooms: {}, muted: false };
}
function saveProfile() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}
const profile = loadProfile();
// Drop items from older saves that no longer exist.
profile.carry = profile.carry.filter((id) => ITEMS[id]);
profile.collection = profile.collection.filter((id) => ITEMS[id]);
for (const rs of Object.values(profile.rooms)) rs.inventory = rs.inventory.filter((id) => ITEMS[id]);
audio.setMuted(profile.muted);

const app = document.getElementById('app')!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

let teardown: (() => void) | null = null;
function show(node: HTMLElement, cleanup?: () => void) {
  teardown?.();
  teardown = cleanup ?? null;
  app.textContent = '';
  app.appendChild(node);
}

// ───────────────────────── title ─────────────────────────

function hasSave() {
  return profile.completed.length > 0 || Object.keys(profile.rooms).length > 0 || profile.carry.length > 0;
}

function levelNo(id: string): number {
  return CATALOG.findIndex((c) => c.id === id) + 1;
}

function saveSummary(): string {
  const room = profile.lastRoom && profile.rooms[profile.lastRoom] ? PLAYABLE[profile.lastRoom] : undefined;
  const bits = [room ? `Level ${levelNo(room.id)}: ${room.name} (in progress)` : 'In the Lobby', `${profile.completed.length}/${CATALOG.length} rooms escaped`];
  if (profile.lastSaved) bits.push(`saved ${new Date(profile.lastSaved).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`);
  return bits.join(' · ');
}

function continueGame() {
  const room = profile.lastRoom && profile.rooms[profile.lastRoom] ? PLAYABLE[profile.lastRoom] : undefined;
  if (room) startRoom(room);
  else lobby();
}

function wipeSave() {
  profile.completed = [];
  profile.carry = [];
  profile.collection = [];
  profile.rooms = {};
  profile.lastRoom = undefined;
  profile.lastSaved = undefined;
  saveProfile();
}

function titleScreen() {
  const s = el('main', 'screen titlescreen');
  const save = hasSave();
  s.innerHTML = `
    <div class="logo">
      <span class="pre">THE ESCAPE ROOM THAT'S ALSO YOUR CALENDAR</span>
      <h1><span>MISSING</span><span>ASSETS</span></h1>
      <p class="motto">Collect. Connect. Escape.</p>
    </div>
    <div class="title-art" aria-hidden="true"></div>
    <div class="menu">
      ${save ? '<button class="btn big" data-act="continue">Continue saved game</button><p class="save-info"></p>' : ''}
      <button class="btn ${save ? 'ghost' : 'big'}" data-act="new">New game</button>
      <button class="btn ghost" data-act="how">How to play</button>
    </div>
    <p class="credit">An isometric adventure about surviving product design.</p>`;
  if (save) s.querySelector('.save-info')!.textContent = saveSummary();
  const art = s.querySelector('.title-art')!;
  for (const icon of ['usb', 'notes', 'coffee', 'badge', 'coffee', 'duck', 'key', 'flow']) {
    const i = iconImg(icon, 'float');
    i.style.setProperty('--d', `${Math.random() * 3}s`);
    art.appendChild(i);
  }
  const host = el('div', 'modal-host');
  s.appendChild(host);
  s.querySelector('[data-act=continue]')?.addEventListener('click', () => {
    audio.sfx('pickup');
    continueGame();
  });
  s.querySelector('[data-act=new]')!.addEventListener('click', () => {
    const begin = () => {
      wipeSave();
      audio.sfx('pickup');
      lobby();
    };
    if (save) confirmDialog(host, 'START A NEW GAME?', 'This erases your saved progress, including items you carried over.', 'Erase and start', begin);
    else begin();
  });
  s.querySelector('[data-act=how]')!.addEventListener('click', () => howToPlay(host));
  show(s);
}

// ───────────────────────── lobby ─────────────────────────

function lobby() {
  audio.playTrack('lobby');
  const s = el('main', 'screen lobby');
  const done = profile.completed.length;
  s.innerHTML = `
    <header class="lobby-head">
      <button class="btn small ghost" data-act="back">← Title</button>
      <div><h1>THE LOBBY</h1><p>Company HQ · ${done}/${CATALOG.length} rooms escaped</p></div>
      <button class="btn small ghost" data-act="mute">${profile.muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
    </header>
    <section class="carry panel"><h2>CARRIED BETWEEN ROOMS</h2><div class="carry-items"></div></section>
    <div class="floors"></div>`;
  s.querySelector('[data-act=back]')!.addEventListener('click', titleScreen);
  s.querySelector('[data-act=mute]')!.addEventListener('click', (e) => {
    profile.muted = !profile.muted;
    audio.setMuted(profile.muted);
    saveProfile();
    (e.target as HTMLElement).textContent = profile.muted ? '🔇 Sound off' : '🔊 Sound on';
  });

  const carry = s.querySelector('.carry-items')!;
  const seen = [...new Set([...profile.carry, ...profile.collection])];
  if (!seen.length) carry.innerHTML = '<p class="empty">Nothing yet. Some items are too useful to leave behind...</p>';
  for (const id of seen) {
    const it = ITEMS[id];
    if (!it) continue;
    const chip = el('div', `chip-item${profile.carry.includes(id) ? '' : ' faded'}`);
    chip.title = `${it.name} — ${it.desc}`;
    chip.appendChild(iconImg(it.icon));
    chip.appendChild(el('span', '', it.name));
    carry.appendChild(chip);
  }

  const floors = s.querySelector('.floors')!;
  let lastCat = '';
  let firstUnplayedMarked = false;
  let section: HTMLElement | null = null;
  for (const entry of CATALOG) {
    if (entry.category !== lastCat) {
      lastCat = entry.category;
      section = el('section', 'floor');
      section.appendChild(el('h2', '', entry.category.toUpperCase()));
      section.appendChild(el('div', 'rooms'));
      floors.appendChild(section);
    }
    const room = PLAYABLE[entry.id];
    const finished = profile.completed.includes(entry.id);
    const card = el('button', 'room-card');
    card.innerHTML = `<span class="rn"></span><span class="rs"></span>`;
    (card.querySelector('.rn') as HTMLElement).textContent = entry.name;
    const status = card.querySelector('.rs') as HTMLElement;
    if (room) {
      card.classList.add(finished ? 'done' : 'open');
      status.textContent = finished ? '✓ ESCAPED · replay' : '▶ PLAY';
      if (!finished && !firstUnplayedMarked) {
        card.classList.add('next');
        firstUnplayedMarked = true;
      }
      card.addEventListener('click', () => {
        audio.sfx('click');
        startRoom(room);
      });
    } else {
      card.classList.add('locked');
      card.disabled = true;
      status.textContent = '🔒 COMING SOON';
    }
    section!.querySelector('.rooms')!.appendChild(card);
  }
  show(s);
}

// ───────────────────────── game ─────────────────────────

function startRoom(room: RoomDef, fresh = false) {
  audio.playTrack(room.music);
  profile.lastRoom = room.id;
  const finished = profile.completed.includes(room.id);
  let state = !fresh && !finished ? profile.rooms[room.id] : undefined;
  const isNew = !state;
  if (!state) {
    state = freshRoomState(room, profile.carry);
    profile.rooms[room.id] = state;
  }
  const startedAt = Date.now();

  const root = el('div', 'game');
  const header = el('header', 'hud');
  header.innerHTML = `
    <button class="btn small ghost" data-act="lobby">← Lobby</button>
    <div class="titles"><h1></h1><p class="objective"></p></div>
    <div class="hud-btns">
      <button class="btn small ghost" data-act="save" title="Save your progress now">Save</button>
      <button class="btn small ghost" data-act="how" title="How to play">?</button>
      <button class="btn small ghost" data-act="hints" title="Highlight things you haven't looked at yet (H)">✦ Hints</button>
      <button class="btn small ghost" data-act="mute"></button>
      <button class="btn small ghost" data-act="reset" title="Restart this room">↺</button>
    </div>`;
  header.querySelector('h1')!.textContent = room.name;
  header.querySelector('.objective')!.textContent = room.objective;
  const layout = el('div', 'layout');
  const stageWrap = el('div', 'stage-wrap');
  const stage = el('div', 'stage');
  const col = el('div', 'main-col');
  col.append(header, stage);
  stageWrap.appendChild(col);
  const toasts = el('div', 'toasts');
  const tip = el('div', 'tip hidden');
  const status = el('div', 'status hidden');
  stage.append(toasts, tip, status);
  layout.appendChild(stageWrap);
  root.append(layout);
  const modalHost = el('div', 'modal-host');
  root.appendChild(modalHost);

  // ── wiring ──
  let scene: Scene;
  let inv: InventoryUI;
  let dragItem: string | null = null;
  const gained: string[] = [];
  const onEvent = (e: GameEvent) => {
    switch (e.type) {
      case 'sfx':
        audio.sfx(e.name);
        break;
      case 'toast':
        toast(e.text, e.tone);
        break;
      case 'gain': {
        const it = ITEMS[e.item];
        if (it?.collectible && !profile.collection.includes(e.item)) profile.collection.push(e.item);
        gained.push(e.item);
        scene?.handleEvent(e);
        inv?.render();
        const from = scene?.objectClientCenter(e.from);
        const rect = inv?.slotRect(e.item);
        if (from && rect) flyIcon(it.icon, from.x, from.y, rect.left + rect.width / 2, rect.top + rect.height / 2);
        break;
      }
      case 'state':
        saveProfile();
        inv?.render();
        dlg.update();
        syncModal();
        break;
      case 'beat':
        dlg.update();
        syncModal();
        break;
      case 'use-result':
        inv?.flash(e.item, e.ok ? 'good' : 'bad');
        scene?.handleEvent(e);
        break;
      default:
        scene?.handleEvent(e);
    }
  };

  const session = new Session(room, state, onEvent);
  const dlg = new DialogueUI(session);
  stage.appendChild(dlg.el);

  scene = new Scene(session, {
    onHover: (o, cx, cy) => {
      if (!o || session.busy) return tip.classList.add('hidden');
      const armed = inv.armedId ?? dragItem;
      tip.textContent = armed ? `Use ${ITEMS[armed].name} on ${o.name}` : o.name;
      tip.classList.remove('hidden');
      // Keep the label fully inside the stage: flip to the left / below the cursor when it would overflow.
      const r = stage.getBoundingClientRect();
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const px_ = cx - r.left;
      const py = cy - r.top;
      let left = px_ + 14;
      if (left + w > r.width - 4) left = px_ - 14 - w;
      left = Math.max(4, Math.min(left, r.width - w - 4));
      let top = py - 6 - h;
      if (top < 4) top = py + 22;
      top = Math.max(4, Math.min(top, r.height - h - 4));
      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(top)}px`;
    },
    onEscaped: () => finish(),
    onEvent,
  });
  stage.insertBefore(scene.canvas, stage.firstChild);

  inv = new InventoryUI(
    session,
    {
      dropOnStage: (id, x, y) => scene.dropItem(id, x, y),
      dragOverStage: (x, y, over, id) => {
        dragItem = id;
        if (over) scene.hover(x, y);
        else scene.clearHover();
      },
      armed: (id) => {
        stage.classList.toggle('armed', !!id);
        status.classList.toggle('hidden', !id);
        if (id) status.textContent = `Click something in the room to use: ${ITEMS[id].name}  (Esc to cancel)`;
      },
      isOverStage: (x, y) => {
        const r = scene.canvas.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      },
    },
    (text) => session.narrate('You', text),
  );
  layout.appendChild(inv.el);

  // stage input
  scene.canvas.addEventListener('pointermove', (e) => scene.hover(e.clientX, e.clientY));
  scene.canvas.addEventListener('pointerleave', () => scene.clearHover());
  scene.canvas.addEventListener('click', (e) => {
    const armed = inv.armedId;
    if (armed) {
      const hit = scene.dropItem(armed, e.clientX, e.clientY);
      if (hit) inv.disarm();
      return;
    }
    scene.click(e.clientX, e.clientY);
  });
  scene.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    inv.disarm();
  });

  // modals (computer screens, keypads) are driven by the beat queue
  let openModalKey = '';
  function syncModal() {
    const b = session.beat;
    if (!b || b.kind !== 'modal') {
      openModalKey = '';
      return;
    }
    const key = `${b.modal}:${b.id}`;
    if (key === openModalKey) return;
    openModalKey = key;
    if (b.modal === 'screen') {
      openScreen(modalHost, session, b.id, () => {
        session.closeModal();
        openModalKey = '';
      });
    } else {
      openKeypad(modalHost, session, b.id, () => {
        openModalKey = '';
      });
    }
  }

  // HUD buttons
  let hints = false;
  const muteBtn = header.querySelector('[data-act=mute]') as HTMLElement;
  const paintMute = () => (muteBtn.textContent = profile.muted ? '🔇' : '🔊');
  paintMute();
  header.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
    if (act === 'lobby') lobby();
    if (act === 'hints') {
      hints = !hints;
      scene.setHints(hints);
      (e.target as HTMLElement).classList.toggle('on', hints);
    }
    if (act === 'mute') {
      profile.muted = !profile.muted;
      audio.setMuted(profile.muted);
      saveProfile();
      paintMute();
    }
    if (act === 'save') {
      profile.lastRoom = room.id;
      profile.lastSaved = Date.now();
      saveProfile();
      toast(`Saved: Level ${levelNo(room.id)}, ${room.name}`, 'good');
      audio.sfx('good');
    }
    if (act === 'how') howToPlay(modalHost);
    if (act === 'reset') confirmDialog(modalHost, 'RESTART THIS ROOM?', 'Everything you found in this room is put back. Items you carried in stay with you.', 'Restart room', () => startRoom(room, true));
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'h' && !session.busy) header.querySelector<HTMLElement>('[data-act=hints]')!.click();
  };
  window.addEventListener('keydown', onKey);

  // responsive pixel-perfect scaling
  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    const availW = stageWrap.clientWidth;
    const availH = window.innerHeight - header.offsetHeight - 24;
    const scale = Math.floor(Math.min((availW * dpr) / LW, (availH * dpr) / LH));
    let w: number;
    const exact = Math.min((availW * dpr) / LW, (availH * dpr) / LH);
    // Prefer whole-number pixel scaling, unless it would waste a lot of the screen.
    if (scale >= 1 && exact - scale < 0.4) w = (LW * scale) / dpr;
    else w = (LW * exact) / dpr;
    stage.style.width = `${Math.floor(w)}px`;
    col.style.width = `${Math.floor(w)}px`;
    stage.style.height = `${Math.floor((w * LH) / LW)}px`;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(stageWrap);
  window.addEventListener('resize', fit);

  // toasts + flying icons
  function toast(text: string, tone: string) {
    const t = el('div', `toast ${tone}`);
    t.textContent = text;
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
    while (toasts.children.length > 3) toasts.firstElementChild?.remove();
  }
  function flyIcon(icon: string, fx: number, fy: number, tx: number, ty: number) {
    const img = iconImg(icon, 'fly');
    img.style.left = `${fx - 24}px`;
    img.style.top = `${fy - 24}px`;
    document.body.appendChild(img);
    const slot = inv.slotRect(gained[gained.length - 1]);
    if (slot) (document.querySelector(`.slot[data-item="${gained[gained.length - 1]}"]`) as HTMLElement | null)?.classList.add('await');
    img.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${(tx - fx) * 0.3}px, ${(ty - fy) * 0.3 - 60}px) scale(1.4)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${tx - fx}px, ${ty - fy}px) scale(0.8)`, opacity: 0.9 },
      ],
      { duration: 700, easing: 'cubic-bezier(.3,.7,.3,1)' },
    ).onfinish = () => {
      img.remove();
      document.querySelectorAll('.slot.await').forEach((s) => s.classList.remove('await'));
    };
  }

  // victory
  function finish() {
    const carried = session.carryOut();
    for (const id of carried) if (!profile.carry.includes(id)) profile.carry.push(id);
    if (!profile.completed.includes(room.id)) profile.completed.push(room.id);
    delete profile.rooms[room.id];
    profile.lastRoom = undefined;
    saveProfile();
    audio.sfx('unlock');
    const optionalFound = room.optional.filter((id) => gained.includes(id) || profile.collection.includes(id) || id === 'golden_sticky' && session.has(id)).length;
    const secs = Math.round((Date.now() - startedAt) / 1000);
    const card = el('div', 'modal victory-modal');
    card.innerHTML = `
      <div class="card victory">
        <h2>ESCAPED!</h2>
        <p class="sub"></p>
        <div class="stats">
          <div><b>${optionalFound}/${room.optional.length}</b><span>optional finds</span></div>
          <div><b>${carried.length}</b><span>items kept</span></div>
          <div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b><span>time</span></div>
        </div>
        <div class="kept"></div>
        <p class="next-hint">Next up: more rooms, more chaos. Your kept items travel with you.</p>
        <div class="btns"><button class="btn big" data-act="lobby">Back to the lobby</button><button class="btn ghost" data-act="again">Replay</button></div>
      </div>`;
    card.querySelector('.sub')!.textContent = `You left "${room.name}" behind. ${room.tagline}`;
    const kept = card.querySelector('.kept')!;
    for (const id of carried) {
      const c = el('div', 'chip-item');
      c.appendChild(iconImg(ITEMS[id].icon));
      c.appendChild(el('span', '', ITEMS[id].name));
      kept.appendChild(c);
    }
    card.querySelector('[data-act=lobby]')!.addEventListener('click', lobby);
    card.querySelector('[data-act=again]')!.addEventListener('click', () => startRoom(room, true));
    modalHost.appendChild(card);
  }

  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as Record<string, unknown>).__ma = { session, scene, inv };
  }

  show(root, () => {
    scene.destroy();
    inv.destroy();
    dlg.destroy();
    ro.disconnect();
    window.removeEventListener('resize', fit);
    window.removeEventListener('keydown', onKey);
  });
  fit();
  if (isNew) for (const line of room.intro) session.narrate('You', line);
  else dlg.update();
  inv.render();
}

titleScreen();
