import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  assert.ok(sideviewDefinition.flies.length >= 3);
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
  for (const fly of sideviewDefinition.flies) {
    assert.ok(fly.x - fly.range > 0 && fly.x + fly.range < sideviewDefinition.width);
    assert.ok(fly.y > 100 && fly.y < sideviewDefinition.floor - 150);
  }
});


test('Sommelier Speedrun content wires corks, Cork-Popper, pours and guest receipt', () => {
  assert.ok(sideviewDefinition.corks.length >= 3);
  assert.ok(sideviewDefinition.corkPopper?.x > 2000);
  assert.equal(sideviewDefinition.pours.length, 3);
  assert.equal(sideviewDefinition.guestReceipt.guestLine, "Guest said 'notes of regret.'");
  for (const cork of sideviewDefinition.corks) {
    assert.ok(cork.x > 0 && cork.x < sideviewDefinition.width);
    assert.ok(cork.y > 80 && cork.y < sideviewDefinition.floor - 80);
  }
  for (const pour of sideviewDefinition.pours) {
    assert.ok(pour.x > 0 && pour.x < sideviewDefinition.width);
    assert.ok(pour.y > 80 && pour.y < sideviewDefinition.floor - 80);
  }
  assert.ok(sideviewDefinition.guestReceipt.x < sideviewDefinition.width);
});

test('exact Sommelier flavor strings ship in the tip and receipt channels', () => {
  const root = resolve(import.meta.dirname, '..');
  const journey = readFileSync(resolve(root, 'public/journey.js'), 'utf8');
  const missions = readFileSync(resolve(root, 'public/content/missions.mjs'), 'utf8');
  assert.ok(journey.includes("Press Pit tip: the cork-popper in aisle 7 times your pours. One wrong vintage and the whole tasting room goes feral."));
  assert.ok(missions.includes("Guest said 'notes of regret.'"));
  assert.ok(journey.includes("Guest said 'notes of regret.'"));
});

test('Press Pit Tippler Receipt props sit on floor and chain from the cork', () => {
  const terrain = new Terrain(terrainDefinitions.press);
  const press = missionDefinitions.press;
  const receipt = press.props.find((prop) => prop.id === 'press-tippler-receipt');
  const door = press.props.find((prop) => prop.id === 'press-tippler-door');
  const snack = press.props.find((prop) => prop.id === 'press-tippler-snack');
  const rat = press.encounters.find((encounter) => encounter.id === 'press-tippler-rat');
  assert.ok(receipt && door && snack && rat);
  assert.equal(receipt.kind, 'clue-receipt');
  assert.equal(door.kind, 'tippler-door');
  assert.equal(snack.kind, 'tippler-snack');
  assert.deepEqual(rat.types, ['tippler-rat']);
  for (const prop of [receipt, door, snack]) {
    assert.ok(terrain.contains({ x: prop.position[0], y: prop.position[1] }, 14), prop.id);
  }
  assert.ok(terrain.contains({ x: rat.position[0], y: rat.position[1] }, 28), 'tippler rat');
});
