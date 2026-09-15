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

Start with [the current universe scope](docs/UNIVERSE-SCOPE.md) and [Sol's next build](docs/SOL-NEXT.md). Save schema 2 separates the local character, remembered discoveries/endings and the active adventure. New adventures preserve the character and learned tactics; the existing ending is recorded once. This is preparation for StarMuff, not an online connection: accounts, cross-device memory, foreign avatars and friend presence still require shared-server work.

[The Sol handoff](docs/SOL-HANDOFF.md) records the current build state, [the repair report](docs/AUDIT-REPAIRS.md) covers the September 9 fixes, and [the art handoff](docs/ART-HANDOFF.md) identifies the remaining authored-animation gap. The campaign, checkpoint, route-choice, side-view, distinct objective, finale, restoration, guide, and rematch systems are implemented.

## Side modes

- [Berry Beef](public/berry-beef.html) — separate 2D rivalry arena
- [Eutopia](public/eutopia/) — separate 3D Narrator Sommelier prototype ([docs/EUTOPIA.md](docs/EUTOPIA.md))

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

The playable static campaign has four regions and one optional side passage. The earlier 10–12-room graph and 40–60-minute pacing were proposals, not delivered or measured claims. Accounts, multiplayer and shared-universe travel remain future work.

Chapter upgrades survive interrupted travel and are claimed once. Registered checkpoint anchors recover onto reachable floor. Storage denial, failed writes and incompatible saves leave temporary play available with a persistent warning; a blocked write keeps an in-session retry checkpoint. Saves remain local to this browser and origin.

The test suite validates geometry, navigation, animation timing, objectives, checkpoint recovery, contextual interactions, the side-view return path, and finale rules. It does not replace physical-phone performance measurements or human playtesting for feel and fun. The current generated eight-direction gait alternates frames, but the side-facing source art still needs a genuinely authored foot-phase pass; attack, dash, hurt, and ultimate movement are staged from the existing atlas rather than a reusable character rig. Add `?terrain=1` to inspect floor outlines and foot discs during a future visual test.
