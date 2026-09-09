import { objectiveIds } from '../content/campaign.mjs';
import { endingDefinitions, eligibleEnding } from '../content/endings.mjs';

export const WORLD_ID = 'grapegripe';
export const masteryIds = Object.freeze(['sourling', 'moth', 'brute', 'boss', 'vineway-receipt-run']);
const token = (value) => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(value);
const knownList = (value, allowed) => [...new Set((Array.isArray(value) ? value : []).filter((id) => allowed.includes(id)))];

// Local identity is a migration foothold, never a login or proof of ownership.
export function newLocalCharacter() {
  return { id: `local:${crypto.randomUUID()}`, originWorldId: WORLD_ID, avatarId: 'grapegripe:grape-fighter', authority: 'local' };
}

export function createMemory(character = newLocalCharacter()) {
  return { character: { ...character }, discoveries: [], mastered: [], endings: [] };
}

export function validateMemory(value) {
  const character = value?.character;
  if (!character || !token(character.id) || !character.id.startsWith('local:') || character.originWorldId !== WORLD_ID ||
      character.avatarId !== 'grapegripe:grape-fighter' || character.authority !== 'local') return null;
  const endingIds = endingDefinitions.map((ending) => ending.id);
  const endings = [];
  for (const record of Array.isArray(value.endings) ? value.endings : []) {
    if (!endingIds.includes(record?.id) || endings.some((ending) => ending.id === record.id) || !token(record.runId)) continue;
    endings.push({ id: record.id, runId: record.runId });
  }
  return {
    character: { id: character.id, originWorldId: character.originWorldId, avatarId: character.avatarId, authority: 'local' },
    discoveries: knownList(value.discoveries, objectiveIds),
    mastered: knownList(value.mastered, masteryIds),
    endings,
  };
}

export function rememberCampaign(memory, campaign) {
  const next = validateMemory(memory);
  if (!next) throw new Error('Invalid character memory');
  next.discoveries = knownList([...next.discoveries, ...campaign.discovered, ...campaign.completed], objectiveIds);
  next.mastered = knownList([...next.mastered, ...campaign.mastered], masteryIds);
  return next;
}

export function rememberEnding(memory, campaign, runId, endingId, frontier = null) {
  const next = rememberCampaign(memory, campaign);
  if (token(runId) && eligibleEnding(campaign, endingId, frontier) && !next.endings.some((ending) => ending.id === endingId)) {
    next.endings.push({ id: endingId, runId });
  }
  return next;
}
