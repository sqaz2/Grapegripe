import { campaignChapters, chapterById, objectiveById } from '../content/campaign.mjs';

const unique = (values) => [...new Set(values)];

export function createCampaignState(seed = {}) {
  return {
    completed: unique(Array.isArray(seed.completed) ? seed.completed : []),
    discovered: unique(Array.isArray(seed.discovered) ? seed.discovered : []),
    rewardsClaimed: unique(Array.isArray(seed.rewardsClaimed) ? seed.rewardsClaimed : []),
    worldFlags: unique(Array.isArray(seed.worldFlags) ? seed.worldFlags : []),
    routeChoices: { ...(seed.routeChoices || {}) },
    mastered: unique(Array.isArray(seed.mastered) ? seed.mastered : []),
  };
}

export function objectiveAvailable(campaign, objectiveId) {
  const objective = objectiveById(objectiveId);
  if (!objective || campaign.completed.includes(objectiveId)) return false;
  return (objective.requires || []).every((id) => campaign.completed.includes(id));
}

export function chapterComplete(campaign, chapterId) {
  const chapter = chapterById(chapterId);
  return Boolean(chapter && chapter.exitRequires.every((id) => campaign.completed.includes(id)));
}

export function nextObjectives(campaign, chapterId) {
  const chapter = chapterById(chapterId);
  return chapter ? chapter.objectives.filter((objective) => objectiveAvailable(campaign, objective.id)) : [];
}

export function applyCampaignEvent(campaign, event) {
  const next = createCampaignState(campaign);
  if (!event || typeof event !== 'object') return { state: next, changed: false, rewards: [] };
  if (event.type === 'discover') {
    if (!objectiveById(event.objectiveId) || next.discovered.includes(event.objectiveId)) return { state: next, changed: false, rewards: [] };
    next.discovered.push(event.objectiveId);
    return { state: next, changed: true, rewards: [] };
  }
  if (event.type !== 'complete' || !objectiveAvailable(next, event.objectiveId)) return { state: next, changed: false, rewards: [] };
  next.completed.push(event.objectiveId);
  next.discovered = unique([...next.discovered, event.objectiveId]);
  if (event.routeChoice && event.chapterId) next.routeChoices[event.chapterId] = event.routeChoice;
  const chapter = campaignChapters.find((item) => item.objectives.some((objective) => objective.id === event.objectiveId));
  const rewards = [];
  if (chapter && chapterComplete(next, chapter.id) && !next.rewardsClaimed.includes(chapter.reward)) {
    next.rewardsClaimed.push(chapter.reward);
    next.worldFlags.push(chapter.reward);
    rewards.push(chapter.reward);
  }
  return { state: next, changed: true, rewards };
}

