# Grape Gripe

Grape Gripe is a graphics-first mobile battle arena inside a corrupted, bioluminescent vineyard. The game communicates through movement, colour, sound, icons, silhouettes, enemy behavior, and haptics; reading is optional.

## The playable arena

- Floating phone joystick plus tap-to-move
- Large attack, dash, and companion-burst controls
- Four illustrated enemy classes with distinct behavior
- Three escalating waves and a boss encounter
- Auto-targeted attacks, enemy projectiles, collisions, pickups, health, cooldowns, and screen feedback
- Icon-led power choices between waves
- Win, defeat, replay, pausing, optional sound, haptics, and saved best score
- Keyboard controls: WASD/arrows, Space, Shift, E, and Escape
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

## Current product boundary

This release is a complete authored arena run. Future versions can add more battlegrounds, fighters, enemy patterns, upgrade combinations, personal companion behavior, and shareable challenge modes without replacing the core visual combat loop.
