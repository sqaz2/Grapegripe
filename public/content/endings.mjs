import { campaignChapters } from './campaign.mjs';

// Add an ending only when its playable scene and consequences exist.
export const endingDefinitions = Object.freeze([
  Object.freeze({
    id: 'grapegripe:vineyard-restored',
    title: 'The vineyard breathes again',
    requires: Object.freeze(campaignChapters.flatMap((chapter) => chapter.exitRequires)),
  }),
  Object.freeze({
    id: 'grapegripe:grand-vintage',
    title: 'Selected for the Grand Vintage',
    frontierRequires: Object.freeze(['character', 'craft', 'aroma', 'footwork']),
  }),
]);

export function eligibleEnding(campaign, id, frontier = null) {
  const definition = endingDefinitions.find((ending) => ending.id === id);
  if (definition?.frontierRequires) return Boolean(frontier?.selected && definition.frontierRequires.every((stamp) => frontier.stamps?.includes(stamp)));
  return Boolean(definition && definition.requires.every((objective) => campaign.completed.includes(objective)));
}
