const $ = (id) => document.getElementById(id);

const canvas = $('world');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const shell = $('game-shell');
const loadingScreen = $('loading-screen');
const startScreen = $('start-screen');
const startButton = $('start-button');
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
const mapScreen = $('map-screen');
const closeMapButton = $('close-map-button');
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

const imagePaths = {
  root: './assets/root-cellar.webp',
  vineway: './assets/vineway.webp',
  press: './assets/arena.webp',
  sourwood: './assets/sourwood.webp',
  heroFront: './assets/grape-fighter.webp',
  heroBack: './assets/grape-fighter-back.webp',
  heroSide: './assets/grape-fighter-side.webp',
  sourling: './assets/sourling.webp',
  moth: './assets/rumor-moth.webp',
  brute: './assets/thorn-brute.webp',
  boss: './assets/gripe-maw.webp',
};

const regions = [
  {
    key: 'root',
    name: 'Root Cellar',
    tint: '#d9ff45',
    widthFactor: 0.88,
    path: [
      [0.04, 0.50, 0.18],
      [0.24, 0.50, 0.25],
      [0.45, 0.56, 0.23],
      [0.67, 0.43, 0.24],
      [0.96, 0.50, 0.22],
    ],
    encounters: [
      { p: 0.72, types: ['sourling', 'sourling', 'moth'] },
      { p: 0.44, types: ['sourling', 'moth', 'sourling', 'brute'] },
      { p: 0.22, types: ['moth', 'sourling', 'moth', 'brute'] },
    ],
    secret: { p: 0.57, side: 0.78 },
  },
  {
    key: 'vineway',
    name: 'Vineway',
    tint: '#ffd462',
    widthFactor: 0.92,
    path: [
      [0.04, 0.52, 0.22],
      [0.23, 0.46, 0.28],
      [0.43, 0.62, 0.31],
      [0.62, 0.38, 0.27],
      [0.82, 0.52, 0.25],
      [0.96, 0.50, 0.21],
    ],
    encounters: [
      { p: 0.78, types: ['moth', 'sourling', 'sourling'] },
      { p: 0.55, types: ['moth', 'moth', 'sourling', 'brute'] },
      { p: 0.30, types: ['sourling', 'brute', 'moth', 'sourling', 'moth'] },
    ],
    secret: { p: 0.48, side: -0.82 },
  },
  {
    key: 'press',
    name: 'Press Pit',
    tint: '#ff5aa9',
    widthFactor: 0.78,
    path: [
      [0.04, 0.50, 0.16],
      [0.22, 0.50, 0.20],
      [0.42, 0.50, 0.39],
      [0.66, 0.50, 0.40],
      [0.87, 0.50, 0.21],
      [0.96, 0.50, 0.17],
    ],
    encounters: [
      { p: 0.69, types: ['sourling', 'sourling', 'moth', 'sourling'] },
      { p: 0.49, types: ['moth', 'brute', 'moth', 'brute'] },
      { p: 0.31, types: ['brute', 'sourling', 'moth', 'sourling', 'brute'] },
    ],
    secret: { p: 0.42, side: 0.82 },
  },
  {
    key: 'sourwood',
    name: 'Sourwood',
    tint: '#ba68ff',
    widthFactor: 0.92,
    path: [
      [0.04, 0.50, 0.29],
      [0.20, 0.50, 0.36],
      [0.38, 0.43, 0.24],
      [0.55, 0.61, 0.27],
      [0.73, 0.42, 0.25],
      [0.96, 0.50, 0.20],
    ],
    encounters: [
      { p: 0.77, types: ['sourling', 'moth', 'sourling', 'moth'] },
      { p: 0.52, types: ['brute', 'moth', 'brute', 'sourling'] },
      { p: 0.22, types: ['boss', 'moth', 'sourling'] },
    ],
    secret: { p: 0.62, side: -0.84 },
  },
];

const enemyTypes = {
  sourling: { image: 'sourling', hp: 4, speed: 74, damage: 12, radius: 19, height: 68, score: 8, straw: 11, behavior: 'charge' },
  moth: { image: 'moth', hp: 5, speed: 43, damage: 10, radius: 22, height: 74, score: 12, straw: 14, behavior: 'ranged' },
  brute: { image: 'brute', hp: 14, speed: 30, damage: 20, radius: 34, height: 112, score: 28, straw: 22, behavior: 'brute' },
  boss: { image: 'boss', hp: 82, speed: 25, damage: 24, radius: 51, height: 164, score: 150, straw: 100, behavior: 'boss' },
};

const images = {};
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tutorialDone = localStorage.getItem('grape-gripe-journey-tutorial') === 'done';

let viewport = { width: 0, height: 0, dpr: 1 };
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
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function gameScale() {
  return clamp(Math.min(viewport.width / 430, viewport.height / 860), 0.76, 1.2);
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

function pathAt(y) {
  const region = regions[state.regionIndex];
  const p = clamp(y / state.world.height, 0, 1);
  const points = region.path;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const t = (p - a[0]) / (b[0] - a[0]);
      return {
        x: lerp(a[1], b[1], t) * state.world.width,
        width: lerp(a[2], b[2], t) * state.world.width,
      };
    }
  }
  const end = p < points[0][0] ? points[0] : points[points.length - 1];
  return { x: end[1] * state.world.width, width: end[2] * state.world.width };
}

function keepOnPath(entity, allowance = 1) {
  entity.y = clamp(entity.y, 58 * gameScale(), state.world.height - 58 * gameScale());
  const path = pathAt(entity.y);
  const half = Math.max(54 * gameScale(), path.width * allowance);
  entity.x = clamp(entity.x, path.x - half, path.x + half);
}

function configureWorld(preserve = true) {
  const region = regions[state.regionIndex];
  const previous = { ...state.world };
  const oldHero = state.hero ? { x: state.hero.x / previous.width, y: state.hero.y / previous.height } : null;
  const width = Math.max(viewport.width * 1.48, viewport.height * region.widthFactor);
  const image = images[region.key];
  const ratio = image?.naturalHeight && image?.naturalWidth ? image.naturalHeight / image.naturalWidth : 1.777;
  state.world.width = width;
  state.world.height = Math.max(viewport.height * 1.28, width * ratio);
  if (preserve && oldHero && state.hero) {
    state.hero.x = oldHero.x * state.world.width;
    state.hero.y = oldHero.y * state.world.height;
    keepOnPath(state.hero, 0.93);
  }
  seedAmbience();
  updateCamera(1);
}

function resize() {
  viewport.width = shell.clientWidth;
  viewport.height = shell.clientHeight;
  viewport.dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (state.mode !== 'loading') configureWorld(true);
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
    walkCycle: 0,
    trail: [],
  };
}

function resetGame() {
  state.time = 0;
  state.score = 0;
  state.energy = 0;
  state.lastStraw = 0;
  state.regionIndex = 0;
  state.pendingRegion = 0;
  state.upgrades = { power: 0, speed: 0, shield: 0 };
  state.tutorial = tutorialDone ? 2 : 0;
  resetHero();
  enterRegion(0, true);
}

function showGameControls(show) {
  hud.hidden = !show;
  soundButton.hidden = !show;
  pauseButton.hidden = !show;
  mapButton.hidden = !show;
  joystickZone.hidden = !show;
  actionCluster.hidden = !show;
}

function hideOverlays() {
  startScreen.hidden = true;
  pauseScreen.hidden = true;
  mapScreen.hidden = true;
  upgradeScreen.hidden = true;
  endScreen.hidden = true;
}

function enterRegion(index, fresh = false) {
  state.regionIndex = index;
  state.pendingRegion = index;
  state.mode = 'playing';
  state.encounterIndex = 0;
  state.regionClear = false;
  state.regionIntro = 2.3;
  state.gate = null;
  state.enemies = [];
  state.bolts = [];
  state.hostileBolts = [];
  state.pickups = [];
  state.particles = [];
  state.shockwaves = [];
  state.spawnQueue = [];
  state.ultimate = null;
  hideOverlays();
  configureWorld(false);

  const spawnY = state.world.height * 0.93;
  const spawnPath = pathAt(spawnY);
  state.hero.x = spawnPath.x;
  state.hero.y = spawnY;
  state.hero.vx = 0;
  state.hero.vy = 0;
  state.hero.direction = 6;
  state.hero.facingX = 0;
  state.hero.facingY = -1;
  if (!fresh) state.hero.health = Math.min(state.hero.maxHealth, state.hero.health + 28);

  const secretConfig = regions[index].secret;
  const secretY = state.world.height * secretConfig.p;
  const secretPath = pathAt(secretY);
  state.secret = {
    x: secretPath.x + secretPath.width * secretConfig.side,
    y: secretY,
    collected: false,
    phase: Math.random() * Math.PI * 2,
  };

  updateCamera(1);
  updateRouteUI();
  updateTutorialUI();
  showGameControls(true);
  tuneDrone();
  updateUI();
  announce(`${regions[index].name}. Follow the glowing path.`);
}

function beginTravel() {
  if (state.regionIndex >= regions.length - 1) {
    finishGame(true);
    return;
  }
  state.mode = 'travel';
  state.pendingRegion = state.regionIndex + 1;
  state.travelTimer = prefersReducedMotion ? 0.8 : 2.65;
  showGameControls(false);
  sound('travel');
  announce(`Traveling to ${regions[state.pendingRegion].name}.`);
}

function completeRegion() {
  if (state.regionClear) return;
  state.regionClear = true;
  state.score += 75 + state.regionIndex * 25;
  state.energy += 5;
  state.lastStraw = clamp(state.lastStraw + 22, 0, state.maxStraw);
  sound('clear');
  burstParticles(state.hero.x, state.hero.y, regions[state.regionIndex].tint, 38, 210);
  state.shockwaves.push({ x: state.hero.x, y: state.hero.y, radius: 18, max: 170, life: 0.8, color: regions[state.regionIndex].tint });
  setTimeout(beginTravel, 520);
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

function attack() {
  if (state.mode !== 'playing' || !state.hero || state.hero.attackCooldown > 0 || state.ultimate) return false;
  const hero = state.hero;
  const target = nearestEnemy(hero, 340 * gameScale());
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
    radius: (heavy ? 15 : 9) * gameScale(),
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
    localStorage.setItem('grape-gripe-journey-tutorial', 'done');
    updateTutorialUI();
  }
  return true;
}

function dash() {
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
  if (state.mode !== 'playing' || state.lastStraw < state.maxStraw || state.ultimate) return;
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
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 18, max: Math.max(viewport.width, viewport.height) * 0.95, life: 1.05, color: '#d9ff45' });
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 10, max: Math.max(viewport.width, viewport.height) * 0.72, life: 0.8, color: '#ff4fa3' });
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.stunned = 2.4;
    hitEnemy(enemy, 9 + state.upgrades.power * 2.5, true);
  }
  for (const bolt of state.hostileBolts) bolt.dead = true;
  burstParticles(hero.x, hero.y, '#d9ff45', 65, 320);
  burstParticles(hero.x, hero.y, '#ff4fa3', 42, 250);
  state.shake = prefersReducedMotion ? 5 : 24;
  state.flash = 0.6;
}

function spawnEnemy(typeName, gateY = state.hero.y - 120) {
  const spec = enemyTypes[typeName];
  const regionScale = 1 + state.regionIndex * 0.14;
  const scale = gameScale();
  const y = clamp(gateY + (Math.random() - 0.48) * 150 * scale, 75, state.world.height - 75);
  const path = pathAt(y);
  let x = path.x + (Math.random() - 0.5) * path.width * 1.45;
  if (Math.hypot(x - state.hero.x, y - state.hero.y) < 110 * scale) x += (Math.random() > 0.5 ? 1 : -1) * 130 * scale;
  const enemy = {
    id: nextId++,
    type: typeName,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: Math.ceil(spec.hp * regionScale),
    maxHp: Math.ceil(spec.hp * regionScale),
    speed: spec.speed * scale,
    damage: spec.damage * (1 + state.regionIndex * 0.08),
    radius: spec.radius * scale,
    height: spec.height * scale,
    score: spec.score,
    straw: spec.straw,
    behavior: spec.behavior,
    image: spec.image,
    facing: Math.random() > 0.5 ? 1 : -1,
    age: 0,
    spawn: 0,
    attackCooldown: 0.65 + Math.random() * 0.8,
    telegraph: 0,
    attackPending: false,
    lungeTime: 0,
    lungeX: 0,
    lungeY: 0,
    touchCooldown: 0,
    hitFlash: 0,
    stunned: 0,
    summoned: false,
    dead: false,
  };
  keepOnPath(enemy, 0.94);
  state.enemies.push(enemy);
  burstParticles(enemy.x, enemy.y, typeName === 'boss' ? '#ffae45' : '#a55be2', typeName === 'boss' ? 30 : 11, 115);
  state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 10, max: enemy.radius * 2.3, life: 0.58, color: typeName === 'boss' ? '#ffae45' : '#bd82ed' });
}

function triggerEncounter(encounter) {
  const y = encounter.p * state.world.height;
  state.gate = { y, clearTimer: 0, pulse: 1, active: true };
  state.spawnQueue = encounter.types.map((type, index) => ({ type, delay: index * 0.38, y }));
  state.shockwaves.push({ x: pathAt(y).x, y, radius: 12, max: pathAt(y).width, life: 0.75, color: '#ff4c70' });
  announce('A thorn gate closes. Clear the path.');
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
    spawnHostileBolt(enemy, angle, 170 * gameScale());
    enemy.attackCooldown = 1.65 + Math.random() * 0.45;
  } else if (enemy.behavior === 'boss') {
    for (let i = -2; i <= 2; i += 1) spawnHostileBolt(enemy, angle + i * 0.22, 142 * gameScale());
    if (enemy.hp < enemy.maxHp * 0.48 && !enemy.summoned) {
      enemy.summoned = true;
      spawnEnemy('sourling', enemy.y + 70);
      spawnEnemy('moth', enemy.y + 90);
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
  enemy.hp -= damage;
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
  const radius = 78 * gameScale();
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
  let x = input.joyX;
  let y = input.joyY;
  if (input.keys.has('arrowleft') || input.keys.has('a')) x -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) x += 1;
  if (input.keys.has('arrowup') || input.keys.has('w')) y -= 1;
  if (input.keys.has('arrowdown') || input.keys.has('s')) y += 1;

  if (Math.hypot(x, y) < 0.1 && input.tapTarget) {
    const dx = input.tapTarget.x - hero.x;
    const dy = input.tapTarget.y - hero.y;
    if (Math.hypot(dx, dy) < 12) input.tapTarget = null;
    else {
      const length = Math.hypot(dx, dy);
      x = dx / length;
      y = dy / length;
    }
  } else if (Math.hypot(x, y) >= 0.1) input.tapTarget = null;

  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  if (length > 0.12) {
    setDirection(hero, x, y);
    hero.walkCycle += dt * 10;
    if (state.tutorial === 0) { state.tutorial = 1; updateTutorialUI(); }
  }

  if (hero.dashTime > 0) {
    hero.dashTime -= dt;
    hero.vx = hero.dashX * hero.speed * 3.45;
    hero.vy = hero.dashY * hero.speed * 3.45;
    hero.trail.unshift({ x: hero.x, y: hero.y, direction: hero.direction, life: 0.28 });
    if (hero.trail.length > 5) hero.trail.pop();
  } else {
    const easing = 1 - Math.exp(-dt * 12);
    hero.vx += (x * hero.speed - hero.vx) * easing;
    hero.vy += (y * hero.speed - hero.vy) * easing;
  }

  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  if (state.gate?.active) hero.y = Math.max(hero.y, state.gate.y - 72 * gameScale());
  keepOnPath(hero, 0.9);
  for (const trail of hero.trail) trail.life -= dt;
  hero.trail = hero.trail.filter((trail) => trail.life > 0);
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

    if (enemy.telegraph > 0) {
      enemy.telegraph -= dt;
      enemy.vx *= Math.exp(-dt * 10);
      enemy.vy *= Math.exp(-dt * 10);
      if (enemy.telegraph <= 0 && enemy.attackPending) executeEnemyAttack(enemy);
    } else if (enemy.spawn < 0.72 || enemy.stunned > 0) {
      enemy.vx *= Math.exp(-dt * 7);
      enemy.vy *= Math.exp(-dt * 7);
    } else if (enemy.lungeTime > 0) {
      enemy.lungeTime -= dt;
      const multiplier = enemy.behavior === 'brute' ? 5.2 : 4.2;
      enemy.vx = enemy.lungeX * enemy.speed * multiplier;
      enemy.vy = enemy.lungeY * enemy.speed * multiplier;
    } else {
      const dx = hero.x - enemy.x;
      const dy = hero.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      let desired = enemy.speed;
      if (enemy.behavior === 'ranged') desired = d > 190 * gameScale() ? enemy.speed : d < 135 * gameScale() ? -enemy.speed * 0.7 : 0;
      if (enemy.behavior === 'boss') desired = d > 175 * gameScale() ? enemy.speed : 0;
      const easing = 1 - Math.exp(-dt * 4.2);
      enemy.vx += (nx * desired - enemy.vx) * easing;
      enemy.vy += (ny * desired - enemy.vy) * easing;

      const attackDistance = enemy.behavior === 'ranged' ? 330 : enemy.behavior === 'boss' ? 390 : enemy.behavior === 'brute' ? 155 : 110;
      if (enemy.attackCooldown <= 0 && d < attackDistance * gameScale()) {
        enemy.attackPending = true;
        enemy.telegraph = enemy.behavior === 'boss' ? 0.78 : enemy.behavior === 'brute' ? 0.65 : enemy.behavior === 'ranged' ? 0.48 : 0.4;
      }
    }

    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    keepOnPath(enemy, 0.98);
    if (Math.abs(enemy.vx) > 2) enemy.facing = enemy.vx > 0 ? -1 : 1;
    if (distance(enemy, hero) < enemy.radius + 22 * gameScale() && enemy.touchCooldown <= 0) {
      damageHero(enemy.damage);
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
    if (!bolt.dead && distance(bolt, state.hero) < bolt.radius + 21 * gameScale()) {
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
    if (d < 175 * gameScale()) {
      const pull = 1 - Math.exp(-dt * (d < 70 ? 14 : 5));
      pickup.vx += ((state.hero.x - pickup.x) * 6 - pickup.vx) * pull;
      pickup.vy += ((state.hero.y - 16 - pickup.y) * 6 - pickup.vy) * pull;
    }
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    if (d < 28 * gameScale()) {
      pickup.life = 0;
      state.energy += 1;
      state.score += 4;
      state.lastStraw = clamp(state.lastStraw + 2, 0, state.maxStraw);
      sound('collect');
    }
  }
  state.pickups = state.pickups.filter((pickup) => pickup.life > 0);

  if (state.secret && !state.secret.collected && distance(state.secret, state.hero) < 42 * gameScale()) {
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
  const nextEncounter = regions[state.regionIndex].encounters[state.encounterIndex];
  if (!state.gate && nextEncounter && state.hero.y / state.world.height <= nextEncounter.p + 0.045) triggerEncounter(nextEncounter);

  for (const spawn of state.spawnQueue) spawn.delay -= dt;
  const ready = state.spawnQueue.filter((spawn) => spawn.delay <= 0);
  state.spawnQueue = state.spawnQueue.filter((spawn) => spawn.delay > 0);
  for (const spawn of ready) spawnEnemy(spawn.type, spawn.y);

  if (state.gate?.active && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.gate.clearTimer += dt;
    if (state.gate.clearTimer > 0.55) {
      state.gate.active = false;
      state.encounterIndex += 1;
      state.lastStraw = clamp(state.lastStraw + 10, 0, state.maxStraw);
      state.energy += 3;
      state.score += 30;
      sound('clear');
      state.shockwaves.push({ x: pathAt(state.gate.y).x, y: state.gate.y, radius: 8, max: pathAt(state.gate.y).width * 1.4, life: 0.75, color: '#d9ff45' });
      state.gate = null;
    }
  }

  if (!state.gate && !nextEncounter && state.encounterIndex >= regions[state.regionIndex].encounters.length && state.hero.y < state.world.height * 0.085) completeRegion();
}

function updateUltimate(dt) {
  if (!state.ultimate) return;
  state.ultimate.time += dt;
  if (state.ultimate.time >= 0.42) fireUltimate();
  if (state.ultimate.time >= 1.48) state.ultimate = null;
}

function updateCamera(amount = 0.12) {
  if (!state.hero) return;
  const targetX = clamp(state.hero.x - viewport.width * 0.5, 0, Math.max(0, state.world.width - viewport.width));
  const targetY = clamp(state.hero.y - viewport.height * 0.61, 0, Math.max(0, state.world.height - viewport.height));
  state.camera.x = lerp(state.camera.x, targetX, amount);
  state.camera.y = lerp(state.camera.y, targetY, amount);
}

function update(dt) {
  state.time += dt;
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
  updateEnemies(dt);
  updateBolts(dt);
  updatePickups(dt);
  updateEncounter(dt);
  updateUltimate(dt);
  updateEffects(dt);
  updateCamera(1 - Math.exp(-dt * 7));
  if (input.attackHeld) attack();
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
  enterRegion(state.pendingRegion);
}

function finishGame(won) {
  state.mode = won ? 'won' : 'lost';
  showGameControls(false);
  endScreen.hidden = false;
  endScreen.classList.toggle('is-loss', !won);
  finalScore.textContent = Math.round(state.score).toLocaleString();
  if (won) {
    sound('win');
    localStorage.setItem('grape-gripe-best-score', String(Math.max(Number(localStorage.getItem('grape-gripe-best-score') || 0), state.score)));
    announce('The Sourwood is uncorked. Journey complete.');
  } else announce('The Gripevine got the last word.');
}

function pauseGame() {
  if (state.mode !== 'playing') return;
  state.returnMode = 'playing';
  state.mode = 'paused';
  pauseScreen.hidden = false;
  showGameControls(false);
  pauseButton.hidden = false;
  soundButton.hidden = false;
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = state.returnMode;
  pauseScreen.hidden = true;
  showGameControls(true);
  lastFrame = performance.now();
}

function openMap() {
  if (state.mode !== 'playing') return;
  state.returnMode = 'playing';
  state.mode = 'map';
  mapScreen.hidden = false;
  showGameControls(false);
  mapButton.hidden = false;
  updateRouteUI();
}

function closeMap() {
  if (state.mode !== 'map') return;
  state.mode = state.returnMode;
  mapScreen.hidden = true;
  showGameControls(true);
  lastFrame = performance.now();
}

function updateTutorialUI() {
  tutorialFocus.hidden = state.mode !== 'playing' || state.tutorial !== 0;
  attackButton.classList.toggle('is-prompted', state.mode === 'playing' && state.tutorial === 1);
}

function updateRouteUI() {
  document.querySelectorAll('.route-pip').forEach((pip) => {
    const index = Number(pip.dataset.region);
    pip.classList.toggle('complete', index < state.regionIndex || (state.regionClear && index === state.regionIndex));
    pip.classList.toggle('active', index === state.regionIndex);
  });
  document.querySelectorAll('.wave-line').forEach((line, index) => line.classList.toggle('complete', index < state.regionIndex));
  document.querySelectorAll('[data-map-region]').forEach((node) => {
    const index = Number(node.dataset.mapRegion);
    node.classList.toggle('complete', index < state.regionIndex || (state.regionClear && index === state.regionIndex));
    node.classList.toggle('active', index === state.regionIndex);
    node.classList.toggle('locked', index > state.regionIndex);
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
  if (boss) bossHealthFill.style.width = `${100 * boss.hp / boss.maxHp}%`;

  const dashRatio = state.hero.dashCooldown / state.hero.dashMaxCooldown;
  dashButton.style.setProperty('--cooldown', String(1 - dashRatio));
  dashButton.disabled = dashRatio > 0;
  const ready = state.lastStraw >= state.maxStraw;
  companionButton.disabled = !ready;
  companionButton.classList.toggle('is-ready', ready);
  companionButton.style.setProperty('--charge', String(state.lastStraw / state.maxStraw));
  updateRouteUI();
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
}

function drawExit() {
  const y = state.world.height * 0.052;
  const path = pathAt(y);
  const cleared = state.encounterIndex >= regions[state.regionIndex].encounters.length && !state.gate;
  const pulse = 0.5 + Math.sin(state.time * 4) * 0.15;
  ctx.save();
  ctx.translate(path.x, y);
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

function drawGate() {
  if (!state.gate?.active) return;
  const path = pathAt(state.gate.y);
  const pulse = 0.72 + Math.sin(state.time * 7) * 0.18;
  ctx.save();
  ctx.translate(path.x, state.gate.y - 34 * gameScale());
  ctx.strokeStyle = `rgba(255,76,112,${pulse})`;
  ctx.lineWidth = 5;
  ctx.shadowBlur = 18;
  ctx.shadowColor = '#ff4c70';
  ctx.beginPath();
  const width = path.width * 1.05;
  const pieces = 9;
  for (let i = 0; i <= pieces; i += 1) {
    const x = -width + i * (width * 2 / pieces);
    const y = Math.sin(i * 2.4 + state.time * 2) * 7;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.lineTo(x - 6, y - 12);
    ctx.moveTo(x, y);
  }
  ctx.stroke();
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

function heroRenderInfo(direction) {
  if (direction === 0) return { image: images.heroSide, flip: -1, rotation: 0 };
  if (direction === 4) return { image: images.heroSide, flip: 1, rotation: 0 };
  if (direction === 1) return { image: images.heroSide, flip: -1, rotation: 0.07 };
  if (direction === 3) return { image: images.heroSide, flip: 1, rotation: -0.07 };
  if (direction === 5) return { image: images.heroBack, flip: 1, rotation: -0.055 };
  if (direction === 7) return { image: images.heroBack, flip: -1, rotation: 0.055 };
  if (direction === 6) return { image: images.heroBack, flip: 1, rotation: 0 };
  return { image: images.heroFront, flip: 1, rotation: 0 };
}

function drawHeroAt(x, y, direction, alpha = 1, ghost = false) {
  const hero = state.hero;
  const info = heroRenderInfo(direction);
  const speed = Math.hypot(hero.vx, hero.vy);
  const moving = speed > 14;
  const bob = moving && !ghost ? Math.sin(hero.walkCycle) * 3.2 : 0;
  const attackProgress = hero.attackAnim > 0 ? hero.attackAnim / 0.34 : 0;
  const attackLean = ghost ? 0 : Math.sin(attackProgress * Math.PI) * 0.09;
  const baseHeight = (info.image === images.heroSide ? 116 : info.image === images.heroBack ? 112 : 105) * gameScale();
  const height = baseHeight * (1 + (ghost ? 0 : Math.sin(hero.walkCycle * 2) * 0.018));
  const filter = ghost ? 'saturate(1.3) hue-rotate(15deg)' : hero.invulnerable > 0 && Math.floor(hero.invulnerable * 18) % 2 ? 'brightness(1.75) saturate(.6)' : 'none';
  drawShadow(x, y + 5, 68 * gameScale(), ghost ? 0.1 : 0.42);
  drawImageBottom(info.image, x, y + bob, height, info.flip, alpha, info.rotation + attackLean * info.flip, filter);
}

function drawHero() {
  const hero = state.hero;
  for (let i = hero.trail.length - 1; i >= 0; i -= 1) {
    const trail = hero.trail[i];
    drawHeroAt(trail.x, trail.y, trail.direction, trail.life * 0.46, true);
  }
  if (hero.shieldPulse > 0) {
    ctx.strokeStyle = `rgba(142,232,255,${hero.shieldPulse})`;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#8ee8ff';
    ctx.beginPath();
    ctx.ellipse(hero.x, hero.y - 34, 52 * gameScale(), 67 * gameScale(), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawHeroAt(hero.x, hero.y, hero.direction);
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
  let target;
  if (state.gate?.active && state.enemies.length) target = nearestEnemy(state.hero);
  else {
    const y = state.world.height * 0.052;
    target = { x: pathAt(y).x, y };
  }
  if (!target) return;
  const sx = target.x - state.camera.x;
  const sy = target.y - state.camera.y;
  const margin = 72;
  if (sx > margin && sx < viewport.width - margin && sy > margin && sy < viewport.height - margin) return;
  const heroScreen = { x: state.hero.x - state.camera.x, y: state.hero.y - state.camera.y };
  const angle = Math.atan2(sy - heroScreen.y, sx - heroScreen.x);
  const x = clamp(sx, margin, viewport.width - margin);
  const y = clamp(sy, 105, viewport.height - 210);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = state.gate?.active ? '#ff4c70' : '#d9ff45';
  ctx.shadowBlur = 18;
  ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();
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
    const hx = state.hero.x - state.camera.x;
    const hy = state.hero.y - state.camera.y - 35;
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

function draw() {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.fillStyle = '#090611';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  if (!images[regions[state.regionIndex]?.key]) return;

  const shakeX = prefersReducedMotion ? 0 : (Math.random() - 0.5) * state.shake;
  const shakeY = prefersReducedMotion ? 0 : (Math.random() - 0.5) * state.shake;
  ctx.save();
  ctx.translate(-state.camera.x + shakeX, -state.camera.y + shakeY);
  drawBackground();
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
  drawParticles();
  ctx.restore();

  drawGuidance();
  drawRegionIntro();
  drawUltimateOverlay();
  if (state.mode === 'travel') drawTravelMap();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,55,96,${state.flash * 0.35})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
}

function frame(now) {
  const dt = Math.min(0.034, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (state.mode !== 'loading' && state.mode !== 'paused' && state.mode !== 'map' && state.mode !== 'upgrade' && state.mode !== 'won' && state.mode !== 'lost') update(dt);
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
  attackButton.classList.remove('is-held');
}

joystickZone.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'playing' || input.joystickId !== null) return;
  event.preventDefault();
  input.joystickId = event.pointerId;
  input.joyOriginX = event.clientX;
  input.joyOriginY = event.clientY;
  const shellRect = shell.getBoundingClientRect();
  joystickBase.style.left = `${clamp(event.clientX - shellRect.left - 63, 8, shellRect.width * 0.54 - 132)}px`;
  joystickBase.style.top = `${clamp(event.clientY - shellRect.top - 63, shellRect.height - Math.min(shellRect.height * 0.38, 320), shellRect.height - 134)}px`;
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

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode === 'travel') { state.travelTimer = Math.min(state.travelTimer, 0.35); return; }
  if (state.mode !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  input.tapTarget = {
    x: event.clientX - rect.left + state.camera.x,
    y: event.clientY - rect.top + state.camera.y,
  };
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
  initializeSound();
  resetGame();
});
restartButton.addEventListener('click', () => {
  initializeSound();
  hideOverlays();
  resetGame();
});
pauseButton.addEventListener('click', () => state.mode === 'paused' ? resumeGame() : pauseGame());
resumeButton.addEventListener('click', resumeGame);
mapButton.addEventListener('click', openMap);
closeMapButton.addEventListener('click', closeMap);

soundButton.addEventListener('click', () => {
  state.sound = !state.sound;
  soundButton.setAttribute('aria-pressed', String(state.sound));
  soundButton.setAttribute('aria-label', state.sound ? 'Turn sound off' : 'Turn sound on');
  if (state.sound) initializeSound();
  if (masterGain) masterGain.gain.setTargetAtTime(state.sound ? 0.17 : 0, audioContext.currentTime, 0.035);
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  input.keys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'm'].includes(key)) event.preventDefault();
  if (state.mode === 'start' && (key === ' ' || key === 'enter')) { initializeSound(); resetGame(); return; }
  if (key === ' ') { initializeSound(); attack(); }
  if (key === 'shift') dash();
  if (key === 'e') unleashGripe();
  if (key === 'm') state.mode === 'map' ? closeMap() : openMap();
  if (key === 'escape') {
    if (state.mode === 'map') closeMap();
    else if (state.mode === 'paused') resumeGame();
    else pauseGame();
  }
});
window.addEventListener('keyup', (event) => input.keys.delete(event.key.toLowerCase()));
window.addEventListener('resize', resize, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') pauseGame();
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

resize();
requestAnimationFrame(frame);
loadImages()
  .then(() => {
    resetHero();
    state.regionIndex = 0;
    configureWorld(false);
    const spawnY = state.world.height * 0.93;
    state.hero.x = pathAt(spawnY).x;
    state.hero.y = spawnY;
    updateCamera(1);
    loadingScreen.classList.add('is-ready');
    setTimeout(() => {
      loadingScreen.hidden = true;
      startScreen.hidden = false;
      state.mode = 'start';
    }, 360);
  })
  .catch((error) => {
    console.error(error);
    loadingScreen.hidden = true;
    startScreen.hidden = false;
    state.mode = 'start';
    announce('Some journey art could not load. Reload to try again.');
  });
