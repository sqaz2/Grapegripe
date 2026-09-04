> Preserved prior research. This is evidence and a proposed graphics comparison, not a record of completed implementation. The current build sequence and user constraints are in SOL-HANDOFF.md; that handoff takes precedence where scope differs.

# GRAPE GRIPE: Graphics-First Production Research Brief

**Date:** 2026-09-04  
**Audience:** Project owner, future art collaborators, animation collaborators, and game-development collaborators  
**Decision:** What additional research is needed, and which production pipeline is most likely to deliver the best graphics for a mobile-first browser action journey?

## Scope and assumptions

This brief evaluates Grape Gripe as it exists today: a portrait-oriented browser prototype built with HTML, CSS, and Canvas 2D, with a polished painterly grape fighter, a lime one-eyed companion, a dark purple bioluminescent vineyard arena, and four illustrated enemy types. The current art assets total roughly 505 KB and already establish an appealing color and character direction. The intended game is an action journey with eight-direction movement, action buttons, multiple connected regions, strategy-guide-style world structure, a funny power-up called "Unleash the Grape Gripe," little or no required reading, and phone-first controls.

This is production research, not a promise that one engine or art method will automatically produce a beautiful game. The quality of the final work will depend on art direction, animation timing, lighting, VFX, sound, iteration, and device testing as much as raw rendering technology.

## Executive answer

Yes. There are important areas to research before producing more maps or large quantities of finished art. The highest-risk unknown is the **character graphics pipeline**. The current prototype proves the visual premise, but a single static illustration cannot supply convincing eight-direction turning, running, attacks, dodges, knockback, emotes, upgrades, and boss interactions.

The provisional winner is a **hybrid real-time 3D pipeline**:

- rigged 3D hero, companion, enemies, bosses, pickups, and major interactive props;
- hand-painted, baked, or lightly modeled 2.5D environments;
- fixed portrait camera with an orthographic or near-orthographic view;
- a restrained toon/painterly shader, rim light, contact shadow, baked environment light, and selective effects;
- Babylon.js with a WebGL 2 baseline and WebGPU only as an optional enhancement;
- Blender to model, rig, animate, and export glTF/GLB assets.

This is an inference from the project constraints and the evidence, not a finding that Babylon.js is inherently superior. Hades II preserved a painterly 2D appearance while shifting characters to real-time 3D; its graphics programmer reports smoother turns and blends, more characters, faster performance, and lower memory use than the earlier 2D workflow ([DigiPen interview with Hades II graphics programmer Devansh Maheshwari](https://www.digipen.edu/showcase/news/hades-2-graphic-programmer)). That directly addresses Grape Gripe's eight-direction and action-animation problem.

However, the project should not commit until it runs one controlled **graphics A/B spike** on target phones:

1. Version A: a rigged real-time 3D grape fighter and companion over a painterly environment.
2. Version B: the same motions pre-rendered from a 3D rig into 2D sprite atlases with normal maps.
3. Same 20-30 second Press Pit encounter, camera, effects, enemy count, and audio.
4. Compare visual match, frame pacing, memory, download size, heat, battery behavior, load time, and revision speed.

If real-time 3D cannot preserve the current character's charm or remain stable on the chosen low-end phone, Version B becomes the final pipeline. Dead Cells demonstrates why a 3D rig rendered into 2D frames can preserve a stylized result while making animation retakes and asset reuse much faster ([Thomas Vasseur's production deep dive](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)).

## What "best graphics" means for this game

Best graphics is not maximum resolution, polygon count, or particle count. On a phone, the best graphics are the ones that remain expressive, readable, responsive, coherent, and stable at gameplay scale.

The quality hierarchy should be:

1. **Instant silhouette:** the grape fighter, companion, hazards, pickups, and enemy attack shapes are distinguishable in peripheral vision.
2. **Motion quality:** turns have weight, attacks have readable anticipation and contact, movement blends do not pop, and hit reactions communicate cause and effect.
3. **Combat readability:** the player can identify danger, safe ground, rewards, exits, and interactables without reading labels and without relying on color alone.
4. **Art cohesion:** the same forms, palette rules, lighting logic, texture density, and line treatment recur across characters and regions.
5. **Game feel:** hit pause, motion trails, impact shapes, particles, sound, screen response, companion reaction, and optional haptics work as one event.
6. **Frame pacing and loading:** visual splendor that stutters, overheats a phone, or delays first play is not the best graphics for this product.

MDN's WebGL guidance supports treating GPU memory as a budget, adapting to device limits, reducing render resolution when needed, batching draw calls, and considering compressed textures ([MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)).

## Research tracks to complete before full production

### P0: Graphics pipeline proof

**Question:** Can a real-time 3D grape fighter look as charming as the current illustration at normal phone scale while remaining performant?

**Experiment:** Build the A/B encounter described above. Lock the camera, arena, actions, and effects so the render method is the only meaningful difference.

**Pass condition:** At least five viewers prefer or cannot distinguish the hybrid 3D version at gameplay scale; it meets the device quality gates; it is faster to revise than equivalent sprite work.

**Reason:** Hades II required experimentation to blend real-time 3D characters with painterly 2D art, but the resulting pipeline enabled natural turning and motion blends ([DigiPen](https://www.digipen.edu/showcase/news/hades-2-graphic-programmer)). Dead Cells reached a different answer: 3D source animation rendered as 2D sequences with normal maps and a toon shader, emphasizing rapid retakes and asset reuse ([Game Developer](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)). Both sources agree on one principle: build a reusable rig and animation pipeline instead of drawing every direction and retake manually.

### P0: Character and animation bible

Create the hero and companion as full turnarounds before additional final illustrations. Define front, back, side, and diagonal readability; dominant shapes; leaf behavior; grape-cluster deformation; hand/gauntlet scale; eye direction; companion orbit; and shadow footprint.

Minimum hero clips for the vertical slice:

- idle, run, stop, turn, dash, light attack, heavy attack, launch/throw, hurt, knockdown, recover, victory, interaction;
- a separate movement/upper-body approach only if tests prove it improves responsiveness;
- companion idle, alert, point, panic, dodge, celebrate, charge, and ultimate reaction.

Use animation blending for direction changes in real-time 3D. If sprites win, render directions from the same rig into lazy-loaded atlases. The animation bible should specify anticipation frames, contact timing, recovery, cancel windows, root motion policy, and the exact frame at which damage is applied.

### P0: Combat readability and VFX budget

Each attack needs a recognizable sequence: **anticipation -> threat shape -> contact -> consequence -> recovery**. Boss telegraphs should remain visible when the screen is busy. Lime/yellow should be protected for interactables, warnings, companion guidance, and high-value actions; background lime should be reduced behind active combat. Important signals should combine shape, movement, sound, and optional vibration rather than color alone ([Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103)).

Define an effect budget per event. A basic hit should not use the same screen coverage, brightness, sound weight, or camera response as the ultimate. Add a reduced-motion option and a screen-shake toggle.

### P0: Portrait camera and control-safe composition

Define one camera angle and lens before producing environments. The current portrait composition is a strength, but the bottom corners will be occupied by the movement and action controls. No attack may begin unseen under a thumb or button cluster.

Create a camera-safe overlay containing:

- top status strip;
- central combat/readability field;
- left movement-thumb zone;
- right action-thumb zone;
- companion-message zone expressed through motion, face, arrows, and short sounds;
- off-screen threat arrows and exit shapes.

Microsoft's touch-layout guidance notes that touch play is generally constrained to two simultaneous thumb inputs, recommends ranking controls by frequency and importance, and calls for testing across screen sizes and interruptions ([Microsoft touch-control guide](https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide?view=gdk-2604)).

### P0: Device and delivery budget

Test on three physical classes, not only desktop emulation:

- reference high-tier phone: Pixel 9 Pro or equivalent;
- common mid-tier Android phone;
- older/low-memory phone selected from likely audience devices.

Internal starting targets, subject to measurement:

- 60 fps target on high/mid devices; stable 30 fps quality mode on the low tier;
- first playable download under 12 MB for the vertical slice;
- no long main-thread stall during room transition;
- controls respond in the same rendered frame whenever possible;
- resume correctly after app switch, phone call, lock, or browser interruption;
- no thermal collapse during a 10-minute route;
- quality scaling for shadows, particles, internal render scale, post-processing, and enemy count.

These numerical targets are project decisions, not external standards. MDN warns that client hardware limits vary widely and recommends explicit VRAM budgeting and lower internal render resolution as a performance lever ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)).

### P1: World-kit and journey architecture

Do not make one giant empty map. Build the Gripevine as connected authored regions, each with a landmark silhouette and a distinct mechanic. Suggested first route:

1. **Root Cellar:** safe practice, companion bond, breakable cork seals.
2. **Vineway:** short travel runs, forks, moving hazards, first secret route.
3. **Press Pit:** current arena becomes the first combat landmark.
4. **Sourwood:** winding travel region, ambush ecology, first miniboss.

Each biome should begin with a modular kit: ground shapes, border shapes, elevation/occlusion pieces, blockers, hazards, interactables, decals, ambient motion, and three unmistakable landmarks. Authored landmark rooms provide memorable places; reusable or shuffled travel chunks create journey length without demanding a fully hand-painted continent.

The strategy guide should be a **living production map**, not a complete encyclopedia made before testing. Finish the guide spread for the first route only: world overview, region map, main route, optional objective, secret, enemy silhouettes, boss weakness, movement icons, and the ultimate. A vertical slice should represent final art, gameplay, and core systems before scaling production ([Game Developer on vertical slices](https://www.gamedeveloper.com/game-platforms/what-you-should-take-out-of-pre-production)). Supergiant similarly used a limited technical test to find compatibility and technical problems before opening Hades II more broadly ([Supergiant development update](https://www.supergiantgames.com/blog/hades-ii-development-update/)).

### P1: Low-reading onboarding and icon comprehension

The game should be completable without reading prose, but icons cannot simply be left unlabeled and assumed to work. Test each core icon twice: first out of context for recognition, then inside a realistic action sequence for comprehension ([Nielsen Norman Group icon testing guidance](https://www.nngroup.com/articles/how-to-test-digital-icons/)).

Use animated teaching:

- ghost-thumb motion over the eight-way control;
- companion physically points or performs the needed action;
- the correct button pulses using shape and motion, not color alone;
- the environment demonstrates a mechanic safely before it can hurt the player;
- failure immediately replays the cue more clearly;
- optional one- or two-word labels can be enabled, but are not required.

Primary touch targets should be generously larger than accessibility minima. WCAG 2.2 defines a 24 by 24 CSS-pixel minimum target criterion and a 44 by 44 enhanced criterion; Grape Gripe should begin at roughly 56 CSS pixels for primary action buttons and then tune by device and hand testing ([W3C minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)). The 56-pixel recommendation is an internal design target.

### P1: Sound, music, and optional haptics

Research and prototype one complete audiovisual combat event before composing a soundtrack. Build layers for anticipation, swing/whoosh, contact, enemy vocal, debris, reward confirmation, companion reaction, and camera response. Web Audio supports precise timing, routing, and spatialization for interactive audio ([MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)).

Use optional haptics sparingly and in sync with audio and visuals. Android's haptic guidance explicitly recommends synchronization and restraint ([Android haptics principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles)). Browser vibration support varies, so haptics are enhancement-only and must not carry information by themselves.

### P1: The ultimate as signature animation

"Unleash the Grape Gripe" should be designed as a short readable spectacle, not a generic large explosion.

Storyboard:

1. The **Last Straw** meter reaches full; companion notices first.
2. The companion puts on tiny earmuffs and backs away.
3. The hero plants, swells, and pulls an impossible cork from the grape cluster.
4. A spectral purple-and-lime complaint wave screams across the field.
5. Projectiles reverse, enemies stagger, thorn barriers crack, and the boss exposes a weakness.
6. The companion re-enters, scorched but delighted, and presents the cork like a trophy.

The spectacle must still read in one second, with the phone muted and at normal play scale. Reserve the widest value contrast, strongest camera response, and densest effect layering for this move.

### P2: Shareable replay experiment

The site can eventually save the last few seconds around the ultimate and offer a native share button. Canvas content can be captured as a real-time media stream, and MediaRecorder can encode that stream ([MDN canvas capture](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream), [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)). Native web sharing can pass text, links, and supported files to operating-system share targets, but the Web Share API has incomplete browser coverage and requires HTTPS plus a user action ([MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)). Therefore this is a later experiment with a download/copy-link fallback, not part of the first production milestone.

### P2: Retention and player motivation

Do not research retention as a collection of manipulative timers. Research what makes players want one more route:

- visible mystery on the world map;
- a new move or funny modification that changes play;
- secrets requiring remembered landmarks rather than text;
- companion reactions and evolving visual relationship;
- short route choices with meaningful risk and reward;
- collectible Gripe Bottles that preserve memorable verdicts without requiring long reading;
- strategy-guide pages that visibly fill in as discoveries are made.

The theme should remain expressible in one sentence: **Travel a living vineyard, investigate its gripes, and unleash the loudest one as a weapon.** The Cult of the Lamb team described the value of a player fantasy that can be explained in one sentence and of cutting features that do not fulfill that promise ([Unity interview with Massive Monster](https://unity.com/blog/games/recipe-behind-smash-hit-cult-of-the-lamb)).

## Pipeline comparison

| Pipeline | Visual fit | Eight-direction cost | Mobile memory/delivery | Revision speed | Main risk | Recommendation |
|---|---|---:|---:|---:|---|---|
| Hand-drawn 2D frames | Excellent if expertly animated | Very high | Atlas growth can become severe | Slow | inconsistent directions and expensive retakes | Do not use as the main character pipeline |
| 2D skeletal/mesh sprites in 3D world | Strong for flat graphic styles | Medium | Good | Fast | can look like cutout puppets; diagonal turn limits | Useful for UI, props, and select enemies |
| 3D rig rendered into 2D atlases | Strong; can preserve painterly output | Medium-high at export, low at runtime | Can grow with directions/actions | Fast source retakes | atlas size, frame flicker, no continuous turn | Approved fallback |
| Real-time rigged 3D in painterly 2.5D | Strong if shader/art tests succeed | Low after rig exists | Potentially best at content scale | Fast | hardest initial look-development problem | Provisional winner; validate first |

## Recommended engine and asset route

The current Canvas 2D implementation is an effective prototype but should not become the content-production foundation before the graphics spike. It would require custom work for animation state blending, scene/resource streaming, advanced lighting, skeletal animation, and GPU asset management.

For the real-time hybrid spike, use:

- **Babylon.js** as a full browser 3D engine with WebGL and WebGPU support, animation, scene management, lighting, particles, and glTF workflows ([Babylon.js](https://www.babylonjs.com/));
- **Blender** for modeling, rigging, animation actions, baking, and glTF/GLB export ([Blender glTF manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html));
- GLB characters with a shared skeleton where useful;
- baked lightmaps for environment mood, one hero/key light, restrained dynamic shadows, and a simple rim-light/toon treatment;
- KTX2/Basis compressed textures where supported, with normal fallbacks;
- progressive region loading and disposal of resources no longer needed.

If the sprite path wins, use the same Blender source assets and animation actions, then batch-render eight directions plus normal maps into sprite atlases. This preserves a path to change direction later without discarding the modeling and rigging work.

## Visual art bible starter

### Keep from the current art

- clustered purple hero silhouette;
- oversized green leaf/gauntlet shapes;
- lime one-eyed companion;
- deep violet world with magenta-violet magic;
- organic vineyard ruins and grotesque plant enemies;
- cute, confrontational, slightly absurd tone.

### Improve for gameplay

- simplify microdetail inside the hero silhouette at normal play scale;
- add a consistent rim light and dark contact shadow so the hero separates from purple terrain;
- reserve the brightest lime for gameplay information rather than background decoration;
- reduce saturation and contrast in the combat background immediately behind actors;
- give each enemy one unmistakable body shape and one unmistakable attack shape;
- let environmental detail increase at edges and landmarks, not beneath active combat.

### Palette roles

| Role | Color family | Use |
|---|---|---|
| World shadow | near-black violet | depth, negative space, control legibility |
| Hero/body | grape purple | protagonist identity |
| Guidance/safe action | lime/chartreuse | companion, exits, interactables, success |
| Threat | hot magenta/coral | enemy anticipation, danger, damage |
| Reward/secret | warm gold | rare pickups, hidden route confirmation |
| Neutral structure | desaturated plum/blue | terrain that must not compete with combat |

## Vertical-slice quality gates

Do not scale to more regions until one Root Cellar -> Vineway -> Press Pit route passes:

1. Hero and companion silhouettes remain readable on a 6-inch phone at normal grip distance.
2. Testers identify enemy attack direction before taking damage in at least 80 percent of first-seen telegraphs.
3. Eight-direction movement, turn, attack, dash, and hurt states contain no visible popping, frame shimmer, or foot sliding severe enough to distract.
4. A first-time player completes the movement and attack lesson without reading prose.
5. Controls do not conceal hazards, exits, or active enemies.
6. High/mid-tier target devices sustain the 60 fps target; low tier sustains the 30 fps mode for a 10-minute route.
7. First playable stays within the provisional 12 MB delivery budget.
8. The ultimate is understandable, funny, and satisfying while muted.
9. Reduced motion, reduced shake, audio levels, and haptic toggle work.
10. The guide map and the playable route agree exactly.

The 80 percent, 60/30 fps, and 12 MB values are internal thresholds chosen to make the decision testable. They should be revised if audience/device data proves them inappropriate.

## Research and production order

1. Freeze a one-page art thesis and one-sentence player promise.
2. Draw hero, companion, and three enemies as production turnarounds.
3. Build the A/B graphics spike using identical animation and encounter requirements.
4. Test the spike on three physical phone classes and with at least five viewers.
5. Lock the engine and character pipeline.
6. Produce the vertical-slice animation bible, VFX bible, camera-safe overlay, and input icon set.
7. Build the Root Cellar -> Vineway -> Press Pit route and matching strategy-guide spread.
8. Conduct no-reading onboarding, telegraph, and touch-control tests.
9. Polish audiovisual impact and the Last Straw ultimate.
10. Only then expand Sourwood and the wider Gripevine.

## Limitations, disagreement, and confidence

- There is no public benchmark that proves Babylon.js will outperform Phaser, current Canvas 2D, Three.js, or another engine for this exact scene. The recommendation is a reasoned fit based on feature needs and must be validated by the A/B spike.
- Hades II targets native desktop/console hardware with a custom engine, so its exact performance results cannot be transferred to a browser game. Its production lesson - real-time 3D enabling fluid turns and lower content-scale memory - is relevant, but the magnitude is not assumed.
- Dead Cells uses a pixel-art target, not painterly high-resolution characters. Its value here is the source-rig-to-sprite workflow and fast retakes, not its exact rendering settings.
- Microsoft touch research cited here concerns Xbox cloud gaming and should not be generalized into a forecast for Grape Gripe's audience. Its input constraints and layout guidance are used as design evidence only.
- Web Share and browser media recording have compatibility and format differences. Sharing must remain optional and feature-detected.
- The current images were assessed as production references, not as final multi-angle asset sheets. A real artist/animator should own final shape language and motion quality.

**Confidence:** High that the graphics pipeline must be tested before content scale-up; high that a reusable 3D rig should be the source of motion; medium that real-time 3D should be the final render method; high that no-reading onboarding, combat readability, device budgets, sound/VFX choreography, and modular journey maps require explicit research and acceptance tests.

## Claim-source ledger

| Claim | Source | Evidence type | Confidence | Qualification |
|---|---|---|---|---|
| Real-time 3D enabled Hades II to support more characters, smoother transitions/turning, faster performance, and lower memory than its earlier 2D workflow | [DigiPen interview](https://www.digipen.edu/showcase/news/hades-2-graphic-programmer) | Direct interview with graphics programmer | High | Native custom engine, not browser |
| A 3D source rig rendered into 2D frames/normal maps can make retakes and asset reuse faster | [Dead Cells production deep dive](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-) | First-person developer account | High | Pixel-art target differs |
| WebGL production should budget memory, adapt to limits, batch, atlas, compress textures, and scale internal resolution | [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | Standards-oriented technical guidance | High | Exact budgets are project-specific |
| Touch design is dominated by two-thumb constraints and should prioritize frequent actions and screen-size testing | [Microsoft touch guide](https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide?view=gdk-2604) | Platform design guidance | Medium-high | Xbox cloud context |
| Important cues should use multiple sensory channels and not color alone | [Xbox XAG 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103) | Accessibility guidance | High | Implementation details remain project-specific |
| Icons require out-of-context and in-context comprehension testing | [Nielsen Norman Group](https://www.nngroup.com/articles/how-to-test-digital-icons/) | UX research guidance | High | Not game-specific |
| A vertical slice should represent final art, gameplay, and systems before scaling | [Game Developer](https://www.gamedeveloper.com/game-platforms/what-you-should-take-out-of-pre-production) | Industry production guidance | Medium-high | Editorial, not experimental study |
| Limited technical tests can uncover compatibility and technical issues before broader release | [Supergiant](https://www.supergiantgames.com/blog/hades-ii-development-update/) | First-party development update | High | Hades II project context |
| A one-sentence player fantasy helps focus production decisions | [Unity/Massive Monster interview](https://unity.com/blog/games/recipe-behind-smash-hit-cult-of-the-lamb) | Direct developer interview | High | Design principle, not causal proof |
| Canvas capture, media recording, and native sharing can support shareable clips, subject to compatibility and permissions | [MDN captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream), [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder), [Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) | Web API reference | High | Web Share is not Baseline; formats vary |

## Selected references

1. DigiPen. "Devansh Maheshwari Programs God Tier Graphics in Hades II." Accessed 2026-09-04. https://www.digipen.edu/showcase/news/hades-2-graphic-programmer
2. Vasseur, Thomas. "Art Design Deep Dive: Using a 3D Pipeline for 2D Animation in Dead Cells." Game Developer, 2018-01-25. https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-
3. Unity. "Creepy, Cute, Compelling: The Recipe for Smash Hit, Cult of the Lamb." 2022-10-28. https://unity.com/blog/games/recipe-behind-smash-hit-cult-of-the-lamb
4. Supergiant Games. "HADES II Development Update." 2023. https://www.supergiantgames.com/blog/hades-ii-development-update/
5. MDN. "WebGL Best Practices." Accessed 2026-09-04. https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
6. Microsoft. "A Designer's Guide to Building Touch Controls." Accessed 2026-09-04. https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide?view=gdk-2604
7. Microsoft. "Xbox Accessibility Guideline 103: Additional Channels for Important Cues." Accessed 2026-09-04. https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103
8. W3C. "Understanding Success Criterion 2.5.8: Target Size (Minimum)." Accessed 2026-09-04. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
9. W3C. "Understanding Success Criterion 2.5.5: Target Size (Enhanced)." Accessed 2026-09-04. https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
10. Nielsen Norman Group. "How to Test Digital Icons." Accessed 2026-09-04. https://www.nngroup.com/articles/how-to-test-digital-icons/
11. MDN. "HTMLCanvasElement: captureStream()." Accessed 2026-09-04. https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
12. MDN. "MediaRecorder." Accessed 2026-09-04. https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
13. MDN. "Web Share API." Accessed 2026-09-04. https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
14. Babylon.js. Official engine documentation and feature overview. Accessed 2026-09-04. https://www.babylonjs.com/
15. Blender Foundation. "glTF 2.0." Blender Manual. Accessed 2026-09-04. https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html
