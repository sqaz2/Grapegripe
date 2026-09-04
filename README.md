# Grape Gripe

Grape Gripe is a graphics-first mobile action journey through a corrupted, bioluminescent vineyard. The game communicates through movement, colour, sound, icons, silhouettes, enemy behavior, and haptics; reading is optional.

## The playable journey

- Four scrolling regions: Root Cellar, Vineway, Press Pit, and Sourwood
- Eight-direction movement and a distance-driven walking atlas (side gait art still needs finishing)
- Floating phone joystick with large attack, dash, and ultimate controls
- Four illustrated enemy classes with distinct behavior
- Encounter gates, optional secrets, region transitions, and a visual world map
- Three-hit grape combo ending in an explosive heavy shot
- The Last Straw meter and screen-clearing Unleash the Grape Gripe ultimate
- Auto-targeted attacks, enemy projectiles, collisions, pickups, health, cooldowns, and screen feedback
- Icon-led power choices between regions
- Win, defeat, replay, pausing, optional sound, haptics, and saved best score
- Keyboard controls: WASD/arrows, Space, Shift, E, M, and Escape
- Responsive safe-area layout and reduced-motion support
- Shared terrain polygons, bridge holes, swept foot collision and enemy pathfinding
- Fixed world coordinates through phone rotation, safe pause/travel transitions and asset-load retry

## Next build

Start with [the Sol handoff](docs/SOL-HANDOFF.md), [audit and validation](docs/AUDIT.md), and [animation art status](docs/ART-HANDOFF.md).

The next milestone is a distinct Root Cellar relay mission with objective state, a saved checkpoint and a permanent shortcut. The handoff then develops route choices, optional side-view exploration, chapter missions, a phased finale and discoveries to pursue after winning. These are planned improvements, not features already present.

## Run locally

Serve the `public` directory with any static web server. For example:

```bash
python3 -m http.server 4173 --directory public
```

Then open `http://localhost:4173`.

## Validate

```bash
npm test
```

The game has no production dependencies or build step. Cloudflare can serve `public` directly using the included `wrangler.jsonc` configuration.

## Release boundary

The current release is a four-region combat demo with a final victory state. Its twelve encounter gates repeat one objective type. Campaign checkpoints, varied mission criteria, authored action clips, alternate routes and a changed world after the ending are not implemented yet. The new terrain and animation modules establish foundations for that work; they do not make the expanded campaign complete.

The test suite validates geometry, navigation, animation timing and game-state integration. It does not replace browser testing, physical-phone performance measurements or playtesting for fun. Add `?terrain=1` to inspect floor outlines and foot discs during a future visual test.
