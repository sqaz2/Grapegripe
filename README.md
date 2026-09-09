# Grape Gripe

Grape Gripe is a mobile action adventure about a grape who wants to become excellent wine. Explore a town, work with grape rangers, swing through vine routes, and earn a place in the Grand Vintage. The humour comes from tiny grapes with enormous ambitions; the human wine-makers are part of the celebration.

## The Grand Vintage

- Three connected maps: Bunchborough, Sunlit Terraces and Harvest Fair, with ten townsfolk and rangers.
- Four persistent jobs: vine-post delivery, equipment recovery, aroma gathering and irrigation repair.
- Two side-view expeditions with different objectives: Canopy Post earns courier boots; Bottle Aqueduct requires three aroma tags and exits at the fair. Collected tags, defeated moths and checkpoints persist.
- Three weapons: Seedshot, the Corkscatter spread shot and the piercing Pruning lance. Jobs and exploration caches pay for equipment.
- A human stomper's Footwork audition: dodge eight telegraphed stomps; three hits ends the attempt without losing work.
- Earn Character, Craft, Aroma and Footwork seals, then meet Madame Merlot for a permanent Grand Vintage selection ending.
- A field record shows jobs, seals, gear and fast travel to discovered maps. Town and work remain after selection. This is one finite chapter, with optional work and patrols after the ending.
- Town is the new starting action. Continue resumes your save. The original boss victory now offers entry to town, and Pause lets you return from a patrol or vine route.

See [the chapter implementation and verification notes](docs/GRAND-VINTAGE.md).

## The original vineyard patrol

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
- Keyboard controls: WASD/arrows to move, Space to attack/grapple, Shift to dash, E for Grape Gripe, F to talk/interact, M for the map/record, and Escape to pause
- Responsive safe-area layout and reduced-motion support
- Shared terrain polygons, bridge holes, swept foot collision and enemy pathfinding
- Fixed world coordinates through phone rotation, safe pause/travel transitions and asset-load retry

## Build notes

Start with [the current universe scope](docs/UNIVERSE-SCOPE.md) and [the Grand Vintage chapter](docs/GRAND-VINTAGE.md). Save schema 3 retains the character/memory/adventure separation from schema 2 and adds persistent town, jobs, equipment, route checkpoints and selection progress. Schema 1 and 2 saves migrate. New patrols preserve the character, ranger work and learned tactics; both endings are recorded once. Accounts, cross-device memory, foreign avatars and friend presence still require shared-server work.

[The Sol handoff](docs/SOL-HANDOFF.md) records the current build state, [the repair report](docs/AUDIT-REPAIRS.md) covers the September 9 fixes, and [the art handoff](docs/ART-HANDOFF.md) identifies the remaining authored-animation gap. The campaign, checkpoint, route-choice, side-view, distinct objective, finale, restoration, guide, and rematch systems are implemented.

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

The playable static game has the three-map Grand Vintage chapter, two ranger vine routes, and the original four-region patrol with its optional side passage. The earlier 10–12-room graph and 40–60-minute pacing were proposals, not delivered or measured claims. Accounts, multiplayer and shared-universe travel remain future work.

Chapter upgrades survive interrupted travel and are claimed once. Registered checkpoint anchors recover onto reachable floor. Storage denial, failed writes and incompatible saves leave temporary play available with a persistent warning; a blocked write keeps an in-session retry checkpoint. Saves remain local to this browser and origin.

The test suite validates geometry, navigation, animation timing, objectives, checkpoint recovery, contextual interactions, the side-view return path, and finale rules. It does not replace physical-phone performance measurements or human playtesting for feel and fun. The current generated eight-direction gait alternates frames, but the side-facing source art still needs a genuinely authored foot-phase pass; attack, dash, hurt, and ultimate movement are staged from the existing atlas rather than a reusable character rig. Add `?terrain=1` to inspect floor outlines and foot discs during a future visual test.
