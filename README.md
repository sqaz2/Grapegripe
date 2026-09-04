# Grape Gripe

**Follow the story. Find the real gripe.**

Grape Gripe is a mobile-first detective game built from whatever is bothering you. This repository begins with **Playable Branch**, a hand-authored vertical slice used to prove the movement, navigation, companion, story-fragment, and choice mechanics before personal AI generation is added.

## What is playable

- Floating touch joystick with eased drift
- Tap-to-move and WASD/arrow-key fallbacks
- Companion follow behavior and Scan / Reframe / Ask abilities
- Always-visible objective, destination arrow, and minimap
- One complete case: inspect the branch, collect **Seen** and **Assumed**, then choose at the fork
- Three endings with visible world consequences
- Local completion badge and optional ambient sound
- Responsive portrait-first interface with large touch targets and safe-area support

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

The project has no production dependencies or build step. Cloudflare can serve `public` directly. The included `wrangler.jsonc` also supports a static-assets deployment.

## Product boundary

This first slice deliberately excludes personal AI input, accounts, public feeds, unrestricted NPC chat, procedural worlds, combat, economy systems, and real-time multiplayer. The next gate is whether the authored branch is enjoyable and understandable on a real phone.
