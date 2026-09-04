import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../public/engine/terrain.mjs';
import { terrainDefinitions } from '../public/engine/terrain-data.mjs';

const p = ([x, y]) => ({ x, y });
const fixture = () => new Terrain({ width: 300, height: 300,
  outer: [[0,0],[300,0],[300,300],[0,300]],
  holes: [[[100,80],[200,80],[200,220],[100,220]]],
});

test('swept dash and knockback cannot tunnel through a hole or outer edge', () => {
  const t = fixture();
  const dash = t.move({ x: 50, y: 150 }, 240, 0, 14);
  assert.ok(dash.x < 86.01 && dash.blocked);
  const knockback = t.move({ x: 50, y: 150 }, -200, 0, 14);
  assert.ok(knockback.x >= 14 && t.contains(knockback, 14));
  assert.equal(t.segmentClear({ x: 50, y: 150 }, { x: 250, y: 150 }, 14), false);
});

test('whole feet fit, invalid starts fail closed, and diagonal movement slides safely', () => {
  const t = fixture();
  assert.equal(t.contains({ x: 8, y: 150 }, 14), false);
  const bad = t.move({ x: 150, y: 150 }, 200, 0, 14);
  assert.equal(bad.x, 150); assert.equal(bad.moved, 0);
  let actor = { x: 30, y: 30 };
  for (let i = 0; i < 90; i++) { actor = t.move(actor, -5, 2, 14); assert.ok(t.contains(actor, 14)); }
  assert.ok(actor.y > 190, 'wall collision must still permit tangential movement');
});

test('pathfinding goes around the hole; every smoothed segment is safe', () => {
  const t = fixture(), start = { x: 50, y: 150 }, goal = { x: 250, y: 150 };
  const path = t.findPath(start, goal, 14);
  assert.ok(path.length > 1);
  let last = start;
  for (const next of path) { assert.ok(t.segmentClear(last, next, 14)); last = next; }
  assert.deepEqual(last, goal);
});

test('a gate closes both routes and invalidates navigation when it opens', () => {
  const t = fixture();
  const spans = t.spansAt(150);
  assert.equal(spans.length, 2);
  t.setGates(spans.map(([left, right]) => ({ a: { x: left, y: 150 }, b: { x: right, y: 150 } })));
  const revision = t.revision;
  const start = { x: 50, y: 250 }, goal = { x: 50, y: 50 };
  assert.equal(t.findPath(start, goal, 14).length, 0);
  assert.ok(t.move(start, 0, -220, 14).y >= 168);
  t.setGates();
  assert.ok(t.revision > revision && t.findPath(start, goal, 14).length);
});

for (const [key, definition] of Object.entries(terrainDefinitions)) {
  test(`${key}: landmarks, both directions, and large enemies have connected safe floor`, () => {
    const t = new Terrain(definition);
    const landmarks = [definition.spawn, ...definition.encounters, definition.secret, definition.exit];
    for (const radius of [10, 12, 14, 21, 28]) {
      for (const landmark of landmarks) assert.ok(t.contains(p(landmark), radius), `${key} ${landmark} radius ${radius}`);
      for (const [from, to] of [[definition.spawn, definition.exit], [definition.exit, definition.spawn], [definition.spawn, definition.secret]]) {
        const path = t.findPath(p(from), p(to), radius);
        assert.ok(path.length, `${key} reachable for radius ${radius}`);
        let actor = p(from);
        for (const next of path) {
          assert.ok(t.segmentClear(actor, next, radius));
          const moved = t.move(actor, next.x - actor.x, next.y - actor.y, radius);
          assert.ok(Math.hypot(moved.x - next.x, moved.y - next.y) < 0.01);
          actor = next;
        }
      }
    }
  });
}

test('Vineway bridge gap remains empty and gates span both bridges', () => {
  const t = new Terrain(terrainDefinitions.vineway);
  assert.equal(t.contains({ x: 500, y: 600 }, 14), false);
  assert.equal(t.spansAt(600).length, 2);
  let seed = 18;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const radius of [10,14,21,28]) {
    let actor = p(terrainDefinitions.vineway.spawn);
    for (let i = 0; i < 1600; i++) {
      actor = t.move(actor, (random() - .5) * 95, (random() - .55) * 95, radius);
      assert.ok(t.contains(actor, radius), `random dash escaped at ${actor.x}, ${actor.y}`);
    }
  }
});
