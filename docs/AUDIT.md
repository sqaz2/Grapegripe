# Gameplay audit and implemented foundations

Scope: source, existing art, recovered design research, collision geometry and headless logic tests. This pass did not run browser QA, measure a physical phone or observe new human playtests. The user's completed run is the evidence that the existing campaign is too easy to exhaust; its exact playtime was not measured here.

## Findings

| Priority | Finding and evidence | This pass |
| --- | --- | --- |
| P0 | Old `pathAt`/`keepOnPath` used one broad horizontal strip. That cannot represent the void between Vineway's two bridges or the actor's foot radius. | Replaced with traced polygons, holes, swept circular movement and wall sliding |
| P0 | Enemies moved straight towards the player. Restricting terrain alone would leave them pushing into the gap. | Added clearance-aware A*, safe path smoothing, route invalidation and shared movement for player/enemies/dashes/knockback |
| P0 | `configureWorld` resized physics to the viewport, moving the hero but not all other entities. | World remains 941×1672 image units; resize changes camera/zoom only |
| P0 | `completeRegion` used `setTimeout`; a region could advance during pause. Input could remain held across overlays. | Simulation-clock clearing state; pauseable travel; clear input at map/pause/resume/transition/blur; fixed 60 Hz simulation |
| P1 | `drawHeroAt` bobbed one still illustration. Eight-direction input was not a walking animation. | Distance-driven controller, six atlas frames, five source views plus mirrors, stable foot anchor and captured dash poses. **Side gait art remains incomplete** |
| P1 | Every region has three kill waves; upgrades are mostly numerical; victory offers another identical run. | Audited and specified campaign/objectives/ending in `SOL-HANDOFF.md`; deliberately not built out in this foundation pass |
| P1 | Only tutorial completion and best score are persisted. No campaign checkpoint, objective history or discovery state exists. | Storage failures no longer break startup; full save system is the next campaign prerequisite |
| P1 | A stun could still allow an already telegraphed attack to execute. | Ultimate cancels telegraph, pending attack and lunge; stunned enemies cannot initiate contact damage |
| P1 | Image-load failure exposed a playable but incomplete game. | Loading fails closed, with a retry control |
| P2 | Previous validator mostly searched source strings for feature names. | Added meaningful geometry, navigation, animation and game-state regression tests |

## Terrain contract for future work

- `public/engine/terrain-data.mjs` holds outer floor polygons, holes, spawn/exit/secret anchors and encounter anchors. The art and data share source-image coordinates.
- `Terrain.contains(point, radius)` checks a complete foot disc. The combat hit radius is intentionally separate: a tall monster should not require a bridge as wide as its full painted silhouette.
- `Terrain.move(start, dx, dy, radius)` sweeps all movement and slides when safe. Invalid starts fail closed. It never projects through a hole.
- `Terrain.project` is for authored placements or user tap destinations; it is not a substitute for collision during movement.
- `Terrain.findPath` returns safe waypoints or an empty list when unreachable. It uses radius-specific clearance and swept diagonal checks. Every smoothed segment is checked again.
- `Terrain.setGates` changes collision and invalidates cached navigation. Current gates span all floor branches at their authored crossing.
- `?terrain=1` draws floor boundaries and foot discs for a future requested visual check. There is no production API for teleporting or granting victory.
- `docs/terrain-overlay.webp` is a source-art geometry diagnostic, not a screenshot of the game running.

The floor traces are manual approximations of the visible stone. They fix the structural bridge-hole defect; close visual inspection of every edge on phones remains necessary. Future raised platforms, solid crates, destructible props and side-view gravity need explicit collision definitions. Flying projectiles are currently allowed over empty floor; that is separate from grounded movement.

Navigation uses cached clearance grids and occasional A*. It is sufficient for the current small encounter sizes in logic tests. Larger crowds require profiling and a navigation budget, not per-frame A* for every actor. No phone performance claim is made.

## Animation contract

- `public/engine/animation.mjs` advances gait by actual travelled distance. Requested input or blocked velocity cannot spin the feet against a wall.
- Idle, walk, dash, attack, hurt and ultimate are explicit controller states. State names do not imply six finished authored animation clips.
- `public/engine/hero-atlas.mjs` declares 384px cells, six columns, five view rows and the foot anchor.
- `drawHeroAt` uses the atlas; the companion is a separate crop of existing art with an independent hover transform.
- Existing front/back/side still assets are retained as art references. No rig, Blender source or glTF animation is included.
- Read `ART-HANDOFF.md` before generating or replacing more animation assets.

## Validation performed

Run `npm test` with Node 22 or newer. The suite checks:

- A dash and knockback cannot cross a hole or an outer boundary; diagonal sliding remains usable.
- Whole feet fit; invalid positions fail closed; smoothed routes do not cut corners.
- Split gates block both routes, then reopening invalidates navigation correctly.
- Every region's spawn, encounters, secret and exit are valid for hero and enemy foot sizes; forward and return paths exist.
- Seeded movement sequences remain on Vineway floor for four actor radii.
- Gait timing is independent of frame rate, freezes at walls and selects all directional views.
- Missing storage is tolerated; missing art blocks play and retry recovers.
- Rotation/resize preserves entity and world coordinates.
- Pause/map/travel clear held input; a clearing timer cannot advance during pause.
- All twelve authored encounters spawn their full roster on reachable floor and their gates release after completion.
- Real held attacks and projectile damage clear the first encounter in a logic simulation.
- A moth and a large boss navigate around the actual bridge gap without falling or becoming stuck.

The DOM/Canvas test harness records draw calls; it does not render pixels, exercise a real browser input stack, judge gait anatomy or establish campaign fun. The all-encounter test uses lethal damage to isolate gate plumbing and is not presented as a human playthrough.

## What remains before a finished game

The highest-value next work is directional/action art, a distinct objective with a reliable checkpoint, then a connected room graph. Build the optional side-view excursion and expanded finale only after that foundation is playable. The current game still has four regions, twelve encounter gates and the original ending. The full campaign described in the handoff is a plan, not shipped content.
