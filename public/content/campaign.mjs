export const CAMPAIGN_SCHEMA_VERSION = 1;

export const campaignChapters = Object.freeze([
  {
    id: 'root',
    name: 'Root Cellar',
    exitRequires: ['root-companion', 'root-relay-west', 'root-relay-east', 'root-guard'],
    checkpoint: 'root-lift',
    reward: 'root-shortcut',
    objectives: [
      { id: 'root-companion', kind: 'rescue', target: 'companion-cage', requires: [] },
      { id: 'root-relay-west', kind: 'activate', target: 'relay-west', requires: ['root-companion'] },
      { id: 'root-relay-east', kind: 'activate', target: 'relay-east', requires: ['root-companion'] },
      { id: 'root-guard', kind: 'encounter', target: 'root-guard', requires: [] },
    ],
  },
  {
    id: 'vineway',
    name: 'Vineway',
    exitRequires: ['vineway-route', 'vineway-guardian'],
    checkpoint: 'vineway-bridge',
    reward: 'vineway-shortcut',
    objectives: [
      { id: 'vineway-route', kind: 'choose', target: 'vineway-fork', requires: [] },
      { id: 'vineway-guardian', kind: 'encounter', target: 'vineway-guardian', requires: ['vineway-route'] },
      { id: 'vineway-passage', kind: 'secret', target: 'vineway-passage', requires: ['vineway-route'], optional: true },
    ],
  },
  {
    id: 'press',
    name: 'Press Pit',
    exitRequires: ['press-cork-delivered', 'press-vent-west', 'press-vent-east'],
    checkpoint: 'press-platform',
    reward: 'press-restored',
    objectives: [
      { id: 'press-cork-found', kind: 'carry', target: 'press-cork', requires: [] },
      { id: 'press-cork-delivered', kind: 'deliver', target: 'press-socket', requires: ['press-cork-found'] },
      { id: 'press-vent-west', kind: 'strike', target: 'press-vent-west', requires: ['press-cork-delivered'] },
      { id: 'press-vent-east', kind: 'strike', target: 'press-vent-east', requires: ['press-cork-delivered'] },
    ],
  },
  {
    id: 'sourwood',
    name: 'Sourwood',
    exitRequires: ['sourwood-rescue', 'sourwood-route', 'sourwood-maw'],
    checkpoint: 'sourwood-bloom',
    reward: 'world-restored',
    objectives: [
      { id: 'sourwood-rescue', kind: 'rescue', target: 'sourwood-creature', requires: [] },
      { id: 'sourwood-route', kind: 'activate', target: 'sourwood-root', requires: ['sourwood-rescue'] },
      { id: 'sourwood-vent-west', kind: 'strike', target: 'maw-vent-west', requires: ['sourwood-route'] },
      { id: 'sourwood-vent-east', kind: 'strike', target: 'maw-vent-east', requires: ['sourwood-route'] },
      { id: 'sourwood-maw', kind: 'ultimate', target: 'gripe-maw', requires: ['sourwood-vent-west', 'sourwood-vent-east'] },
    ],
  },
]);

export const objectiveIds = Object.freeze(campaignChapters.flatMap((chapter) => chapter.objectives.map((objective) => objective.id)));
export const rewardIds = Object.freeze(campaignChapters.map((chapter) => chapter.reward));
export const chapterIds = Object.freeze(campaignChapters.map((chapter) => chapter.id));

export const chapterById = (id) => campaignChapters.find((chapter) => chapter.id === id);
export const objectiveById = (id) => campaignChapters.flatMap((chapter) => chapter.objectives).find((objective) => objective.id === id);

export function validateCampaign(chapters = campaignChapters) {
  const errors = [];
  const seen = new Set();
  for (const chapter of chapters) {
    if (!chapter.id || !chapter.objectives?.length) errors.push(`Invalid chapter ${chapter.id || '(missing id)'}`);
    const local = new Set(chapter.objectives.map((objective) => objective.id));
    for (const objective of chapter.objectives) {
      if (seen.has(objective.id)) errors.push(`Duplicate objective ${objective.id}`);
      seen.add(objective.id);
      for (const requirement of objective.requires || []) if (!local.has(requirement)) errors.push(`${objective.id} requires unknown ${requirement}`);
    }
    for (const requirement of chapter.exitRequires || []) if (!local.has(requirement)) errors.push(`${chapter.id} exit requires unknown ${requirement}`);
    const byId = new Map(chapter.objectives.map((objective) => [objective.id, objective]));
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
      if (visiting.has(id)) { errors.push(`${chapter.id} has circular requirements at ${id}`); return; }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const requirement of byId.get(id)?.requires || []) if (byId.has(requirement)) visit(requirement);
      visiting.delete(id); visited.add(id);
    };
    for (const id of local) visit(id);
  }
  return errors;
}
