import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSave, removeSave, loadSave, newSave, storeSave, validateSave, restartAdventure, SAVE_KEY, BACKUP_KEY, SAVE_SCHEMA_VERSION } from '../public/engine/save.mjs';
import { rememberEnding } from '../public/engine/journey-memory.mjs';
import { campaignChapters } from '../public/content/campaign.mjs';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), values };
}

test('save validates bounded values and known ids', () => {
  const value = newSave();
  value.campaign.completed = ['root-companion', 'made-up'];
  value.run.upgrades.power = 99;
  const valid = validateSave(value);
  assert.deepEqual(valid.campaign.completed, ['root-companion']);
  assert.equal(valid.run.upgrades.power, 3);
});

test('save keeps a recoverable previous copy', () => {
  const storage = memoryStorage();
  let first = newSave();
  first = storeSave(first, storage);
  first.run.energy = 12;
  storeSave(first, storage);
  assert.ok(storage.getItem(BACKUP_KEY));
  storage.setItem(SAVE_KEY, '{broken');
  assert.equal(loadSave(storage).run.energy, 0);
});

test('the Press Pit verdict survives validation and reload', () => {
  const storage = memoryStorage();
  const save = newSave();
  save.campaign.routeChoices.press = 'save';
  const stored = storeSave(save, storage);
  assert.equal(stored.campaign.routeChoices.press, 'save');
  assert.equal(loadSave(storage).campaign.routeChoices.press, 'save');
});

test('Vineway stunt mastery survives validation and reload', () => {
  const storage = memoryStorage();
  const save = newSave();
  save.campaign.mastered.push('vineway-receipt-run');
  const stored = storeSave(save, storage);
  assert.ok(stored.campaign.mastered.includes('vineway-receipt-run'));
  assert.ok(loadSave(storage).campaign.mastered.includes('vineway-receipt-run'));
});

test('Whining preference and Aged Poorly rematch survive validation', () => {
  const save = newSave();
  save.preferences.whining = false;
  save.run.agedPoorly = true;
  const valid = validateSave(save);
  assert.equal(valid.preferences.whining, false);
  assert.equal(valid.run.agedPoorly, true);
});

test('legacy victory migrates once without changing character on later loads', () => {
  const legacy = newSave();
  legacy.schemaVersion = 1;
  delete legacy.memory;
  delete legacy.run.id;
  legacy.campaign.completed = ['root-companion'];
  legacy.campaign.mastered = ['moth'];
  legacy.checkpoint = { chapterId: 'vineway', anchorId: 'vineway-side-passage' };
  legacy.run.endingSeen = true;
  legacy.run.score = 100;
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(legacy) });
  const first = loadSave(storage), second = loadSave(storage);
  assert.equal(first.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.deepEqual(first.memory.character, second.memory.character);
  assert.equal(first.memory.endings.length, 1);
  assert.equal(first.run.id, second.run.id);
  assert.deepEqual(first.checkpoint, legacy.checkpoint);
  assert.deepEqual(first.memory.mastered, ['moth']);
  assert.equal(first.run.score, 100);
  storage.setItem(SAVE_KEY, '{broken');
  assert.equal(loadSave(storage).memory.character.id, first.memory.character.id, 'migration backup retains the same identity');
});

test('adventure reset preserves identity and earned memory but resets objectives and perks', () => {
  const save = newSave();
  save.campaign.completed = campaignChapters.flatMap((chapter) => chapter.exitRequires);
  save.campaign.mastered = ['moth', 'vineway-receipt-run'];
  save.campaign.routeChoices.press = 'solve';
  save.run.endingSeen = true;
  save.memory = rememberEnding(save.memory, save.campaign, save.run.id, 'grapegripe:vineyard-restored');
  const repeated = rememberEnding(save.memory, save.campaign, save.run.id, 'grapegripe:vineyard-restored');
  assert.equal(repeated.endings.length, 1);
  const next = restartAdventure(save, { agedPoorly: true });
  assert.deepEqual(next.memory.character, save.memory.character);
  assert.notEqual(next.run.id, save.run.id);
  assert.equal(next.memory.endings.length, 1);
  assert.ok(next.memory.mastered.includes('vineway-receipt-run'));
  assert.deepEqual(next.campaign.completed, []);
  assert.deepEqual(next.campaign.routeChoices, {});
  assert.equal(next.run.endingSeen, false);
  assert.equal(next.run.agedPoorly, true);
  assert.equal(save.campaign.routeChoices.press, 'solve', 'reset does not mutate the prior adventure');
});

test('unfinished campaign and unregistered ending cannot mint an ending', () => {
  const save = newSave();
  assert.equal(rememberEnding(save.memory, save.campaign, save.run.id, 'grapegripe:vineyard-restored').endings.length, 0);
  assert.equal(rememberEnding(save.memory, save.campaign, save.run.id, 'invented-ending').endings.length, 0);
});

test('corruption repair keeps the last valid backup and character', () => {
  const storage = memoryStorage();
  const first = storeSave(newSave(), storage);
  const next = storeSave({ ...first, run: { ...first.run, score: 25 } }, storage);
  storage.setItem(SAVE_KEY, '{broken');
  const recovered = loadSave(storage);
  assert.equal(recovered.memory.character.id, next.memory.character.id);
  const repaired = storeSave(recovered, storage);
  assert.ok(repaired);
  assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).memory.character.id, next.memory.character.id);
});

test('newer save formats, stale writes, and failed writes cannot overwrite progress', () => {
  const storage = memoryStorage();
  const first = storeSave(newSave(), storage);
  const second = storeSave(first, storage);
  assert.equal(storeSave(first, storage), false);
  const future = JSON.stringify({ ...second, schemaVersion: 999 });
  storage.setItem(SAVE_KEY, future);
  assert.equal(loadSave(storage), null);
  assert.equal(storeSave(second, storage), false);
  assert.equal(storage.getItem(SAVE_KEY), future);
  const unavailable = { getItem: () => null, setItem: () => { throw new Error('full'); } };
  assert.equal(storeSave(newSave(), unavailable), false);
});

test('unavailable storage, including a throwing property getter, fails safely', () => {
  assert.equal(storeSave(newSave(), null), false);
  assert.equal(removeSave(null), false);
  assert.equal(inspectSave(null).status, 'unavailable');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    assert.equal(loadSave(), null);
    assert.equal(storeSave(newSave()), false);
    assert.equal(removeSave(), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('recovery keeps the good backup through a failed primary write', () => {
  const storage = memoryStorage();
  const initial = newSave(); initial.run.energy = 45;
  const first = storeSave(initial, storage); storeSave(first, storage);
  storage.setItem(SAVE_KEY, '{broken');
  const goodBackup = storage.getItem(BACKUP_KEY);
  const recovered = loadSave(storage); recovered.run.energy = 52;
  const failPrimary = { ...storage, setItem(key, value) {
    if (key === SAVE_KEY) throw new Error('Quota exceeded');
    storage.setItem(key, value);
  } };
  assert.equal(storeSave(recovered, failPrimary), false);
  assert.equal(storage.getItem(BACKUP_KEY), goodBackup);
  assert.equal(loadSave(storage).run.energy, 45);
  assert.ok(storeSave(recovered, storage));
  assert.equal(storage.getItem(BACKUP_KEY), goodBackup);
  assert.equal(loadSave(storage).run.energy, 52);
});

test('newer save versions in either slot are preserved without silent fallback', () => {
  for (const futureKey of [SAVE_KEY, BACKUP_KEY]) {
    const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(newSave()), [BACKUP_KEY]: JSON.stringify(newSave()) });
    storage.setItem(futureKey, JSON.stringify({ ...newSave(), schemaVersion: 999 }));
    const before = [...storage.values];
    assert.equal(inspectSave(storage).status, 'incompatible');
    assert.equal(loadSave(storage), null);
    assert.equal(storeSave(newSave(), storage), false);
    assert.equal(removeSave(storage), false);
    assert.deepEqual([...storage.values], before);
  }
});

test('old saves recover an unclaimed upgrade and retain already earned ones', () => {
  const old = newSave();
  delete old.run.pendingUpgrade; delete old.run.upgradesClaimed;
  old.checkpoint.chapterId = 'vineway';
  assert.equal(validateSave(old).run.pendingUpgrade, 'root');
  old.run.upgrades.speed = 1;
  assert.equal(validateSave(old).run.pendingUpgrade, null);
  assert.deepEqual(validateSave(old).run.upgradesClaimed, ['root']);
});
