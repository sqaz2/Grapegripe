import { campaignChapters } from './campaign.mjs';

// Add an ending only when its playable scene and consequences exist.
export const endingDefinitions = Object.freeze([
  Object.freeze({
    id: 'grapegripe:vineyard-restored',
    title: 'The vineyard breathes again',
    requires: Object.freeze(campaignChapters.flatMap((chapter) => chapter.exitRequires)),
  }),
]);

export function eligibleEnding(campaign, id) {
  const definition = endingDefinitions.find((ending) => ending.id === id);
  return Boolean(definition && definition.requires.every((objective) => campaign.completed.includes(objective)));
}
