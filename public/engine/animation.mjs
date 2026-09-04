// Distance, not requested velocity, drives the gait. Rendering never changes it.
export const STRIDE_LENGTH = 72;
const facings = [
  { row: 2, flip: -1 }, { row: 1, flip: -1 }, { row: 0, flip: 1 },
  { row: 1, flip: 1 }, { row: 2, flip: 1 }, { row: 3, flip: 1 },
  { row: 4, flip: 1 }, { row: 3, flip: -1 },
];

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
  const column = animator.state === 'idle' ? 2 : animator.state === 'dash' ? 0 : Math.floor(animator.phase * 6) % 6;
  return { ...facing, column, state: animator.state, phase: animator.phase, stateTime: animator.stateTime };
}
