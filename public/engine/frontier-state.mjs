import { rangerMaps, rangerJobs, rangerWeapons, rangerExpeditions, selectionStamps, frontierFlags, rangerEncounterIds } from '../content/frontier.mjs';

const known = (list, ids) => [...new Set((Array.isArray(list) ? list : []).filter((id) => ids.includes(id)))];
const finite = (n, fallback, low, high) => typeof n === 'number' && Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback;

export function createFrontierState() {
  return { version: 1, active: false, mapId: 'town', position: { x: 1600, y: 1770 }, visited: ['town'], jobs: [], completed: [], flags: [], cleared: [], stamps: [], seeds: 0, gear: ['seedshot'], weapon: 'seedshot', selected: false, trialBest: 0, activeRoute: null, expeditions: {} };
}

export function validateFrontier(value) {
  const base = createFrontierState();
  if (!value || typeof value !== 'object') return base;
  const mapId = Object.hasOwn(rangerMaps, value.mapId) ? value.mapId : 'town';
  const map = rangerMaps[mapId];
  const gear = known(value.gear, [...Object.keys(rangerWeapons), 'courier-boots']);
  if (!gear.includes('seedshot')) gear.unshift('seedshot');
  const expeditions = {};
  for (const [id, route] of Object.entries(rangerExpeditions)) {
    const saved = value.expeditions?.[id];
    if (!saved || typeof saved !== 'object') continue;
    expeditions[id] = {
      checkpoint: route.checkpoints.filter((x) => x <= finite(saved.checkpoint, 110, 0, route.exitX)).at(-1) || 110,
      receipts: known(saved.receipts, route.receipts.map((_, i) => i)),
      flies: known(saved.flies, route.flies.map((_, i) => i)), complete: Boolean(saved.complete),
    };
  }
  const completed = known(value.completed, rangerJobs.map((job) => job.id));
  const flags = known(value.flags, frontierFlags);
  const trialBest = Math.floor(finite(value.trialBest, 0, 0, 8));
  const stamps = selectionStamps.filter((stamp) => stamp === 'footwork'
    ? trialBest >= 8
    : rangerJobs.some((job) => job.stamp === stamp && completed.includes(job.id)));
  return { ...base, active: Boolean(value.active), mapId,
    position: { x: finite(value.position?.x, map.spawn[0], 0, map.width), y: finite(value.position?.y, map.spawn[1], 0, map.height) },
    visited: known([...known(value.visited, Object.keys(rangerMaps)), mapId, 'town'], Object.keys(rangerMaps)),
    jobs: known(value.jobs, rangerJobs.map((job) => job.id)), completed, flags,
    cleared: known(value.cleared, rangerEncounterIds), stamps,
    seeds: Math.floor(finite(value.seeds, 0, 0, 99999)), gear,
    weapon: gear.includes(value.weapon) && Object.hasOwn(rangerWeapons, value.weapon) ? value.weapon : 'seedshot',
    selected: Boolean(value.selected) && selectionStamps.every((stamp) => stamps.includes(stamp)),
    trialBest,
    activeRoute: Object.hasOwn(rangerExpeditions, value.activeRoute) ? value.activeRoute : null, expeditions,
  };
}

export function acceptRangerJob(progress, jobId) {
  if (!rangerJobs.some((job) => job.id === jobId) || progress.jobs.includes(jobId)) return false;
  progress.jobs.push(jobId); return true;
}

export function claimRangerJob(progress, jobId) {
  const job = rangerJobs.find((entry) => entry.id === jobId);
  if (!job || !progress.jobs.includes(jobId) || progress.completed.includes(jobId) || !job.needs.every((flag) => progress.flags.includes(flag))) return false;
  progress.completed.push(jobId);
  progress.seeds = Math.min(99999, progress.seeds + job.reward);
  if (job.stamp && !progress.stamps.includes(job.stamp)) progress.stamps.push(job.stamp);
  if (job.gear && !progress.gear.includes(job.gear)) progress.gear.push(job.gear);
  return true;
}

export function addFrontierFlag(progress, flag) {
  if (!frontierFlags.includes(flag) || progress.flags.includes(flag)) return false;
  progress.flags.push(flag); return true;
}

export function equipRangerWeapon(progress, weapon) {
  if (!Object.hasOwn(rangerWeapons, weapon) || !progress.gear.includes(weapon)) return false;
  progress.weapon = weapon; return true;
}

export function buyRangerWeapon(progress, weapon) {
  const item = rangerWeapons[weapon];
  if (!item?.price || progress.gear.includes(weapon) || progress.seeds < item.price) return false;
  progress.seeds -= item.price; progress.gear.push(weapon); progress.weapon = weapon; return true;
}

export function recordFootwork(progress, survived) {
  progress.trialBest = Math.max(progress.trialBest, Math.min(8, Math.floor(survived)));
  if (progress.trialBest >= 8 && !progress.stamps.includes('footwork')) progress.stamps.push('footwork');
}

export function selectGrandVintage(progress) {
  if (progress.selected || !selectionStamps.every((stamp) => progress.stamps.includes(stamp))) return false;
  progress.selected = true; return true;
}
