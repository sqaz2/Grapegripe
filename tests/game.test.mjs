import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './game-harness.mjs';
import { terrainDefinitions } from '../public/engine/terrain-data.mjs';
import { campaignChapters } from '../public/content/campaign.mjs';

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
  for (const id of ['root-companion', 'root-relay-west', 'root-relay-east', 'root-guard']) g.completeObjective(id);
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
  g.completeObjective('root-companion');
  g.state.lastStraw = 100; g.unleashGripe(); g.fireUltimate();
  g.updateEnemies(.2);
  assert.equal(enemy.attackPending, false); assert.equal(enemy.lungeTime, 0);
  assert.ok(enemy.stunned > 2);
});

test('all mission encounters spawn reachable enemies and release their gates', async () => {
  const g = await loadGame(); g.resetGame();
  for (let region = 0; region < 4; region++) {
    g.enterRegion(region);
    const chapter = campaignChapters[region];
    for (const encounter of g.state.mission.encounters) {
      const objective = chapter.objectives.find((item) => item.id === encounter.objectiveId);
      if (objective) {
        for (const candidate of chapter.objectives) {
          if (candidate.id === objective.id) break;
          if (!g.state.campaign.completed.includes(candidate.id)) g.completeObjective(candidate.id);
        }
      }
      const target = g.state.terrain.project({ x: encounter.x, y: encounter.y + 35 }, 14);
      const path = g.state.terrain.findPath(g.state.hero, target, 14);
      assert.ok(path.length, `approach region ${region} encounter ${encounter.id}`);
      for (const next of path) g.moveActor(g.state.hero, next.x - g.state.hero.x, next.y - g.state.hero.y);
      g.updateEncounter(.01);
      assert.ok(g.state.gate?.active, `trigger ${chapter.id}/${encounter.id}`);
      // Drain spawn delays through the real encounter update, then verify every enemy.
      g.updateEncounter(2);
      assert.equal(g.state.spawnQueue.length, 0);
      assert.equal(g.state.enemies.length, encounter.types.length);
      for (const enemy of g.state.enemies) {
        assert.ok(g.state.terrain.contains(enemy, enemy.footRadius));
        assert.ok(g.state.terrain.findPath(enemy, g.state.hero, enemy.footRadius).length);
        g.hitEnemy(enemy, 999, true); // Gate plumbing test, not a claim of playing the combat.
      }
      g.updateEnemies(1/60); g.updateEncounter(.6);
      assert.equal(g.state.gate, null);
    }
    for (const objective of chapter.objectives) if (!g.state.campaign.completed.includes(objective.id)) g.completeObjective(objective.id);
    const definition = terrainDefinitions[g.regions[region].key];
    const path = g.state.terrain.findPath(g.state.hero, { x: definition.exit[0], y: definition.exit[1] }, 14);
    assert.ok(path.length);
    for (const next of path) g.moveActor(g.state.hero, next.x - g.state.hero.x, next.y - g.state.hero.y);
    g.updateEncounter(.01);
    assert.equal(g.state.mode, 'clearing');
  }
});

test('actual held attacks and projectile damage can clear the first encounter', async () => {
  const g = await loadGame(); g.resetGame();
  Object.assign(g.state.hero, { x: 445, y: 745, invulnerable: 60 });
  g.input.attackHeld = true;
  for (let frame = 0; frame < 1800 && g.state.encounterIndex === 0; frame++) g.update(1/60);
  assert.equal(g.state.encounterIndex, 1);
  assert.equal(g.state.gate, null);
});

test('context action powers the Root Cellar and press cork can be dropped and delivered', async () => {
  const g = await loadGame(); g.resetGame();
  Object.assign(g.state.hero, { x: 478, y: 1255 });
  g.updateContextTarget(); assert.equal(g.useContextTarget(), true);
  assert.ok(g.state.campaign.completed.includes('root-companion'));
  for (const [id, x, y] of [['root-relay-west', 350, 1040], ['root-relay-east', 600, 600]]) {
    Object.assign(g.state.hero, { x, y }); g.updateContextTarget(); g.useContextTarget();
    assert.ok(g.state.campaign.completed.includes(id));
  }

  g.enterRegion(2);
  Object.assign(g.state.hero, { x: 477, y: 1150 }); g.updateContextTarget(); g.useContextTarget();
  assert.equal(g.state.carried, 'press-cork');
  g.attack(); assert.equal(g.state.carried, null);
  g.updateContextTarget(); g.useContextTarget();
  Object.assign(g.state.hero, { x: 477, y: 760 }); g.updateContextTarget(); g.useContextTarget();
  assert.ok(g.state.campaign.completed.includes('press-cork-delivered'));
});

test('heavy shots power press vents and the optional side passage returns safely', async () => {
  const g = await loadGame(); g.resetGame(); g.enterRegion(2);
  g.completeObjective('press-cork-found'); g.completeObjective('press-cork-delivered');
  for (const [id, x] of [['press-vent-west', 350], ['press-vent-east', 600]]) {
    g.state.bolts.push({ x, y: 585, vx: 0, vy: 0, radius: 15, damage: 5, life: 1, targetId: null, heavy: true, spin: 0 });
    g.updateBolts(1/60);
    assert.ok(g.state.campaign.completed.includes(id));
  }
  g.enterRegion(1); g.completeObjective('vineway-route');
  g.startSideview();
  g.state.sideview.x = 1700; g.update(1/60);
  assert.ok(g.state.campaign.completed.includes('vineway-passage'));
  g.update(1);
  assert.equal(g.state.mode, 'playing'); assert.equal(g.state.regionIndex, 1);
});

test('the Gripe Maw survives ordinary damage and the charged finale completes it', async () => {
  const g = await loadGame(); g.resetGame();
  g.completeObjective('root-companion');
  g.enterRegion(3);
  for (const id of ['sourwood-rescue', 'sourwood-route', 'sourwood-vent-west', 'sourwood-vent-east']) g.completeObjective(id);
  Object.assign(g.state.hero, { x: 489, y: 575, invulnerable: 30 });
  g.updateEncounter(.01); g.updateEncounter(.1);
  const boss = g.state.enemies.find((enemy) => enemy.type === 'boss');
  assert.ok(boss);
  boss.spawn = 1;
  g.hitEnemy(boss, 999);
  assert.equal(boss.hp, 1);
  g.state.lastStraw = 100; g.unleashGripe(); g.fireUltimate();
  assert.ok(g.state.campaign.completed.includes('sourwood-maw'));
  assert.equal(boss.dead, true);
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
