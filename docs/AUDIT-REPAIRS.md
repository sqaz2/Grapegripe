# Audit repairs — 9 September 2026

The audit initially inspected GitHub main `8761ce19c713ef290de9ec044bed551a0b7bdefc`. Repair work discovered newer source in the existing Sites project at `1a25bcab8c0f1c1e6ce1e053e869d75fa160a2f3`. This delivery preserves that newer source: schema-2 character memory, the ending registry, Whining demonstrations, Aged Poorly and the prior receipt/touch repairs. It does not revert the game to the older GitHub version.

## Changes and verification

| Finding | Repair | Evidence |
| --- | --- | --- |
| Non-finite side-route energy | One explicit 99,999 energy limit, also enforced by save validation | Receipt and mastery totals survive a fresh game instance |
| Lost upgrade on travel reload | Persist pending chapter and claimed chapters; recover older missing choices in order | Reload during travel and choice, choose twice, reload again, revisit completed chapters |
| Storage getter breaks startup | Access storage inside guarded operations | Throwing getter and denied adapter leave play available |
| Bad backup rotation and future-schema overwrite | Retain the newest valid compatible recovery slot; refuse writes when either slot uses a newer schema | Corrupt primary, failing next primary write, both future-schema slot positions |
| Tests miss game persistence | Bind every imported save operation to the harness adapter | Assert stored bytes, then load into a fresh game instance |
| Failed save has no feedback | Persistent warning for unavailable, incompatible or conflicting storage; clear after recovery | Fault injection and resumed successful writes; in-session death retry preserves objectives |
| Checkpoint names interpreted by substring | Explicit validated anchor registry and floor projection | Every registered anchor is reachable and preserves character identity |
| Short landscape clips controls | Remove the 480px shell minimum; allow overlay scrolling and keep tall panel starts reachable | CSS review only; real-phone rendering remains unverified |
| Stale handoff tells developers to rebuild shipped missions | Replace current handoff and archive the historical campaign brief | Delivered features, art gaps and future work are separated |

`npm test`: validator and **64 tests passed**. These are real game/module logic tests using mocked DOM/Canvas and explicit storage. They are not a rendered browser playthrough or a physical-phone performance test. The open Sommelier Speedrun feature is separate from this campaign repair; it must retain the vine-control lesson and use the same finite reward rules before merging.

The optional side excursion restarts at its safe entry after reload; partial receipt positions, moth progress and swing state are session-only. Finished mastery and permanent character memory remain saved. Temporary play and failed disk writes preserve an in-session retry checkpoint, but closing the tab can still lose unsaved progress.

## Remaining release work

- Authored side/diagonal walking phases and action poses remain incomplete. Three new targeted strips failed visual inspection and were rejected; existing art was preserved. See ART-HANDOFF.md.
- Perform a human campaign playthrough and physical-phone checks for short landscape, app switching, simultaneous movement/action, silent swing teaching, hazards and frame time. Automated tests do not establish feel, pacing or visual correctness.
- At inspection, the existing Sites project was owner-private with no custom domain attached. Public `grape.gripe` checks returned a proxy connection error, which cannot establish the origin's health. Cloudflare account access is required to inspect or repair the domain's actual routing. Neither a test pass nor a saved Site version proves that public address serves this code.
- StarMuff shared identity, cross-device saves, friends and additional authored endings are future scope, not regressions repaired by this change.
