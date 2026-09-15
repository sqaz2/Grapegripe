# Grape Gripe in the StarMuff universe

Scope and source audit: 2026-09-05. This document supersedes the older single-game restrictions where they conflict with the user's universe direction. Build endings one at a time, or as a small coherent group. There is no 100-ending commitment.

## Player promise

Your first spawn establishes your character; travel never turns you into each destination's mascot. You can eventually find friends, travel between games, and remember the endings and discoveries you earned. Each game keeps its own controls, world art, local abilities and sense of humour. Reading and sound are optional for understanding play.

First-spawn randomisation is a universe-level decision to implement once. Do not reroll on page load, death, scene change or entering another game. Existing Grape Gripe players keep the grape fighter. This delivery does not randomly assign an unsupported avatar or silently replace a future StarMuff visitor's appearance.

## What exists, and what does not

Grape Gripe has four top-down regions, one optional side-view route, objective dependencies, one actual ending, local checkpoints, generated directional art, and a static deployment. There is no game account server or friend presence service here.

Read-only StarMuff inspection found:

- `package.json`: Express, React/Vite, Drizzle and Postgres-related packages. These are repository declarations, not proof of the live deployment's runtime.
- `shared/schema.ts`: users, players linked to users, and game saves associated with a player and world. Its save fields are largely ship/sector-specific.
- `server/routes.ts`: session authentication, player ownership checks for save reads, and a custom request header for API writes.
- `server/chamberRoutes.ts`: an existing subgame handoff lifecycle with saved snapshots and expiry. It is a useful reference, not an endpoint Grape Gripe can reuse unchanged. The inspected create handler accepts `playerId` from the body; explicitly verify ownership when extending this pattern.

Source links: [StarMuff schema](https://github.com/sqaz2/StarMuff/blob/main/shared/schema.ts), [routes](https://github.com/sqaz2/StarMuff/blob/main/server/routes.ts), [Chamber handoffs](https://github.com/sqaz2/StarMuff/blob/main/server/chamberRoutes.ts). Only these bounded files were inspected, not the entire StarMuff repository or its live service. README.md returned 404; package.json and the named source files were readable.

## Difficulty and delivery boundaries

| Area | Difficulty | Why | This delivery |
| --- | --- | --- | --- |
| Same character across games/devices | Very hard | Shared authentication, durable ownership, avatar compatibility, cross-origin travel and save conflicts | Grape Gripe character/memory/adventure boundary implemented; online connection still required |
| Find friends and play together | Very hard | Presence privacy, reconnects, authoritative movement/combat, instance routing and latency | Scoped below; no simulated online population |
| Consistent character animation in every world | Hard | Every avatar needs matching directional and action poses in both perspectives | Existing assets preserved; per-avatar art acceptance specified |
| Reliable replay and ending history | Hard | Old-save migration, reset boundaries, duplicates, unknown schemas and corruption | Implemented and tested locally |
| Distinct second ending | Medium | New reachable choice, silent teaching, consequence and reward rules | Framework delivered; second story/scene left for Sol |
| Additional authored route/room | Medium | Art/floor alignment, navigation, checkpoint and phone pacing | Existing terrain engine reusable; room expansion follows controls QA |
| Ending cabinet and visual hints | Easy–medium | UI can consume existing stable records, but silent readability needs playtesting | Pause shows earned ending count; richer cabinet left for Sol |
| Labels, map badges, balance values | Easy | Existing UI/content supports bounded edits | Do after deciding their gameplay job |

## Implemented foundation

`public/engine/journey-memory.mjs` owns a local-origin character descriptor and cumulative discoveries, learned tactics and unique ending records. Character identity is distinct from scene actor objects. `enterRegion` carries its ID and avatar ID onto the actor, and the side-view scene keeps that actor. There is currently one supported avatar, the existing grape fighter; this is not an all-character renderer.

`public/engine/save.mjs` now writes schema 2 at the existing storage key. It migrates schema-1 saves, retains an existing victory, preserves the character through the migration backup, keeps the last valid backup during repair, refuses newer unsupported formats and rejects sequential stale writes. Revision is now retained by the running game rather than recreated for each checkpoint. This does not claim atomic cross-tab transactions.

`restartAdventure` preserves character, memories and preferences; it resets current puzzles, transient restoration flags, combat upgrades and run-specific verdict perks. Continuing an adventure preserves those local decisions. Replaying is a new adventure, not a new person. Memories do not auto-complete objectives or grant old combat rewards in the new run.

`public/content/endings.mjs` registers only the playable `grapegripe:vineyard-restored` ending, with explicit requirements. Runtime completion verifies those requirements and records a unique ending once, even if the completion callback repeats. The original `endingSeen` flag remains a current-adventure compatibility flag for restored-world travel. Ending history survives a new adventure and Aged Poorly.

The existing visual guide and Vineway mastery badge read accumulated learning. Pause exposes the ending count and whether local progress is saving. The remaining undefined energy cap in the Vineway mastery reward was removed; energy remains finite.

## Honest storage boundary

This is a refactor and migration of the existing device-local save, not completion of shared-universe persistence. It remains confined to this origin and browser, and clearing browser data can erase it. The `local:` character identifier is not a login token or server-issued identity. No cross-site import, account claim, arbitrary avatar URL, online reward or cloud-save success is implied.

The shared server must become the source of truth before offering cross-game identity, cross-device recovery, friends or valuable transferable rewards. Use StarMuff's existing player ownership model rather than starting a competing account system in Grape Gripe. Verify the actually deployed server and database first; do not migrate StarMuff infrastructure based solely on package declarations.

## Shared-server integration contract for the next platform milestone

This is a design contract, not currently exposed endpoints:

1. Bind an owned StarMuff player to one immutable origin/character descriptor. Choose a supported first spawn once on the server. Existing local characters require an explicit authenticated claim flow; a browser-supplied player ID must never establish ownership.
2. Store universal identity separately from per-world records and active adventure checkpoints. Suggested keys: character ID; `(character ID, world ID)` for memory; `(character ID, world ID, adventure ID)` for a run. Use database uniqueness for `(character ID, ending ID)`.
3. Depart by committing the source checkpoint and creating a short-lived, single-use transfer tied to the authenticated player, destination world/instance and allowlisted return location. Do not put save blobs or account credentials in the URL.
4. Destination resolves the transfer through the server, validates ownership, expiry, destination, avatar support and checkpoint schema, then commits entry once. Duplicate or simultaneous redemption must not create a second character or reward.
5. Failure before successful entry leaves the source checkpoint recoverable. Closing, retrying or going Back resumes an explicit state. The server is the authority for transfer status and rewards; query parameters and client memory are not.
6. Map each game to a capability adapter. Grape Gripe requires eight-direction top-down poses plus side-view jump, grapple, swing, release, dash, hurt and idle. Unknown avatar assets must stop entry with a return option, not transform the visitor into the grape fighter.
7. For the first connection, prefer serving Grape Gripe under the same authenticated StarMuff origin if the deployed architecture supports it. Otherwise design the cross-origin session flow explicitly; do not assume separate Sites domains share cookies or localStorage.

Do not call these requirements finished after implementing a JSON import/export button. Test expiry, replay, wrong-player/wrong-world access, concurrent updates, rejected writes and interrupted navigation against the real server.

## Friends after identity and travel

First deliver opt-in presence and a join request, not synchronized combat. Presence should expire and support invisible/private status. Resolve the friend's game and instance and use the same safe travel contract. Live co-op is a separate milestone: server-owned encounter/objective state, input reconciliation, reconnect recovery and mobile load tests. Avoid simulating it by displaying other players' names over single-player actors.

## Audit issues still relevant to Sol

- `journey.js` is still a large combined scene/controller/renderer module. Extract one scene adapter at a time with unchanged behavior, not an engine rewrite.
- Checkpoint anchors now use an explicit registry and reachable-floor projection. Add and validate an anchor with each new room.
- Pending chapter upgrades and claimed rewards are now persisted. Tests cover travel/choice reloads, duplicate clicks and recovery of old missed choices.
- Vineway partial receipts/moth progress and current side checkpoint are session-only; leaving/reloading can restart the excursion. Its final mastery is remembered.
- Repeatedly visiting secrets or replaying a side route can grant more local score/energy. Do not connect these counters directly to a shared economy. Server-authoritative reward policy is a separate decision.
- Whining currently addresses repeated falls and slow moth contact. Holding grapple with no anchor does not trigger a complete adaptive tutorial; the ghost alone still needs a silent phone comprehension test.
- Aged Poorly needs a visual demonstration of sour ground, a grace period before damage, and hazard reachability checks on narrow paths. Do not call it a second narrative ending.
- Primary touch recovery exists, but the last report did not prove an Android browser defect. The earlier undefined energy cap could also produce non-finite audio parameters. Both reward paths are now finite; physical-phone reproduction is still required.
- Pause accessibility, haptics/reduced-motion settings, guide small-screen layout and actual input interruption require device/browser testing. UI headings and text-free play need observation, not just string validation.
- Side gait and action poses remain an art gap documented in ART-HANDOFF.md. Preserve the current illustrated world; generated character artwork should remain consistent across avatars and worlds.

## Evidence limits

The new tests cover migration, identity retention, completed ending criteria, duplicate completion, new-run boundaries, reload, safe storage failure, future-schema protection and stale sequential writes. Existing geometry, input, navigation, animation-state and combat tests still run. They are Node logic tests with a mocked DOM/Canvas, not real-phone rendering, networking, security certification, performance measurement or a human assessment of fun.
