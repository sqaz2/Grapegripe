# Grape Gripe

Grape Gripe is a graphics-first mobile action journey through a corrupted, bioluminescent vineyard. The game communicates through movement, colour, sound, icons, silhouettes, enemy behavior, and haptics; reading is optional.

## The playable journey

- Four scrolling regions: Root Cellar, Vineway, Press Pit, and Sourwood
- Eight-direction movement and a distance-driven walking atlas (side gait art still needs finishing)
- Floating phone joystick with large attack, dash, and ultimate controls
- Four illustrated enemy classes with distinct behavior, safe terrain routing, and readable attack tells
- Distinct chapter missions: rescue, two-relay restoration, route choice, cork carrying, heavy-shot vents, and a recoverable finale
- Optional side-view Vineway excursion with automatic gap hops, dash movement, ledge recovery, and shared progression
- Versioned campaign checkpoints, backup recovery, a large Continue action, permanent shortcuts, and world-state restoration
- Encounter gates, optional discoveries, region transitions, post-ending fast travel, and a visual world map
- Three-hit grape combo ending in an explosive heavy shot
- The Last Straw meter and a staged Unleash the Grape Gripe finale with the companion's earmuffs and an absurd cork pull
- Auto-targeted attacks, enemy projectiles, collisions, pickups, health, cooldowns, and screen feedback
- Icon-led power choices between regions
- Unlockable visual enemy-counter guide, ending return loop, and a Gripe Maw rematch
- Win, defeat, checkpoint retry, pausing, optional sound, haptics, and saved best score
- Keyboard controls: WASD/arrows, Space, Shift, E, M, and Escape
- Responsive safe-area layout and reduced-motion support
- Shared terrain polygons, bridge holes, swept foot collision and enemy pathfinding
- Fixed world coordinates through phone rotation, safe pause/travel transitions and asset-load retry

## Build notes

[The Sol handoff](docs/SOL-HANDOFF.md) records the campaign brief, [the audit](docs/AUDIT.md) records the engineering foundation, and [the art handoff](docs/ART-HANDOFF.md) identifies the remaining authored-animation gap. The campaign, checkpoint, route-choice, side-view, distinct objective, finale, restoration, guide, and rematch systems described by that brief are now implemented.

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

This is the complete static first-release campaign. It intentionally does not include an account system, multiplayer, an AI backend, monetisation gates, procedural filler, or mandatory story reading.

The test suite validates geometry, navigation, animation timing, objectives, checkpoint recovery, contextual interactions, the side-view return path, and finale rules. It does not replace physical-phone performance measurements or human playtesting for feel and fun. The current generated eight-direction gait alternates frames, but the side-facing source art still needs a genuinely authored foot-phase pass; attack, dash, hurt, and ultimate movement are staged from the existing atlas rather than a reusable character rig. Add `?terrain=1` to inspect floor outlines and foot discs during a future visual test.
