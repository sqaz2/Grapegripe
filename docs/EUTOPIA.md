# Eutopia — Stanley Parable–style estate (separate 3D mode)

Working title for a narrator-driven vertical slice inside Grape Gripe.
It is a **separate mode** from the 2D Sol Max / Vineway campaign (`journey.js`, `game.js`, campaign content). Do not wire Eutopia into campaign save, missions, or terrain systems.

## Premise

A sealed “perfect tasting estate” run by a Narrator Sommelier. The player is a quality-control guest.
The Narrator gives turn-by-turn instructions. The player may **FOLLOW** or **IGNORE**.

- Follow → glossy utopia / brochure endings (laminated, obedient).
- Ignore → rooms restyle into wine-world chaos and alternate endings.

Funny why: the estate AI finished the perfect experience; guests kept improvising; so it built Eutopia to force the script.

## Art direction (this rebuild)

Intentional stylization over random primitives:

- Checker marble, gold trim, bottle chandeliers, arched stained glass
- Per-beat set dressing (`setDressing`) so atrium / service / booth / employee / maze read differently
- Mood lighting + path log (✓ / ✗) so consequences stay visible

## How to run

```bash
python3 -m http.server 4173 --directory public
```

Open `http://localhost:4173/eutopia/` or the **Eutopia** link on the start screen.

Three.js loads as a pinned CDN ESM module (`three@0.170.0` on jsDelivr) so the static deploy stays buildless.

## Files

| Path | Role |
|------|------|
| `public/eutopia/index.html` | Entry page + import map |
| `public/eutopia/eutopia.js` | Stylized rooms, movement, door triggers, narrator UI |
| `public/eutopia/eutopia.css` | Overlay / HUD chrome |
| `public/eutopia/beats.mjs` | Data-driven beats & endings |
| `tests/eutopia.test.mjs` | Beat schema + file smoke |

## Beat tree (vertical slice)

```
lobby → atrium → booth → ending-five-corks | ending-spilled-notes
              ↘ employee → ending-hr | ending-union
      ↘ service → atrium (repent) | maze → ending-chute | ending-must
```

Six endings. Denser narrator lines per beat. Each beat exposes a consequence hint before the doors.

## How to add a beat

Edit `public/eutopia/beats.mjs`:

1. Add a key with `id`, `kind`, `title`, `mood`, `setDressing`, `narrator[]`, `instruction`, `consequenceHint`, and `doors.left` / `doors.right`.
2. Each door needs `label`, `choice` (`obey` | `defy`), and `next`.
3. Endings use `kind: 'ending'` plus `epilogue`.
4. Optionally extend `buildRoom()` dressing hooks in `eutopia.js`.
5. Run `npm test`.

## Follow-ups (not in this slice)

- Voice / TTS for narrator lines
- More mid-path rooms (library of tasting notes, cork archive)
- Save remembered endings without touching 2D campaign save
- Mobile virtual stick (currently walk buttons + drag-look)
- Distinct door SFX and room stings
- A third “sideways” choice type beyond left/right when the schema grows

## Merge note

Eutopia stays additive (`public/eutopia/**`, docs, tests, start-screen link). It should not conflict with open 2D journey work.
