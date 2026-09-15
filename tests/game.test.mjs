import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './game-harness.mjs';
import { terrainDefinitions } from '../public/engine/terrain-data.mjs';
import { campaignChapters } from '../public/content/campaign.mjs';
import { loadSave, SAVE_KEY } from '../public/engine/save.mjs';

test('boot, render calls, and game controls tolerate unavailable storage', async () => {
  const g = await loadGame({ debug: true });
  assert.equal(g.state.mode, 'start');
  g.resetGame(); g.draw();
  assert.equal(g.state.mode, 'playing');
  assert.ok(g.drawnImages.some(({ src }) => src.endsWith('hero-walk.webp')));
  g.finishGame(false);
  assert.equal(g.state.mode, 'lost');
});

test('idle rendering continuously animates the cape without changing the planted pose', async () => {
  const g = await loadGame(); g.resetGame();
  g.drawnImages.length = 0;
  g.draw();
  const idleDraws = g.drawnImages.filter(({ src }) => src.endsWith('hero-walk.webp')).length;
  assert.equal(g.state.hero.animator.state, 'idle');
  g.state.hero.animator.state = 'walk';
  g.drawnImages.length = 0;
  g.draw();
  const movingDraws = g.drawnImages.filter(({ src }) => src.endsWith('hero-walk.webp')).length;
  assert.ok(idleDraws >= movingDraws + 14, 'idle cape should render fourteen flowing bands');
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

test('context action powers the Root Cellar and the press cork stays carried while attacking', async () => {
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
  assert.equal(g.state.mode, 'help');
  g.dismissContextHelp();
  const boltsBefore = g.state.bolts.length;
  g.attack();
  assert.equal(g.state.carried, 'press-cork', 'attacking must not drop the objective');
  assert.equal(g.state.bolts.length, boltsBefore + 1, 'carrying must not disable shooting');
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
  g.dismissContextHelp();
  g.state.sideview.x = 1700; g.update(1/60);
  g.state.sideview.x = 2900; g.update(1/60);
  assert.ok(g.state.campaign.completed.includes('vineway-passage'));
  g.update(1);
  assert.equal(g.state.mode, 'playing'); assert.equal(g.state.regionIndex, 1);
});

test('Press Pit clues unlock a persistent visual verdict with four real perks', async () => {
  const storage = new Map();
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(2);
  for (const id of ['press-cork-found', 'press-cork-delivered', 'press-clue-seen', 'press-clue-read', 'press-clue-wanted', 'press-vent-west', 'press-vent-east']) {
    assert.equal(g.completeObjective(id), true, id);
  }
  assert.equal(g.openVerdict(), true);
  assert.equal(g.state.mode, 'verdict');
  assert.equal(g.element('verdict-screen').hidden, false);
  assert.equal(g.chooseVerdict('say'), true);
  assert.equal(g.state.mode, 'playing');
  assert.equal(g.state.campaign.routeChoices.press, 'say');
  assert.ok(g.state.campaign.completed.includes('press-verdict'));
  assert.equal(g.state.lastStraw, g.state.maxStraw);
  g.state.campaign.routeChoices.press = 'solve';
  g.state.hero.attackCooldown = 0; g.state.hero.comboWindow = 0; g.attack();
  g.state.hero.attackCooldown = 0; g.state.hero.comboWindow = .4; g.attack();
  assert.equal(g.state.bolts.at(-1).heavy, true, 'solve should make every second shot heavy');

  g.state.campaign.routeChoices.press = 'save'; g.enterRegion(3);
  const health = g.state.hero.health;
  g.damageHero(30);
  assert.equal(g.state.hero.health, health, 'save should block the first hit in an area');
  assert.equal(g.state.guardAvailable, false);

  g.state.campaign.routeChoices.press = 'drop';
  g.state.hero.dashCooldown = 0; g.dash();
  assert.ok(g.state.hero.dashCooldown < g.state.hero.dashMaxCooldown * .7, 'drop should sharply shorten dash recharge');
});

test('the phone joystick remains live inside the optional side passage', async () => {
  const g = await loadGame(); g.resetGame(); g.enterRegion(1); g.startSideview();
  g.dismissContextHelp();
  const joystick = g.element('joystick-zone');
  const down = { pointerId: 17, clientX: 90, clientY: 700, preventDefault() {} };
  joystick.listeners.pointerdown[0](down);
  joystick.listeners.pointermove[0]({ ...down, clientX: 135 });
  assert.equal(g.input.joystickId, 17);
  assert.ok(g.input.joyX > 0.9);
  const startX = g.state.sideview.x;
  for (let i = 0; i < 30; i += 1) g.update(1/60);
  assert.ok(g.state.sideview.x > startX + 20, 'held joystick should move the side-view hero');
  joystick.listeners.pointerup[0]({ pointerId: 17 });
  assert.equal(g.input.joystickId, null);
  assert.equal(g.input.joyX, 0);
});

test('first-time help explains carried objectives and can be disabled from pause', async () => {
  const storage = new Map();
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(2);
  Object.assign(g.state.hero, { x: 477, y: 1150 });
  g.updateContextTarget(); g.useContextTarget();
  assert.equal(g.state.mode, 'help');
  assert.equal(g.element('context-help-card').dataset.tip, 'press-cork');
  assert.equal(g.element('context-help').hidden, false);
  g.dismissContextHelp();
  assert.equal(g.state.mode, 'playing');
  assert.equal(storage.get('grape-gripe-help-press-cork'), 'seen');
  g.pauseGame();
  g.toggleGameplayHelp();
  assert.equal(g.state.helpEnabled, false);
  assert.equal(storage.get('grape-gripe-gameplay-help'), 'off');
  assert.equal(g.element('gameplay-help-toggle').getAttribute('aria-checked'), 'false');
});

test('Whining is optional and demonstrates a nearby swing after repeated misses', async () => {
  const storage = new Map([['grape-gripe-help-sideview-controls', 'seen']]);
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(1); g.startSideview();
  g.state.sideview.assistFailures = 2;
  assert.equal(g.triggerWhiningDemo(), true);
  assert.ok(g.state.sideview.assistDemo > 0);
  assert.notEqual(g.state.sideview.assistVineIndex, null);
  g.toggleWhining();
  assert.equal(g.state.whiningEnabled, false);
  assert.equal(storage.get('grape-gripe-whining'), 'off');
});

test('Aged Poorly enemies leave one readable temporary sour-ground hazard', async () => {
  const g = await loadGame({ storage: new Map() }); g.resetGame({ agedPoorly: true });
  g.spawnEnemy('sourling', { x: g.state.hero.x + 80, y: g.state.hero.y });
  const enemy = g.state.enemies.at(-1);
  g.hitEnemy(enemy, 999);
  assert.equal(g.state.sourSpots.length, 1);
  assert.equal(g.state.sourSpots[0].life, 5.8);
});

test('side passage supports manual jumping, air steering and vine grappling', async () => {
  const storage = new Map([['grape-gripe-help-sideview-controls', 'seen']]);
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(1); g.startSideview();
  for (let frame = 0; frame < 40 && !g.state.sideview.grounded; frame += 1) g.update(1/60);
  assert.equal(g.state.sideview.grounded, true);
  const groundY = g.state.sideview.y;
  g.input.joyY = -1;
  g.update(1/60);
  g.input.joyY = 0;
  assert.ok(g.state.sideview.vy < 0, 'pushing up should jump');
  for (let frame = 0; frame < 8; frame += 1) g.update(1/60);
  assert.ok(g.state.sideview.y < groundY - 35);
  const beforeAirX = g.state.sideview.x;
  g.input.joyX = 1;
  for (let frame = 0; frame < 12; frame += 1) g.update(1/60);
  assert.ok(g.state.sideview.x > beforeAirX + 10, 'joystick should steer in the air');

  const vine = g.sideviewDefinition.vines[0];
  Object.assign(g.state.sideview, { x: vine.x - 35, y: vine.y + 245, vx: 0, vy: 0, actionCooldown: 0, grappleIndex: null });
  g.input.attackHeld = true;
  assert.equal(g.sideviewAction(), true);
  assert.equal(g.state.sideview.grapplePhase, 'windup');
  assert.equal(g.state.sideview.grappleTargetIndex, 0);
  assert.equal(g.state.sideview.direction, 1, 'the hero should turn toward the anchor before reaching');
  for (let frame = 0; frame < 12; frame += 1) g.update(1/60);
  assert.equal(g.state.sideview.grappleIndex, 0);
  assert.equal(g.state.sideview.grapplePhase, 'swing');
  g.state.sideview.grappleAngularVelocity = 2.2;
  g.update(1/60);
  const releaseVx = g.state.sideview.vx;
  const releaseVy = g.state.sideview.vy;
  g.input.attackHeld = false;
  g.update(1/60);
  assert.equal(g.state.sideview.grappleIndex, null, 'releasing the button should release the vine');
  assert.equal(g.state.sideview.grapplePhase, 'none');
  assert.ok(Math.sign(g.state.sideview.vx) === Math.sign(releaseVx), 'release should preserve horizontal travel direction');
  assert.ok(Math.abs(g.state.sideview.vy - releaseVy) < 30, 'release should preserve vertical momentum');
});

test('standing beneath a receipt collects it and a fresh touch recovers a stale phone joystick', async () => {
  const storage = new Map([['grape-gripe-help-sideview-controls', 'seen']]);
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(1); g.startSideview();
  const receipt = g.state.sideview.receipts[0];
  Object.assign(g.state.sideview, {
    x: receipt.x, y: 445, vx: 0, vy: 0, grounded: true, standingPlatformId: 'ledge-1',
  });
  g.update(1 / 60);
  assert.equal(receipt.collected, true, 'the visible paper overlaps the full hero body');
  assert.equal(g.state.sideview.receiptCount, 1);
  assert.equal(Number.isFinite(g.state.energy), true);

  g.input.joystickId = 77;
  g.input.joyX = 1;
  const pointerdown = g.element('joystick-zone').listeners.pointerdown[0];
  pointerdown({ pointerId: 88, clientX: 120, clientY: 700, preventDefault() {} });
  assert.equal(g.input.joystickId, 88, 'a new touch reclaims a stick whose pointer-up was lost');
});

test('side passage pendulum can carry the hero over an anchor and receipts reward high routes', async () => {
  const storage = new Map([['grape-gripe-help-sideview-controls', 'seen']]);
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(1); g.startSideview();
  const vine = g.sideviewDefinition.vines[0];
  Object.assign(g.state.sideview, { x: vine.x - 120, y: vine.y + 180, vx: 400, vy: -120, actionCooldown: 0 });
  g.input.attackHeld = true; g.sideviewAction();
  for (let frame = 0; frame < 12; frame += 1) g.update(1/60);
  g.state.sideview.grappleAngle = -2.65;
  g.state.sideview.grappleAngularVelocity = -3.2;
  let roseAboveAnchor = false;
  for (let frame = 0; frame < 40; frame += 1) {
    g.update(1/60);
    if (g.state.sideview.y < vine.y) roseAboveAnchor = true;
  }
  assert.equal(roseAboveAnchor, true, 'enough momentum should permit an up-and-over swing');

  g.input.attackHeld = false; g.update(1/60);
  const receipt = g.state.sideview.receipts[0];
  Object.assign(g.state.sideview, { x: receipt.x, y: receipt.y + 45, vx: 0, vy: 0 });
  const scoreBefore = g.state.score;
  g.update(1/60);
  assert.equal(receipt.collected, true);
  assert.equal(g.state.sideview.receiptCount, 1);
  assert.ok(g.state.score > scoreBefore);
});

test('Vineway stunt route rewards fast moth impacts, rejects slow ones and records mastery', async () => {
  const storage = new Map([['grape-gripe-help-sideview-controls', 'seen']]);
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(1); g.startSideview();
  const side = g.state.sideview;
  const firstFly = side.flies[0];
  const nextTime = g.state.time + 1 / 60;
  const firstX = firstFly.baseX + Math.sin(nextTime * 1.25 + firstFly.phase) * firstFly.range;
  const firstY = g.sideviewDefinition.flies[0].y + Math.sin(nextTime * 2.8 + firstFly.phase) * 16;
  Object.assign(side, { x: firstX - 4, y: firstY + 45, vx: 0, vy: 0, grounded: false, hitCooldown: 0 });
  g.update(1/60);
  assert.equal(firstFly.defeated, false, 'a slow collision should not defeat a moth');
  assert.ok(Math.abs(side.vx) >= 250, 'a slow collision should visibly bounce the hero away');

  side.hitCooldown = 0;
  const secondFly = side.flies[1];
  const secondTime = g.state.time + 1 / 60;
  const secondX = secondFly.baseX + Math.sin(secondTime * 1.25 + secondFly.phase) * secondFly.range;
  const secondY = g.sideviewDefinition.flies[1].y + Math.sin(secondTime * 2.8 + secondFly.phase) * 16;
  Object.assign(side, { x: secondX - 7, y: secondY + 45, vx: 430, vy: 0, grounded: false });
  g.update(1/60);
  assert.equal(secondFly.defeated, true, 'a high-speed impact should defeat a moth');

  for (const receipt of side.receipts) receipt.collected = true;
  side.receiptCount = side.receipts.length;
  for (const fly of side.flies) fly.defeated = true;
  side.flyCount = side.flies.length;
  g.update(1/60);
  assert.equal(side.masteryAwarded, true);
  assert.ok(g.state.campaign.mastered.includes('vineway-receipt-run'));
  assert.ok(Number.isFinite(g.state.energy), 'mastery energy cannot break the audio or HUD');
});

test('a completed adventure, new run, and reload retain one character and one earned ending', async () => {
  const storage = new Map();
  const g = await loadGame({ storage }); g.resetGame();
  const character = g.state.memory.character.id;
  assert.equal(g.finishGame(true), false, 'a fresh game is not a completed ending');
  assert.equal(g.state.mode, 'playing');
  for (const [index, chapter] of campaignChapters.entries()) {
    g.enterRegion(index);
    for (const objective of chapter.objectives) g.completeObjective(objective.id);
  }
  g.state.campaign.mastered.push('moth');
  g.finishGame(true); g.finishGame(true);
  assert.equal(g.state.memory.endings.length, 1);
  const previousRun = g.state.adventureId;
  g.resetGame({ agedPoorly: true });
  assert.equal(g.state.memory.character.id, character);
  assert.equal(g.state.hero.characterId, character);
  assert.equal(g.state.memory.endings.length, 1);
  assert.ok(g.state.memory.mastered.includes('moth'));
  assert.notEqual(g.state.adventureId, previousRun);
  assert.equal(g.state.campaign.completed.length, 0);
  assert.equal(g.state.endingSeen, false);
  const saved = loadSave({ getItem: (key) => storage.get(key) ?? null });
  const reloaded = await loadGame({ storage });
  reloaded.resetGame({ continueSave: saved });
  assert.equal(reloaded.state.memory.character.id, character);
  assert.equal(reloaded.state.adventureId, g.state.adventureId);
  assert.equal(reloaded.state.memory.endings.length, 1);
  reloaded.enterRegion(1); reloaded.state.helpEnabled = false; reloaded.startSideview();
  reloaded.finishSideview();
  for (let i = 0; i < 50; i++) reloaded.update(1 / 60);
  assert.equal(reloaded.state.hero.characterId, character);
});

test('unsupported future save survives starting a temporary adventure', async () => {
  const future = JSON.stringify({ schemaVersion: 999 });
  const storage = new Map([[SAVE_KEY, future]]);
  const g = await loadGame({ storage }); g.resetGame();
  assert.equal(g.state.mode, 'playing');
  assert.equal(g.state.persistenceAvailable, false);
  assert.equal(storage.get(SAVE_KEY), future);
  assert.match(g.element('journey-save-status').textContent, /not saving/);
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


test('Press Pit tip channel carries the cork-popper aisle warning', async () => {
  const g = await loadGame(); g.resetGame(); g.enterRegion(2);
  Object.assign(g.state.hero, { x: 477, y: 1150 });
  g.updateContextTarget(); g.useContextTarget();
  assert.equal(g.state.mode, 'help');
  assert.match(g.element('context-help-title').textContent, /Press Pit tip/i);
  assert.match(
    g.element('context-help-copy').textContent,
    /the cork-popper in aisle 7 times your pours\. One wrong vintage and the whole tasting room goes feral\./,
  );
});

test('Sommelier Speedrun: flying corks, mispour telegraph, three clean pours unlock guest receipt', async () => {
  const storage = new Map([['grape-gripe-help-sideview-controls', 'seen']]);
  const g = await loadGame({ storage }); g.resetGame(); g.enterRegion(1); g.startSideview();
  const side = g.state.sideview;
  assert.ok(side.corks.length >= 3);
  assert.ok(side.corkPopper);
  assert.equal(side.pours.length, 3);
  assert.equal(side.guestReceipt.guestLine, "Guest said 'notes of regret.'");

  // Ambient cork bounce on slow contact.
  const cork = side.corks[0];
  const nextTime = g.state.time + 1 / 60;
  const corkX = cork.baseX + Math.sin(nextTime * 1.35 + cork.phase) * cork.range;
  const corkY = cork.baseY + Math.cos(nextTime * 2.1 + cork.phase) * 18;
  Object.assign(side, { x: corkX, y: corkY + 45, vx: 0, vy: 0, grounded: false, hitCooldown: 0 });
  g.update(1 / 60);
  assert.equal(cork.defeated, false);
  assert.ok(Math.abs(side.vx) >= 200, 'slow cork contact should knock the hero back');

  // Cork-Popper charges a readable mispour telegraph into a danger zone.
  side.hitCooldown = 0;
  Object.assign(side, { x: side.corkPopper.x - 40, y: 505, vx: 0, vy: 0 });
  side.corkPopper.phase = 'idle';
  side.corkPopper.timer = 0;
  side.corkPopper.mispour = null;
  g.update(1 / 60);
  assert.equal(side.corkPopper.mispour?.phase, 'telegraph');
  assert.ok(side.corkPopper.mispour.radius < side.corkPopper.mispour.maxRadius);
  // Finish charge → danger + flying cork projectiles.
  side.corkPopper.mispour.charge = 0.001;
  g.update(1 / 60);
  assert.equal(side.corkPopper.mispour?.phase, 'danger');
  assert.ok(side.flyingCorks.length >= 2, 'mispour should launch flying corks');

  // Three clean pours unlock the guest receipt; collecting it persists mastery + guest line.
  side.corkPopper.mispour = null;
  side.hitCooldown = 0;
  for (const pour of side.pours) {
    Object.assign(side, { x: pour.x, y: pour.y + 45, vx: 0, vy: 0, hitCooldown: 0 });
    g.update(1 / 60);
    assert.equal(pour.filled, true, `pour ${pour.id} should fill cleanly`);
  }
  assert.equal(side.cleanPourCount, 3);
  assert.equal(side.guestReceipt.unlocked, true);
  Object.assign(side, { x: side.guestReceipt.x, y: side.guestReceipt.y + 45, vx: 0, vy: 0, hitCooldown: 0 });
  g.update(1 / 60);
  assert.equal(side.guestReceipt.collected, true);
  assert.ok(g.state.campaign.mastered.includes('sommelier-speedrun'));
  assert.equal(side.guestReceipt.guestLine, "Guest said 'notes of regret.'");
  assert.equal(side.corkPopper.defeated, true);
});
