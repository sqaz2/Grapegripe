import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimator, advanceAnimator, sampleAnimation, STRIDE_LENGTH } from '../public/engine/animation.mjs';

test('walking uses displacement and selects all six frame indices', () => {
  const a = createAnimator(), frames = new Set();
  for (let i = 0; i < 60; i++) { advanceAnimator(a, { distance: STRIDE_LENGTH / 60, dt: 1/60 }); frames.add(sampleAnimation(a, 2).column); }
  assert.equal(frames.size, 6);
});

test('pushing a wall stops gait; idle, attack and dash have stable states', () => {
  const a = createAnimator();
  advanceAnimator(a, { distance: 30, dt: .1 });
  const phase = a.phase;
  for (let i = 0; i < 20; i++) advanceAnimator(a, { distance: 0, dt: 1/60 });
  assert.equal(a.phase, phase); assert.equal(a.state, 'idle');
  advanceAnimator(a, { distance: 100, dt: .1, dashing: true });
  assert.equal(a.phase, phase); assert.equal(a.state, 'dash');
  advanceAnimator(a, { dt: .1, attacking: true }); assert.equal(a.state, 'attack');
  advanceAnimator(a, { dt: .1, attacking: true, hurt: true }); assert.equal(a.state, 'hurt');
});

test('idle plants both boots and cycles through quiet poses plus an occasional gag', () => {
  const a = createAnimator();
  const variants = [];
  for (const dt of [0, 3.5, 2.5, 2.5, 2.2]) {
    advanceAnimator(a, { distance: 0, dt });
    const pose = sampleAnimation(a, 4);
    assert.equal(pose.row, 0, 'rest must leave the side-on running cells');
    assert.equal(pose.column, 2, 'rest must keep the balanced two-boot frame');
    variants.push(pose.idleVariant);
  }
  assert.deepEqual(variants, ['breathe', 'look-left', 'look-right', 'settle', 'companion-bonk']);
});

test('gait is frame-rate independent and all eight directions are explicit', () => {
  const a = createAnimator(), b = createAnimator();
  for (let i = 0; i < 30; i++) advanceAnimator(a, { distance: 150/30, dt: 1/30 });
  for (let i = 0; i < 120; i++) advanceAnimator(b, { distance: 150/120, dt: 1/120 });
  assert.ok(Math.abs(a.phase - b.phase) < 1e-9);
  const poses = Array.from({ length: 8 }, (_, i) => sampleAnimation(a, i));
  assert.deepEqual(poses.map(({row}) => row), [2,1,0,1,2,3,4,3]);
  assert.deepEqual(poses.map(({flip}) => flip), [-1,-1,1,1,1,1,1,-1]);
  const copy = sampleAnimation(a, 2);
  advanceAnimator(a, { distance: 15, dt: .1 });
  assert.notEqual(copy.phase, a.phase, 'dash trail must retain its captured pose');
});
