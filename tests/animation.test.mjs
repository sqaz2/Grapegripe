import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimator, advanceAnimator, sampleAnimation, walkColumn, STRIDE_LENGTH } from '../public/engine/animation.mjs';

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
    assert.equal(pose.row, 2);
    assert.equal(pose.flip, 1);
    assert.equal(pose.column, 1);
    variants.push(pose.idleVariant);
  }
  assert.deepEqual(variants, ['breathe', 'look-left', 'look-right', 'settle', 'companion-bonk']);
});

test('stopping preserves all eight facing directions', () => {
  const idle = createAnimator();
  const walking = createAnimator();
  advanceAnimator(walking, { distance: 8, dt: 1/60 });
  const idlePoses = Array.from({ length: 8 }, (_, direction) => sampleAnimation(idle, direction));
  const movingPoses = Array.from({ length: 8 }, (_, direction) => sampleAnimation(walking, direction));
  assert.deepEqual(idlePoses.map(({ row }) => row), movingPoses.map(({ row }) => row));
  assert.deepEqual(idlePoses.map(({ flip }) => flip), movingPoses.map(({ flip }) => flip));
  assert.deepEqual(idlePoses.map(({ column }) => column), [1, 0, 2, 0, 1, 0, 0, 0]);
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

test('SW/W/NW flipped facings reverse walk columns so opposite contact leads', () => {
  // East (dir 4, flip +1) and west (dir 0, flip -1) must disagree at mid-stride contact.
  const a = createAnimator();
  advanceAnimator(a, { distance: STRIDE_LENGTH * 0.08, dt: 1 / 60 }); // early contact column
  const east = sampleAnimation(a, 4);
  const west = sampleAnimation(a, 0);
  const nw = sampleAnimation(a, 1);
  const sw = sampleAnimation(a, 7);
  assert.equal(east.flip, 1);
  assert.equal(west.flip, -1);
  assert.equal(nw.flip, -1);
  assert.equal(sw.flip, -1);
  assert.equal(west.column, walkColumn(a.phase, -1));
  assert.equal(east.column, walkColumn(a.phase, 1));
  assert.equal(west.column, 5 - east.column);
  assert.equal(nw.column, west.column);
  assert.equal(sw.column, west.column);
});

test('walkColumn keeps six distinct frames and mirrors under flip', () => {
  const forward = Array.from({ length: 6 }, (_, i) => walkColumn(i / 6, 1));
  const mirrored = Array.from({ length: 6 }, (_, i) => walkColumn(i / 6, -1));
  assert.deepEqual(forward, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(mirrored, [5, 4, 3, 2, 1, 0]);
});
