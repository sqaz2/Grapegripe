# Grape Gripe

Grape Gripe is a graphics-first mobile action journey through a corrupted, bioluminescent vineyard. The game communicates through movement, colour, sound, icons, silhouettes, enemy behavior, and haptics; reading is optional.

## The playable journey

- Four large scrolling regions: Root Cellar, Vineway, Press Pit, and Sourwood
- Eight-direction movement with matching front, rear, side, and diagonal hero poses
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

This release is a complete authored vertical slice: a start-to-finish four-region run with traversal, combat, upgrades, secrets, a boss, and a final victory state. Future versions can add regions, fighters, enemy patterns, routes, personal companion behavior, and shareable challenge modes without replacing the core journey-and-combat loop.
