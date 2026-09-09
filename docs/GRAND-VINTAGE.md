# The Grand Vintage — September 9, 2026

The user found that the boss victory only led to another run. They asked for a town, large maps, grape rangers, more work and weapons, and a stronger purpose for the vine controls they already liked. Their story decision: our grape wants to become wine and earn selection among the best grapes. This chapter follows that direction, with a finite selection goal and a persistent home.

## Playable flow

Enter Bunchborough using Town, or Continue from a completed original patrol. Ranger Ruby registers the grape's ambition. Pip offers a delivery, Corky offers equipment recovery, and Tansy offers optional irrigation work. The town has direct roads to Sunlit Terraces and Harvest Fair; maps become available for fast travel once discovered.

| Work | Activity | Reward |
| --- | --- | --- |
| Neither rain nor raisins | Cross Canopy Post, hand the letter to Ranger Véra, return to Pip | Character seal, faster courier boots, 30 seeds |
| Under pressure | Clear pests at the parts cache and return the parts to Corky | Craft seal, Corkscatter, 25 seeds |
| High notes | Gather three aroma tags in Bottle Aqueduct, reach the fair exit, return to Véra | Aroma seal, 35 seeds |
| A little less dry | Open both irrigation valves and return to Tansy | 25 seeds |
| Footwork audition | Dodge eight warnings from Bernard the human stomper | Footwork seal, 40 seeds on first success |

With all four seals, Madame Merlot adds the grape to the Grand Vintage reserve list. This records a second distinct ending in the existing character memory. It does not reset the town, equipment or discoveries. Town celebrations and dialogue acknowledge selection; optional work and the original patrol remain available. There is no claim of an endless campaign or measured play duration.

## Implementation

`content/frontier.mjs` owns the three maps, ten NPCs, job definitions, weapons and two route definitions. `engine/frontier-state.mjs` validates and updates persistent progress. `engine/frontier-scene.mjs` adapts the existing movement, swept terrain collision, enemies, projectiles, animation and side-view controls. The town backgrounds are 3200×2400 world units; the terraces are 3600×2700. Their floor polygons follow the illustrated open paths and keep both terrace planting islands impassable.

The side-view routes retain the existing manual jump, grapple anticipation, pendulum, release, dash and Whining assistance. They use extended layouts from the original authored route. Their jobs are distinct: one is a courier crossing; the other requires three aroma tags and exits on another map. Collected tags, defeated moths and checkpoints survive reload and a return to town. Missing required tags sends the player back to the route entrance while retaining collected tags. This is local browser progression, not multiplayer or a shared save service.

Seedshot keeps the original three-hit combo. Corkscatter fires a short, wide three-projectile burst. The Pruning lance costs 55 seeds and pierces up to three different enemies. Boots increase travel speed without stacking on map changes. Cleared encounters stay cleared. Defeat returns the grape to the town fountain without removing work or equipment. The human trial is friendly and repeatable, with no duplicated reward after passing.

Save schema 3 migrates schemas 1 and 2 while retaining identity and ending history. It keeps the established backup and stale-write safeguards. Starting an old patrol parks ranger progress rather than clearing it. Saves remain tied to the current browser and origin. A custom domain does not automatically inherit a save from the Sites origin.

## Art and verification

Three generated illustrated environments are used as WebP assets: `ranger-town.webp`, `ranger-terraces.webp`, `ranger-fair.webp`. Each source is 1448×1086 and was compressed without content changes. The existing character artwork remains the player's identity. Townsfolk reuse that ranger artwork with colour variants; the illustrated fair includes the human stomper, whose cropped portrait remains visible during the audition. Existing gait limitations documented in ART-HANDOFF.md still apply.

The validator and 73 automated tests cover the original 64 checks plus map connectivity, safe route checkpoints, old-winner migration, partial expedition reload, guarded recovery through projectile combat, all job turn-ins, equipment costs, three-target piercing, successful and failed footwork, unique selection, and return to patrol without losing progress. These run actual game logic with a mocked DOM/Canvas. Scripted positions are used to reach vine tags and exits; the original physics tests cover swinging and jumping. This is not a browser render, physical-phone performance measurement, or human playthrough for fun and pacing.

This chapter's user-requested content expansion supersedes the older handoff's instruction to wait before adding maps. It does not claim the older phone/art acceptance work is complete. The separate Sommelier Speedrun branch is not included in this chapter.
