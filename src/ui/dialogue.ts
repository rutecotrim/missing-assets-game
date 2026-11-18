import type { Session } from '../core/session';
import type { CharacterLook } from '../core/types';
import { PLAYER_LOOK, characterRects, drawRects } from '../engine/characters';

const LOOKS: Record<string, CharacterLook> = {
  You: PLAYER_LOOK,
  Brenda: { skin: '#f1c9a5', hair: '#7b2d26', hairStyle: 'long', shirt: '#e8453c', pants: '#2b2d42', lanyard: true },
  Sam: { skin: '#c68a5b', hair: '#2a1b12', hairStyle: 'curly', shirt: '#3fb7a8', pants: '#4b5d8a', glasses: true },
  Derek: { skin: '#f0c7a0', hair: '#8a8a92', hairStyle: 'slick', shirt: '#2c3e66', pants: '#222c4a', tie: '#e8453c' },
};

function portrait(who: string): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 24;
  cv.height = 22;
  cv.className = 'portrait pix';
  const c = cv.getContext('2d')!;
  const look = LOOKS[who] ?? LOOKS.You;
  drawRects(c, 12, 25, characterRects(look, { front: true, right: true }, { talking: true }));
  return cv;
}

/** Bottom-of-stage dialogue box with a typewriter effect and choices. */
export class DialogueUI {
  readonly el: HTMLElement;
  private shown = '';
  private full = '';
  private timer = 0;
  private key = '';

  constructor(private session: Session) {
    this.el = document.createElement('div');
    this.el.className = 'dialogue hidden';
    this.el.addEventListener('click', () => this.advance());
    window.addEventListener('keydown', this.onKey);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    clearInterval(this.timer);
  }

  private onKey = (e: KeyboardEvent) => {
    const b = this.session.beat;
    if (!b || b.kind === 'modal') return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.advance();
    }
    if (/^[1-9]$/.test(e.key) && b.kind === 'node') {
      const node = this.session.dialogueNode(b);
      const vis = this.session.visibleChoices(node);
      const pick = vis[Number(e.key) - 1];
      if (pick && this.shown === this.full) this.session.next(pick.index);
    }
  };

  private advance() {
    const b = this.session.beat;
    if (!b || b.kind === 'modal') return;
    if (this.shown !== this.full) {
      this.finish();
      return;
    }
    if (b.kind === 'node') {
      const node = this.session.dialogueNode(b);
      if (this.session.visibleChoices(node).length) return; // must choose
    }
    this.session.next();
  }

  private finish() {
    clearInterval(this.timer);
    this.shown = this.full;
    this.paintText();
  }

  private textEl(): HTMLElement | null {
    return this.el.querySelector('.text');
  }

  private paintText() {
    const t = this.textEl();
    if (t) t.textContent = this.shown;
    const done = this.shown === this.full;
    this.el.classList.toggle('done', done);
    const ch = this.el.querySelector('.choices');
    if (ch) ch.classList.toggle('hidden', !done);
  }

  /** Re-render whenever the beat queue changes. */
  update() {
    const b = this.session.beat;
    if (!b || b.kind === 'modal') {
      this.el.classList.add('hidden');
      this.key = '';
      clearInterval(this.timer);
      return;
    }
    const who = b.kind === 'line' ? b.who : this.session.dialogueNode(b).who;
    const text = b.kind === 'line' ? b.text : this.session.dialogueNode(b).text;
    const key = JSON.stringify(b);
    if (key === this.key) return;
    this.key = key;
    this.el.classList.remove('hidden');
    this.el.classList.toggle('you', who === 'You');
    this.el.textContent = '';
    this.el.appendChild(portrait(who));
    const body = document.createElement('div');
    body.className = 'body';
    const name = document.createElement('div');
    name.className = 'who';
    name.textContent = who;
    const t = document.createElement('p');
    t.className = 'text';
    body.append(name, t);
    if (b.kind === 'node') {
      const node = this.session.dialogueNode(b);
      const vis = this.session.visibleChoices(node);
      if (vis.length) {
        const ch = document.createElement('div');
        ch.className = 'choices hidden';
        vis.forEach(({ choice, index }, n) => {
          const btn = document.createElement('button');
          btn.className = 'choice';
          btn.textContent = `${n + 1}. ${choice.text}`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.session.next(index);
          });
          ch.appendChild(btn);
        });
        body.appendChild(ch);
      }
    }
    const hasChoices = b.kind === 'node' && this.session.visibleChoices(this.session.dialogueNode(b)).length > 0;
    if (!hasChoices) {
      const last = this.session.beats.length === 1 && (b.kind === 'line' || !this.session.dialogueNode(b).next);
      const more = document.createElement('button');
      more.className = `more ${last ? 'close' : ''}`;
      more.innerHTML = last ? 'Close <b>✕</b>' : 'Continue <b>▶</b>';
      more.title = 'Click, or press Space / Enter';
      body.appendChild(more);
    }
    this.el.appendChild(body);

    this.full = text;
    this.shown = '';
    clearInterval(this.timer);
    let i = 0;
    this.timer = window.setInterval(() => {
      i += 1;
      this.shown = this.full.slice(0, i);
      this.paintText();
      if (i >= this.full.length) clearInterval(this.timer);
    }, 16);
    this.paintText();
  }
}
