# Grape Gripe — Sol build handoff

This brief guided the conversion of the four-region combat demo into a journey with distinct objectives, permanent discoveries, an optional route and a proper ending. More identical waves would have added length without solving that problem.

**Release status:** campaign persistence, varied objectives, the optional side-view passage, the staged ending, restoration loop, visual guide and rematch are implemented. Press Pit now includes a complete visual mystery: three icon clues unlock a four-way verdict, and SAY/SOLVE/SAVE/DROP persist as distinct combat perks. The remaining material gap is a truly authored reusable character rig/atlas: the current side gait still has imperfect foot phases, and special actions are staged from the existing atlas.

## Preserve the user's decisions

- Phone first; movement in eight directions; immediate action and big controls.
- The purple grape fighter, leaf equipment, lime companion and illustrated vineyard are the visual identity. Preserve the existing region names. New names below are internal identifiers, not new branding.
- Understandable with text and sound off: silhouettes, animation, spatial cues, shapes and demonstrations. Text may support play but cannot unlock it.
- Travel should create anticipation and route decisions, borrowing the sense of journey from Escape Velocity. Do not turn this into a space-game clone.
- The signature payoff is a funny, powerful **Unleash the Grape Gripe** with an actual visual joke.
- A side-view parallax excursion is worth prototyping. The user suggested it; they did not ask to replace all top-down combat with platforming.
- Earlier detective-chat ideas were superseded by the action direction. Mandatory reading, AI verdicts, complaint typing and long conversations do not belong in the critical path.

## Start here

1. Read `AUDIT.md`, then `ART-HANDOFF.md`. Run `npm test`.
2. Keep `public/journey.js` as the current entry point. `public/game.js` is an older, unreferenced prototype; do not build new features there.
3. Keep physics in source-image coordinates, separate from the camera. Use `Terrain.move` for every grounded displacement.
4. Finish the directional gait art before presenting walking as finished. The controller works; the generated side frames have a known leg-phase defect.
5. Build one complete objective-and-checkpoint mission before duplicating maps. The first milestone is described below.

## The full game arc

**Player promise:** Explore a hostile, beautiful vineyard with your companion; gain a new way to deal with it; visibly restore it; return to places that now play differently.

Proposed first-release size: a hub and roughly 10–12 compact, authored rooms across the existing four regions. A first clear around 40–60 minutes is a pacing hypothesis to test, not a playtime claim. Rooms should deliver a meaningful change in roughly 1–3 minutes and offer frequent safe stopping points. Do not enlarge every background just to extend travel time.

| Chapter | Distinct thing the player does | New decision or capability | Visible result |
| --- | --- | --- | --- |
| Root Cellar | Free the companion; power two visible relays; defeat one guarding encounter | Learn move, attack, dash; companion points at usable objects | A dead lift lights up, a shortcut opens, the hub gains a working landmark |
| Vineway | Choose between a guarded short bridge and a longer route with a discoverable return shortcut | Optional risk changes the reward; companion can reveal a hidden passage | Both bridges are visible on the journey map; the discovered shortcut remains open |
| Press Pit | Carry a cork, investigate three icon clues, power both vents, then choose SAY/SOLVE/SAVE/DROP | Heavy-shot interactions change the machine; the final choice grants a persistent play-style perk | The press becomes a verdict altar and the chosen perk travels into Sourwood |
| Sourwood | Rescue a stranded creature, reconnect the route, then face the Gripe Maw | Combine traversal, target priority, companion interaction and timed ultimate use | The corrupted route blooms; the rescued characters and companion react |
| Return | Travel back through the restored hub and select a new goal | Choose a missed route, mastery encounter or different build | An ending, a changed world and voluntary reasons to return |

All chapter mechanics must be taught in safe situations before appearing in a boss fight. Do not require all secrets, perfect combat, arbitrary grinding or a score threshold for the main ending.

## Replace kill counts with objective state

The current `encounterIndex` is a wave counter, not a quest system. Extract campaign state from presentation before adding more conditions to it.

Implemented files:

- `public/engine/campaign.mjs`: pure campaign reducer, objective dependencies, completion and rewards.
- `public/content/campaign.mjs`: stable IDs, room graph, objective definitions and reward choices.
- `public/engine/save.mjs`: versioned save validation, migration, storage adapter and checkpoint recovery.
- `public/content/missions.mjs`: spatial mission props, encounter anchors and the side-view platform contract. The compact first release keeps both render adapters in `journey.js`; extraction into `public/scenes/` remains an optional refactor.

Example content contract:

```js
{
  id: 'root-relays',
  sceneId: 'root-main',
  objectives: [
    { id: 'companion-free', kind: 'rescue', target: 'companion-cage', requires: [] },
    { id: 'relay-west', kind: 'activate', target: 'relay-west', requires: ['companion-free'] },
    { id: 'relay-east', kind: 'activate', target: 'relay-east', requires: ['companion-free'] },
    { id: 'guard-clear', kind: 'encounter', target: 'root-guard', requires: [] }
  ],
  exitRequires: ['relay-west', 'relay-east', 'guard-clear'],
  rewards: ['root-lift-unlocked'],
  checkpoint: 'root-lift'
}
```

This is an interface proposal, not a claim that these systems or props already exist.

Emit events such as `targetActivated`, `encounterCleared`, `creatureRescued`, `secretFound` and `exitEntered`. The reducer must accept only events for available objectives and grant each reward once. Gate visuals subscribe to the same objective state that controls collision. A delayed effect must never be the authority for opening a gate.

Content validation should reject duplicate IDs, unknown targets, missing exits, circular prerequisites and an ending with no reachable path. Keep `complete`, `available`, `discovered` and `mastered` separate. Finding a door does not mean completing its mission.

## The first milestone delivered

**A repeatable Root Cellar mission with two relays, one battle, a saved shortcut and a visible change.**

Build it using the existing floor and a small number of well-matched props. It should demonstrate the entire production pattern:

1. On entry, a short silent sequence shows two unlit relays connected to a closed lift.
2. Walking close to a relay reveals a hand-shaped action cue. One existing button performs the interaction when safe; no new permanent button is needed.
3. The first relay works immediately. The second is guarded, showing a different reason to fight.
4. Lit cables connect completed relays to the lift. Shapes and motion distinguish complete and incomplete states, even without relying on colour.
5. The lift opens only when both relays and the guard objective are complete.
6. Reaching the lift commits a checkpoint and unlocks a permanent shortcut.
7. Reloading offers a large continue icon and returns to a safe anchor. Re-entering does not grant the same reward again.

Acceptance: finish with text and sound off; quit during a fight and resume safely; activate objectives in either permitted order; reload at every boundary without duplicate rewards or a closed completed gate. A failed or blocked storage write must leave the game playable and clearly avoid claiming that progress was saved.

## Persistence before a longer campaign

Save stable IDs and durable decisions, not canvas objects, input state or timers. Suggested envelope:

```js
{
  schemaVersion: 1,
  revision: 12,
  campaign: { completed: [], discovered: [], rewardsClaimed: [], worldFlags: [] },
  checkpoint: { sceneId: 'root-main', anchorId: 'root-lift' },
  loadout: { primary: 'grape-shot', modifier: null },
  preferences: { sound: true, haptics: true, shake: true }
}
```

Validate arrays, known IDs and numeric ranges. Keep one previous valid checkpoint. A malformed or newer unsupported save must not crash or silently replace recoverable progress. Do not serialize mid-dash velocities or replay half-finished transition callbacks. On load, reconstruct the room from objective state, place the hero at a validated anchor, clear held input and restart only the unfinished encounter.

Save when a mission objective commits, a checkpoint changes, a reward is claimed, or settings change. Avoid writes every frame. Death retries the current encounter or checkpoint while preserving completed discoveries. A new-run action must be distinct from continue and must not erase persistent discoveries accidentally.

## Journeys and optional 2D exploration

Treat the world as connected rooms with named entry anchors. Each link needs `fromScene`, `exitId`, `toScene`, `entryId`, `requires` and a return policy. The map should show reachable routes, undiscovered branches and why a visible connection is blocked through an icon associated with its actual prerequisite.

The current travel animation links region N to N+1. Replace that only after the room graph and checkpoint state work. Keep unlocked return travel quick; repeated empty walking is not the reward for discovery.

Prototype **one optional side-view excursion** branching off Vineway:

- A sheltered passage frames the camera change; a short transition makes the new perspective understandable.
- Use several parallax depth layers, foreground occlusion and a clear walkable foreground. Background ledges must not resemble usable platforms.
- Start with left/right exploration, automatic small step-ups and forgiving dash gaps. Test this before adding a separate jump button. If jumping is needed, change the contextual action icon visibly and demonstrate it in a safe pocket.
- The same hero, attack, dash, companion, inventory and settings continue across the boundary. Do not invent a second progression economy.
- A miss returns to the nearest ledge with a small setback. It should not erase a whole campaign.
- The excursion has a distinct reward and returns to a defined Vineway anchor. Its completion flag survives reload.
- Keep it optional until the controls and camera are enjoyable on a phone. Do not make difficult platforming mandatory to reach the main ending.

Technical seam: define a scene adapter with `enter(payload)`, `update(dt,input)`, `render(view)`, `serializeCheckpoint()` and `exit()`. Suspend the old scene, release input, validate the destination anchor, commit once, then activate the new scene. Cancelled transitions and failed loads restore the old checkpoint. The current top-down `Terrain` handles floor polygons; side-view scenes need a separate gravity/platform solver, not rotated top-down coordinates.

## Combat progression and the ending

Offer a few mutually distinct play styles. Examples: a heavy shot that cracks armour, a ricochet shot that rewards positioning, or a dash that reflects a telegraphed projectile. Prototype and tune one modifier at a time. Three percentage increases to the same shot are not three play styles.

Teach enemy roles through behaviour: a charger commits to a lane, a moth controls space, a brute exposes a weakness after a miss. Stop attacks on stun and pause; preserve clear anticipation before damage. Supply the full charge through successful play and useful actions so taking damage is never the best way to build the ultimate.

The proposed Gripe Maw finale:

| Phase | Familiar mechanic it tests | Clear opportunity |
| --- | --- | --- |
| Approach | Dodge charger lanes and recognise safe paths | Reach the boss arena and a checkpoint |
| Shell | Redirect a marked attack into two press vents | Vents crack the shell; purely shooting armour gives unmistakable feedback |
| Core | Position safely while the companion exposes a weak point | A generous ultimate window, with a renewable charge source if missed |
| Payoff | Use Unleash the Grape Gripe | Companion wears earmuffs; hero yanks an absurd cork; the pressure wave changes the whole arena |
| Aftermath | Walk into the restored space | Survivors react, the map changes, the hub opens for revisits |

Keep the finale recoverable. Missing a window starts another readable cycle. Losing cannot remove required abilities or consume a unique item permanently. The checkpoint is immediately before the boss. Winning grants the ending and world change once; re-entering offers an explicit rematch.

The release ultimate retains the damage/stun burst and adds anticipation, a giant cork pull, the companion's earmuffs, release impact and recovery. Damage is timed to release, and the simplified joke reads without captions and with reduced camera motion. A future authored character rig can replace the staged atlas transforms without changing the combat rule.

## Reasons to return after winning

- Discovered shortcuts make earlier places play differently.
- Optional routes hold a new move variant or a visible cosmetic, not just more score.
- A small visual field guide records encountered enemies, discovered routes and demonstrated counters. Use short replayable motion examples; reading remains optional.
- Mastery medals recognise different skills: safe rescue, successful reflect, use of a shortcut, boss counter. Do not require all medals for the ending.
- Rematches add one comprehensible modifier at a time: different enemy pairing, altered route hazard or alternate loadout. Avoid only multiplying health.
- Let the player preview and voluntarily share a funny finishing moment later. Build the enjoyable moment before adding a sharing pipeline.

Do not add multiplayer, an AI backend, daily streaks, endless procedural content, a shop or monetisation gates in the next pass. They do not fix the present animation, navigation and campaign problems.

## Ordered implementation and completion gates

| Order | Deliverable | Complete when |
| --- | --- | --- |
| 1 | Finish gait and combat animation asset workflow | All eight directions show alternating feet; attack/dash/hurt have authored poses; grounding is stable at actual phone size |
| 2 | One objective mission + checkpoint | Root relays mission above can be played, resumed and replayed without duplicate state |
| 3 | Content schema + room graph | Three small test rooms allow a fork, return shortcut and locked destination, using one source of truth |
| 4 | One optional side-view excursion | Entry, fall recovery, return and reload preserve state; controls are understandable without text |
| 5 | Distinct chapter missions | Each region has its own activity and a visible world change; pacing is observed on real playthroughs |
| 6 | Gripe Maw phases + ending | Every required mechanic was taught; a missed window is recoverable; ending and rematch both work |
| 7 | Discoveries, guide and mastery | Previously beaten content supports genuinely different goals or play styles |
| 8 | Phone release pass | Touch interruption, rotation, loading, settings, rendering and a complete campaign pass on target devices |

Keep deliveries small enough to play after each one. If order 1 needs an art source that cannot be produced here, report that specific asset gap and continue the separable objective-state work; do not relabel a bobbing still as a finished walk cycle.

## Graphics quality gate

The prior graphics research is preserved in `DESIGN-RESEARCH-BASELINE.md`. It proposed testing a rigged character rendered to sprites versus a real-time 3D character on painted environments. It did not establish that an engine rewrite wins on this game's target phones.

Use the same character, one encounter and identical visual requirements for that comparison. Judge readable feet, turns, attacks, lighting match, frame pacing, memory and iteration effort at gameplay size. A single reusable rig is a much stronger long-term source than repeatedly asking an image model for dozens of consistent action/direction cells. Keep the new terrain and campaign logic independent of the renderer so the result does not force another gameplay rewrite.

Provisional targets from the earlier plan: 60 fps where supported, stable 30 fps on lower-tier devices, less than 12 MB for first playable content, no thermal collapse in a ten-minute combat session, and useful reduced-motion/sound/haptic settings. These are targets, **not measured results**. Measure real phone frame-time distribution, loading and memory; Node tests cannot certify them.

## Instructions to paste into Sol

> Continue `sqaz2/Grapegripe`. Read `docs/SOL-HANDOFF.md`, `docs/AUDIT.md` and `docs/ART-HANDOFF.md` first. Preserve the shared terrain/navigation engine and fixed world coordinates. Finish the directional gait art, then build the Root Cellar relay mission with objective state, a saved checkpoint and a permanent shortcut. Keep play understandable with text and sound off. Prove this complete pattern before expanding chapters or adding a side-view excursion. Do not rebuild the obsolete detective UI or claim the full campaign is finished after adding more waves. Report the implemented milestone, remaining art gaps and what was actually tested.
