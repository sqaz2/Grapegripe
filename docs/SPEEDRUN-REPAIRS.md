# Sommelier Speedrun repair addendum — 9 September 2026

This feature branch includes the campaign repairs in AUDIT-REPAIRS.md and preserves the newer character-memory, Whining and Aged Poorly source from Sites. Merge the campaign repair first; the speedrun remains a separate optional feature.

- Clean-pour and guest-receipt rewards use the shared finite energy limit.
- The first side-route help screen retains hold, pump and release instructions alongside the optional three-pour objective, including the accessible announcement.
- Sommelier mastery is registered in character memory as well as current-adventure saves. Reload and a new adventure retain the learned mastery without repeating an old energy reward.
- The mastery flash advances on one timer instead of being decremented twice each simulation step.

The validator and **71 tests pass**. Added integration tests check actual reward amounts, stored bytes through the save adapter, a fresh game instance, character identity and the first-time lesson. Existing cork collision, telegraph, clean-pour and guest tests also pass.

These are mocked DOM/Canvas logic tests. Phone rendering, game feel, directional/action art and public-domain availability retain the limitations in AUDIT-REPAIRS.md.
