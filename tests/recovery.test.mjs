import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './game-harness.mjs';
import { campaignChapters } from '../public/content/campaign.mjs';
import { loadSave, newSave, SAVE_KEY } from '../public/engine/save.mjs';
import { checkpointAnchors } from '../public/engine/checkpoints.mjs';

const start = async (storage = new Map(), extra = {}) => {
  const game = await loadGame({ storage, ...extra });
  game.resetGame(); game.state.helpEnabled = false;
  return game;
};

test('chapter upgrades survive travel and choice-screen reloads, exactly once', async () => {
  const storage = new Map();
  let g = await start(storage);
  for (let region = 0; region < 3; region++) {
    for (const objective of campaignChapters[region].objectives) g.completeObjective(objective.id);
    g.completeRegion(); g.update(.6);
    assert.equal(g.state.mode, 'travel');
    let next = await loadGame({ storage });
    next.resetGame({ continueSave: loadSave(next.adapter) });
    assert.equal(next.state.mode, 'upgrade');
    assert.equal(next.state.pendingUpgrade, campaignChapters[region].id);
    g = await loadGame({ storage });
    g.resetGame({ continueSave: loadSave(g.adapter) });
    assert.equal(g.state.mode, 'upgrade');
    g.chooseUpgrade('power'); g.chooseUpgrade('power');
    assert.equal(g.state.upgrades.power, region + 1);
    assert.equal(g.state.regionIndex, region + 1);
    assert.equal(g.state.mode, 'playing');
    next = await loadGame({ storage });
    next.resetGame({ continueSave: loadSave(next.adapter) });
    assert.equal(next.state.upgrades.power, region + 1);
    assert.equal(next.state.mode, 'playing');
    g = next;
  }
  assert.deepEqual([...g.state.upgradesClaimed], ['root', 'vineway', 'press']);
  assert.ok(storage.get(SAVE_KEY), 'game integration writes the supplied adapter');
});

test('Receipt and mastery energy stay finite and survive a fresh game', async () => {
  const storage = new Map(); const g = await start(storage);
  g.enterRegion(1); g.completeObjective('vineway-route'); g.startSideview();
  const side = g.state.sideview;
  g.state.energy = 20;
  const receipt = side.receipts[0];
  Object.assign(side, { x: receipt.x, y: receipt.y + 45, vx: 0, vy: 0 });
  g.update(1/60);
  assert.equal(side.receiptCount, 1);
  assert.equal(g.state.energy, 23);
  for (const receipt of side.receipts) receipt.collected = true;
  side.receiptCount = side.receipts.length;
  for (const fly of side.flies) fly.defeated = true;
  side.flyCount = side.flies.length;
  g.update(1/60);
  assert.equal(g.state.energy, 38);
  g.finishSideview();
  const savedEnergy = g.state.energy;
  const resumed = await loadGame({ storage });
  resumed.resetGame({ continueSave: loadSave(resumed.adapter) });
  assert.equal(resumed.state.energy, savedEnergy);
  assert.ok(resumed.state.campaign.mastered.includes('vineway-receipt-run'));
});

test('legacy saves recover multiple missed upgrades in order without another reload', async () => {
  const legacy = newSave();
  legacy.checkpoint = { chapterId: 'press', anchorId: 'press-start' };
  delete legacy.run.pendingUpgrade;
  delete legacy.run.upgradesClaimed;
  const storage = new Map([[SAVE_KEY, JSON.stringify(legacy)]]);
  const g = await loadGame({ storage });
  g.resetGame({ continueSave: loadSave(g.adapter) });
  assert.equal(g.state.pendingUpgrade, 'root');
  g.chooseUpgrade('power');
  assert.equal(g.state.mode, 'upgrade');
  assert.equal(g.state.pendingUpgrade, 'vineway');
  g.chooseUpgrade('shield');
  assert.equal(g.state.mode, 'playing');
  assert.equal(g.state.regionIndex, 2);
  const resumed = await loadGame({ storage });
  resumed.resetGame({ continueSave: loadSave(resumed.adapter) });
  assert.equal(resumed.state.mode, 'playing');
  assert.deepEqual({ ...resumed.state.upgrades }, { power: 1, speed: 0, shield: 1 });
});

test('storage failure leaves play available and shows a warning until recovery', async () => {
  const g = await start(new Map(), { denyStorage: true });
  assert.equal(g.state.mode, 'playing');
  assert.equal(g.state.persistenceAvailable, false);
  assert.equal(g.element('save-status').hidden, false);
  assert.match(g.element('save-status').textContent, /cannot be saved/);
  g.completeObjective('root-companion');
  g.options.denyStorage = false;
  g.completeObjective('root-relay-west');
  assert.equal(g.state.persistenceAvailable, true);
  assert.equal(g.element('save-status').hidden, true);
  assert.ok(loadSave(g.adapter).campaign.completed.includes('root-companion'));
});

test('a future save does not block temporary play or get overwritten by New', async () => {
  const future = JSON.stringify({ ...newSave(), schemaVersion: 999 });
  const storage = new Map([[SAVE_KEY, future]]);
  const g = await loadGame({ storage });
  assert.equal(g.state.mode, 'start');
  assert.match(g.element('save-status').textContent, /newer game version/);
  g.resetGame(); g.completeObjective('root-companion');
  assert.equal(g.state.mode, 'playing');
  assert.equal(storage.get(SAVE_KEY), future);
  assert.equal(g.state.persistenceAvailable, false);
});

test('completed chapters do not grant another upgrade on return travel', async () => {
  const g = await start();
  for (const objective of campaignChapters[0].objectives) g.completeObjective(objective.id);
  g.state.upgradesClaimed = ['root'];
  g.completeRegion(); g.update(.6); g.update(3);
  assert.equal(g.state.regionIndex, 1);
  assert.equal(g.state.mode, 'playing');
  assert.equal(g.state.pendingUpgrade, null);
});

test('app interruption and pointer cancellation release held movement and attacks', async () => {
  const g = await start();
  const event = { pointerId: 6, clientX: 80, clientY: 700, preventDefault() {} };
  g.element('joystick-zone').listeners.pointerdown[0](event);
  g.element('joystick-zone').listeners.pointermove[0]({ ...event, clientX: 115 });
  g.input.attackHeld = true;
  g.document.hidden = true; g.events.document.visibilitychange();
  assert.equal(g.state.mode, 'paused');
  assert.equal(g.input.attackHeld, false); assert.equal(g.input.joyX, 0);
  g.resumeGame();
  g.element('joystick-zone').listeners.pointerdown[0](event);
  g.element('joystick-zone').listeners.pointercancel[0](event);
  assert.equal(g.input.joystickId, null);
  assert.equal(g.input.joyX, 0);
});

test('every registered checkpoint restores on reachable floor without changing identity', async () => {
  const g = await start();
  const characterId = g.state.memory.character.id;
  for (const [index, chapter] of campaignChapters.entries()) {
    for (const id of Object.keys(checkpointAnchors[chapter.id])) {
      g.enterRegion(index, true, id);
      assert.ok(g.state.terrain.contains(g.state.hero, g.state.hero.footRadius), id);
      assert.ok(g.state.terrain.findPath(g.state.hero, { x: g.state.mission.props[0].x, y: g.state.mission.props[0].y }, g.state.hero.footRadius).length, id);
      assert.equal(g.state.hero.characterId, characterId);
    }
  }
  g.enterRegion(0, true, 'invented-lift');
  assert.equal(g.state.hero.y, checkpointAnchors.root['root-start'][1]);
});

test('retry keeps session objectives even when storage writes are blocked', async () => {
  const g = await start(new Map(), { failWrites: true });
  g.completeObjective('root-companion');
  const characterId = g.state.memory.character.id;
  g.finishGame(false);
  g.element('restart-button').listeners.click[0]();
  assert.equal(g.state.mode, 'playing');
  assert.ok(g.state.campaign.completed.includes('root-companion'));
  assert.equal(g.state.memory.character.id, characterId);
});
