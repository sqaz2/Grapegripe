import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../public/engine/terrain.mjs';
import { terrainDefinitions } from '../public/engine/terrain-data.mjs';
import { missionDefinitions, sideviewDefinition } from '../public/content/missions.mjs';

test('every mission prop and encounter anchor fits its authored floor', () => {
  for (const [chapter, mission] of Object.entries(missionDefinitions)) {
    const terrain = new Terrain(terrainDefinitions[chapter]);
    for (const prop of mission.props) assert.ok(terrain.contains({ x: prop.position[0], y: prop.position[1] }, 14), `${chapter}/${prop.id}`);
    for (const encounter of mission.encounters) assert.ok(terrain.contains({ x: encounter.position[0], y: encounter.position[1] }, 28), `${chapter}/${encounter.id}`);
  }
});

test('side-view route has forgiving ground gaps, upper ledges and reachable swing anchors', () => {
  const ground = sideviewDefinition.platforms.filter((platform) => platform.id.startsWith('ground-')).sort((a, b) => a.x - b.x);
  const ledges = sideviewDefinition.platforms.filter((platform) => platform.id.startsWith('ledge-'));
  assert.ok(ground[0].x <= sideviewDefinition.spawn.x);
  assert.ok(ground.at(-1).x + ground.at(-1).width >= sideviewDefinition.exitX);
  assert.ok(ledges.length >= 5);
  assert.ok(sideviewDefinition.vines.length >= 5);
  assert.equal(sideviewDefinition.receipts.length, sideviewDefinition.vines.length);
  for (let index = 1; index < ground.length; index++) {
    const gap = ground[index].x - (ground[index - 1].x + ground[index - 1].width);
    assert.ok(gap >= 0 && gap <= 100, `gap ${index} is ${gap}`);
    assert.ok(Math.abs(ground[index].y - ground[index - 1].y) <= 80, `step ${index} is too high`);
  }
  for (const vine of sideviewDefinition.vines) {
    assert.ok(vine.y < sideviewDefinition.floor - 150);
    assert.ok(vine.length >= 250);
  }
  for (const receipt of sideviewDefinition.receipts) {
    assert.ok(receipt.x > 0 && receipt.x < sideviewDefinition.width);
    assert.ok(receipt.y > 0 && receipt.y < sideviewDefinition.floor - 100);
  }
});
