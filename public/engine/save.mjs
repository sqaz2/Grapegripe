import { CAMPAIGN_SCHEMA_VERSION, chapterIds, objectiveIds, rewardIds } from '../content/campaign.mjs';
import { createCampaignState } from './campaign.mjs';

export const SAVE_KEY = 'grape-gripe-campaign-v1';
export const BACKUP_KEY = `${SAVE_KEY}-backup`;
const allowedObjectives = new Set(objectiveIds);
const allowedRewards = new Set(rewardIds);
const allowedChapters = new Set(chapterIds);
const cleanList = (value, allowed) => [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === 'string' && allowed.has(item)))];

export function newSave() {
  return {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    revision: 0,
    campaign: createCampaignState(),
    checkpoint: { chapterId: 'root', anchorId: 'root-start' },
    run: { score: 0, energy: 0, upgrades: { power: 0, speed: 0, shield: 0 }, endingSeen: false },
    preferences: { sound: true, haptics: true, shake: true },
  };
}

export function validateSave(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== CAMPAIGN_SCHEMA_VERSION) return null;
  const base = newSave();
  const chapterId = allowedChapters.has(value.checkpoint?.chapterId) ? value.checkpoint.chapterId : 'root';
  const clampInt = (input, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(input)) ? Math.round(Number(input)) : min));
  const campaign = createCampaignState({
    completed: cleanList(value.campaign?.completed, allowedObjectives),
    discovered: cleanList(value.campaign?.discovered, allowedObjectives),
    rewardsClaimed: cleanList(value.campaign?.rewardsClaimed, allowedRewards),
    worldFlags: cleanList(value.campaign?.worldFlags, allowedRewards),
    mastered: Array.isArray(value.campaign?.mastered) ? value.campaign.mastered.filter((item) => typeof item === 'string').slice(0, 32) : [],
    routeChoices: value.campaign?.routeChoices && typeof value.campaign.routeChoices === 'object' ? value.campaign.routeChoices : {},
  });
  return {
    ...base,
    revision: clampInt(value.revision, 0, 1_000_000),
    campaign,
    checkpoint: { chapterId, anchorId: typeof value.checkpoint?.anchorId === 'string' ? value.checkpoint.anchorId : `${chapterId}-start` },
    run: {
      score: clampInt(value.run?.score, 0, 99_999_999),
      energy: clampInt(value.run?.energy, 0, 99_999),
      upgrades: {
        power: clampInt(value.run?.upgrades?.power, 0, 3),
        speed: clampInt(value.run?.upgrades?.speed, 0, 3),
        shield: clampInt(value.run?.upgrades?.shield, 0, 3),
      },
      endingSeen: Boolean(value.run?.endingSeen),
    },
    preferences: {
      sound: value.preferences?.sound !== false,
      haptics: value.preferences?.haptics !== false,
      shake: value.preferences?.shake !== false,
    },
  };
}

export function loadSave(storage = globalThis.localStorage) {
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    try {
      const raw = storage?.getItem(key);
      if (!raw) continue;
      const save = validateSave(JSON.parse(raw));
      if (save) return save;
    } catch { /* Try the recoverable backup. */ }
  }
  return null;
}

export function storeSave(save, storage = globalThis.localStorage) {
  const valid = validateSave(save);
  if (!valid) return false;
  const next = { ...valid, revision: valid.revision + 1 };
  try {
    const current = storage?.getItem(SAVE_KEY);
    if (current) storage.setItem(BACKUP_KEY, current);
    storage?.setItem(SAVE_KEY, JSON.stringify(next));
    return next;
  } catch { return false; }
}

export function removeSave(storage = globalThis.localStorage) {
  try { storage?.removeItem(SAVE_KEY); storage?.removeItem(BACKUP_KEY); return true; } catch { return false; }
}

