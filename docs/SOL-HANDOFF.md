# Grape Gripe — current handoff

Updated 9 September 2026. Read [AUDIT-REPAIRS.md](AUDIT-REPAIRS.md), [UNIVERSE-SCOPE.md](UNIVERSE-SCOPE.md) and [SOL-NEXT.md](SOL-NEXT.md) before making changes.

## Delivered and preserved

- Four top-down regions with rescue, relays, route choice, cork carrying, vents, clue verdicts, a staged ending, restored-world travel and rematch.
- Optional Vineway platforming, swings, Receipts, moth counters and remembered mastery.
- Schema-2 local character, cumulative discoveries/endings and a resettable adventure; a new adventure keeps the same character.
- Explicit reachable checkpoint anchors, persisted chapter upgrade choices, recoverable saves, protection for future formats, and visible saving failure feedback.
- Eight-direction controls, terrain collision/pathfinding, touch recovery, help demonstrations and illustrated game assets.

The runtime entry is `public/journey.js`. `public/game.js` is an unreferenced prototype. Keep physics in source-image coordinates and use the shared terrain engine for grounded movement. Run `npm test` after logic changes.

## Next acceptance work

The validator and 64 automated tests pass. Actual phone layout, responsiveness, silent comprehension, performance and campaign pacing remain unverified. Test those before expanding content. Partial side-excursion progress resets safely on reload; final mastery is remembered.

Side/diagonal gait and special-action art still need an authored pose pass. Rejected generation attempts are documented in [ART-HANDOFF.md](ART-HANDOFF.md); do not substitute them into production.

The older 10–12-room proposal and 40–60-minute pacing hypothesis were never verified deliverables. The original brief is preserved in [CAMPAIGN-DESIGN-REFERENCE.md](CAMPAIGN-DESIGN-REFERENCE.md) for design history only. Do not rebuild its already implemented missions.

## Preserve the product direction

Phone first, large controls, immediate action, eight-direction movement and a funny visual ultimate. Reading and sound are optional. Keep the illustrated vineyard and existing grape character; eventual StarMuff travel must preserve each player's established identity. Shared-server travel and friends need the separate platform work in UNIVERSE-SCOPE.md. Build additional endings one at a time when their complete choice and consequence can be delivered.
