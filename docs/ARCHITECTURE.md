# Architecture

**Stack:** TypeScript + Vite, Canvas 2D for the world (rendered at 368×292 and scaled with nearest-neighbour), plain DOM for inventory/dialogue/modals, WebAudio for sound. No runtime dependencies, no art files: sprites are drawn procedurally in code.

```
src/core     pure game logic (no DOM): types.ts (schemas), session.ts (rules engine)
src/data     content as data: items.ts, recipes.ts, rooms/<room>.ts, rooms/index.ts (catalog)
src/engine   rendering: iso projection, pixel primitives, props, characters, icons, A*, scene, audio
src/ui       inventory (drag & drop), dialogue, computer/keypad modals
src/main.ts  screens (title, lobby, game), profile save, wiring
tests        headless tests that solve the room through the real rules engine
```

## How things work
- **Movement:** click → unproject to a tile → 8-way A* over tiles not covered by solid objects → the player walks tile to tile. NPCs can patrol and never block you.
- **Interaction:** clicking an object walks to its `stand` tile, faces it, then runs `session.inspect(id)`. Dropping an item runs `session.useItemOn(item, id)`. Hit-testing uses each object's projected silhouette; depth sorting is a topological sort of footprints.
- **Rules engine:** every object has `look` rules and `use[itemId]` rules. A rule is `{ when?: Cond, do: Effect[] }`; the first matching rule runs. Effects: `say, give, take, set, reveal, hide, toast, talk, screen, keypad, sfx, fx, escape`. Conditions: `flag, has, not, all, any`. Unmatched item uses fall back to funny "nope" lines and give red feedback — items are never auto-useful.
- **Inventory:** 16 slots, items are global data. Pointer-based drag (works for touch) onto stage objects or other slots. `persist: true` items travel to the next room; `collectible` items are tracked on the profile.
- **Combination:** `RECIPES` are order-independent pairs with `consume`, `gives`, and a line of text. Wrong pairs shake and quip.
- **Dialogue / modals:** a queue of beats (lines, dialogue nodes with choices, computer screens, keypads) so effects can chain naturally.
- **Save:** localStorage profile (completed rooms, carried items, collection, per-room state).

## Adding a room
1. Create `src/data/rooms/<id>.ts` exporting a `RoomDef` (palette, spawn, objects, dialogues, keypads, screens, decals).
2. Register it in `src/data/rooms/index.ts` (`PLAYABLE`); the lobby already lists it in `CATALOG`.
3. New items → `items.ts` (+ an icon in `engine/icons.ts`); new combos → `recipes.ts`.
3b. Music: each room sets `music: "<trackId>"`; add a track in `src/data/music.ts` to give it its own song.
4. New furniture → add a painter to `PROPS` in `engine/props.ts` (compose `g.box`, `g.faceRect`, `g.wallRect`).
5. Copy `tests/stakeholders.test.ts` to prove the room is solvable.

## Stakeholders Room solution (spoilers)
Sofa → USB · whiteboard → tape · bin → torn flow · tape+flow → taped flow · table → notes, mug · mug → coffee machine → coffee · coffee → Derek → badge · badge → PC · USB → PC · flow → printer (scan) · PC shows code 4172 → cabinet → exit key → door.
Optional: rubber duck (plant), stress ball (wobbly chair) → Brenda → golden sticky note, biscuits, duck+ball combo.
