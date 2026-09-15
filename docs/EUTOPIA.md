# Eutopia — separate 3D prototype

Working title for a Stanley Parable–style vertical slice inside Grape Gripe.
It is a **separate mode** from the 2D Sol Max / Vineway campaign (`journey.js`, `game.js`, campaign content). Do not wire Eutopia into campaign save, missions, or terrain systems.

## Premise (game content only)

A sealed “perfect tasting estate” run by a Narrator Sommelier. The player is a quality-control guest.
The Narrator gives turn-by-turn instructions. The player may **FOLLOW** or **IGNORE**.

- Follow → glossy utopia / brochure endings.
- Ignore → rooms glitch into wine-world chaos and new paths.

Funny why: the estate AI finished the perfect experience; guests kept improvising; so it built Eutopia to force the script.

## How to run

Serve `public` as usual:

```bash
python3 -m http.server 4173 --directory public
```

Open:

- `http://localhost:4173/eutopia/`
- or from the main start screen: **Eutopia** link

Cloudflare Pages/Workers serves `public/` directly (`wrangler.jsonc`). No build step.
Three.js loads as a **pinned CDN ESM module** via import map (`three@0.170.0` on jsDelivr) so the static deploy stays buildless.

## Files

| Path | Role |
|------|------|
| `public/eutopia/index.html` | Entry page + import map |
| `public/eutopia/eutopia.js` | Three.js lobby, movement, door triggers, narrator UI |
| `public/eutopia/eutopia.css` | Overlay / HUD chrome |
| `public/eutopia/beats.mjs` | Data-driven beats & endings |
| `tests/eutopia.test.mjs` | Beat schema + file smoke |

## How to add a beat

Edit `public/eutopia/beats.mjs`:

1. Add a new key under `beats` with `id`, `kind: 'beat'`, `title`, `mood` (`brochure` | `glitch`), `narrator` (string array), `instruction`, and `doors.left` / `doors.right`.
2. Each door needs `label`, `choice` (`obey` | `defy`), and `next` (another beat or ending id).
3. Endings use `kind: 'ending'`, the same narrator array, plus `epilogue`.
4. Point an existing door’s `next` at your new id.
5. Run `npm test` — `validateBeats()` will catch missing targets and schema mistakes.

The renderer does not hardcode story text; it only consumes beat ids and moods.

## Scope of this slice

- One small 3D lobby (and short follow-on rooms that reuse the same shell).
- One door choice per beat: left = instructed / right = forbidden (buttons or walk-in).
- On-screen Narrator lines (no voice).
- Two short endings: obedient brochure + defiant glitch.
- Intentionally not an open world.

## Merge note

Eutopia should stay additive (`public/eutopia/**`, docs, tests, a start-screen link). It should not conflict with open work on Sommelier Speedrun, save/mobile, or Grand Vintage when those land — merge order can treat this as a parallel path.
