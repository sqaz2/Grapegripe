import { CAMPAIGN_SCHEMA_VERSION, chapterIds, objectiveIds, rewardIds } from '../content/campaign.mjs';
import { createCampaignState } from './campaign.mjs';
import { createMemory, validateMemory, rememberCampaign, masteryIds } from './journey-memory.mjs';
import { checkpointId } from './checkpoints.mjs';

export const SAVE_SCHEMA_VERSION = 2;
export const MAX_ENERGY = 99_999;
export const upgradeChapters = Object.freeze(chapterIds.slice(0, -1));
// Keep the storage address so existing players migrate in place, with a backup.
export const SAVE_KEY = 'grape-gripe-campaign-v1';
export const BACKUP_KEY = `${SAVE_KEY}-backup`;
const allowedObjectives = new Set(objectiveIds);
const allowedRewards = new Set(rewardIds);
const allowedChapters = new Set(chapterIds);
const cleanList = (value, allowed) => [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === 'string' && allowed.has(item)))];

export function newSave() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    revision: 0,
    memory: createMemory(),
    campaign: createCampaignState(),
    checkpoint: { chapterId: 'root', anchorId: 'root-start' },
    run: { id: crypto.randomUUID(), score: 0, energy: 0, upgrades: { power: 0, speed: 0, shield: 0 }, endingSeen: false, agedPoorly: false, pendingUpgrade: null, upgradesClaimed: [] },
    preferences: { sound: true, haptics: true, shake: true, whining: true },
  };
}

export function validateSave(value) {
  if (!value || typeof value !== 'object' || ![CAMPAIGN_SCHEMA_VERSION, SAVE_SCHEMA_VERSION].includes(value.schemaVersion)) return null;
  const legacy = value.schemaVersion === CAMPAIGN_SCHEMA_VERSION;
  if (!legacy && (!validateMemory(value.memory) || typeof value.run?.id !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(value.run.id))) return null;
  const base = newSave();
  const chapterId = allowedChapters.has(value.checkpoint?.chapterId) ? value.checkpoint.chapterId : 'root';
  const clampInt = (input, min, max) => Math.max(min, Math.min(max, typeof input === 'number' && Number.isFinite(input) ? Math.round(input) : min));
  const campaign = createCampaignState({
    completed: cleanList(value.campaign?.completed, allowedObjectives),
    discovered: cleanList(value.campaign?.discovered, allowedObjectives),
    rewardsClaimed: cleanList(value.campaign?.rewardsClaimed, allowedRewards),
    worldFlags: cleanList(value.campaign?.worldFlags, allowedRewards),
    mastered: cleanList(value.campaign?.mastered, new Set(masteryIds)),
    routeChoices: {
      ...(['long', 'bridge'].includes(value.campaign?.routeChoices?.vineway) ? { vineway: value.campaign.routeChoices.vineway } : {}),
      ...(['say', 'solve', 'save', 'drop'].includes(value.campaign?.routeChoices?.press) ? { press: value.campaign.routeChoices.press } : {}),
    },
  });
  const upgrades = Object.fromEntries(['power', 'speed', 'shield'].map((key) => [key, clampInt(value.run?.upgrades?.[key], 0, 3)]));
  // Old v1 envelopes had no reward ledger. Retain earned upgrades and recover
  // any missed transition choice, oldest first, without granting duplicates.
  const passed = upgradeChapters.slice(0, chapterIds.indexOf(chapterId));
  const legacyClaims = value.run?.endingSeen ? [...upgradeChapters] : passed.slice(0, Object.values(upgrades).reduce((a, b) => a + b, 0));
  const upgradesClaimed = Array.isArray(value.run?.upgradesClaimed)
    ? cleanList(value.run.upgradesClaimed, new Set(upgradeChapters)) : legacyClaims;
  const pendingUpgrade = upgradeChapters.includes(value.run?.pendingUpgrade) && !upgradesClaimed.includes(value.run.pendingUpgrade)
    ? value.run.pendingUpgrade : passed.find((id) => !upgradesClaimed.includes(id)) || null;
  const memory = rememberCampaign(legacy ? base.memory : value.memory, campaign);
  // Older releases recorded victory only as this flag. Preserve that earned ending.
  if (legacy && value.run?.endingSeen) memory.endings.push({ id: 'grapegripe:vineyard-restored', runId: base.run.id });
  return {
    ...base,
    memory,
    revision: clampInt(value.revision, 0, 1_000_000),
    campaign,
    checkpoint: { chapterId, anchorId: checkpointId(chapterId, value.checkpoint?.anchorId) },
    run: {
      id: legacy ? base.run.id : value.run.id,
      score: clampInt(value.run?.score, 0, 99_999_999),
      energy: clampInt(value.run?.energy, 0, MAX_ENERGY),
      upgrades,
      pendingUpgrade,
      upgradesClaimed,
      endingSeen: Boolean(value.run?.endingSeen),
      agedPoorly: Boolean(value.run?.agedPoorly),
    },
    preferences: {
      sound: value.preferences?.sound !== false,
      haptics: value.preferences?.haptics !== false,
      shake: value.preferences?.shake !== false,
      whining: value.preferences?.whining !== false,
    },
  };
}

export function inspectSave(storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function') return { save: null, status: 'unavailable' };
    const parsed = [SAVE_KEY, BACKUP_KEY].map((key) => {
      const raw = storage.getItem(key);
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    });
    if (parsed.some((value) => value?.schemaVersion > SAVE_SCHEMA_VERSION)) return { save: null, status: 'incompatible' };
    const candidates = parsed.map((value, index) => ({ value, index, save: validateSave(value) }))
      .filter((candidate) => candidate.save).sort((a, b) => b.save.revision - a.save.revision || a.index - b.index);
    const candidate = candidates[0];
    if (!candidate) return { save: null, status: 'empty' };
    let save = candidate.save;
    if (candidate.value.schemaVersion === CAMPAIGN_SCHEMA_VERSION) {
      const migrated = storeSave(save, storage);
      if (!migrated) return { save, status: 'unavailable' };
      save = migrated;
    }
    return { save, status: candidate.index ? 'recovered' : 'ok' };
  } catch { return { save: null, status: 'unavailable' }; }
}

export function loadSave(storage) { return inspectSave(storage).save; }

export function storeSave(save, storage) {
  const valid = validateSave(save);
  if (!valid) return false;
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage) return false;
    let current = null;
    for (const key of [SAVE_KEY, BACKUP_KEY]) {
      const raw = storage.getItem(key);
      if (!raw) continue;
      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }
      if (parsed?.schemaVersion > SAVE_SCHEMA_VERSION) return false;
      const candidate = validateSave(parsed);
      if (candidate && parsed.schemaVersion === CAMPAIGN_SCHEMA_VERSION) {
        // The migration's recovery copy must refer to the same character too.
        candidate.memory = rememberCampaign(valid.memory, candidate.campaign);
        candidate.run.id = valid.run.id;
      }
      if (candidate && (!current || candidate.revision > current.revision)) current = candidate;
    }
    // Sequential stale-tab writes are rejected; this is not a server transaction.
    if (current && valid.revision < current.revision) return false;
    const next = { ...valid, revision: Math.max(valid.revision, current?.revision || 0) + 1 };
    if (current) storage.setItem(BACKUP_KEY, JSON.stringify(current));
    storage.setItem(SAVE_KEY, JSON.stringify(next));
    return next;
  } catch { return false; }
}

export function restartAdventure(save, { agedPoorly = false } = {}) {
  const previous = validateSave(save);
  const next = newSave();
  if (previous) {
    next.memory = previous.memory;
    next.preferences = previous.preferences;
    next.revision = previous.revision;
  }
  next.run.agedPoorly = Boolean(agedPoorly);
  return next;
}

export function removeSave(storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage || inspectSave(storage).status === 'incompatible') return false;
    storage.removeItem(SAVE_KEY); storage.removeItem(BACKUP_KEY); return true;
  } catch { return false; }
}
