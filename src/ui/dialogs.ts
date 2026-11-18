function shell(host: HTMLElement, html: string, cls = ''): { root: HTMLElement; card: HTMLElement; close: () => void } {
  const root = document.createElement('div');
  root.className = 'modal';
  const card = document.createElement('div');
  card.className = `card help ${cls}`;
  card.innerHTML = html;
  root.appendChild(card);
  const close = () => {
    root.remove();
    window.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close();
  });
  host.appendChild(root);
  return { root, card, close };
}

/** In-page confirmation (native confirm() is unavailable in some embedded viewers). */
export function confirmDialog(host: HTMLElement, title: string, text: string, yesLabel: string, onYes: () => void) {
  const { card, close } = shell(host, `<h2></h2><p></p><div class="btns"><button class="btn big" data-y></button><button class="btn ghost" data-n>Cancel</button></div>`);
  card.querySelector('h2')!.textContent = title;
  card.querySelector('p')!.textContent = text;
  const yes = card.querySelector('[data-y]') as HTMLElement;
  yes.textContent = yesLabel;
  yes.addEventListener('click', () => {
    close();
    onYes();
  });
  card.querySelector('[data-n]')!.addEventListener('click', close);
}

export function howToPlay(host: HTMLElement) {
  const { card, close } = shell(
    host,
    `<h2>HOW TO PLAY</h2>
    <p class="lead">You are a designer trapped in a meeting room. Explore, collect things, use them on stuff, and find the way out.</p>
    <div class="how">
      <section><h3>MOUSE</h3><ul>
        <li><b>Click the floor</b> to walk.</li>
        <li><b>Click objects and people</b> to look, search or talk.</li>
        <li><b>Drag an item</b> from the backpack onto something in the room to use it.</li>
        <li><b>Click an item</b> to read about it. <b>Examine</b> gives more detail.</li>
        <li><b>Use on…</b> is the tap-friendly way: pick an item, press the button, click a target.</li>
      </ul></section>
      <section><h3>KEYBOARD</h3><ul>
        <li><b>Space / Enter</b> continue dialogue. <b>1–9</b> choose a reply.</li>
        <li><b>H</b> sparkles on things you haven't looked at yet.</li>
        <li><b>Esc</b> closes windows or cancels "Use on…".</li>
      </ul></section>
      <section><h3>GOOD TO KNOW</h3><ul>
        <li>Nothing is used up unless it works, so experiment.</li>
        <li>A yellow <b>!</b> means someone has something to say.</li>
        <li>Some items are only funny. A few come with you to later rooms.</li>
        <li>Progress saves automatically. The <b>Save</b> button saves right now.</li>
      </ul></section>
    </div>
    <div class="btns"><button class="btn big" data-c>Got it</button></div>`,
    'how-card',
  );
  card.querySelector('[data-c]')!.addEventListener('click', close);
}
