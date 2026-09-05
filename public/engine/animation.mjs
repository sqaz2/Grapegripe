// Distance, not requested velocity, drives the gait. Rendering never changes it.
export const STRIDE_LENGTH = 72;
export const IDLE_LOOP_SECONDS = 13.2;
const facings = [
  { row: 2, flip: -1 }, { row: 1, flip: -1 }, { row: 0, flip: 1 },
  { row: 1, flip: 1 }, { row: 2, flip: 1 }, { row: 3, flip: 1 },
  { row: 4, flip: 1 }, { row: 3, flip: -1 },
];
// Pick the most balanced frame available in each authored direction. A future
// dedicated idle atlas can replace these without changing the state machine.
const idleColumns = [2, 0, 1, 0, 0];

export function createAnimator() {
  return { phase: 0, state: 'idle', stateTime: 0, distance: 0 };
}

export function advanceAnimator(animator, { distance = 0, dt = 0, dashing = false, attacking = false, hurt = false, ultimate = false }) {
  const moving = distance > 0.025;
  const next = ultimate ? 'ultimate' : hurt ? 'hurt' : dashing ? 'dash' : attacking ? 'attack' : moving ? 'walk' : 'idle';
  animator.stateTime = next === animator.state ? animator.stateTime + dt : 0;
  animator.state = next;
  // A dash has its own pose and must not spin the feet at dash velocity.
  if (moving && !dashing) {
    animator.distance += distance;
    animator.phase = (animator.distance / STRIDE_LENGTH) % 1;
  }
  return animator;
}

export function sampleAnimation(animator, direction = 2) {
  const facing = facings[((Math.round(direction) % 8) + 8) % 8];
  if (animator.state === 'idle') {
    const idleTime = animator.stateTime % IDLE_LOOP_SECONDS;
    const idleVariant = idleTime < 3.4 ? 'breathe'
      : idleTime < 5.8 ? 'look-left'
        : idleTime < 8.2 ? 'look-right'
          : idleTime < 10.4 ? 'settle'
            : 'companion-bonk';
    const idleLean = idleVariant === 'look-left' ? -0.018
      : idleVariant === 'look-right' ? 0.018
        : idleVariant === 'companion-bonk' ? Math.sin((idleTime - 10.4) * 7) * 0.012
          : 0;
    return {
      ...facing,
      column: idleColumns[facing.row],
      state: animator.state,
      phase: animator.phase,
      stateTime: animator.stateTime,
      idleTime,
      idleVariant,
      idleLean,
      idleBreath: Math.sin(animator.stateTime * 2.15) * 0.008,
    };
  }
  const column = animator.state === 'dash' ? 0 : Math.floor(animator.phase * 6) % 6;
  return {
    ...facing,
    column,
    state: animator.state,
    phase: animator.phase,
    stateTime: animator.stateTime,
    idleTime: 0,
    idleVariant: null,
    idleLean: 0,
    idleBreath: 0,
  };
}
