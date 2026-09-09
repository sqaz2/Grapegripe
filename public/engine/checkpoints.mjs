import { missionDefinitions } from '../content/missions.mjs';
import { terrainDefinitions } from './terrain-data.mjs';

// Stable save IDs resolve to authored locations, never substring matches.
export const checkpointAnchors = Object.freeze(Object.fromEntries(Object.entries(missionDefinitions).map(([chapter, mission]) => {
  const exit = terrainDefinitions[chapter].exit;
  const anchors = { [`${chapter}-start`]: mission.anchor };
  for (const encounter of mission.encounters) anchors[`${chapter}-${encounter.id}`] = [encounter.position[0], encounter.position[1] + encounter.trigger + 35];
  const endId = { root: 'root-lift', vineway: 'vineway-bridge', press: 'press-platform', sourwood: 'sourwood-bloom' }[chapter];
  anchors[endId] = [exit[0], exit[1] + 85];
  if (chapter === 'root') anchors['root-restored'] = mission.anchor;
  if (chapter === 'vineway') {
    const passage = mission.props.find((prop) => prop.id === 'vineway-passage');
    anchors['vineway-side-passage'] = [passage.position[0], passage.position[1] + 72];
  }
  if (chapter === 'press') anchors['press-cork'] = [477, 830];
  if (chapter === 'sourwood') anchors['sourwood-boss'] = anchors['sourwood-gripe-maw'];
  return [chapter, Object.freeze(anchors)];
})));

export function checkpointId(chapter, id) {
  return Object.hasOwn(checkpointAnchors[chapter] || {}, id) ? id : `${chapter}-start`;
}

export function checkpointPosition(chapter, id, terrain, radius) {
  const [x, y] = checkpointAnchors[chapter][checkpointId(chapter, id)];
  return terrain.project({ x, y }, radius);
}
