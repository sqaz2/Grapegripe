# Sol's next build

Read UNIVERSE-SCOPE.md first. Its scope replaces the old single-game direction and the historical instructions at the bottom of SOL-HANDOFF.md. User decision: one persistent character throughout StarMuff; endings built one at a time or in small groups, no 100-ending target.

## Completed foundation — reuse it

- `journey-memory.mjs`: character descriptor, discoveries, learned tactics, unique endings.
- `endings.mjs`: registered ending requirements; only one authored ending exists.
- Save schema 2: schema-1 migration, memory-preserving resets, valid backup recovery and sequential stale-write rejection.
- Runtime uses the same character in top-down and side-view; Pause reports local saving/ending count.
- September 9 repairs add explicit reachable checkpoint anchors, durable upgrade choices, guarded storage, persistent failure feedback and in-session retry when writes fail. See AUDIT-REPAIRS.md.
- Local storage is still local. Shared-server travel, avatars from other worlds and friends are not implemented.

Do not rebuild the Root Cellar mission, Press clues, side-view excursion or existing ending from the old handoff. They are implemented. The September 9 repair branch preserves the newer Sites source alongside the fixes; GitHub main may lag until that branch is merged. Compare history before any sync and never force-push divergent histories.

## Ordered delivery groups

### 1. Make the current adventure dependable

The explicit checkpoint registry and persisted upgrade choices are implemented and tested. Reload before, during and after choosing an upgrade no longer loses or duplicates it. Partial side-route positions and collectibles remain session-only: reload safely returns to the chapter checkpoint, then starts the optional excursion again. Final mastery and permanent character memory are saved. Do not claim the partial excursion is durable.

Ask the user to test the first swing and receipt again while you work. Separately verify silent play on a physical phone: stop/start facing, touch interruption, simultaneous movement/action, pause/resume, jumping, swing pumping/release, ledge return and narrow bridge enemies. Report precisely which checks were simulated versus physically observed.

Acceptance: a complete adventure can be interrupted at every scene boundary and resumed without losing identity, skipping a required choice, duplicating a reward or becoming trapped. Do not make losing a unique item block the ending.

### 2. Finish the art and explanatory cues

Use ART-HANDOFF.md for the remaining leg phases and authored swing/action/idle poses. Sol Max #4 Part 1 ships a flipped walk-column remap for SW/W/NW contact frames (`walkColumn` in animation.mjs); it is not a finished atlas. Preserve generated character imagery and existing visual quality. Add a short visual sour-ground demonstration for Aged Poorly, with a safe warning interval and space to escape. Improve Whining's hold/pump/release explanation only if phone testing shows the ghost is unclear.

Acceptance: all eight directions and side-view actions read at phone size; a player can learn the special move and sour-ground rule without text or sound. Do not call staged stills a finished action animation set.

### 3. Build one new ending with an actual choice

Proposed small slice, not yet approved story canon: after the Press clues, a visually distinct optional route lets the player address the Maw's gripe instead of merely changing a damage multiplier. Design the clue, one action, consequence and final scene together. Preserve the current combat ending as reachable.

Add the ending definition only when its full scene works. If this requires new event types, extend the campaign reducer and content validator; do not add arbitrary conditions in a timer callback. Record through the memory boundary. A new ending needs a distinct outcome in the world and a visual collectible in an ending cabinet; another title over the same victory is insufficient.

Acceptance: from a clean adventure, reach each available ending intentionally; repeat it without duplicate memory/rewards; reload and replay while retaining the same character and other discovered endings. Never require collecting every optional Receipt to see the main ending.

### 4. Connect one world to StarMuff

This remains a hard platform milestone; do not describe it as a small UI task. Inspect the deployed StarMuff authentication and persistence architecture, then implement the shared-server contract in UNIVERSE-SCOPE.md. Keep ownership on StarMuff's server. Start with one authenticated character traveling into Grape Gripe and safely returning. Add the avatar adapter for that actual supported character before enabling entry.

Acceptance: identical character ID, origin and appearance on both sides; server-stored world history survives another device; failed/expired/replayed/wrong-player transfers never change ownership or duplicate rewards; source checkpoint remains recoverable after failure. Do not infer account access from a `local:` ID.

### 5. Friends, then cooperative play

After group 4 passes, add opt-in presence, private/hidden status and joining a friend's instance. Live co-op needs its own design and server tests; it is not earned by merely connecting the sites. Deliver it separately from the next ending.

## Paste into Sol

> Continue the existing Grape Gripe checkout containing the September 9 audit repairs. Read docs/UNIVERSE-SCOPE.md, docs/AUDIT-REPAIRS.md, docs/SOL-NEXT.md and docs/ART-HANDOFF.md. Preserve the schema-2 character/memory/adventure separation, reachable checkpoint registry and durable upgrade choices. Next complete the real-phone acceptance checks and authored art work. Preserve eight-direction controls, optional Vineway swings and text-independent play. Do not add a second account system, fake StarMuff connectivity, 100 endings or art that replaces the player's identity. Report actual phone evidence separately from automated checks.
