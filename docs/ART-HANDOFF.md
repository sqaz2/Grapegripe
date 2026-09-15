# Character animation: honest asset status

## StarMuff character continuity

The player keeps their first-spawn character when traveling to another game. The current grape atlas remains the supported native Grape Gripe character; it is not a fallback to silently apply to other visitors. Future avatar adapters need matching top-down and side-view poses, foot anchors and action clips before travel is enabled for that avatar. Keep character artwork generated and consistent with the user's established visual direction. See UNIVERSE-SCOPE.md and SOL-NEXT.md for the integration order.

The old renderer had three still illustrations with bobbing and rotation. This pass adds a replaceable walking atlas and a real distance-driven animation controller. It is an improvement in motion and grounding, but it is **not a production-complete animation set**.

## Included asset

`public/assets/hero-walk.webp`: 2304×1920, RGBA, approximately 535 KiB. Six columns by five rows, 384×384 cells. Anchor `(192,350)` in every cell, rendered as a 144-world-unit square. Character content is roughly 105 world units high. Transparent padding prevents adjacent cell bleed.

| Atlas row | View | Mirrored use |
| --- | --- | --- |
| 0 | South | None |
| 1 | Southwest | Southeast |
| 2 | West | East |
| 3 | Northwest | Northeast |
| 4 | North | None |

The requested six gait phases were contact, down, passing, opposite contact, opposite down, opposite passing. **The generated asset does not satisfy that anatomy consistently.** South and north show foot alternation; southwest, west and northwest keep the same prominent leading boot through most of the sequence. There is motion, but these views can still look like shuffling. A targeted correction did not solve it and was not included.

The initial source had a baked background. The asset preparation pass removed that background and normalised cell size/grounding; WebP encoding did not invent missing poses. Check edge halos, foot placement, silhouette consistency and phase order before calling the art final.

## Finish this before content-scale animation

1. Supply proper alternating contact and passing poses for the three side/diagonal rows. Each left contact must visibly differ from the opposite right contact at roughly 100px character height.
2. Check the body pivot and apparent size across all views. Feet should plant while the body moves forward; the hood and face must not visibly change design between cells.
3. Add authored attack anticipation/release/recovery, dash launch/travel/land, hurt/recovery, interaction and victory clips. The current controller's corresponding states still use walk poses plus simple transforms.
4. Give the companion a separate clean asset and reaction clips. The present runtime crop is functional, not a complete companion animation system.
5. Replace the release's runtime-staged ultimate art with authored poses. The shipped timing now includes earmuffs, an absurd cork pull, pressure build, release and impact without relying on a text joke, but the hero and companion poses are assembled from the existing art rather than a reusable rig.

A second 4×4 action-sheet experiment was deliberately rejected from the release because its checkerboard was baked into opaque pixels and its east-facing walk row was missing. It is evidence for the rig recommendation, not a hidden production asset.

Do not repeatedly generate the same large sprite sheet when the model fails at alternating anatomy. The earlier research's stronger long-term approach is a reusable rig, with the same animations rendered into directional atlases or shown through a tested real-time renderer. That decision still needs a controlled phone comparison; this pass does not introduce a 3D engine.

## Acceptance viewing

September 9 repair attempt: three targeted six-pose strips were generated separately for southwest, west and northwest. All were rejected. They contained opaque checkerboard pixels and still repeated the leading boot; the west candidate also drifted into a three-quarter view. None replaced the existing atlas. The required next delivery is an authored pose/rig pass with visible opposite-foot contacts, not another uninspected generated sheet.

View each direction separately over both light and dark floor, then move continuously through all eight directions at gameplay size. Check a slow walk, a normal walk, wall pushing, stop/start, a dash and an attack during movement. Foot alternation must be obvious without zooming in. The numerical unit tests validate frame selection and timing, not the quality or anatomy of these pictures.

## Sol Max #4 Part 1 — SW/W/NW contact-frame remap (code)

Until authored alternating strips land, `walkColumn()` in `public/engine/animation.mjs` reverses walk columns for flipped facings (directions 0/1/7 → west / northwest / southwest). That makes opposite contact and passing frames lead after mirroring, instead of repeating the same leading boot across the cycle.

This does **not** replace the atlas art. Part 1 is the controller fix only; a later Part still needs visible opposite-foot poses in the sheet itself.
