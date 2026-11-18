# Missing Assets — *Collect. Connect. Escape.*

An isometric pixel-art escape-room adventure set inside a product design company.
You are a UX/UI designer trapped in meeting rooms. Explore, collect items, combine them,
use them on the world, and unlock the exit. No quizzes — just poking at things.

**Playable now:** the Stakeholders Room (+ title screen and a lobby listing all 27 planned rooms).

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # headless puzzle tests
npm run build      # production build in dist/
```

## Controls
- **Click** floor to walk, click objects/people to inspect or talk.
- **Drag** an inventory item onto an object in the room, or onto another item to combine.
- Or select an item and press **Use on…**, then click an object (Esc cancels).
- **H** toggles hint sparkles on things you haven't looked at yet. Space/Enter advances dialogue; 1–9 pick replies.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and how to add rooms.
