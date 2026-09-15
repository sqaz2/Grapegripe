import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './game-harness.mjs';
import { loadSave } from '../public/engine/save.mjs';

test('first side-route lesson keeps swing controls alongside the optional speedrun goal', async () => {
  const g = await loadGame(); g.resetGame(); g.enterRegion(1); g.startSideview();
  assert.equal(g.state.mode, 'help');
  const copy = g.element('context-help-copy').textContent;
  for (const action of [/hold/i, /pump/i, /release/i, /three clean pours/i]) assert.match(copy, action);
});

test('clean-pour and guest rewards remain finite and retain mastery after reload and replay', async () => {
  const storage = new Map();
  const g = await loadGame({ storage }); g.resetGame(); g.state.helpEnabled = false;
  g.enterRegion(1); g.completeObjective('vineway-route'); g.startSideview();
  const side = g.state.sideview;
  side.masteryAwarded = true;
  for (const receipt of side.receipts) receipt.collected = true;
  for (const cork of side.corks) cork.defeated = true;
  side.corkPopper.timer = 1000;
  g.state.energy = 20;
  for (const [index, pour] of side.pours.entries()) {
    Object.assign(side, { x: pour.x, y: pour.y + 45, vx: 0, vy: 0, hitCooldown: 0 });
    g.update(1 / 60);
    assert.equal(g.state.energy, 20 + (index + 1) * 4);
  }
  Object.assign(side, { x: side.guestReceipt.x, y: side.guestReceipt.y + 45, vx: 0, vy: 0, hitCooldown: 0 });
  g.update(1 / 60);
  assert.equal(g.state.energy, 42);
  const saved = loadSave(g.adapter);
  assert.equal(saved.run.energy, 42);
  assert.ok(saved.campaign.mastered.includes('sommelier-speedrun'));
  assert.ok(saved.memory.mastered.includes('sommelier-speedrun'));
  const resumed = await loadGame({ storage });
  resumed.resetGame({ continueSave: loadSave(resumed.adapter) });
  assert.equal(resumed.state.energy, 42);
  assert.equal(resumed.state.memory.character.id, g.state.memory.character.id);
  resumed.resetGame();
  assert.ok(resumed.state.memory.mastered.includes('sommelier-speedrun'));
  assert.equal(resumed.state.energy, 0, 'new adventures do not repeat an old energy reward');
});
