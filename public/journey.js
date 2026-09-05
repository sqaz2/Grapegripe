import { Terrain } from './engine/terrain.mjs';
import { terrainDefinitions } from './engine/terrain-data.mjs';
import { createAnimator, advanceAnimator, sampleAnimation } from './engine/animation.mjs';
import { heroAtlas } from './engine/hero-atlas.mjs';
import { campaignChapters } from './content/campaign.mjs';
import { missionDefinitions, sideviewDefinition } from './content/missions.mjs';
import { applyCampaignEvent, chapterComplete, createCampaignState, objectiveAvailable } from './engine/campaign.mjs';
import { loadSave, newSave, removeSave, storeSave } from './engine/save.mjs';

const $ = (id) => document.getElementById(id);

const canvas = $('world');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const shell = $('game-shell');
const loadingScreen = $('loading-screen');
const startScreen = $('start-screen');
const startButton = $('start-button');
const continueButton = $('continue-button');
const hud = $('hud');
const healthFill = $('health-fill');
const energyCount = $('energy-count');
const bossHealth = $('boss-health');
const bossHealthFill = $('boss-health-fill');
const soundButton = $('sound-button');
const pauseButton = $('pause-button');
const mapButton = $('map-button');
const pauseScreen = $('pause-screen');
const resumeButton = $('resume-button');
const gameplayHelpToggle = $('gameplay-help-toggle');
const gameplayHelpState = $('gameplay-help-state');
const contextHelp = $('context-help');
const contextHelpCard = $('context-help-card');
const contextHelpTitle = $('context-help-title');
const contextHelpCopy = $('context-help-copy');
const contextHelpContinue = $('context-help-continue');
const mapScreen = $('map-screen');
const closeMapButton = $('close-map-button');
const guideButton = $('guide-button');
const guideScreen = $('field-guide-screen');
const closeGuideButton = $('close-guide-button');
const joystickZone = $('joystick-zone');
const joystickBase = $('joystick-base');
const joystickKnob = $('joystick-knob');
const tutorialFocus = $('tutorial-focus');
const actionCluster = $('action-cluster');
const attackButton = $('attack-button');
const dashButton = $('dash-button');
const companionButton = $('companion-button');
const upgradeScreen = $('upgrade-screen');
const endScreen = $('end-screen');
const finalScore = $('final-score');
const restartButton = $('restart-button');
const liveStatus = $('live-status');
const objectiveStrip = $('objective-strip');
const sideRouteNode = $('side-route-node');
const mapStamps = $('map-stamps');

const imagePaths = {
  root: './assets/root-cellar.webp',
  vineway: './assets/vineway.webp',
  press: './assets/arena.webp',
  sourwood: './assets/sourwood.webp',
  heroFront: './assets/grape-fighter.webp',
  heroBack: './assets/grape-fighter-back.webp',
  heroSide: './assets/grape-fighter-side.webp',
  heroWalk: './assets/hero-walk.webp',
  sourling: './assets/sourling.webp',
  moth: './assets/rumor-moth.webp',
  brute: './assets/thorn-brute.webp',
  boss: './assets/gripe-maw.webp',
  sideview: './assets/vineway-sideview.webp',
};

const regions = [
  {
    key: 'root',
    name: 'Root Cellar',
    tint: '#d9ff45',
    encounters: [
      { types: ['sourling', 'sourling', 'moth'] },
      { types: ['sourling', 'moth', 'sourling', 'brute'] },
      { types: ['moth', 'sourling', 'moth', 'brute'] },
    ],
  },
  {
    key: 'vineway',
    name: 'Vineway',
    tint: '#ffd462',
    encounters: [
      { types: ['moth', 'sourling', 'sourling'] },
      { types: ['moth', 'moth', 'sourling', 'brute'] },
      { types: ['sourling', 'brute', 'moth', 'sourling', 'moth'] },
    ],
  },
  {
    key: 'press',
    name: 'Press Pit',
    tint: '#ff5aa9',
    encounters: [
      { types: ['sourling', 'sourling', 'moth', 'sourling'] },
      { types: ['moth', 'brute', 'moth', 'brute'] },
      { types: ['brute', 'sourling', 'moth', 'sourling', 'brute'] },
    ],
  },
  {
    key: 'sourwood',
    name: 'Sourwood',
    tint: '#ba68ff',
    encounters: [
      { types: ['sourling', 'moth', 'sourling', 'moth'] },
      { types: ['brute', 'moth', 'brute', 'sourling'] },
      { types: ['boss', 'moth', 'sourling'] },
    ],
  },
];

const enemyTypes = {
  sourling: { image: 'sourling', hp: 4, speed: 74, damage: 12, radius: 19, height: 68, score: 8, straw: 11, behavior: 'charge' },
  moth: { image: 'moth', hp: 5, speed: 43, damage: 10, radius: 22, height: 74, score: 12, straw: 14, behavior: 'ranged' },
  brute: { image: 'brute', hp: 14, speed: 30, damage: 20, radius: 34, height: 112, score: 28, straw: 22, behavior: 'brute' },
  boss: { image: 'boss', hp: 82, speed: 25, damage: 24, radius: 51, height: 164, score: 150, straw: 100, behavior: 'boss' },
};

const images = {};
let assetsReady = false;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const readSaved = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeSaved = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Play remains available without browser storage. */ } };
const tutorialDone = readSaved('grape-gripe-journey-tutorial') === 'done';
const terrainDebug = new URLSearchParams(location.search).has('terrain');
const terrains = new Map();

let viewport = { width: 0, height: 0, dpr: 1, zoom: 1 };
let accumulator = 0;
let lastFrame = performance.now();
let nextId = 1;
let audioContext = null;
let masterGain = null;
let regionDrone = null;

const input = {
  joystickId: null,
  joyX: 0,
  joyY: 0,
  joyOriginX: 0,
  joyOriginY: 0,
  keys: new Set(),
  tapTarget: null,
  route: [],
  attackHeld: false,
};

const state = {
  mode: 'loading',
  returnMode: 'playing',
  sound: true,
  time: 0,
  score: 0,
  energy: 0,
  regionIndex: 0,
  pendingRegion: 0,
  encounterIndex: 0,
  regionClear: false,
  travelTimer: 0,
  regionIntro: 0,
  clearTimer: 0,
  terrain: null,
  guidance: { route: [], timer: 0, revision: -1 },
  shake: 0,
  flash: 0,
  lastStraw: 0,
  maxStraw: 100,
  tutorial: tutorialDone ? 2 : 0,
  upgrades: { power: 0, speed: 0, shield: 0 },
  world: { width: 1, height: 1 },
  camera: { x: 0, y: 0 },
  hero: null,
  gate: null,
  secret: null,
  enemies: [],
  bolts: [],
  hostileBolts: [],
  pickups: [],
  particles: [],
  shockwaves: [],
  spawnQueue: [],
  ambience: [],
  ultimate: null,
  campaign: createCampaignState(),
  checkpoint: { chapterId: 'root', anchorId: 'root-start' },
  mission: null,
  carried: null,
  contextTarget: null,
  sideview: null,
  helpEnabled: readSaved('grape-gripe-gameplay-help') !== 'off',
  helpReturnMode: 'playing',
  activeHelp: null,
  bossFinale: null,
  endingSeen: false,
  persistenceAvailable: true,
};

const contextHelpDefinitions = Object.freeze({
  'press-cork': {
    title: 'Cork secured',
    copy: 'Carry it to the glowing socket. You can still fire.',
    announcement: 'Cork secured. Carry it to the glowing socket.',
  },
  'sideview-controls': {
    title: 'Climb the Vineway',
    copy: 'Push up to jump. Hold the green vine button to swing. Release to fly.',
    announcement: 'Push up to jump. Hold the green vine button to swing, then release.',
  },
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function viewZoom() {
  return viewport.zoom;
}

function announce(message) {
  liveStatus.textContent = '';
  requestAnimationFrame(() => { liveStatus.textContent = message; });
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function directionVector(direction) {
  const angle = direction * Math.PI / 4;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function setDirection(hero, x, y) {
  if (Math.hypot(x, y) < 0.08) return;
  hero.direction = (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8;
  hero.facingX = x;
  hero.facingY = y;
}

function currentTerrainData() {
  return terrainDefinitions[regions[state.regionIndex].key];
}

function asPoint(value) {
  return { x: value[0], y: value[1] };
}

function currentMissionDefinition() {
  return missionDefinitions[regions[state.regionIndex].key];
}

function objectiveComplete(id) {
  return state.campaign.completed.includes(id);
}

function saveProgress(anchorId = `${regions[state.regionIndex].key}-start`, chapterId = regions[state.regionIndex].key) {
  const envelope = newSave();
  envelope.campaign = state.campaign;
  envelope.checkpoint = { chapterId, anchorId };
  envelope.run = { score: state.score, energy: state.energy, upgrades: { ...state.upgrades }, endingSeen: state.endingSeen };
  envelope.preferences.sound = state.sound;
  const stored = storeSave(envelope);
  state.persistenceAvailable = Boolean(stored);
  if (stored) state.checkpoint = stored.checkpoint;
  return Boolean(stored);
}

function completeObjective(objectiveId, options = {}) {
  const result = applyCampaignEvent(state.campaign, {
    type: 'complete', objectiveId,
    chapterId: regions[state.regionIndex].key,
    routeChoice: options.routeChoice,
  });
  if (!result.changed) return false;
  state.campaign = result.state;
  state.score += options.score ?? 55;
  state.energy += options.energy ?? 4;
  state.lastStraw = clamp(state.lastStraw + (options.straw ?? 14), 0, state.maxStraw);
  state.shockwaves.push({ x: options.x ?? state.hero.x, y: options.y ?? state.hero.y, radius: 10, max: 145, life: 0.75, color: '#d9ff45' });
  burstParticles(options.x ?? state.hero.x, options.y ?? state.hero.y, '#d9ff45', 28, 185);
  sound('clear');
  vibrate([12, 24, 22]);
  saveProgress(options.anchorId);
  updateRouteUI();
  updateObjectiveUI();
  return true;
}

function applySavedRun(save) {
  state.campaign = createCampaignState(save?.campaign);
  state.checkpoint = save?.checkpoint || { chapterId: 'root', anchorId: 'root-start' };
  state.score = save?.run?.score || 0;
  state.energy = save?.run?.energy || 0;
  state.upgrades = { power: 0, speed: 0, shield: 0, ...(save?.run?.upgrades || {}) };
  state.endingSeen = Boolean(save?.run?.endingSeen);
  state.sound = save?.preferences?.sound !== false;
  soundButton.setAttribute('aria-pressed', String(state.sound));
  soundButton.setAttribute('aria-label', state.sound ? 'Turn sound off' : 'Turn sound on');
}

function applyUpgradeStats() {
  const hero = state.hero;
  hero.damage = 2.2 + state.upgrades.power * 0.95;
  hero.speed = 150 + state.upgrades.speed * 17;
  hero.attackRate = 1 + state.upgrades.speed * 0.1;
  hero.dashMaxCooldown = Math.max(1.25, 2.1 - state.upgrades.speed * 0.17);
  hero.maxHealth = 100 + state.upgrades.shield * 18;
  hero.health = hero.maxHealth;
}

function moveActor(entity, dx, dy) {
  const result = state.terrain.move(entity, dx, dy, entity.footRadius);
  const oldX = entity.x, oldY = entity.y;
  entity.x = result.x;
  entity.y = result.y;
  if (Math.abs(result.x - oldX) < 0.001) entity.vx = 0;
  if (Math.abs(result.y - oldY) < 0.001) entity.vy = 0;
  return result;
}

function configureWorld() {
  const key = regions[state.regionIndex].key;
  const definition = terrainDefinitions[key];
  state.world = { width: definition.width, height: definition.height };
  if (!terrains.has(key)) terrains.set(key, new Terrain(definition));
  state.terrain = terrains.get(key);
  seedAmbience();
  updateCamera(1);
}

function resize() {
  viewport.width = shell.clientWidth;
  viewport.height = shell.clientHeight;
  viewport.dpr = Math.min(devicePixelRatio || 1, 2);
  viewport.zoom = clamp(Math.min(viewport.width / 430, viewport.height / 860), 0.76, 1.2);
  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Resize the view, never actor coordinates, terrain, gates or projectiles.
  updateCamera(1);
  clearInput();
}

function seedAmbience() {
  const count = clamp(Math.round(state.world.width * state.world.height / 65000), 18, 46);
  state.ambience = Array.from({ length: count }, () => ({
    x: Math.random() * state.world.width,
    y: Math.random() * state.world.height,
    r: 0.8 + Math.random() * 2.8,
    phase: Math.random() * Math.PI * 2,
    speed: 0.22 + Math.random() * 0.55,
    drift: (Math.random() - 0.5) * 12,
    gold: Math.random() > 0.84,
  }));
}

function resetHero() {
  state.hero = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    direction: 6,
    facingX: 0,
    facingY: -1,
    health: 100,
    maxHealth: 100,
    speed: 150,
    damage: 2.2,
    attackRate: 1,
    attackCooldown: 0,
    attackAnim: 0,
    combo: 0,
    comboWindow: 0,
    dashCooldown: 0,
    dashMaxCooldown: 2.1,
    dashTime: 0,
    dashX: 0,
    dashY: -1,
    invulnerable: 0,
    shieldPulse: 0,
    footRadius: 14,
    animator: createAnimator(),
    walkCycle: 0,
    trail: [],
  };
}

function resetGame(options = {}) {
  const continuing = Boolean(options.continueSave);
  state.time = 0;
  state.score = 0;
  state.energy = 0;
  state.lastStraw = 0;
  state.regionIndex = 0;
  state.pendingRegion = 0;
  state.upgrades = { power: 0, speed: 0, shield: 0 };
  state.campaign = createCampaignState();
  state.checkpoint = { chapterId: 'root', anchorId: 'root-start' };
  state.endingSeen = false;
  state.tutorial = readSaved('grape-gripe-journey-tutorial') === 'done' ? 2 : 0;
  state.clearTimer = 0;
  accumulator = 0;
  clearInput();
  resetHero();
  if (continuing) applySavedRun(options.continueSave);
  else removeSave();
  applyUpgradeStats();
  const chapterIndex = Math.max(0, regions.findIndex((region) => region.key === state.checkpoint.chapterId));
  enterRegion(chapterIndex, true, state.checkpoint.anchorId);
  if (!continuing) saveProgress('root-start');
}

function showGameControls(show) {
  hud.hidden = !show;
  soundButton.hidden = !show;
  pauseButton.hidden = !show;
  mapButton.hidden = !show;
  joystickZone.hidden = !show;
  actionCluster.hidden = !show;
  tutorialFocus.hidden = !show || state.tutorial !== 0;
}

function syncGameplayHelp() {
  const enabled = Boolean(state.helpEnabled);
  gameplayHelpToggle.setAttribute('aria-checked', String(enabled));
  gameplayHelpToggle.setAttribute('aria-label', `Gameplay help ${enabled ? 'on' : 'off'}`);
  gameplayHelpState.textContent = enabled ? 'ON' : 'OFF';
}

function configureSideviewControls(active) {
  actionCluster.classList.toggle('sideview-controls', active);
  joystickZone.classList.toggle('sideview-controls', active);
  if (active) attackButton.setAttribute('aria-label', 'Hold to grab a vine');
  else attackButton.setAttribute('aria-label', 'Attack');
}

function showContextHelp(id) {
  const definition = contextHelpDefinitions[id];
  if (!definition || !state.helpEnabled || readSaved(`grape-gripe-help-${id}`) === 'seen') return false;
  clearInput();
  state.helpReturnMode = state.mode;
  state.activeHelp = id;
  state.mode = 'help';
  contextHelpCard.dataset.tip = id;
  contextHelpTitle.textContent = definition.title;
  contextHelpCopy.textContent = definition.copy;
  contextHelp.hidden = false;
  showGameControls(false);
  announce(definition.announcement);
  return true;
}

function dismissContextHelp(markSeen = true) {
  if (state.mode !== 'help' || !state.activeHelp) return false;
  if (markSeen) writeSaved(`grape-gripe-help-${state.activeHelp}`, 'seen');
  clearInput();
  state.mode = state.helpReturnMode;
  state.activeHelp = null;
  contextHelp.hidden = true;
  const playing = state.mode === 'playing' || state.mode === 'sideview';
  showGameControls(playing);
  if (state.mode === 'sideview') mapButton.hidden = true;
  accumulator = 0;
  lastFrame = performance.now();
  return true;
}

function toggleGameplayHelp() {
  state.helpEnabled = !state.helpEnabled;
  writeSaved('grape-gripe-gameplay-help', state.helpEnabled ? 'on' : 'off');
  syncGameplayHelp();
}

function hideOverlays() {
  startScreen.hidden = true;
  pauseScreen.hidden = true;
  contextHelp.hidden = true;
  state.activeHelp = null;
  mapScreen.hidden = true;
  guideScreen.hidden = true;
  upgradeScreen.hidden = true;
  endScreen.hidden = true;
}

function enterRegion(index, fresh = false, anchorId = null) {
  clearInput();
  state.regionIndex = index;
  state.pendingRegion = index;
  state.mode = 'playing';
  state.encounterIndex = 0;
  state.regionClear = false;
  state.regionIntro = 2.3;
  state.clearTimer = 0;
  state.gate = null;
  state.enemies = [];
  state.bolts = [];
  state.hostileBolts = [];
  state.pickups = [];
  state.particles = [];
  state.shockwaves = [];
  state.spawnQueue = [];
  state.ultimate = null;
  state.carried = null;
  state.contextTarget = null;
  state.sideview = null;
  configureSideviewControls(false);
  state.bossFinale = null;
  state.guidance = { route: [], timer: 0, revision: -1 };
  hideOverlays();
  configureWorld();
  state.terrain.setGates();
  const data = currentTerrainData();
  const mission = currentMissionDefinition();
  state.mission = {
    props: mission.props.map((prop) => ({ ...prop, ...asPoint(prop.position), pulse: Math.random() * Math.PI * 2 })),
    encounters: mission.encounters.map((encounter) => ({ ...encounter, ...asPoint(encounter.position), triggered: Boolean(encounter.objectiveId && objectiveComplete(encounter.objectiveId)), cleared: Boolean(encounter.objectiveId && objectiveComplete(encounter.objectiveId)) })),
  };
  if (state.endingSeen && regions[index].key === 'sourwood') {
    const rematch = state.mission.encounters.find((encounter) => encounter.id === 'gripe-maw');
    if (rematch) Object.assign(rematch, { objectiveId: null, triggered: false, cleared: false, rematch: true });
  }
  if (regions[index].key === 'press' && objectiveComplete('press-cork-found') && !objectiveComplete('press-cork-delivered')) state.carried = 'press-cork';
  let spawn = asPoint(mission.anchor || data.spawn);
  if (anchorId?.includes('lift') || anchorId?.includes('bridge') || anchorId?.includes('platform') || anchorId?.includes('bloom')) spawn = state.terrain.project({ x: data.exit[0], y: data.exit[1] + 85 }, state.hero.footRadius) || spawn;
  if (anchorId === 'vineway-side-passage') {
    const passage = mission.props.find((prop) => prop.id === 'vineway-passage');
    spawn = state.terrain.project({ x: passage.position[0], y: passage.position[1] + 72 }, state.hero.footRadius) || spawn;
  }
  Object.assign(state.hero, spawn, {
    vx: 0, vy: 0, direction: 6, facingX: 0, facingY: -1,
    dashTime: 0, attackAnim: 0, trail: [], animator: createAnimator(),
  });
  if (!fresh) state.hero.health = Math.min(state.hero.maxHealth, state.hero.health + 28);
  state.secret = { ...asPoint(data.secret), collected: false, phase: Math.random() * Math.PI * 2 };
  updateCamera(1);
  updateRouteUI();
  updateTutorialUI();
  showGameControls(true);
  tuneDrone();
  updateUI();
  updateObjectiveUI();
  announce(`${regions[index].name}. Follow the living markers.`);
}

function beginTravel() {
  if (state.mode !== 'clearing') return;
  clearInput();
  if (state.regionIndex >= regions.length - 1) {
    finishGame(true);
    return;
  }
  state.mode = 'travel';
  state.pendingRegion = state.regionIndex + 1;
  state.checkpoint = { chapterId: regions[state.pendingRegion].key, anchorId: `${regions[state.pendingRegion].key}-start` };
  saveProgress(state.checkpoint.anchorId, state.checkpoint.chapterId);
  state.travelTimer = prefersReducedMotion ? 0.8 : 2.65;
  showGameControls(false);
  sound('travel');
  announce(`Traveling to ${regions[state.pendingRegion].name}.`);
}

function completeRegion() {
  const chapterId = regions[state.regionIndex].key;
  if (state.regionClear || !chapterComplete(state.campaign, chapterId)) return;
  state.regionClear = true;
  state.score += 75 + state.regionIndex * 25;
  state.energy += 5;
  state.lastStraw = clamp(state.lastStraw + 22, 0, state.maxStraw);
  sound('clear');
  burstParticles(state.hero.x, state.hero.y, regions[state.regionIndex].tint, 38, 210);
  state.shockwaves.push({ x: state.hero.x, y: state.hero.y, radius: 18, max: 170, life: 0.8, color: regions[state.regionIndex].tint });
  state.mode = 'clearing';
  state.clearTimer = 0.52;
  clearInput();
  showGameControls(false);
  updateRouteUI();
}

function initializeSound() {
  if (audioContext) {
    if (audioContext.state === 'suspended') audioContext.resume();
    return;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioContext = new AudioCtor({ latencyHint: 'interactive' });
  masterGain = audioContext.createGain();
  masterGain.gain.value = state.sound ? 0.17 : 0;
  masterGain.connect(audioContext.destination);

  regionDrone = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  regionDrone.type = 'sawtooth';
  regionDrone.frequency.value = 43.65;
  filter.type = 'lowpass';
  filter.frequency.value = 118;
  filter.Q.value = 4.2;
  droneGain.gain.value = 0.045;
  lfo.frequency.value = 0.13;
  lfoGain.gain.value = 21;
  lfo.connect(lfoGain).connect(filter.frequency);
  regionDrone.connect(filter).connect(droneGain).connect(masterGain);
  regionDrone.start();
  lfo.start();
}

function tuneDrone() {
  if (!audioContext || !regionDrone) return;
  const frequencies = [43.65, 49, 38.89, 41.2];
  regionDrone.frequency.cancelScheduledValues(audioContext.currentTime);
  regionDrone.frequency.linearRampToValueAtTime(frequencies[state.regionIndex], audioContext.currentTime + 0.8);
}

function tone(frequency, duration = 0.12, type = 'sine', volume = 0.14, endFrequency = frequency, delay = 0) {
  if (!audioContext || !state.sound) return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function sound(name) {
  if (name === 'attack') tone(340, 0.09, 'triangle', 0.1, 145);
  if (name === 'heavy') { tone(170, 0.18, 'square', 0.12, 58); tone(520, 0.11, 'triangle', 0.08, 180, 0.03); }
  if (name === 'hit') tone(108, 0.07, 'square', 0.08, 62);
  if (name === 'hurt') tone(91, 0.23, 'sawtooth', 0.14, 42);
  if (name === 'dash') tone(145, 0.19, 'sine', 0.11, 680);
  if (name === 'collect') tone(410 + Math.min(state.energy, 12) * 18, 0.11, 'sine', 0.07, 760);
  if (name === 'secret') { tone(330, 0.22, 'triangle', 0.1, 660); tone(660, 0.28, 'sine', 0.09, 990, 0.16); }
  if (name === 'clear') { tone(300, 0.18, 'triangle', 0.1, 460); tone(500, 0.28, 'triangle', 0.11, 740, 0.14); }
  if (name === 'travel') { tone(92, 0.7, 'sine', 0.1, 620); tone(246, 0.5, 'triangle', 0.07, 920, 0.18); }
  if (name === 'ultimate') {
    tone(58, 0.95, 'sawtooth', 0.2, 360);
    tone(430, 0.5, 'square', 0.08, 72, 0.35);
    tone(780, 0.6, 'triangle', 0.12, 110, 0.48);
  }
  if (name === 'win') { tone(220, 0.3, 'triangle', 0.12, 440); tone(440, 0.45, 'triangle', 0.12, 880, 0.2); }
}

function nearestEnemy(origin = state.hero, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.spawn < 0.7) continue;
    const d = distance(origin, enemy);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function propReady(prop) {
  if (prop.kind === 'lift') return chapterComplete(state.campaign, regions[state.regionIndex].key);
  if (prop.kind === 'cork') return !state.carried && !objectiveComplete('press-cork-delivered');
  if (prop.kind === 'socket') return state.carried === 'press-cork' && objectiveAvailable(state.campaign, prop.objectiveId);
  if (prop.kind === 'passage') return objectiveAvailable(state.campaign, prop.objectiveId) || objectiveComplete(prop.objectiveId);
  if (prop.kind.startsWith('route-')) return objectiveAvailable(state.campaign, prop.objectiveId);
  return prop.objectiveId ? objectiveAvailable(state.campaign, prop.objectiveId) : false;
}

function updateContextTarget() {
  if (!state.mission || state.mode !== 'playing') { state.contextTarget = null; return; }
  let best = null;
  let bestDistance = Infinity;
  for (const prop of state.mission.props) {
    if (!propReady(prop)) continue;
    const d = distance(prop, state.hero);
    if (d <= prop.radius + 26 && d < bestDistance) { best = prop; bestDistance = d; }
  }
  state.contextTarget = best;
  attackButton.classList.toggle('is-context', Boolean(best));
  attackButton.setAttribute('aria-label', best ? 'Use nearby object' : 'Attack');
}

function startSideview() {
  clearInput();
  state.mode = 'sideview';
  state.sideview = {
    x: sideviewDefinition.spawn.x, y: sideviewDefinition.spawn.y,
    vx: 0, vy: 0, grounded: false, checkpointX: sideviewDefinition.spawn.x,
    cameraX: 0, direction: 1, dashTime: 0, dashCooldown: 0, actionCooldown: 0, finishTimer: 0,
    standingPlatformId: null, coyote: 0, jumpBuffer: 0, jumpLatch: false,
    grappleIndex: null, grappleLength: 0, grappleMiss: 0,
  };
  state.contextTarget = null;
  attackButton.classList.remove('is-context');
  configureSideviewControls(true);
  showGameControls(true);
  mapButton.hidden = true;
  companionButton.disabled = true;
  announce('A hidden passage. Keep moving toward the light.');
  showContextHelp('sideview-controls');
}

function finishSideview() {
  if (!state.sideview || state.sideview.finishTimer > 0) return;
  completeObjective('vineway-passage', { score: 180, energy: 15, straw: 30, x: state.hero.x, y: state.hero.y, anchorId: 'vineway-side-passage' });
  state.sideview.finishTimer = 0.75;
  sound('secret');
}

function useContextTarget() {
  const prop = state.contextTarget;
  if (!prop || !propReady(prop)) return false;
  if (prop.kind === 'lift') { completeRegion(); return true; }
  if (prop.kind === 'passage') { startSideview(); return true; }
  if (prop.kind.startsWith('route-')) {
    completeObjective(prop.objectiveId, { routeChoice: prop.routeChoice, x: prop.x, y: prop.y, score: prop.routeChoice === 'bridge' ? 75 : 55 });
    return true;
  }
  if (prop.kind === 'cork') {
    if (!objectiveComplete(prop.objectiveId)) completeObjective(prop.objectiveId, { x: prop.x, y: prop.y, score: 45, energy: 2 });
    state.carried = 'press-cork';
    sound('secret');
    showContextHelp('press-cork');
    return true;
  }
  if (prop.kind === 'socket' && state.carried === 'press-cork') {
    state.carried = null;
    completeObjective(prop.objectiveId, { x: prop.x, y: prop.y, score: 90, energy: 6, anchorId: 'press-cork' });
    return true;
  }
  if (prop.objectiveId) {
    completeObjective(prop.objectiveId, { x: prop.x, y: prop.y });
    return true;
  }
  return false;
}

function sideviewAction() {
  if (state.mode !== 'sideview' || !state.sideview) return false;
  const side = state.sideview;
  if (side.grappleIndex !== null) return true;
  if (side.actionCooldown > 0) return false;
  side.actionCooldown = 0.24;
  let nearestIndex = -1;
  let nearestDistance = 370;
  for (let index = 0; index < sideviewDefinition.vines.length; index += 1) {
    const vine = sideviewDefinition.vines[index];
    const d = Math.hypot(side.x - vine.x, side.y - vine.y);
    if (vine.y < side.y - 36 && d < nearestDistance) { nearestDistance = d; nearestIndex = index; }
  }
  if (nearestIndex >= 0) {
    const vine = sideviewDefinition.vines[nearestIndex];
    side.grappleIndex = nearestIndex;
    side.grappleLength = clamp(nearestDistance, 96, vine.length);
    side.grounded = false;
    side.standingPlatformId = null;
    burstParticles(vine.x, vine.y, '#d9ff45', 14, 135);
    sound('secret'); vibrate(12);
  } else {
    side.grappleMiss = 0.28;
    burstParticles(side.x + side.direction * 46, side.y - 48, '#d9ff45', 8, 95);
    sound('attack');
  }
  return true;
}

function attack() {
  if (state.mode === 'sideview') return sideviewAction();
  if (state.mode !== 'playing' || !state.hero || state.hero.attackCooldown > 0 || state.ultimate) return false;
  updateContextTarget();
  if (state.contextTarget && useContextTarget()) return true;
  const hero = state.hero;
  const target = nearestEnemy(hero, 340);
  let vector = directionVector(hero.direction);
  if (target) {
    const length = distance(hero, target) || 1;
    vector = { x: (target.x - hero.x) / length, y: (target.y - hero.y) / length };
    setDirection(hero, vector.x, vector.y);
  }

  if (hero.comboWindow > 0) hero.combo = (hero.combo + 1) % 3;
  else hero.combo = 0;
  const heavy = hero.combo === 2;
  hero.comboWindow = 0.52;
  hero.attackCooldown = (heavy ? 0.36 : 0.25) / hero.attackRate;
  hero.attackAnim = heavy ? 0.34 : 0.22;

  state.bolts.push({
    id: nextId++,
    x: hero.x + vector.x * 24,
    y: hero.y - 20 + vector.y * 24,
    vx: vector.x * (heavy ? 470 : 555),
    vy: vector.y * (heavy ? 470 : 555),
    radius: (heavy ? 15 : 9),
    damage: hero.damage * (heavy ? 2.25 : 1),
    life: heavy ? 1.05 : 0.72,
    targetId: target?.id || null,
    heavy,
    spin: Math.random() * Math.PI,
  });
  burstParticles(hero.x + vector.x * 32, hero.y - 18 + vector.y * 30, heavy ? '#ffcd54' : '#d9ff45', heavy ? 11 : 5, heavy ? 125 : 70);
  state.shake = Math.max(state.shake, heavy ? 5 : 1.6);
  sound(heavy ? 'heavy' : 'attack');
  if (heavy) vibrate(18);
  if (state.tutorial === 1) {
    state.tutorial = 2;
    writeSaved('grape-gripe-journey-tutorial', 'done');
    updateTutorialUI();
  }
  return true;
}

function dash() {
  if (state.mode === 'sideview' && state.sideview) {
    const side = state.sideview;
    if (side.dashCooldown > 0 || side.finishTimer > 0) return;
    let direction = Math.sign(input.joyX) || side.direction || 1;
    side.direction = direction;
    side.dashTime = 0.24;
    side.dashCooldown = 1.1;
    side.vx = direction * 540;
    if (!side.grounded) side.vy = Math.min(side.vy, -110);
    sound('dash'); vibrate(16);
    return;
  }
  if (state.mode !== 'playing' || state.hero.dashCooldown > 0 || state.ultimate) return;
  const hero = state.hero;
  let x = input.joyX;
  let y = input.joyY;
  if (Math.hypot(x, y) < 0.18) ({ x, y } = directionVector(hero.direction));
  const length = Math.hypot(x, y) || 1;
  hero.dashX = x / length;
  hero.dashY = y / length;
  setDirection(hero, hero.dashX, hero.dashY);
  hero.dashTime = 0.23;
  hero.invulnerable = 0.34;
  hero.dashCooldown = hero.dashMaxCooldown;
  hero.trail = [];
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 12, max: 70, life: 0.38, color: '#bd82ed' });
  burstParticles(hero.x, hero.y, '#bd82ed', 16, 155);
  sound('dash');
  vibrate(16);
}

function unleashGripe() {
  if (state.mode !== 'playing' || !objectiveComplete('root-companion') || state.lastStraw < state.maxStraw || state.ultimate) return;
  state.lastStraw = 0;
  state.ultimate = { time: 0, fired: false };
  state.hero.invulnerable = 1.7;
  state.shake = 8;
  sound('ultimate');
  vibrate([25, 35, 55, 45, 80]);
  updateUI();
  announce('The Grape Gripe is unleashed.');
}

function fireUltimate() {
  if (!state.ultimate || state.ultimate.fired) return;
  state.ultimate.fired = true;
  const hero = state.hero;
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 18, max: 900, life: 1.05, color: '#d9ff45' });
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 10, max: 680, life: 0.8, color: '#ff4fa3' });
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.stunned = 2.4;
    enemy.telegraph = 0; enemy.attackPending = false; enemy.lungeTime = 0;
    hitEnemy(enemy, 9 + state.upgrades.power * 2.5, true);
  }
  for (const bolt of state.hostileBolts) bolt.dead = true;
  burstParticles(hero.x, hero.y, '#d9ff45', 65, 320);
  burstParticles(hero.x, hero.y, '#ff4fa3', 42, 250);
  state.shake = prefersReducedMotion ? 5 : 24;
  state.flash = 0.6;
}

function spawnEnemy(typeName, anchor = asPoint(currentTerrainData().encounters[state.encounterIndex])) {
  const spec = enemyTypes[typeName];
  const regionScale = 1 + state.regionIndex * 0.14;
  const footRadius = { sourling: 10, moth: 12, brute: 21, boss: 28 }[typeName];
  let position = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = state.terrain.project({ x: anchor.x + (Math.random() - 0.5) * 190, y: anchor.y + (Math.random() - 0.25) * 95 }, footRadius);
    if (!candidate || distance(candidate, state.hero) < 58) continue;
    if (state.terrain.findPath(candidate, state.hero, footRadius).length) { position = candidate; break; }
  }
  // Authored anchors are safe; a finite fallback prevents invisible stuck waves.
  position ||= state.terrain.project(anchor, footRadius);
  if (!position || !state.terrain.findPath(position, state.hero, footRadius).length) return false;
  const enemy = {
    id: nextId++, type: typeName, ...position, vx: 0, vy: 0,
    hp: Math.ceil(spec.hp * regionScale), maxHp: Math.ceil(spec.hp * regionScale),
    speed: spec.speed, damage: spec.damage * (1 + state.regionIndex * 0.08),
    radius: spec.radius, footRadius, height: spec.height, score: spec.score,
    straw: spec.straw, behavior: spec.behavior, image: spec.image,
    facing: Math.random() > 0.5 ? 1 : -1, age: 0, spawn: 0,
    attackCooldown: 0.65 + Math.random() * 0.8,
    telegraph: 0, attackPending: false, lungeTime: 0, lungeX: 0, lungeY: 0,
    touchCooldown: 0, hitFlash: 0, stunned: 0, summoned: false, dead: false,
    route: [], navTimer: 0, navRevision: -1,
  };
  state.enemies.push(enemy);
  burstParticles(enemy.x, enemy.y, typeName === 'boss' ? '#ffae45' : '#a55be2', typeName === 'boss' ? 30 : 11, 115);
  state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 10, max: enemy.radius * 2.3, life: 0.58, color: typeName === 'boss' ? '#ffae45' : '#bd82ed' });
  return true;
}

function triggerEncounter(encounter) {
  const anchor = { x: encounter.x, y: encounter.y };
  const y = anchor.y - 96;
  const segments = state.terrain.spansAt(y).map(([left, right]) => ({ a: { x: left, y }, b: { x: right, y }, radius: 4 }));
  state.terrain.setGates(segments);
  state.gate = { y, segments, clearTimer: 0, active: true, encounter };
  encounter.triggered = true;
  input.tapTarget = null; input.route = [];
  const routeChoice = state.campaign.routeChoices.vineway;
  const roster = encounter.id === 'vineway-guardian' && routeChoice === 'long' ? ['moth', 'sourling'] : encounter.types;
  state.spawnQueue = roster.map((type, index) => ({ type, delay: index * 0.38, anchor, retries: 0 }));
  if (encounter.id === 'gripe-maw') {
    state.lastStraw = state.maxStraw;
    state.bossFinale = { phase: 'core', time: 0, fired: false };
  }
  state.shockwaves.push({ ...anchor, radius: 12, max: 95, life: 0.75, color: '#ff4c70' });
  announce(encounter.id === 'gripe-maw' ? 'The Gripe Maw opens. Break it with the Grape Gripe.' : 'A thorn gate closes. Clear the path.');
}

function spawnHostileBolt(enemy, angle, speed = 155) {
  state.hostileBolts.push({
    x: enemy.x,
    y: enemy.y - enemy.radius * 0.25,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: enemy.type === 'boss' ? 9 : 7,
    damage: enemy.damage,
    life: 4.5,
    dead: false,
  });
}

function executeEnemyAttack(enemy) {
  const hero = state.hero;
  const angle = Math.atan2(hero.y - enemy.y, hero.x - enemy.x);
  if (enemy.behavior === 'ranged') {
    spawnHostileBolt(enemy, angle, 170);
    enemy.attackCooldown = 1.65 + Math.random() * 0.45;
  } else if (enemy.behavior === 'boss') {
    for (let i = -2; i <= 2; i += 1) spawnHostileBolt(enemy, angle + i * 0.22, 142);
    if (enemy.hp < enemy.maxHp * 0.48 && !enemy.summoned) {
      enemy.summoned = true;
      spawnEnemy('sourling', { x: enemy.x - 45, y: enemy.y + 70 });
      spawnEnemy('moth', { x: enemy.x + 45, y: enemy.y + 90 });
    }
    enemy.attackCooldown = 2.05;
  } else {
    enemy.lungeX = Math.cos(angle);
    enemy.lungeY = Math.sin(angle);
    enemy.lungeTime = enemy.behavior === 'brute' ? 0.42 : 0.27;
    enemy.attackCooldown = enemy.behavior === 'brute' ? 1.85 : 1.28;
  }
  burstParticles(enemy.x, enemy.y, enemy.type === 'boss' ? '#ff4c70' : '#df52ff', enemy.type === 'boss' ? 15 : 7, 90);
  enemy.attackPending = false;
}

function hitEnemy(enemy, damage, ultimate = false) {
  if (enemy.dead) return;
  const finaleBoss = enemy.type === 'boss' && regions[state.regionIndex].key === 'sourwood';
  const rematch = finaleBoss && state.gate?.encounter?.id === 'gripe-maw' && state.gate.encounter.rematch;
  if (finaleBoss && !rematch && !objectiveAvailable(state.campaign, 'sourwood-maw')) {
    enemy.hitFlash = 0.08;
    state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: enemy.radius, max: enemy.radius * 1.35, life: 0.22, color: '#ff4c70' });
    return;
  }
  if (finaleBoss) damage = ultimate ? enemy.hp + 1 : damage * 0.34;
  enemy.hp -= damage;
  if (finaleBoss && !ultimate) enemy.hp = Math.max(1, enemy.hp);
  enemy.hitFlash = 0.12;
  const angle = Math.atan2(enemy.y - state.hero.y, enemy.x - state.hero.x);
  enemy.vx += Math.cos(angle) * (ultimate ? 155 : 48);
  enemy.vy += Math.sin(angle) * (ultimate ? 155 : 48);
  state.lastStraw = clamp(state.lastStraw + (ultimate ? 0 : 2.4), 0, state.maxStraw);
  burstParticles(enemy.x, enemy.y, enemy.type === 'boss' ? '#ffae45' : '#d9ff45', ultimate ? 15 : 7, ultimate ? 165 : 95);
  state.shake = Math.max(state.shake, enemy.type === 'boss' ? 5 : 2.5);
  sound('hit');
  if (enemy.hp <= 0) killEnemy(enemy);
}

function explodeBolt(bolt, directTarget) {
  const radius = 78;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy === directTarget) continue;
    if (Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) < radius) hitEnemy(enemy, bolt.damage * 0.58);
  }
  state.shockwaves.push({ x: bolt.x, y: bolt.y, radius: 8, max: radius, life: 0.42, color: '#ffcc54' });
  burstParticles(bolt.x, bolt.y, '#ffcc54', 19, 180);
}

function killEnemy(enemy) {
  enemy.dead = true;
  state.score += enemy.score;
  state.lastStraw = clamp(state.lastStraw + enemy.straw, 0, state.maxStraw);
  const count = enemy.type === 'boss' ? 12 : enemy.type === 'brute' ? 4 : 2;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.PI * 2 * i / count + Math.random() * 0.5;
    state.pickups.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * (40 + Math.random() * 75),
      vy: Math.sin(angle) * (40 + Math.random() * 75),
      age: 0,
      life: 8,
      spin: Math.random() * Math.PI * 2,
    });
  }
  state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 10, max: enemy.radius * 2.8, life: 0.52, color: enemy.type === 'boss' ? '#ffae45' : '#a45add' });
  burstParticles(enemy.x, enemy.y, enemy.type === 'boss' ? '#ffae45' : '#8e42d0', enemy.type === 'boss' ? 58 : 20, enemy.type === 'boss' ? 275 : 155);
  if (enemy.type === 'boss') state.shake = prefersReducedMotion ? 6 : 22;
  if (!state.campaign.mastered.includes(enemy.type)) {
    state.campaign.mastered.push(enemy.type);
    saveProgress();
  }
  if (enemy.type === 'boss' && regions[state.regionIndex].key === 'sourwood') {
    completeObjective('sourwood-maw', { x: enemy.x, y: enemy.y, score: 300, energy: 20, straw: 0, anchorId: 'sourwood-boss' });
    state.bossFinale = { phase: 'payoff', time: 0, fired: true };
  }
}

function damageHero(amount) {
  const hero = state.hero;
  if (!hero || hero.invulnerable > 0 || state.mode !== 'playing') return;
  const reduction = 1 - state.upgrades.shield * 0.14;
  hero.health = Math.max(0, hero.health - Math.round(amount * reduction));
  hero.invulnerable = 0.68;
  hero.shieldPulse = 0.48;
  state.flash = 0.35;
  state.shake = prefersReducedMotion ? 4 : 11;
  state.lastStraw = clamp(state.lastStraw + 12, 0, state.maxStraw);
  burstParticles(hero.x, hero.y, '#ff4c70', 18, 190);
  sound('hurt');
  vibrate([18, 28, 24]);
  if (hero.health <= 0) finishGame(false);
}

function updateMovement(dt) {
  const hero = state.hero;
  let x = input.joyX, y = input.joyY;
  if (input.keys.has('arrowleft') || input.keys.has('a')) x -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) x += 1;
  if (input.keys.has('arrowup') || input.keys.has('w')) y -= 1;
  if (input.keys.has('arrowdown') || input.keys.has('s')) y += 1;
  if (Math.hypot(x, y) >= 0.1) { input.tapTarget = null; input.route = []; }
  else if (input.route.length) {
    while (input.route.length && distance(hero, input.route[0]) < 10) input.route.shift();
    if (input.route.length) {
      const waypoint = input.route[0], length = distance(hero, waypoint) || 1;
      x = (waypoint.x - hero.x) / length; y = (waypoint.y - hero.y) / length;
    } else input.tapTarget = null;
  }
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  if (length > 0.12) setDirection(hero, x, y);
  const dashing = hero.dashTime > 0;
  const movementSpeed = hero.speed * (state.carried ? 0.76 : 1);
  if (dashing) {
    hero.dashTime = Math.max(0, hero.dashTime - dt);
    hero.vx = hero.dashX * movementSpeed * 3.45;
    hero.vy = hero.dashY * movementSpeed * 3.45;
    hero.trail.unshift({ x: hero.x, y: hero.y, direction: hero.direction, life: 0.28, pose: sampleAnimation(hero.animator, hero.direction) });
    if (hero.trail.length > 5) hero.trail.pop();
  } else {
    const easing = 1 - Math.exp(-dt * 12);
    hero.vx += (x * movementSpeed - hero.vx) * easing;
    hero.vy += (y * movementSpeed - hero.vy) * easing;
  }
  const movement = moveActor(hero, hero.vx * dt, hero.vy * dt);
  advanceAnimator(hero.animator, { distance: movement.moved, dt, dashing, attacking: hero.attackAnim > 0, hurt: hero.shieldPulse > 0, ultimate: Boolean(state.ultimate) });
  hero.walkCycle = hero.animator.phase * Math.PI * 2;
  if (movement.moved > 0.2 && state.tutorial === 0) { state.tutorial = 1; updateTutorialUI(); }
  for (const trail of hero.trail) trail.life -= dt;
  hero.trail = hero.trail.filter((trail) => trail.life > 0);
}

function enemySteering(enemy, dt) {
  enemy.navTimer -= dt;
  const hero = state.hero;
  if (state.terrain.segmentClear(enemy, hero, enemy.footRadius)) return hero;
  if (enemy.navTimer <= 0 || enemy.navRevision !== state.terrain.revision) {
    enemy.route = state.terrain.findPath(enemy, hero, enemy.footRadius);
    enemy.navTimer = 0.55 + (enemy.id % 5) * 0.08;
    enemy.navRevision = state.terrain.revision;
  }
  while (enemy.route.length && distance(enemy, enemy.route[0]) < 10) enemy.route.shift();
  return enemy.route[0] || enemy;
}

function updateEnemies(dt) {
  const hero = state.hero;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.age += dt;
    enemy.spawn = Math.min(1, enemy.spawn + dt * 3.1);
    enemy.attackCooldown -= dt;
    enemy.touchCooldown -= dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.stunned = Math.max(0, enemy.stunned - dt);

    if (enemy.stunned > 0 || enemy.spawn < 0.72) {
      enemy.vx *= Math.exp(-dt * 7); enemy.vy *= Math.exp(-dt * 7);
    } else if (enemy.telegraph > 0) {
      enemy.telegraph -= dt;
      enemy.vx *= Math.exp(-dt * 10);
      enemy.vy *= Math.exp(-dt * 10);
      if (enemy.telegraph <= 0 && enemy.attackPending) executeEnemyAttack(enemy);
    } else if (enemy.lungeTime > 0) {
      enemy.lungeTime -= dt;
      const multiplier = enemy.behavior === 'brute' ? 5.2 : 4.2;
      enemy.vx = enemy.lungeX * enemy.speed * multiplier;
      enemy.vy = enemy.lungeY * enemy.speed * multiplier;
    } else {
      const waypoint = enemySteering(enemy, dt);
      const dx = waypoint.x - enemy.x;
      const dy = waypoint.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const sight = state.terrain.segmentClear(enemy, hero, 0);
      const heroDistance = distance(enemy, hero);
      let desired = waypoint === enemy ? 0 : enemy.speed;
      if (sight && enemy.behavior === 'ranged') desired = heroDistance > 190 ? enemy.speed : heroDistance < 135 ? -enemy.speed * 0.7 : 0;
      if (sight && enemy.behavior === 'boss') desired = heroDistance > 175 ? enemy.speed : 0;
      const easing = 1 - Math.exp(-dt * 4.2);
      enemy.vx += (nx * desired - enemy.vx) * easing;
      enemy.vy += (ny * desired - enemy.vy) * easing;

      const attackDistance = enemy.behavior === 'ranged' ? 330 : enemy.behavior === 'boss' ? 390 : enemy.behavior === 'brute' ? 155 : 110;
      if (enemy.attackCooldown <= 0 && distance(enemy, hero) < attackDistance && sight) {
        enemy.attackPending = true;
        enemy.telegraph = enemy.behavior === 'boss' ? 0.78 : enemy.behavior === 'brute' ? 0.65 : enemy.behavior === 'ranged' ? 0.48 : 0.4;
      }
    }

    moveActor(enemy, enemy.vx * dt, enemy.vy * dt);
    if (Math.abs(enemy.vx) > 2) enemy.facing = enemy.vx > 0 ? -1 : 1;
    if (distance(enemy, hero) < enemy.radius + 22 && enemy.touchCooldown <= 0 && enemy.spawn >= 0.72 && enemy.stunned <= 0) {
      damageHero(enemy.damage);
      if (state.mode !== 'playing') return;
      enemy.touchCooldown = 0.9;
      const angle = Math.atan2(hero.y - enemy.y, hero.x - enemy.x);
      hero.vx += Math.cos(angle) * 175;
      hero.vy += Math.sin(angle) * 175;
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
}

function updateBolts(dt) {
  for (const bolt of state.bolts) {
    bolt.life -= dt;
    bolt.spin += dt * 10;
    const target = bolt.targetId ? state.enemies.find((enemy) => enemy.id === bolt.targetId && !enemy.dead) : null;
    if (target) {
      const angle = Math.atan2(target.y - bolt.y, target.x - bolt.x);
      const speed = Math.hypot(bolt.vx, bolt.vy);
      const desiredX = Math.cos(angle) * speed;
      const desiredY = Math.sin(angle) * speed;
      const homing = 1 - Math.exp(-dt * (bolt.heavy ? 2.5 : 5.5));
      bolt.vx += (desiredX - bolt.vx) * homing;
      bolt.vy += (desiredY - bolt.vy) * homing;
    }
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (bolt.heavy) {
      const vent = state.mission?.props.find((prop) => prop.kind === 'vent' && prop.objectiveId && objectiveAvailable(state.campaign, prop.objectiveId) && distance(bolt, prop) < bolt.radius + prop.radius);
      if (vent) {
        completeObjective(vent.objectiveId, { x: vent.x, y: vent.y, score: 70, energy: 5 });
        explodeBolt(bolt, null);
        bolt.life = 0;
      }
    }
    if (bolt.life <= 0) continue;
    for (const enemy of state.enemies) {
      if (enemy.dead || distance(bolt, enemy) > bolt.radius + enemy.radius) continue;
      hitEnemy(enemy, bolt.damage);
      if (bolt.heavy) explodeBolt(bolt, enemy);
      bolt.life = 0;
      break;
    }
  }
  state.bolts = state.bolts.filter((bolt) => bolt.life > 0);

  for (const bolt of state.hostileBolts) {
    bolt.life -= dt;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (!bolt.dead && distance(bolt, state.hero) < bolt.radius + 21) {
      damageHero(bolt.damage);
      bolt.dead = true;
    }
  }
  state.hostileBolts = state.hostileBolts.filter((bolt) => bolt.life > 0 && !bolt.dead);
}

function updatePickups(dt) {
  for (const pickup of state.pickups) {
    pickup.age += dt;
    pickup.life -= dt;
    pickup.spin += dt * 5;
    pickup.vx *= Math.exp(-dt * 2.8);
    pickup.vy *= Math.exp(-dt * 2.8);
    const d = distance(pickup, state.hero);
    if (d < 175) {
      const pull = 1 - Math.exp(-dt * (d < 70 ? 14 : 5));
      pickup.vx += ((state.hero.x - pickup.x) * 6 - pickup.vx) * pull;
      pickup.vy += ((state.hero.y - 16 - pickup.y) * 6 - pickup.vy) * pull;
    }
    const origin = state.terrain.project(pickup, 4);
    if (origin) Object.assign(pickup, state.terrain.move(origin, pickup.vx * dt, pickup.vy * dt, 4));
    if (d < 28) {
      pickup.life = 0;
      state.energy += 1;
      state.score += 4;
      state.lastStraw = clamp(state.lastStraw + 2, 0, state.maxStraw);
      sound('collect');
    }
  }
  state.pickups = state.pickups.filter((pickup) => pickup.life > 0);

  if (state.secret && !state.secret.collected && distance(state.secret, state.hero) < 42) {
    state.secret.collected = true;
    state.energy += 10;
    state.score += 120;
    state.lastStraw = clamp(state.lastStraw + 28, 0, state.maxStraw);
    sound('secret');
    vibrate([18, 40, 32]);
    burstParticles(state.secret.x, state.secret.y, '#ffd462', 35, 220);
    state.shockwaves.push({ x: state.secret.x, y: state.secret.y, radius: 8, max: 130, life: 0.75, color: '#ffd462' });
    announce('Secret cork found.');
  }
}

function burstParticles(x, y, color, count, speed) {
  const actual = prefersReducedMotion ? Math.ceil(count * 0.45) : count;
  for (let i = 0; i < actual; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.35 + Math.random() * 0.65);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      gravity: 18 + Math.random() * 45,
      life: 0.35 + Math.random() * 0.55,
      maxLife: 0.9,
      size: 1.5 + Math.random() * 4.5,
      color,
      grape: Math.random() > 0.72,
    });
  }
}

function updateEffects(dt) {
  state.shake = Math.max(0, state.shake - dt * 25);
  state.flash = Math.max(0, state.flash - dt * 2.5);
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.exp(-dt * 1.3);
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  for (const wave of state.shockwaves) {
    wave.life -= dt;
    wave.radius += (wave.max - wave.radius) * (1 - Math.exp(-dt * 7));
  }
  state.shockwaves = state.shockwaves.filter((wave) => wave.life > 0);
}

function updateEncounter(dt) {
  if (!state.gate) {
    const encounter = state.mission?.encounters.find((item) => {
      if (item.triggered || item.cleared) return false;
      if (item.objectiveId && !objectiveAvailable(state.campaign, item.objectiveId)) return false;
      return distance(item, state.hero) <= item.trigger;
    });
    if (encounter) triggerEncounter(encounter);
  }
  for (const spawn of state.spawnQueue) spawn.delay -= dt;
  const ready = state.spawnQueue.filter((spawn) => spawn.delay <= 0);
  state.spawnQueue = state.spawnQueue.filter((spawn) => spawn.delay > 0);
  for (const spawn of ready) {
    if (!spawnEnemy(spawn.type, spawn.anchor) && spawn.retries < 3) state.spawnQueue.push({ ...spawn, delay: 0.5, retries: spawn.retries + 1 });
  }
  if (state.gate?.active && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.gate.clearTimer += dt;
    if (state.gate.clearTimer > 0.55) {
      const encounter = state.gate.encounter;
      encounter.cleared = true;
      if (encounter.objectiveId && !objectiveComplete(encounter.objectiveId)) {
        completeObjective(encounter.objectiveId, { x: encounter.x, y: encounter.y, score: encounter.id === 'gripe-maw' ? 250 : 85, energy: 7, anchorId: `${regions[state.regionIndex].key}-${encounter.id}` });
      }
      state.encounterIndex++;
      state.lastStraw = clamp(state.lastStraw + 10, 0, state.maxStraw);
      state.energy += 3; state.score += 30;
      sound('clear');
      for (const segment of state.gate.segments) state.shockwaves.push({ x: (segment.a.x + segment.b.x) / 2, y: state.gate.y, radius: 8, max: 110, life: 0.75, color: '#d9ff45' });
      state.gate = null;
      state.terrain.setGates();
      updateRouteUI();
    }
  }
  const exit = state.mission?.props.find((prop) => prop.kind === 'lift');
  if (!state.gate && exit && chapterComplete(state.campaign, regions[state.regionIndex].key) && distance(state.hero, exit) < 48) completeRegion();
}

function updateUltimate(dt) {
  if (!state.ultimate) return;
  state.ultimate.time += dt;
  if (state.ultimate.time >= 0.42) fireUltimate();
  if (state.ultimate.time >= 1.48) state.ultimate = null;
}

function updateCamera(amount = 0.12) {
  if (!state.hero) return;
  const width = viewport.width / viewZoom(), height = viewport.height / viewZoom();
  const targetX = clamp(state.hero.x - width * 0.5, 0, Math.max(0, state.world.width - width));
  const targetY = clamp(state.hero.y - height * 0.61, 0, Math.max(0, state.world.height - height));
  state.camera.x = lerp(state.camera.x, targetX, amount);
  state.camera.y = lerp(state.camera.y, targetY, amount);
}

function sidePlatformsAt(x) {
  return sideviewDefinition.platforms.filter((platform) => x >= platform.x && x <= platform.x + platform.width);
}

function sidePlatformById(id) {
  return sideviewDefinition.platforms.find((platform) => platform.id === id) || null;
}

function sideGroundAt(x) {
  return sidePlatformsAt(x).sort((a, b) => b.y - a.y)[0] || null;
}

function sideLandingAt(x, oldY, nextY) {
  return sidePlatformsAt(x)
    .filter((platform) => oldY <= platform.y + 10 && nextY >= platform.y)
    .sort((a, b) => a.y - b.y)[0] || null;
}

function updateSideview(dt) {
  const side = state.sideview;
  if (!side) return;
  state.time += dt;
  side.dashCooldown = Math.max(0, side.dashCooldown - dt);
  side.actionCooldown = Math.max(0, side.actionCooldown - dt);
  side.dashTime = Math.max(0, side.dashTime - dt);
  side.grappleMiss = Math.max(0, side.grappleMiss - dt);
  if (side.finishTimer > 0) {
    side.finishTimer -= dt;
    updateEffects(dt);
    if (side.finishTimer <= 0) enterRegion(1, false, 'vineway-side-passage');
    return;
  }
  let xInput = input.joyX;
  if (input.keys.has('arrowleft') || input.keys.has('a')) xInput -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) xInput += 1;
  xInput = clamp(xInput, -1, 1);
  if (Math.abs(xInput) > 0.12) side.direction = Math.sign(xInput);

  const jumpHeld = input.joyY < -0.5 || input.keys.has('arrowup') || input.keys.has('w');
  if (jumpHeld && !side.jumpLatch) side.jumpBuffer = 0.14;
  side.jumpLatch = jumpHeld;
  side.jumpBuffer = Math.max(0, side.jumpBuffer - dt);
  side.coyote = side.grounded ? 0.12 : Math.max(0, side.coyote - dt);

  const grappleHeld = input.attackHeld || input.keys.has(' ');
  if (side.grappleIndex !== null && !grappleHeld) side.grappleIndex = null;
  if (grappleHeld && side.grappleIndex === null && side.actionCooldown <= 0) sideviewAction();

  if (side.jumpBuffer > 0 && (side.grounded || side.coyote > 0)) {
    side.jumpBuffer = 0;
    side.coyote = 0;
    side.grounded = false;
    side.standingPlatformId = null;
    side.vy = -455;
    state.shockwaves.push({ x: side.x, y: side.y, radius: 4, max: 42, life: 0.3, color: '#d9ff45' });
    sound('dash'); vibrate(8);
  }

  if (side.dashTime <= 0) {
    const speed = side.grounded ? 225 : 250;
    const response = side.grounded ? 13 : 7.5;
    side.vx += (xInput * speed - side.vx) * (1 - Math.exp(-dt * response));
  }
  side.vy += 970 * dt;

  if (side.grappleIndex !== null) {
    const vine = sideviewDefinition.vines[side.grappleIndex];
    const dx = side.x - vine.x;
    const dy = side.y - vine.y;
    const length = Math.hypot(dx, dy) || 1;
    const tangentX = dy / length;
    const tangentY = -dx / length;
    side.vx += tangentX * xInput * 430 * dt;
    side.vy += tangentY * xInput * 430 * dt;
    side.grappleLength = clamp(side.grappleLength + input.joyY * 105 * dt, 88, vine.length);
  }

  const support = sidePlatformById(side.standingPlatformId);
  const lookAhead = side.x + (side.direction || 1) * 34;
  const hasForwardFloor = support && sidePlatformsAt(lookAhead).some((platform) => Math.abs(platform.y - support.y) <= 82);
  if (side.grounded && Math.abs(xInput) > 0.3 && support && !hasForwardFloor) {
    side.vy = -330;
    side.grounded = false;
    side.standingPlatformId = null;
    state.shockwaves.push({ x: side.x, y: side.y, radius: 4, max: 38, life: 0.28, color: '#d9ff45' });
  }

  const oldX = side.x;
  const oldY = side.y;
  side.x = clamp(side.x + side.vx * dt, 24, sideviewDefinition.width - 24);
  let nextY = side.y + side.vy * dt;

  if (side.grappleIndex !== null) {
    const vine = sideviewDefinition.vines[side.grappleIndex];
    const dx = side.x - vine.x;
    const dy = nextY - vine.y;
    const length = Math.hypot(dx, dy) || 1;
    if (length > side.grappleLength) {
      const nx = dx / length;
      const ny = dy / length;
      side.x = vine.x + nx * side.grappleLength;
      nextY = vine.y + ny * side.grappleLength;
      const outwardSpeed = side.vx * nx + side.vy * ny;
      if (outwardSpeed > 0) {
        side.vx -= outwardSpeed * nx;
        side.vy -= outwardSpeed * ny;
      }
    }
  }

  const landing = side.vy >= 0 ? sideLandingAt(side.x, oldY, nextY) : null;
  side.grounded = false;
  if (landing) {
    nextY = landing.y;
    side.vy = 0;
    side.grounded = true;
    side.standingPlatformId = landing.id;
    side.grappleIndex = null;
  } else {
    side.standingPlatformId = null;
  }
  side.y = nextY;
  for (const checkpoint of sideviewDefinition.checkpoints) if (side.x >= checkpoint) side.checkpointX = checkpoint;
  if (side.y > 760) {
    side.x = side.checkpointX;
    const platform = sideGroundAt(side.x);
    side.y = platform?.y || sideviewDefinition.floor;
    side.vx = 0; side.vy = 0;
    side.grounded = Boolean(platform);
    side.standingPlatformId = platform?.id || null;
    side.grappleIndex = null;
    state.flash = 0.22;
    vibrate(20);
  }
  const moved = Math.hypot(side.x - oldX, side.y - oldY);
  advanceAnimator(state.hero.animator, { distance: moved, dt, dashing: side.dashTime > 0, attacking: false, hurt: false, ultimate: false });
  state.hero.direction = side.direction >= 0 ? 0 : 4;
  const sideScale = viewport.height / 720;
  const sideViewWidth = viewport.width / sideScale;
  side.cameraX = lerp(side.cameraX, clamp(side.x - sideViewWidth * 0.38, 0, Math.max(0, sideviewDefinition.width - sideViewWidth)), 1 - Math.exp(-dt * 6));
  if (side.x >= sideviewDefinition.exitX) finishSideview();
  updateEffects(dt);
  updateUI();
}

function update(dt) {
  if (!['playing', 'clearing', 'travel', 'start', 'sideview'].includes(state.mode)) return;
  if (state.mode === 'sideview') { updateSideview(dt); return; }
  state.time += dt;
  if (state.mode === 'clearing') {
    state.clearTimer -= dt;
    updateEffects(dt);
    if (state.clearTimer <= 0) beginTravel();
    return;
  }
  if (state.mode === 'travel') {
    state.travelTimer -= dt;
    updateEffects(dt);
    if (state.travelTimer <= 0) showUpgrade();
    return;
  }
  if (state.mode !== 'playing') return;

  const hero = state.hero;
  hero.attackCooldown = Math.max(0, hero.attackCooldown - dt);
  hero.attackAnim = Math.max(0, hero.attackAnim - dt);
  hero.comboWindow = Math.max(0, hero.comboWindow - dt);
  hero.dashCooldown = Math.max(0, hero.dashCooldown - dt);
  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  hero.shieldPulse = Math.max(0, hero.shieldPulse - dt);
  state.regionIntro = Math.max(0, state.regionIntro - dt);

  updateMovement(dt);
  updateContextTarget();
  updateEnemies(dt);
  if (state.mode !== 'playing') return;
  updateBolts(dt);
  if (state.mode !== 'playing') return;
  updatePickups(dt);
  updateEncounter(dt);
  updateUltimate(dt);
  if (state.bossFinale) state.bossFinale.time += dt;
  updateEffects(dt);
  updateCamera(1 - Math.exp(-dt * 7));
  if (input.attackHeld || input.keys.has(' ')) attack();
  updateUI();
}

function showUpgrade() {
  state.mode = 'upgrade';
  upgradeScreen.hidden = false;
  updateUpgradeDots();
  announce('Choose a power for the next region.');
}

function chooseUpgrade(type) {
  if (state.mode !== 'upgrade') return;
  state.upgrades[type] = clamp(state.upgrades[type] + 1, 0, 3);
  if (type === 'power') state.hero.damage += 0.95;
  if (type === 'speed') {
    state.hero.speed += 17;
    state.hero.attackRate += 0.1;
    state.hero.dashMaxCooldown = Math.max(1.25, state.hero.dashMaxCooldown - 0.17);
  }
  if (type === 'shield') {
    state.hero.maxHealth += 18;
    state.hero.health = Math.min(state.hero.maxHealth, state.hero.health + 35);
  }
  upgradeScreen.hidden = true;
  state.checkpoint = { chapterId: regions[state.pendingRegion].key, anchorId: `${regions[state.pendingRegion].key}-start` };
  saveProgress(state.checkpoint.anchorId, state.checkpoint.chapterId);
  enterRegion(state.pendingRegion);
}

function finishGame(won) {
  clearInput();
  state.clearTimer = 0;
  hideOverlays();
  state.mode = won ? 'won' : 'lost';
  showGameControls(false);
  endScreen.hidden = false;
  endScreen.classList.toggle('is-loss', !won);
  finalScore.textContent = Math.round(state.score).toLocaleString();
  $('ending-mark').textContent = won ? 'THE VINEYARD BREATHES AGAIN' : 'THE VINEYARD NEEDS ANOTHER TRY';
  if (won) {
    state.endingSeen = true;
    state.checkpoint = { chapterId: 'root', anchorId: 'root-restored' };
    saveProgress(state.checkpoint.anchorId, state.checkpoint.chapterId);
    sound('win');
    writeSaved('grape-gripe-best-score', String(Math.max(Number(readSaved('grape-gripe-best-score') || 0), state.score)));
    announce('The Sourwood is uncorked. Journey complete.');
  } else announce('The Gripevine got the last word.');
}

function pauseGame() {
  if (!['playing', 'clearing', 'travel', 'sideview'].includes(state.mode)) return;
  clearInput();
  state.returnMode = state.mode;
  state.mode = 'paused';
  pauseScreen.hidden = false;
  syncGameplayHelp();
  showGameControls(false);
  pauseButton.hidden = false;
  soundButton.hidden = false;
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  clearInput();
  state.mode = state.returnMode;
  pauseScreen.hidden = true;
  showGameControls(state.mode === 'playing' || state.mode === 'sideview');
  if (state.mode === 'sideview') mapButton.hidden = true;
  accumulator = 0;
  lastFrame = performance.now();
}

function openMap() {
  if (state.mode !== 'playing') return;
  clearInput();
  state.returnMode = 'playing';
  state.mode = 'map';
  mapScreen.hidden = false;
  showGameControls(false);
  mapButton.hidden = false;
  updateRouteUI();
  updateGuideUI();
}

function closeMap() {
  if (state.mode !== 'map') return;
  clearInput();
  state.mode = state.returnMode;
  mapScreen.hidden = true;
  accumulator = 0;
  showGameControls(true);
  lastFrame = performance.now();
}

function updateGuideUI() {
  document.querySelectorAll('[data-guide]').forEach((card) => card.classList.toggle('unlocked', state.campaign.mastered.includes(card.dataset.guide)));
}

function openGuide() {
  if (state.mode !== 'map') return;
  mapScreen.hidden = true;
  guideScreen.hidden = false;
  state.mode = 'guide';
  updateGuideUI();
}

function closeGuide() {
  if (state.mode !== 'guide') return;
  guideScreen.hidden = true;
  mapScreen.hidden = false;
  state.mode = 'map';
}

function updateTutorialUI() {
  tutorialFocus.hidden = state.mode !== 'playing' || state.tutorial !== 0;
  attackButton.classList.toggle('is-prompted', state.mode === 'playing' && state.tutorial === 1);
}

function updateRouteUI() {
  document.querySelectorAll('.route-pip').forEach((pip) => {
    const index = Number(pip.dataset.region);
    pip.classList.toggle('complete', chapterComplete(state.campaign, regions[index].key));
    pip.classList.toggle('active', index === state.regionIndex);
  });
  document.querySelectorAll('.wave-line').forEach((line, index) => line.classList.toggle('complete', chapterComplete(state.campaign, regions[index].key)));
  document.querySelectorAll('[data-map-region]').forEach((node) => {
    const index = Number(node.dataset.mapRegion);
    node.classList.toggle('complete', chapterComplete(state.campaign, regions[index].key));
    node.classList.toggle('active', index === state.regionIndex);
    const previousUnlocked = index === 0 || chapterComplete(state.campaign, regions[index - 1].key);
    node.classList.toggle('locked', !previousUnlocked);
    node.disabled = !state.endingSeen || !previousUnlocked;
  });
  sideRouteNode.classList.toggle('discovered', objectiveComplete('vineway-passage'));
  [...mapStamps.children].forEach((stamp, index) => {
    const rewards = ['root-shortcut', 'vineway-shortcut', 'press-restored', 'world-restored'];
    stamp.classList.toggle('unlocked', state.campaign.worldFlags.includes(rewards[index]));
  });
}

function updateObjectiveUI() {
  const chapter = campaignChapters[state.regionIndex];
  if (!chapter) return;
  const objectives = chapter.objectives;
  while (objectiveStrip.children.length < objectives.length) objectiveStrip.append(document.createElement('i'));
  [...objectiveStrip.children].forEach((slot, index) => {
    const objective = objectives[index];
    slot.hidden = !objective;
    if (!objective) return;
    slot.classList.toggle('complete', objectiveComplete(objective.id));
    slot.classList.toggle('available', objectiveAvailable(state.campaign, objective.id));
    slot.title = objective.kind;
  });
}

function updateUpgradeDots() {
  document.querySelectorAll('.upgrade-card').forEach((card) => {
    const level = state.upgrades[card.dataset.upgrade];
    card.querySelectorAll('.level-dots i').forEach((dot, index) => dot.classList.toggle('filled', index < level));
    card.disabled = level >= 3;
  });
}

function updateUI() {
  if (!state.hero) return;
  healthFill.style.width = `${100 * state.hero.health / state.hero.maxHealth}%`;
  energyCount.textContent = state.energy.toLocaleString();
  const boss = state.enemies.find((enemy) => enemy.type === 'boss' && !enemy.dead);
  bossHealth.hidden = !boss;
  objectiveStrip.hidden = Boolean(boss);
  if (boss) bossHealthFill.style.width = `${100 * boss.hp / boss.maxHp}%`;

  const dashRatio = state.mode === 'sideview' && state.sideview ? state.sideview.dashCooldown / 1.1 : state.hero.dashCooldown / state.hero.dashMaxCooldown;
  dashButton.style.setProperty('--cooldown', String(1 - dashRatio));
  dashButton.disabled = dashRatio > 0;
  const ready = state.mode === 'playing' && objectiveComplete('root-companion') && state.lastStraw >= state.maxStraw;
  companionButton.disabled = !ready;
  companionButton.classList.toggle('is-ready', ready);
  companionButton.style.setProperty('--charge', String(state.lastStraw / state.maxStraw));
  if (state.mode === 'playing') updateContextTarget();
}

function drawImageBottom(image, x, y, height, flip = 1, alpha = 1, rotation = 0, filter = 'none') {
  if (!image?.naturalWidth) return;
  const width = height * image.naturalWidth / image.naturalHeight;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(flip, 1);
  ctx.globalAlpha = alpha;
  ctx.filter = filter;
  ctx.drawImage(image, -width / 2, -height * 0.92, width, height);
  ctx.restore();
}

function drawShadow(x, y, width, alpha = 0.38) {
  const gradient = ctx.createRadialGradient(x, y, 1, x, y, width / 2);
  gradient.addColorStop(0, `rgba(5,2,10,${alpha})`);
  gradient.addColorStop(1, 'rgba(5,2,10,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground() {
  const image = images[regions[state.regionIndex].key];
  ctx.drawImage(image, 0, 0, state.world.width, state.world.height);
  const fog = ctx.createLinearGradient(0, 0, 0, state.world.height);
  fog.addColorStop(0, 'rgba(25,7,50,.08)');
  fog.addColorStop(0.5, 'rgba(12,4,28,.02)');
  fog.addColorStop(1, 'rgba(8,2,20,.12)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, state.world.width, state.world.height);

  for (const mote of state.ambience) {
    const alpha = 0.2 + (Math.sin(state.time * mote.speed + mote.phase) + 1) * 0.16;
    ctx.fillStyle = mote.gold ? `rgba(255,212,98,${alpha})` : `rgba(217,255,69,${alpha})`;
    ctx.beginPath();
    ctx.arc(mote.x + Math.sin(state.time * 0.35 + mote.phase) * mote.drift, mote.y, mote.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.campaign.worldFlags.includes('world-restored')) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const wash = ctx.createLinearGradient(0, 0, 0, state.world.height);
    wash.addColorStop(0, 'rgba(217,255,69,.07)'); wash.addColorStop(.55, 'rgba(106,228,75,.025)'); wash.addColorStop(1, 'rgba(255,212,98,.06)');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, state.world.width, state.world.height);
    for (let i = 0; i < 15; i++) {
      const y = 340 + i * 77;
      const x = 305 + ((i * 137 + state.regionIndex * 83) % 330);
      const r = 4 + Math.sin(state.time * 2 + i) * 1.2;
      ctx.fillStyle = i % 3 ? 'rgba(217,255,69,.62)' : 'rgba(255,212,98,.7)';
      ctx.shadowBlur = 13; ctx.shadowColor = ctx.fillStyle;
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * r, y + Math.sin(angle) * r, r, r * .42, angle, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawExit() {
  const { x, y } = asPoint(currentTerrainData().exit);
  const cleared = chapterComplete(state.campaign, regions[state.regionIndex].key) && !state.gate;
  const pulse = 0.5 + Math.sin(state.time * 4) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = cleared ? `rgba(217,255,69,${pulse + 0.25})` : 'rgba(160,108,192,.3)';
  ctx.lineWidth = 4;
  ctx.shadowBlur = cleared ? 28 : 8;
  ctx.shadowColor = cleared ? '#d9ff45' : '#7e439f';
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 34 + i * 16 + pulse * 8, 18 + i * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCork(x, y, scale = 1, rotation = -0.2) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
  const cork = ctx.createLinearGradient(-24, 0, 24, 0);
  cork.addColorStop(0, '#7c3d1d'); cork.addColorStop(0.25, '#d3914e'); cork.addColorStop(0.55, '#f0b96f'); cork.addColorStop(1, '#6b3018');
  ctx.fillStyle = cork; ctx.strokeStyle = '#3a1515'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-30, -15, 60, 30, 11); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(75,30,20,.7)'; ctx.lineWidth = 2;
  for (const line of [-18, 18]) { ctx.beginPath(); ctx.moveTo(line, -13); ctx.lineTo(line, 13); ctx.stroke(); }
  ctx.fillStyle = '#70351c'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMissionProps() {
  const mission = state.mission;
  if (!mission) return;
  if (regions[state.regionIndex].key === 'root') {
    const lift = mission.props.find((prop) => prop.kind === 'lift');
    for (const prop of mission.props.filter((item) => item.kind === 'relay')) {
      if (!objectiveComplete(prop.objectiveId)) continue;
      ctx.strokeStyle = 'rgba(217,255,69,.72)'; ctx.lineWidth = 5; ctx.shadowBlur = 17; ctx.shadowColor = '#d9ff45';
      ctx.setLineDash([8, 13]); ctx.lineDashOffset = -state.time * 22;
      ctx.beginPath(); ctx.moveTo(prop.x, prop.y); ctx.quadraticCurveTo(480, (prop.y + lift.y) / 2, lift.x, lift.y); ctx.stroke();
      ctx.setLineDash([]); ctx.shadowBlur = 0;
    }
  }
  for (const prop of mission.props) {
    const done = prop.objectiveId ? objectiveComplete(prop.objectiveId) : false;
    const ready = propReady(prop);
    if (prop.kind === 'cork' && (state.carried || objectiveComplete('press-cork-delivered'))) continue;
    const pulse = 1 + Math.sin(state.time * 4 + prop.pulse) * 0.06;
    ctx.save(); ctx.translate(prop.x, prop.y); ctx.scale(pulse, pulse);
    ctx.shadowBlur = ready ? 24 : 10;
    ctx.shadowColor = done ? '#d9ff45' : ready ? '#ffd462' : '#73319b';
    if (prop.kind === 'cage') {
      ctx.strokeStyle = done ? '#d9ff45' : '#7e3c8f'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -8, 32, done ? 0.35 : Math.PI, done ? Math.PI * 1.65 : Math.PI * 2); ctx.stroke();
      if (!done) { for (let x = -22; x <= 22; x += 11) { ctx.beginPath(); ctx.moveTo(x, -35); ctx.lineTo(x, 19); ctx.stroke(); } }
      ctx.fillStyle = done ? '#d9ff45' : '#b669dd'; ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI * 2); ctx.fill();
    } else if (prop.kind === 'relay') {
      ctx.fillStyle = done ? '#d9ff45' : ready ? '#aa5de0' : '#422151'; ctx.strokeStyle = done ? '#f4ffb0' : '#c78af1'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(24, -4); ctx.lineTo(12, 31); ctx.lineTo(-17, 31); ctx.lineTo(-25, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#32143f'; ctx.beginPath(); ctx.ellipse(0, 32, 36, 13, 0, 0, Math.PI * 2); ctx.fill();
    } else if (prop.kind.startsWith('route-')) {
      ctx.strokeStyle = ready ? '#ffd462' : '#724887'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      const direction = prop.kind === 'route-left' ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(-direction * 30, 22); ctx.lineTo(direction * 4, -8); ctx.lineTo(direction * 34, 18); ctx.stroke();
      ctx.fillStyle = ready ? '#ffd462' : '#724887'; ctx.beginPath(); ctx.moveTo(direction * 39, 18); ctx.lineTo(direction * 19, 10); ctx.lineTo(direction * 28, 32); ctx.closePath(); ctx.fill();
    } else if (prop.kind === 'passage') {
      ctx.strokeStyle = done ? '#d9ff45' : ready ? '#ffd462' : '#724887'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 12, 38, Math.PI, 0); ctx.lineTo(38, 32); ctx.moveTo(-38, 32); ctx.lineTo(-38, 12); ctx.stroke();
      ctx.fillStyle = `rgba(217,255,69,${done ? .32 : .12})`; ctx.beginPath(); ctx.ellipse(0, 18, 28, 34, 0, 0, Math.PI * 2); ctx.fill();
    } else if (prop.kind === 'cork') drawCork(0, -10, 0.85);
    else if (prop.kind === 'socket') {
      ctx.fillStyle = done ? '#87cb22' : '#4d2364'; ctx.strokeStyle = done ? '#d9ff45' : ready ? '#ffd462' : '#8b5aa3'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, 42, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -19, 18, 0, Math.PI * 2); ctx.stroke();
    } else if (prop.kind === 'vent') {
      ctx.strokeStyle = done ? '#d9ff45' : ready ? '#ffbd49' : '#60336f'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * Math.PI / 3 + state.time * (done ? 1.5 : 0)); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(28, 0); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = done ? '#d9ff45' : '#ff5b82'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    } else if (prop.kind === 'lift') {
      const open = chapterComplete(state.campaign, regions[state.regionIndex].key);
      ctx.strokeStyle = open ? '#d9ff45' : '#63347a'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(0, 0, 44, 25, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = open ? 'rgba(217,255,69,.3)' : 'rgba(75,34,94,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 18, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (ready && distance(prop, state.hero) < 180) {
      ctx.strokeStyle = '#fff8dc'; ctx.lineWidth = 4; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(0, -54, 13 + Math.sin(state.time * 6) * 3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffd462'; ctx.beginPath(); ctx.moveTo(-8, -75); ctx.lineTo(8, -75); ctx.lineTo(0, -61); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function drawCarried() {
  if (state.carried !== 'press-cork') return;
  drawCork(state.hero.x, state.hero.y - 112, 0.72, Math.sin(state.time * 4) * 0.08);
  const socket = state.mission?.props.find((prop) => prop.kind === 'socket' && !objectiveComplete(prop.objectiveId));
  if (!socket) return;
  const angle = Math.atan2(socket.y - state.hero.y, socket.x - state.hero.x);
  const pulse = prefersReducedMotion ? 1 : 1 + Math.sin(state.time * 6) * .12;
  ctx.save();
  ctx.translate(state.hero.x, state.hero.y - 76);
  ctx.rotate(angle);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ffd462'; ctx.shadowBlur = 18; ctx.shadowColor = '#ffd462';
  ctx.beginPath(); ctx.moveTo(49, 0); ctx.lineTo(29, -11); ctx.lineTo(34, 0); ctx.lineTo(29, 11); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawGate() {
  if (!state.gate?.active) return;
  const pulse = 0.72 + Math.sin(state.time * 7) * 0.18;
  ctx.save();
  ctx.strokeStyle = `rgba(255,76,112,${pulse})`;
  ctx.lineWidth = 6; ctx.shadowBlur = 18; ctx.shadowColor = '#ff4c70';
  for (const { a, b } of state.gate.segments) {
    const pieces = Math.max(2, Math.ceil((b.x - a.x) / 23));
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    for (let i = 1; i <= pieces; i++) {
      const x = lerp(a.x, b.x, i / pieces), y = a.y + Math.sin(i * 2.4 + state.time * 2) * 4;
      ctx.lineTo(x, y); ctx.lineTo(x - 6, y - 12); ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawSecret() {
  if (!state.secret || state.secret.collected) return;
  const pulse = 1 + Math.sin(state.time * 3 + state.secret.phase) * 0.12;
  ctx.save();
  ctx.translate(state.secret.x, state.secret.y);
  ctx.scale(pulse, pulse);
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#ffd462';
  ctx.fillStyle = '#a76a2d';
  ctx.strokeStyle = '#ffe894';
  ctx.lineWidth = 3;
  ctx.rotate(-0.22);
  ctx.beginPath();
  ctx.roundRect(-13, -22, 26, 44, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd462';
  ctx.beginPath();
  ctx.arc(0, -21, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const pulse = 1 + Math.sin(pickup.spin) * 0.16;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.scale(pulse, pulse);
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#d9ff45';
    ctx.fillStyle = '#d9ff45';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.arc(-5, 5, 4, 0, Math.PI * 2);
    ctx.arc(5, 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBolts() {
  for (const bolt of state.bolts) {
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.rotate(bolt.spin);
    ctx.shadowBlur = bolt.heavy ? 28 : 17;
    ctx.shadowColor = bolt.heavy ? '#ffcd54' : '#d9ff45';
    ctx.fillStyle = bolt.heavy ? '#ffcd54' : '#d9ff45';
    ctx.beginPath();
    ctx.arc(0, 0, bolt.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,220,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bolt.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4f7d12';
    ctx.beginPath();
    ctx.ellipse(0, -bolt.radius * 0.95, bolt.radius * 0.35, bolt.radius * 0.16, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const bolt of state.hostileBolts) {
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff4fa3';
    ctx.fillStyle = '#ff4fa3';
    ctx.beginPath();
    ctx.arc(0, 0, bolt.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb4d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bolt.radius * 1.55, state.time * 5, state.time * 5 + Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(enemy) {
  const spawnScale = 0.45 + enemy.spawn * 0.55;
  const bob = Math.sin(enemy.age * (enemy.type === 'moth' ? 7 : 4) + enemy.id) * (enemy.type === 'moth' ? 5 : 2);
  drawShadow(enemy.x, enemy.y + 4, enemy.height * 0.66 * spawnScale, 0.34 * enemy.spawn);
  if (enemy.telegraph > 0) {
    const ratio = clamp(enemy.telegraph / (enemy.behavior === 'boss' ? 0.78 : enemy.behavior === 'brute' ? 0.65 : enemy.behavior === 'ranged' ? 0.48 : 0.4), 0, 1);
    ctx.strokeStyle = `rgba(255,76,112,${0.55 + (1-ratio)*0.4})`;
    ctx.lineWidth = 3 + (1 - ratio) * 3;
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#ff4c70';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius * (1.3 + ratio * 1.5), 0, Math.PI * 2);
    ctx.stroke();
    const angle = Math.atan2(state.hero.y - enemy.y, state.hero.x - enemy.x);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + Math.cos(angle) * 80, enemy.y + Math.sin(angle) * 80);
    ctx.stroke();
  }
  const filter = enemy.hitFlash > 0 ? 'brightness(2) saturate(.3)' : enemy.stunned > 0 ? 'saturate(.55) hue-rotate(38deg)' : 'none';
  drawImageBottom(images[enemy.image], enemy.x, enemy.y + bob, enemy.height * spawnScale, enemy.facing, enemy.spawn, Math.sin(enemy.age * 2 + enemy.id) * 0.025, filter);
  if (enemy.hp < enemy.maxHp && enemy.spawn >= 1) {
    const width = enemy.height * 0.62;
    ctx.fillStyle = 'rgba(7,3,12,.78)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.height * 0.94, width, 6);
    ctx.fillStyle = enemy.type === 'boss' ? '#ffae45' : '#ff4c70';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.height * 0.94, width * Math.max(0, enemy.hp / enemy.maxHp), 6);
  }
}

const idleCapeSections = {
  0: [
    { x: 54, y: 148, width: 74, height: 94, direction: -1 },
    { x: 282, y: 151, width: 66, height: 94, direction: 1 },
  ],
  1: [{ x: 248, y: 133, width: 108, height: 122, direction: 1 }],
  2: [{ x: 224, y: 112, width: 138, height: 142, direction: 1 }],
  3: [{ x: 178, y: 108, width: 180, height: 151, direction: 1 }],
  4: [
    { x: 48, y: 116, width: 116, height: 145, direction: -1 },
    { x: 225, y: 116, width: 132, height: 145, direction: 1 },
  ],
};

function drawIdleCapeWind(pose, frameX, frameY, size, scale) {
  const bands = 7;
  const sourceX = pose.column * heroAtlas.cell;
  const sourceY = pose.row * heroAtlas.cell;
  const capeSections = idleCapeSections[pose.row] || [];

  // Redraw only the two loose cape edges in narrow horizontal bands. The feet,
  // body and silhouette anchor never move, while the lower cloth catches more wind.
  for (const section of capeSections) {
    const bandHeight = section.height / bands;
    for (let band = 0; band < bands; band += 1) {
      const progress = (band + 1) / bands;
      const sourceBandY = section.y + band * bandHeight;
      const breeze = Math.sin(state.time * 1.75 + band * 0.42)
        + Math.sin(state.time * 3.85 - band * 0.27) * 0.34;
      const lift = Math.sin(state.time * 2.35 + band * 0.63) * progress * 1.4;
      const drift = section.direction * breeze * (2.5 + progress * 8.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        frameX + section.x * scale,
        frameY + sourceBandY * scale,
        section.width * scale,
        bandHeight * scale + 1,
      );
      ctx.clip();
      ctx.drawImage(images.heroWalk, sourceX, sourceY, heroAtlas.cell, heroAtlas.cell,
        frameX + drift * scale, frameY + lift * scale, size, size);
      ctx.restore();
    }
  }

  // Draw the stable body everywhere except the two animated cape-edge windows.
  ctx.save();
  ctx.beginPath();
  ctx.rect(frameX - 2, frameY - 2, size + 4, size + 4);
  for (const section of capeSections) {
    ctx.rect(
      frameX + section.x * scale,
      frameY + section.y * scale,
      section.width * scale,
      section.height * scale,
    );
  }
  ctx.clip('evenodd');
  ctx.drawImage(images.heroWalk, sourceX, sourceY, heroAtlas.cell, heroAtlas.cell,
    frameX, frameY, size, size);
  ctx.restore();
}

function drawHeroAt(x, y, direction, alpha = 1, ghost = false, frozenPose = null) {
  const hero = state.hero;
  const pose = frozenPose || sampleAnimation(hero.animator, direction);
  const size = heroAtlas.worldSize;
  const scale = size / heroAtlas.cell;
  const attackProgress = hero.attackAnim > 0 ? hero.attackAnim / 0.34 : 0;
  const attackLean = ghost ? 0 : Math.sin(attackProgress * Math.PI) * 0.09;
  const idleMotion = pose.state === 'idle' && !ghost && !prefersReducedMotion;
  const idleBreath = idleMotion ? pose.idleBreath : 0;
  const lean = pose.state === 'dash' ? 0.12 : attackLean + (idleMotion ? pose.idleLean : 0);
  drawShadow(x, y + 4, 62, ghost ? 0.1 : 0.4);
  ctx.save();
  ctx.translate(x, y);
  // Scale from the planted-foot anchor so breathing never makes the boots float.
  ctx.scale(pose.flip * (1 - idleBreath * 0.45), 1 + idleBreath);
  ctx.rotate(lean);
  ctx.globalAlpha = alpha;
  ctx.filter = ghost ? 'saturate(1.3) hue-rotate(15deg)' : hero.invulnerable > 0 && Math.floor(hero.invulnerable * 18) % 2 ? 'brightness(1.75) saturate(.6)' : 'none';
  const frameX = -heroAtlas.anchor.x * scale;
  const frameY = -heroAtlas.anchor.y * scale;
  if (idleMotion) drawIdleCapeWind(pose, frameX, frameY, size, scale);
  else ctx.drawImage(images.heroWalk, pose.column * heroAtlas.cell, pose.row * heroAtlas.cell,
    heroAtlas.cell, heroAtlas.cell, frameX, frameY, size, size);
  ctx.restore();
}

function drawCompanion() {
  if (regions[state.regionIndex].key === 'root' && !objectiveComplete('root-companion')) return;
  const hero = state.hero;
  const pose = sampleAnimation(hero.animator, hero.direction);
  const funny = !prefersReducedMotion && pose.idleVariant === 'companion-bonk';
  const gagTime = funny ? pose.idleTime - 10.4 : 0;
  const hover = prefersReducedMotion ? 0 : Math.sin(state.time * 3.2) * 3;
  let x = hero.x + 43;
  let y = hero.y - 76 + hover;
  let tilt = 0;
  if (funny) {
    const approach = clamp(gagTime / 0.65, 0, 1);
    const returnTrip = clamp((gagTime - 2.15) / 0.6, 0, 1);
    const perch = Math.sin(clamp((gagTime - 0.5) / 0.38, 0, 1) * Math.PI) * 10;
    const blend = approach * (1 - returnTrip);
    x = lerp(hero.x + 43, hero.x + 5, blend);
    y = lerp(hero.y - 76 + hover, hero.y - 126 - perch, blend);
    tilt = Math.sin(gagTime * 11) * 0.18 * blend;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // Existing companion art has its own crop and transform, independent of gait.
  // Replace this crop with a dedicated companion atlas in Sol's animation pass.
  ctx.drawImage(images.heroFront, 427, 0, 179, 233, -17, -22, 34, 44);
  if (funny && gagTime > 0.68 && gagTime < 1.18) {
    const flash = 1 - Math.abs(gagTime - 0.93) / 0.25;
    ctx.globalAlpha = clamp(flash, 0, 1);
    ctx.strokeStyle = '#fff8dc';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i += 1) {
      const angle = i * Math.PI * 0.4 - Math.PI * 0.55;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 21, Math.sin(angle) * 21);
      ctx.lineTo(Math.cos(angle) * 31, Math.sin(angle) * 31);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHero() {
  const hero = state.hero;
  for (let i = hero.trail.length - 1; i >= 0; i -= 1) {
    const trail = hero.trail[i];
    drawHeroAt(trail.x, trail.y, trail.direction, trail.life * 0.46, true, trail.pose);
  }
  if (hero.shieldPulse > 0) {
    ctx.strokeStyle = `rgba(142,232,255,${hero.shieldPulse})`;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#8ee8ff';
    ctx.beginPath();
    ctx.ellipse(hero.x, hero.y - 34, 52, 67, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawHeroAt(hero.x, hero.y, hero.direction);
  drawCompanion();
}

function drawParticles() {
  for (const wave of state.shockwaves) {
    ctx.save();
    ctx.globalAlpha = clamp(wave.life * 1.8, 0, 1);
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 17;
    ctx.shadowColor = wave.color;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (const particle of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 9;
    ctx.shadowColor = particle.color;
    ctx.beginPath();
    if (particle.grape) ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    else ctx.ellipse(particle.x, particle.y, particle.size * 1.8, particle.size * 0.55, Math.atan2(particle.vy, particle.vx), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGuidance() {
  if (state.mode !== 'playing') return;
  const readyProp = state.mission?.props
    .filter((prop) => propReady(prop))
    .sort((a, b) => distance(a, state.hero) - distance(b, state.hero))[0];
  const readyEncounter = state.mission?.encounters.find((encounter) => !encounter.triggered && (!encounter.objectiveId || objectiveAvailable(state.campaign, encounter.objectiveId)));
  const destination = state.gate?.active ? nearestEnemy(state.hero)
    : readyProp || readyEncounter || asPoint(currentTerrainData().exit);
  if (!destination) return;
  const guide = state.guidance;
  if (state.time >= guide.timer || guide.revision !== state.terrain.revision) {
    guide.route = state.terrain.findPath(state.hero, destination, state.hero.footRadius);
    guide.timer = state.time + 0.5; guide.revision = state.terrain.revision;
  }
  while (guide.route.length > 1 && distance(state.hero, guide.route[0]) < 40) guide.route.shift();
  const target = guide.route[0] || destination;
  const sx = (target.x - state.camera.x) * viewZoom(), sy = (target.y - state.camera.y) * viewZoom();
  if (distance(target, state.hero) < 65) return;
  const heroScreen = { x: (state.hero.x - state.camera.x) * viewZoom(), y: (state.hero.y - state.camera.y) * viewZoom() };
  const angle = Math.atan2(sy - heroScreen.y, sx - heroScreen.x);
  ctx.save();
  ctx.translate(clamp(sx, 72, viewport.width - 72), clamp(sy, 112, viewport.height - 220));
  ctx.rotate(angle);
  ctx.fillStyle = state.gate?.active ? '#ff4c70' : '#d9ff45';
  ctx.shadowBlur = 18; ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTerrainDebug() {
  if (!terrainDebug) return;
  ctx.save(); ctx.lineWidth = 2;
  for (const [index, ring] of [state.terrain.outer, ...state.terrain.holes].entries()) {
    ctx.strokeStyle = index ? '#ff4c70' : '#d9ff45';
    ctx.beginPath(); ring.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath(); ctx.stroke();
  }
  for (const actor of [state.hero, ...state.enemies]) {
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(actor.x, actor.y, actor.footRadius, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawRegionIntro() {
  if (state.regionIntro <= 0 || state.mode !== 'playing') return;
  const t = Math.min(1, state.regionIntro / 0.45, (2.3 - state.regionIntro) / 0.45);
  ctx.save();
  ctx.globalAlpha = clamp(t, 0, 1);
  const width = Math.min(310, viewport.width - 48);
  const x = (viewport.width - width) / 2;
  const y = 108;
  ctx.fillStyle = 'rgba(10,5,18,.72)';
  ctx.strokeStyle = regions[state.regionIndex].tint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 54, 27);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff8dc';
  ctx.font = '900 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(regions[state.regionIndex].name.toUpperCase(), viewport.width / 2, y + 27);
  ctx.restore();
}

function drawUltimateOverlay() {
  if (!state.ultimate) return;
  const t = state.ultimate.time;
  ctx.save();
  if (t < 0.42) {
    const darkness = clamp(t / 0.42, 0, 1) * 0.55;
    ctx.fillStyle = `rgba(12,1,24,${darkness})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    const hx = (state.hero.x - state.camera.x) * viewZoom();
    const hy = (state.hero.y - state.camera.y - 35) * viewZoom();
    ctx.strokeStyle = '#d9ff45';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 35;
    ctx.shadowColor = '#d9ff45';
    ctx.beginPath();
    ctx.arc(hx, hy, 35 + t * 130, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const fade = clamp((1.48 - t) / 0.8, 0, 1);
    const gradient = ctx.createRadialGradient(viewport.width / 2, viewport.height / 2, 10, viewport.width / 2, viewport.height / 2, viewport.height * 0.8);
    gradient.addColorStop(0, `rgba(217,255,69,${fade * 0.18})`);
    gradient.addColorStop(0.45, `rgba(255,79,163,${fade * 0.16})`);
    gradient.addColorStop(1, 'rgba(70,16,112,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
  ctx.restore();
}

function drawTravelMap() {
  const progress = 1 - state.travelTimer / (prefersReducedMotion ? 0.8 : 2.65);
  ctx.save();
  ctx.fillStyle = 'rgba(7,2,14,.84)';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  const centerX = viewport.width / 2;
  const top = viewport.height * 0.23;
  const gap = Math.min(108, viewport.height * 0.15);
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(132,58,177,.62)';
  ctx.beginPath();
  for (let i = 0; i < regions.length; i += 1) {
    const x = centerX + (i % 2 === 0 ? -42 : 42);
    const y = top + i * gap;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  for (let i = 0; i < regions.length; i += 1) {
    const x = centerX + (i % 2 === 0 ? -42 : 42);
    const y = top + i * gap;
    const complete = i <= state.regionIndex;
    const active = i === state.pendingRegion;
    const pulse = active ? 1 + Math.sin(state.time * 7) * 0.09 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = complete ? regions[i].tint : active ? regions[i].tint : '#3b2749';
    ctx.shadowBlur = active ? 30 : 8;
    ctx.shadowColor = regions[i].tint;
    ctx.beginPath();
    ctx.arc(0, 0, active ? 32 : 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = complete || active ? '#20102a' : '#8a7398';
    ctx.font = '1000 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), 0, 1);
    ctx.restore();
  }

  const fromIndex = state.regionIndex;
  const toIndex = state.pendingRegion;
  const from = { x: centerX + (fromIndex % 2 === 0 ? -42 : 42), y: top + fromIndex * gap };
  const to = { x: centerX + (toIndex % 2 === 0 ? -42 : 42), y: top + toIndex * gap };
  const gx = lerp(from.x, to.x, clamp(progress * 1.35, 0, 1));
  const gy = lerp(from.y, to.y, clamp(progress * 1.35, 0, 1));
  ctx.fillStyle = '#f3d9ff';
  ctx.shadowBlur = 24;
  ctx.shadowColor = '#d9ff45';
  ctx.beginPath();
  ctx.arc(gx, gy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9ff45';
  ctx.beginPath();
  ctx.ellipse(gx + 7, gy - 8, 8, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSideview() {
  const side = state.sideview;
  if (!side) return;
  const scale = viewport.height / 720;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-side.cameraX, 0);
  const panelWidth = 1728;
  for (let panel = 0; panel * panelWidth < sideviewDefinition.width; panel += 1) {
    const x = panel * panelWidth;
    if (panel % 2 === 0) ctx.drawImage(images.sideview, x, 0, panelWidth, 720);
    else {
      ctx.save();
      ctx.translate(x + panelWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(images.sideview, 0, 0, panelWidth, 720);
      ctx.restore();
    }
  }
  const glow = ctx.createLinearGradient(0, 470, 0, 720);
  glow.addColorStop(0, 'rgba(23,5,44,0)'); glow.addColorStop(1, 'rgba(8,1,16,.66)');
  ctx.fillStyle = glow; ctx.fillRect(side.cameraX, 0, viewport.width / scale, 720);

  for (let index = 0; index < sideviewDefinition.vines.length; index += 1) {
    const vine = sideviewDefinition.vines[index];
    const sway = prefersReducedMotion ? 0 : Math.sin(state.time * 1.8 + index * 1.7) * 7;
    const selected = side.grappleIndex === index;
    ctx.save();
    ctx.strokeStyle = selected ? '#d9ff45' : 'rgba(91, 142, 31, .9)';
    ctx.lineWidth = selected ? 7 : 5;
    ctx.lineCap = 'round';
    ctx.shadowBlur = selected ? 24 : 10;
    ctx.shadowColor = selected ? '#d9ff45' : '#79b42c';
    ctx.beginPath();
    ctx.moveTo(vine.x - sway * .25, 0);
    ctx.bezierCurveTo(vine.x + 24 + sway, vine.y * .32, vine.x - 20 - sway, vine.y * .7, vine.x, vine.y);
    ctx.stroke();
    ctx.fillStyle = selected ? '#ecff95' : '#9dcc38';
    ctx.beginPath(); ctx.ellipse(vine.x - 9, vine.y - 10, 14, 7, -0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(vine.x + 10, vine.y - 7, 14, 7, 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = selected ? '#d9ff45' : '#8b44c3';
    for (const [dx, dy] of [[0, 0], [-8, 10], [8, 10], [0, 19]]) { ctx.beginPath(); ctx.arc(vine.x + dx, vine.y + dy, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  for (const platform of sideviewDefinition.platforms) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = platform.kind === 'vine' ? 'rgba(32, 12, 43, .96)' : 'rgba(22, 10, 30, .9)';
    ctx.lineWidth = platform.kind === 'vine' ? 24 : 20;
    ctx.beginPath(); ctx.moveTo(platform.x + 8, platform.y + 8); ctx.lineTo(platform.x + platform.width - 8, platform.y + 8); ctx.stroke();
    ctx.strokeStyle = platform.kind === 'vine' ? '#73a52a' : 'rgba(124, 99, 142, .82)';
    ctx.lineWidth = platform.kind === 'vine' ? 8 : 7;
    ctx.shadowBlur = platform.kind === 'vine' ? 14 : 8;
    ctx.shadowColor = platform.kind === 'vine' ? '#9be133' : '#7c4d94';
    ctx.beginPath(); ctx.moveTo(platform.x + 5, platform.y); ctx.lineTo(platform.x + platform.width - 5, platform.y); ctx.stroke();
    if (platform.kind === 'vine') {
      for (let x = platform.x + 34; x < platform.x + platform.width - 15; x += 58) {
        ctx.fillStyle = '#9b54cf';
        ctx.beginPath(); ctx.arc(x, platform.y + 14 + ((x / 58) % 2) * 4, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9fd347';
        ctx.beginPath(); ctx.ellipse(x + 8, platform.y - 6, 10, 5, -.45, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  if (side.grappleIndex !== null) {
    const vine = sideviewDefinition.vines[side.grappleIndex];
    ctx.save();
    ctx.strokeStyle = '#d9ff45'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.shadowBlur = 20; ctx.shadowColor = '#d9ff45';
    ctx.beginPath(); ctx.moveTo(vine.x, vine.y + 16); ctx.lineTo(side.x, side.y - 42); ctx.stroke();
    ctx.restore();
  } else if (side.grappleMiss > 0) {
    const reach = (1 - side.grappleMiss / .28) * 90;
    ctx.save(); ctx.globalAlpha = clamp(side.grappleMiss * 3.6, 0, 1);
    ctx.strokeStyle = '#d9ff45'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side.x + side.direction * 18, side.y - 46); ctx.quadraticCurveTo(side.x + side.direction * 50, side.y - 80, side.x + side.direction * reach, side.y - 65); ctx.stroke(); ctx.restore();
  }

  const exitFloor = sideGroundAt(sideviewDefinition.exitX);
  const exitY = (exitFloor?.y || 530) - 72;
  const exitPulse = 1 + Math.sin(state.time * 5) * 0.08;
  ctx.save(); ctx.translate(sideviewDefinition.exitX + 35, exitY); ctx.scale(exitPulse, exitPulse);
  ctx.strokeStyle = '#d9ff45'; ctx.lineWidth = 7; ctx.shadowBlur = 26; ctx.shadowColor = '#d9ff45';
  ctx.beginPath(); ctx.arc(0, 0, 35, Math.PI, 0); ctx.lineTo(35, 42); ctx.moveTo(-35, 42); ctx.lineTo(-35, 0); ctx.stroke(); ctx.restore();
  drawHeroAt(side.x, side.y, side.direction >= 0 ? 0 : 4);
  const hover = prefersReducedMotion ? 0 : Math.sin(state.time * 3) * 4;
  ctx.drawImage(images.heroFront, 427, 0, 179, 233, side.x + (side.direction >= 0 ? -48 : 30), side.y - 115 + hover, 34, 44);
  drawParticles();
  if (side.x < 260) {
    ctx.globalAlpha = clamp(1 - side.x / 280, 0, 0.8);
    ctx.strokeStyle = '#fff8dc'; ctx.fillStyle = '#d9ff45'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const y = 435 + Math.sin(state.time * 4) * 4;
    for (const x of [145, 190, 235]) { ctx.beginPath(); ctx.moveTo(x - 13, y - 11); ctx.lineTo(x, y); ctx.lineTo(x - 13, y + 11); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawFinalePayoff() {
  if (!state.ultimate || regions[state.regionIndex].key !== 'sourwood') return;
  const t = state.ultimate.time;
  if (t < 0.16 || t > 1.45) return;
  const hx = (state.hero.x - state.camera.x) * viewZoom();
  const hy = (state.hero.y - state.camera.y) * viewZoom();
  const pull = clamp((t - 0.16) / 0.42, 0, 1);
  ctx.save();
  ctx.translate(hx, hy - 82 - pull * 48);
  ctx.rotate(-0.3 + pull * 0.68);
  const corkScale = 1.1 + pull * 0.9;
  ctx.scale(corkScale, corkScale);
  const gradient = ctx.createLinearGradient(-34, 0, 34, 0);
  gradient.addColorStop(0, '#6c3017'); gradient.addColorStop(.3, '#df9d58'); gradient.addColorStop(.65, '#ffc985'); gradient.addColorStop(1, '#713319');
  ctx.fillStyle = gradient; ctx.strokeStyle = '#341212'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-38, -20, 76, 40, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6d2e43'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (t > 0.3) {
    const cx = hx + 45, cy = hy - 87;
    ctx.fillStyle = '#ffd462'; ctx.strokeStyle = '#3d174c'; ctx.lineWidth = 4;
    for (const dx of [-12, 12]) { ctx.beginPath(); ctx.arc(cx + dx, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - 22, cy); ctx.lineTo(cx + 22, cy); ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.fillStyle = '#090611';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  if (!assetsReady || !state.hero || !state.terrain) return;

  const renderMode = (state.mode === 'paused' || state.mode === 'help') ? (state.mode === 'help' ? state.helpReturnMode : state.returnMode) : state.mode;
  if (renderMode === 'sideview') {
    drawSideview();
    if (state.flash > 0) { ctx.fillStyle = `rgba(255,55,96,${state.flash * 0.35})`; ctx.fillRect(0, 0, viewport.width, viewport.height); }
    return;
  }

  const shakeX = prefersReducedMotion ? 0 : (Math.random() - 0.5) * state.shake;
  const shakeY = prefersReducedMotion ? 0 : (Math.random() - 0.5) * state.shake;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.scale(viewZoom(), viewZoom());
  ctx.translate(-state.camera.x, -state.camera.y);
  drawBackground();
  drawMissionProps();
  drawExit();
  drawGate();
  drawSecret();
  drawPickups();
  drawBolts();
  const actors = [...state.enemies.map((enemy) => ({ type: 'enemy', y: enemy.y, entity: enemy })), { type: 'hero', y: state.hero?.y || 0, entity: state.hero }]
    .filter((actor) => actor.entity)
    .sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.type === 'hero') drawHero();
    else drawEnemy(actor.entity);
  }
  drawCarried();
  drawParticles();
  drawTerrainDebug();
  ctx.restore();

  drawGuidance();
  drawRegionIntro();
  drawUltimateOverlay();
  drawFinalePayoff();
  if (renderMode === 'travel') drawTravelMap();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,55,96,${state.flash * 0.35})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
}

function frame(now) {
  const elapsed = Math.min(0.12, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (['playing', 'clearing', 'travel', 'start', 'sideview'].includes(state.mode)) {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps++ < 7) { update(1 / 60); accumulator -= 1 / 60; }
  } else accumulator = 0;
  draw();
  requestAnimationFrame(frame);
}

function setJoystick(event) {
  const dx = event.clientX - input.joyOriginX;
  const dy = event.clientY - input.joyOriginY;
  const max = 45;
  const length = Math.hypot(dx, dy);
  const scale = length > max ? max / length : 1;
  const x = dx * scale;
  const y = dy * scale;
  input.joyX = x / max;
  input.joyY = y / max;
  joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
}

function releaseJoystick(event) {
  if (event.pointerId !== input.joystickId) return;
  input.joystickId = null;
  input.joyX = 0;
  input.joyY = 0;
  joystickKnob.style.transform = '';
  joystickZone.classList.remove('is-active');
  joystickBase.style.left = '';
  joystickBase.style.top = '';
  joystickBase.style.bottom = '';
}

function releaseAttack() {
  input.attackHeld = false;
  if (state.sideview) state.sideview.grappleIndex = null;
  attackButton.classList.remove('is-held');
}

function clearInput() {
  input.keys.clear(); input.joystickId = null; input.joyX = 0; input.joyY = 0;
  input.route = []; input.tapTarget = null; input.attackHeld = false;
  joystickKnob.style.transform = '';
  joystickBase.style.left = ''; joystickBase.style.top = ''; joystickBase.style.bottom = '';
  joystickZone.classList.remove('is-active'); attackButton.classList.remove('is-held');
  if (state.sideview) state.sideview.grappleIndex = null;
}

joystickZone.addEventListener('pointerdown', (event) => {
  if (!['playing', 'sideview'].includes(state.mode) || input.joystickId !== null) return;
  event.preventDefault();
  input.joystickId = event.pointerId;
  input.joyOriginX = event.clientX;
  input.joyOriginY = event.clientY;
  const zoneRect = joystickZone.getBoundingClientRect();
  joystickBase.style.left = `${clamp(event.clientX - zoneRect.left - 63, 0, zoneRect.width - 126)}px`;
  joystickBase.style.top = `${clamp(event.clientY - zoneRect.top - 63, 0, zoneRect.height - 126)}px`;
  joystickBase.style.bottom = 'auto';
  joystickZone.classList.add('is-active');
  joystickZone.setPointerCapture(event.pointerId);
  setJoystick(event);
});

joystickZone.addEventListener('pointermove', (event) => {
  if (event.pointerId === input.joystickId) setJoystick(event);
});
joystickZone.addEventListener('pointerup', releaseJoystick);
joystickZone.addEventListener('pointercancel', releaseJoystick);
joystickZone.addEventListener('lostpointercapture', releaseJoystick);

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode === 'travel') { state.travelTimer = Math.min(state.travelTimer, 0.35); return; }
  if (state.mode !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  input.tapTarget = {
    x: (event.clientX - rect.left) / viewZoom() + state.camera.x,
    y: (event.clientY - rect.top) / viewZoom() + state.camera.y,
  };
  input.route = state.terrain.findPath(state.hero, input.tapTarget, state.hero.footRadius);
});

attackButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  initializeSound();
  input.attackHeld = true;
  attackButton.classList.add('is-held');
  attack();
  attackButton.setPointerCapture(event.pointerId);
});
attackButton.addEventListener('pointerup', releaseAttack);
attackButton.addEventListener('pointercancel', releaseAttack);
attackButton.addEventListener('lostpointercapture', releaseAttack);

dashButton.addEventListener('click', dash);
companionButton.addEventListener('click', unleashGripe);
document.querySelectorAll('.upgrade-card').forEach((button) => button.addEventListener('click', () => chooseUpgrade(button.dataset.upgrade)));

startButton.addEventListener('click', () => {
  if (!assetsReady) return;
  initializeSound();
  resetGame();
});
continueButton.addEventListener('click', () => {
  if (!assetsReady) return;
  const checkpoint = loadSave();
  if (!checkpoint) { continueButton.hidden = true; return; }
  initializeSound();
  resetGame({ continueSave: checkpoint });
});
restartButton.addEventListener('click', () => {
  if (!assetsReady) return;
  initializeSound();
  hideOverlays();
  const checkpoint = loadSave();
  resetGame(checkpoint ? { continueSave: checkpoint } : {});
});
pauseButton.addEventListener('click', () => state.mode === 'paused' ? resumeGame() : pauseGame());
resumeButton.addEventListener('click', resumeGame);
gameplayHelpToggle.addEventListener('click', toggleGameplayHelp);
contextHelpContinue.addEventListener('click', dismissContextHelp);
mapButton.addEventListener('click', openMap);
closeMapButton.addEventListener('click', closeMap);
guideButton.addEventListener('click', openGuide);
closeGuideButton.addEventListener('click', closeGuide);
document.querySelectorAll('[data-map-region]').forEach((node) => node.addEventListener('click', () => {
  if (state.mode !== 'map' || !state.endingSeen) return;
  const index = Number(node.dataset.mapRegion);
  mapScreen.hidden = true;
  enterRegion(index, false, `${regions[index].key}-start`);
}));

soundButton.addEventListener('click', () => {
  state.sound = !state.sound;
  soundButton.setAttribute('aria-pressed', String(state.sound));
  soundButton.setAttribute('aria-label', state.sound ? 'Turn sound off' : 'Turn sound on');
  if (state.sound) initializeSound();
  if (masterGain) masterGain.gain.setTargetAtTime(state.sound ? 0.17 : 0, audioContext.currentTime, 0.035);
  if (assetsReady && state.mode !== 'loading' && state.mode !== 'start') saveProgress(state.checkpoint.anchorId, state.checkpoint.chapterId);
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  input.keys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'm'].includes(key)) event.preventDefault();
  if (state.mode === 'help') {
    input.keys.delete(key);
    if (key === ' ' || key === 'enter' || key === 'escape') dismissContextHelp();
    return;
  }
  if (event.repeat && ['m', 'escape', 'shift', 'e'].includes(key)) return;
  if (state.mode === 'start' && (key === ' ' || key === 'enter')) {
    initializeSound();
    const checkpoint = loadSave();
    resetGame(checkpoint ? { continueSave: checkpoint } : {});
    return;
  }
  if (key === ' ') { initializeSound(); attack(); }
  if (key === 'shift') dash();
  if (key === 'e') unleashGripe();
  if (key === 'm') state.mode === 'map' ? closeMap() : openMap();
  if (key === 'escape') {
    if (state.mode === 'guide') closeGuide();
    else if (state.mode === 'map') closeMap();
    else if (state.mode === 'paused') resumeGame();
    else pauseGame();
  }
});
window.addEventListener('keyup', (event) => input.keys.delete(event.key.toLowerCase()));
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('blur', () => { clearInput(); pauseGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearInput(); pauseGame(); }
});

async function loadImages() {
  await Promise.all(Object.entries(imagePaths).map(([key, source]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { images[key] = image; resolve(); };
    image.onerror = () => reject(new Error(`Could not load ${source}`));
    image.src = source;
  })));
}

async function boot() {
  state.mode = 'loading';
  syncGameplayHelp();
  startButton.disabled = true;
  $('retry-load').hidden = true;
  $('loading-message').textContent = 'Loading the vineyard…';
  try {
    await loadImages();
    assetsReady = true;
    resetHero();
    state.regionIndex = 0;
    configureWorld();
    Object.assign(state.hero, asPoint(currentTerrainData().spawn));
    updateCamera(1);
    loadingScreen.hidden = true;
    startScreen.hidden = false;
    startButton.disabled = false;
    continueButton.hidden = !loadSave();
    state.mode = 'start';
  } catch {
    // Failed art must never expose a playable but broken world.
    assetsReady = false;
    state.mode = 'loading';
    $('loading-message').textContent = 'The vineyard could not load. Try again.';
    $('retry-load').hidden = false;
  }
}

$('retry-load').addEventListener('click', boot);
resize();
requestAnimationFrame(frame);
boot();
