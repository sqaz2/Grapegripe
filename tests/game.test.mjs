import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './game-harness.mjs';
import { terrainDefinitions } from '../public/engine/terrain-data.mjs';

test('boot, render calls, and game controls tolerate unavailable storage', async () => {
  const g = await loadGame({ debug: true });
  assert.equal(g.state.mode, 'start');
  g.resetGame(); g.draw();
  assert.equal(g.state.mode, 'playing');
  assert.ok(g.drawnImages.some(({ src }) => src.endsWith('hero-walk.webp')));
  g.finishGame(true);
  assert.equal(g.state.mode, 'won');
});

test('asset failure stays behind loading screen, and retry recovers', async () => {
  const g = await loadGame({ failAssets: true });
  assert.equal(g.state.mode, 'loading');
  assert.equal(g.element('start-button').disabled, true);
  assert.equal(g.element('retry-load').hidden, false);
  g.draw();
  assert.equal(g.drawnImages.length, 0);
  g.options.failAssets = false; await g.boot();
  assert.equal(g.state.mode, 'start');
  assert.equal(g.element('start-button').disabled, false);
});

test('resizing does not move hero, enemies, gate, loot or projectile physics', async () => {
  const g = await loadGame(); g.resetGame();
  g.spawnEnemy('brute', { x: 480, y: 1170 });
  g.state.pickups.push({ x: 500, y: 1200 });
  g.state.bolts.push({ x: 490, y: 1200 });
  const snapshot = () => JSON.stringify({ hero: g.state.hero, enemies: g.state.enemies, world: g.state.world, pickups: g.state.pickups, bolts: g.state.bolts, gates: g.state.terrain.gates });
  const before = snapshot();
  g.element('game-shell').clientWidth = 860;
  g.element('game-shell').clientHeight = 430;
  g.resize();
  assert.equal(snapshot(), before);
});

test('pause, map, clearing and region change release held controls', async () => {
  const g = await loadGame(); g.resetGame();
  const hold = () => { g.input.attackHeld = true; g.input.joyX = 1; g.input.joystickId = 5; g.input.keys.add(' '); };
  const released = () => { assert.equal(g.input.attackHeld, false); assert.equal(g.input.joyX, 0); assert.equal(g.input.keys.size, 0); assert.equal(g.input.joystickId, null); };
  hold(); g.openMap(); released(); g.closeMap();
  hold(); g.pauseGame(); released(); g.resumeGame();
  hold(); g.completeRegion(); released();
  const timer = g.state.clearTimer;
  g.pauseGame();
  g.update(4);
  assert.equal(g.state.mode, 'paused'); assert.equal(g.state.clearTimer, timer);
  g.resumeGame(); g.update(.6);
  assert.equal(g.state.mode, 'travel');
  g.pauseGame(); const travelTimer = g.state.travelTimer; g.update(4);
  assert.equal(g.state.travelTimer, travelTimer);
  g.resumeGame(); g.update(3);
  assert.equal(g.state.mode, 'upgrade');
  hold(); g.chooseUpgrade('speed'); released();
  assert.equal(g.state.regionIndex, 1); assert.equal(g.state.mode, 'playing');
});

test('ultimate interrupts a telegraphed attack and cannot cause a delayed attack while stunned', async () => {
  const g = await loadGame(); g.resetGame();
  g.spawnEnemy('brute', { x: 470, y: 1200 });
  const enemy = g.state.enemies[0];
  enemy.spawn = 1; enemy.telegraph = .01; enemy.attackPending = true; enemy.hp = 100;
  g.state.lastStraw = 100; g.unleashGripe(); g.fireUltimate();
  g.updateEnemies(.2);
  assert.equal(enemy.attackPending, false); assert.equal(enemy.lungeTime, 0);
  assert.ok(enemy.stunned > 2);
});

test('all authored encounters spawn reachable enemies and release their gates', async () => {
  const g = await loadGame(); g.resetGame();
  for (let region = 0; region < 4; region++) {
    g.enterRegion(region);
    const definition = terrainDefinitions[g.regions[region].key];
    for (let wave = 0; wave < 3; wave++) {
      const [x, y] = definition.encounters[wave];
      const target = g.state.terrain.project({ x, y: y + 65 }, 14);
      const path = g.state.terrain.findPath(g.state.hero, target, 14);
      assert.ok(path.length, `approach region ${region} wave ${wave}`);
      for (const next of path) g.moveActor(g.state.hero, next.x - g.state.hero.x, next.y - g.state.hero.y);
      g.updateEncounter(.01);
      assert.ok(g.state.gate?.active);
      // Drain spawn delays through the real encounter update, then verify every enemy.
      g.updateEncounter(2);
      assert.equal(g.state.spawnQueue.length, 0);
      assert.equal(g.state.enemies.length, g.regions[region].encounters[wave].types.length);
      for (const enemy of g.state.enemies) {
        assert.ok(g.state.terrain.contains(enemy, enemy.footRadius));
        assert.ok(g.state.terrain.findPath(enemy, g.state.hero, enemy.footRadius).length);
        g.hitEnemy(enemy, 999); // Gate plumbing test, not a claim of playing the combat.
      }
      g.updateEnemies(1/60); g.updateEncounter(.6);
      assert.equal(g.state.gate, null); assert.equal(g.state.encounterIndex, wave + 1);
    }
    const path = g.state.terrain.findPath(g.state.hero, { x: definition.exit[0], y: definition.exit[1] }, 14);
    assert.ok(path.length);
    for (const next of path) g.moveActor(g.state.hero, next.x - g.state.hero.x, next.y - g.state.hero.y);
    g.updateEncounter(.01);
    assert.equal(g.state.mode, 'clearing');
  }
});

test('actual held attacks and projectile damage can clear the first encounter', async () => {
  const g = await loadGame(); g.resetGame();
  Object.assign(g.state.hero, { x: 475, y: 1235, invulnerable: 60 });
  g.input.attackHeld = true;
  for (let frame = 0; frame < 1800 && g.state.encounterIndex === 0; frame++) g.update(1/60);
  assert.equal(g.state.encounterIndex, 1);
  assert.equal(g.state.gate, null);
});

test('ranged and large enemies navigate around the real bridge gap without getting stuck', async () => {
  const g = await loadGame(); g.resetGame();
  for (const type of ['moth', 'boss']) {
    g.enterRegion(1);
    Object.assign(g.state.hero, { x: 700, y: 490, invulnerable: 100 });
    assert.ok(g.state.terrain.contains(g.state.hero, 14));
    assert.ok(g.spawnEnemy(type, { x: 270, y: 575 }));
    const enemy = g.state.enemies[0];
    Object.assign(enemy, { x: 270, y: 575, attackCooldown: 10000 });
    assert.ok(g.state.terrain.contains(enemy, enemy.footRadius));
    assert.equal(g.state.terrain.segmentClear(enemy, g.state.hero, enemy.footRadius), false);
    for (let i = 0; i < 2500; i++) {
      g.updateEnemies(1/60);
      assert.ok(g.state.terrain.contains(enemy, enemy.footRadius), `${type} escaped the bridge`);
    }
    assert.ok(Math.hypot(enemy.x - g.state.hero.x, enemy.y - g.state.hero.y) < 225, `${type} stuck at ${enemy.x}, ${enemy.y}`);
  }
});
