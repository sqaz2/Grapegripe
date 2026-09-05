import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, newSave, storeSave, validateSave, SAVE_KEY, BACKUP_KEY } from '../public/engine/save.mjs';

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
