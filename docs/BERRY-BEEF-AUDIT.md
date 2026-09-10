# Berry Beef — release audit, 10 September 2026

## Finished release scope
A separate three-round side-view rivalry mode. The original campaign stays intact. Original strawberry artwork, platform arenas, keyboard and simultaneous touch inputs, jump, held attack, warning/airborne/recovery enemy states, seed projectiles, landing-zone indicator, off-screen rival direction, health, sound toggle, round retries, separate local round checkpoint, and authored victory/rematch ending.

## Defects fixed in the second audit
- Replaced clock-only attack windows with explicit enemy states: recovery starts on landing, never in mid-air.
- Marked and locked the stomp target during a 0.7-second warning; no unfair mid-air target tracking.
- Corrected portrait/landscape framing so the floor remains above touch controls.
- Kept original sprite proportions and added movement bounce and hit effects.
- Updated health immediately on damage, knockout and round reset.
- Added held attacks, sound effects, progress resume and restart from round one.
- Prevented a death frame from continuing into a rival defeat or overwriting the ending.
- Replaced inline start-menu styling with a dedicated class.

## Verification
Existing campaign regression suite plus six mode tests: platform landing, input release on pause, guarded attacks, counterattack and round progression, damage invulnerability/retry, locked stomp target and landing recovery, portrait/landscape floor bounds, held attack and final ending. No TODO, placeholder or coming-soon markers in mode files. Game canvas rendered and visually inspected at 393×852 and 852×393 with real assets.

Full browser interaction and DOM layout were not verified: the managed preview workflow does not support this buildless static project. Canvas inspection and simulation tests do not substitute for real phone playtesting.

## Compare with player feedback
- Can the player see and understand the landing warning in portrait?
- Is 0.7 seconds enough warning, and is the 1.45–1.65 second recovery window fair?
- Does holding HIT feel responsive while moving and jumping?
- Do the platform layouts create useful choices or encourage staying on the floor?
- Are three rounds varied enough? Current progression changes arena layout, seed speed/frequency and recovery duration; it is not a long exploration campaign.
- Does the art need full walking/attack sprite animation beyond current movement bounce?
- Are the short sound effects satisfying on a phone speaker?

Future improvements should follow observed play friction. No autoplay analytics or remote feedback transmission is included.
