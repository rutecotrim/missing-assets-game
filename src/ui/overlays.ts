import type { Session } from '../core/session';

function modal(cls: string): { root: HTMLElement; card: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'modal';
  const card = document.createElement('div');
  card.className = `card ${cls}`;
  root.appendChild(card);
  return { root, card };
}

function richLine(text: string): HTMLElement {
  const p = document.createElement('div');
  p.className = 'ln';
  if (!text) {
    p.innerHTML = '&nbsp;';
    return p;
  }
  const parts = text.split('**');
  parts.forEach((part, i) => {
    const s = document.createElement(i % 2 ? 'b' : 'span');
    s.textContent = part;
    p.appendChild(s);
  });
  return p;
}

/** A retro in-room computer window driven by ScreenDef data. */
export function openScreen(host: HTMLElement, session: Session, id: string, onClose: () => void) {
  const { def, view } = session.screenView(id);
  const { root, card } = modal('crt');
  card.innerHTML = `<div class="bar"><span class="dots"><i></i><i></i><i></i></span><span class="wtitle"></span><button class="x" aria-label="Close">✕</button></div><div class="screen-body"></div><div class="chips"></div>`;
  card.querySelector('.wtitle')!.textContent = def.title;
  const body = card.querySelector('.screen-body')!;
  for (const l of view.lines) body.appendChild(richLine(l));
  const cur = document.createElement('span');
  cur.className = 'cursor';
  cur.textContent = '█';
  body.lastElementChild?.appendChild(cur);
  const chips = card.querySelector('.chips')!;
  for (const c of view.chips ?? []) {
    if (c.when && !session.test(c.when)) continue;
    const s = document.createElement('span');
    s.className = 'chip';
    s.textContent = c.text;
    chips.appendChild(s);
  }
  const close = () => {
    root.remove();
    window.removeEventListener('keydown', onKey);
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') close();
  };
  window.addEventListener('keydown', onKey);
  card.querySelector('.x')!.addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close();
  });
  host.appendChild(root);
  return close;
}

/** Numeric keypad. Calls session.tryCode on ENTER. */
export function openKeypad(host: HTMLElement, session: Session, id: string, onClose: () => void) {
  const def = session.keypad(id);
  const { root, card } = modal('keypad');
  card.innerHTML = `<div class="kp-title"></div><div class="kp-display" aria-live="polite"></div><div class="kp-msg"></div><div class="kp-keys"></div><button class="btn small ghost kp-close">Step away</button>`;
  card.querySelector('.kp-title')!.textContent = def.title;
  const display = card.querySelector('.kp-display') as HTMLElement;
  const msg = card.querySelector('.kp-msg') as HTMLElement;
  const keys = card.querySelector('.kp-keys') as HTMLElement;
  let code = '';
  const paint = () => {
    display.textContent = (code + '_ _ _ _'.replace(/ /g, '').slice(code.length)).split('').join(' ');
  };
  const press = (k: string) => {
    if (k === 'C') code = '';
    else if (k === 'OK') {
      if (code.length < 4) {
        msg.textContent = 'ENTER 4 DIGITS';
        return;
      }
      const res = session.tryCode(id, code);
      if (res.ok) {
        root.remove();
        window.removeEventListener('keydown', onKey);
        onClose();
        return;
      }
      msg.textContent = res.quip ?? 'ACCESS DENIED';
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      code = '';
    } else if (code.length < 4) {
      code += k;
      msg.textContent = '';
    }
    paint();
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) {
    const b = document.createElement('button');
    b.className = `key ${k === 'OK' ? 'ok' : k === 'C' ? 'clr' : ''}`;
    b.textContent = k;
    b.addEventListener('click', () => press(k));
    keys.appendChild(b);
  }
  const close = () => {
    root.remove();
    window.removeEventListener('keydown', onKey);
    session.closeModal();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Enter') press('OK');
    else if (e.key === 'Backspace') {
      code = code.slice(0, -1);
      paint();
    }
  };
  window.addEventListener('keydown', onKey);
  card.querySelector('.kp-close')!.addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close();
  });
  paint();
  host.appendChild(root);
}
