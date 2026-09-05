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

test('side-view route has only forgiving auto-hop gaps and a supported exit', () => {
  const platforms = [...sideviewDefinition.platforms].sort((a, b) => a.x - b.x);
  assert.ok(platforms[0].x <= sideviewDefinition.spawn.x);
  assert.ok(platforms.at(-1).x + platforms.at(-1).width >= sideviewDefinition.exitX);
  for (let index = 1; index < platforms.length; index++) {
    const gap = platforms[index].x - (platforms[index - 1].x + platforms[index - 1].width);
    assert.ok(gap >= 0 && gap <= 100, `gap ${index} is ${gap}`);
    assert.ok(Math.abs(platforms[index].y - platforms[index - 1].y) <= 80, `step ${index} is too high`);
  }
});
