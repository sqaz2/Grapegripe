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
const pauseScreen = $('pause-screen');
const resumeButton = $('resume-button');
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
  arena: './assets/arena.webp',
  hero: './assets/grape-fighter.webp',
  sourling: './assets/sourling.webp',
  moth: './assets/rumor-moth.webp',
  brute: './assets/thorn-brute.webp',
  boss: './assets/gripe-maw.webp',
};

const images = {};
let viewport = { width: 0, height: 0, dpr: 1 };
let lastFrame = performance.now();
let nextId = 1;
let audioContext = null;
let masterGain = null;
let ambientNodes = [];

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const savedTutorial = localStorage.getItem('grape-gripe-arena-tutorial') === 'done';

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
  paused: false,
  sound: true,
  time: 0,
  score: 0,
  energy: 0,
  wave: 0,
  waveClearTimer: 0,
  wavePulse: 0,
  shake: 0,
  damageFlash: 0,
  companion: 0,
  maxCompanion: 100,
  tutorial: savedTutorial ? 2 : 0,
  upgrades: { power: 0, speed: 0, shield: 0 },
  hero: null,
  enemies: [],
  bolts: [],
  hostileBolts: [],
  pickups: [],
  particles: [],
  shockwaves: [],
  spawnQueue: [],
  scenerySparks: [],
};

const enemyTypes = {
  sourling: {
    image: 'sourling',
    hp: 3,
    speed: 63,
    damage: 13,
    radius: 20,
    size: 66,
    score: 8,
    companion: 14,
    behavior: 'charge',
  },
  moth: {
    image: 'moth',
    hp: 4,
    speed: 39,
    damage: 10,
    radius: 22,
    size: 72,
    score: 12,
    companion: 18,
    behavior: 'ranged',
  },
  brute: {
    image: 'brute',
    hp: 12,
    speed: 25,
    damage: 22,
    radius: 36,
    size: 108,
    score: 28,
    companion: 32,
    behavior: 'charge',
  },
  boss: {
    image: 'boss',
    hp: 54,
    speed: 21,
    damage: 24,
    radius: 53,
    size: 152,
    score: 100,
    companion: 100,
    behavior: 'boss',
  },
};

const waves = [
  [
    ['sourling', 0],
    ['sourling', 0.7],
    ['sourling', 1.4],
    ['sourling', 2.1],
    ['sourling', 2.8],
    ['sourling', 3.5],
  ],
  [
    ['moth', 0],
    ['sourling', 0.5],
    ['moth', 1],
    ['sourling', 1.5],
    ['brute', 2],
    ['sourling', 2.6],
    ['moth', 3.1],
    ['sourling', 3.7],
  ],
  [
    ['boss', 0],
    ['sourling', 1.2],
    ['moth', 2.4],
    ['sourling', 3.6],
  ],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function arenaBounds() {
  const portrait = viewport.height >= viewport.width;
  return {
    x: viewport.width * 0.5,
    y: viewport.height * (portrait ? 0.49 : 0.52),
    rx: Math.min(viewport.width * (portrait ? 0.44 : 0.39), viewport.height * 0.42),
    ry: Math.min(viewport.height * (portrait ? 0.255 : 0.38), viewport.width * 0.52),
  };
}

function gameScale() {
  return clamp(Math.min(viewport.width / 430, viewport.height / 860), 0.78, 1.22);
}

function announce(message) {
  liveStatus.textContent = '';
  requestAnimationFrame(() => {
    liveStatus.textContent = message;
  });
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function resize() {
  const oldWidth = viewport.width || shell.clientWidth;
  const oldHeight = viewport.height || shell.clientHeight;
  viewport.width = shell.clientWidth;
  viewport.height = shell.clientHeight;
  viewport.dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  if (state.hero && oldWidth && oldHeight) {
    state.hero.x *= viewport.width / oldWidth;
    state.hero.y *= viewport.height / oldHeight;
    keepInArena(state.hero, 0.86);
  }
  seedScenerySparks();
}

function seedScenerySparks() {
  const count = Math.max(18, Math.round((viewport.width * viewport.height) / 26000));
  state.scenerySparks = Array.from({ length: count }, () => ({
    x: Math.random() * viewport.width,
    y: Math.random() * viewport.height,
    size: 0.6 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.25 + Math.random() * 0.5,
    color: Math.random() > 0.72 ? '#d9ff45' : '#bd82ed',
  }));
}

function keepInArena(entity, padding = 0.92) {
  const arena = arenaBounds();
  const dx = entity.x - arena.x;
  const dy = entity.y - arena.y;
  const normalized = (dx * dx) / ((arena.rx * padding) ** 2) + (dy * dy) / ((arena.ry * padding) ** 2);
  if (normalized <= 1) return;
  const factor = 1 / Math.sqrt(normalized);
  entity.x = arena.x + dx * factor;
  entity.y = arena.y + dy * factor;
}

function initializeSound() {
  if (audioContext) {
    if (audioContext.state === 'suspended') audioContext.resume();
    return;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioContext = new AudioCtor();
  masterGain = audioContext.createGain();
  masterGain.gain.value = state.sound ? 0.18 : 0;
  masterGain.connect(audioContext.destination);

  const drone = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  drone.type = 'sawtooth';
  drone.frequency.value = 43.65;
  filter.type = 'lowpass';
  filter.frequency.value = 115;
  filter.Q.value = 4;
  droneGain.gain.value = 0.055;
  lfo.frequency.value = 0.16;
  lfoGain.gain.value = 18;
  lfo.connect(lfoGain).connect(filter.frequency);
  drone.connect(filter).connect(droneGain).connect(masterGain);
  drone.start();
  lfo.start();
  ambientNodes = [drone, lfo];
}

function tone(frequency, duration = 0.12, type = 'sine', volume = 0.16, endFrequency = frequency) {
  if (!audioContext || !state.sound) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function sound(name) {
  if (name === 'attack') tone(320, 0.09, 'triangle', 0.11, 180);
  if (name === 'hit') tone(115, 0.08, 'square', 0.09, 72);
  if (name === 'hurt') tone(92, 0.22, 'sawtooth', 0.15, 44);
  if (name === 'dash') tone(160, 0.2, 'sine', 0.12, 620);
  if (name === 'collect') tone(440 + Math.min(state.energy, 8) * 22, 0.1, 'sine', 0.08, 710);
  if (name === 'burst') {
    tone(90, 0.55, 'sine', 0.18, 520);
    setTimeout(() => tone(680, 0.35, 'triangle', 0.1, 230), 90);
  }
  if (name === 'clear') {
    tone(330, 0.18, 'triangle', 0.1, 440);
    setTimeout(() => tone(495, 0.28, 'triangle', 0.12, 660), 130);
  }
  if (name === 'win') {
    tone(220, 0.28, 'triangle', 0.12, 440);
    setTimeout(() => tone(440, 0.35, 'triangle', 0.12, 880), 190);
  }
}

function resetHero() {
  const arena = arenaBounds();
  state.hero = {
    x: arena.x,
    y: arena.y + arena.ry * 0.35,
    vx: 0,
    vy: 0,
    facing: 1,
    health: 100,
    maxHealth: 100,
    speed: 145,
    damage: 2,
    attackRate: 1,
    attackCooldown: 0,
    dashCooldown: 0,
    dashMaxCooldown: 2.25,
    dashTime: 0,
    dashX: 0,
    dashY: -1,
    invulnerable: 0,
    shieldPulse: 0,
  };
}

function resetGame() {
  state.mode = 'playing';
  state.paused = false;
  state.time = 0;
  state.score = 0;
  state.energy = 0;
  state.wave = 0;
  state.waveClearTimer = 0;
  state.wavePulse = 1.6;
  state.shake = 0;
  state.damageFlash = 0;
  state.companion = 0;
  state.upgrades = { power: 0, speed: 0, shield: 0 };
  state.enemies = [];
  state.bolts = [];
  state.hostileBolts = [];
  state.pickups = [];
  state.particles = [];
  state.shockwaves = [];
  state.spawnQueue = [];
  input.tapTarget = null;
  input.attackHeld = false;
  resetHero();
  hideAllOverlays();
  hud.hidden = false;
  soundButton.hidden = false;
  pauseButton.hidden = false;
  joystickZone.hidden = false;
  actionCluster.hidden = false;
  startWave(0);
  updateTutorialUI();
  updateUI();
  announce('Battle started. Wave one.');
}

function hideAllOverlays() {
  startScreen.hidden = true;
  upgradeScreen.hidden = true;
  pauseScreen.hidden = true;
  endScreen.hidden = true;
}

function startWave(index) {
  state.wave = index;
  state.waveClearTimer = 0;
  state.wavePulse = 1.6;
  state.spawnQueue = waves[index].map(([type, delay]) => ({ type, delay }));
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  updateWaveUI();
  if (index === 2) announce('Final wave. Boss incoming.');
  else announce(`Wave ${index + 1}.`);
}

function spawnEnemy(typeName) {
  const spec = enemyTypes[typeName];
  const arena = arenaBounds();
  const angle = Math.random() * Math.PI * 2;
  const scale = gameScale();
  const enemy = {
    id: nextId++,
    type: typeName,
    x: arena.x + Math.cos(angle) * arena.rx * 0.91,
    y: arena.y + Math.sin(angle) * arena.ry * 0.91,
    vx: 0,
    vy: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed * scale,
    damage: spec.damage,
    radius: spec.radius * scale,
    size: spec.size * scale,
    score: spec.score,
    companion: spec.companion,
    behavior: spec.behavior,
    image: spec.image,
    facing: Math.cos(angle) > 0 ? -1 : 1,
    age: 0,
    spawn: 0,
    attackCooldown: 0.5 + Math.random() * 0.8,
    touchCooldown: 0,
    hitFlash: 0,
    stunned: 0,
    summoned: false,
    dead: false,
  };
  state.enemies.push(enemy);
  burstParticles(enemy.x, enemy.y, typeName === 'boss' ? '#ffb33e' : '#a55be2', typeName === 'boss' ? 26 : 10, 95);
  state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 10, max: enemy.radius * 2.2, life: 0.55, color: typeName === 'boss' ? '#ffb33e' : '#bd82ed' });
  updateUI();
}

function nearestEnemy(origin = state.hero, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.spawn < 0.65) continue;
    const d = distance(origin, enemy);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function attack() {
  if (state.mode !== 'playing' || state.paused || !state.hero || state.hero.attackCooldown > 0) return false;
  const target = nearestEnemy();
  if (!target) return false;
  const hero = state.hero;
  const angle = Math.atan2(target.y - hero.y, target.x - hero.x);
  hero.facing = Math.cos(angle) >= 0 ? 1 : -1;
  hero.attackCooldown = 0.34 / hero.attackRate;
  state.bolts.push({
    x: hero.x + Math.cos(angle) * 24,
    y: hero.y - 12 + Math.sin(angle) * 24,
    vx: Math.cos(angle) * 470,
    vy: Math.sin(angle) * 470,
    radius: 7 + state.upgrades.power * 1.5,
    damage: hero.damage,
    life: 1.3,
    targetId: target.id,
  });
  burstParticles(hero.x + Math.cos(angle) * 32, hero.y - 10 + Math.sin(angle) * 26, '#d9ff45', 5, 70);
  state.shake = Math.max(state.shake, 1.4);
  sound('attack');
  if (state.tutorial === 1) {
    state.tutorial = 2;
    localStorage.setItem('grape-gripe-arena-tutorial', 'done');
    updateTutorialUI();
  }
  return true;
}

function dash() {
  if (state.mode !== 'playing' || state.paused || state.hero.dashCooldown > 0) return;
  const hero = state.hero;
  let x = input.joyX;
  let y = input.joyY;
  if (Math.hypot(x, y) < 0.2) {
    const enemy = nearestEnemy();
    if (enemy) {
      x = hero.x - enemy.x;
      y = hero.y - enemy.y;
    } else {
      x = hero.facing;
      y = 0;
    }
  }
  const length = Math.hypot(x, y) || 1;
  hero.dashX = x / length;
  hero.dashY = y / length;
  hero.dashTime = 0.24;
  hero.invulnerable = 0.34;
  hero.dashCooldown = hero.dashMaxCooldown;
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 15, max: 70, life: 0.4, color: '#d8a4ff' });
  burstParticles(hero.x, hero.y, '#bd82ed', 16, 150);
  sound('dash');
  vibrate(18);
}

function companionBurst() {
  if (state.mode !== 'playing' || state.paused || state.companion < state.maxCompanion) return;
  state.companion = 0;
  const hero = state.hero;
  state.shockwaves.push({ x: hero.x, y: hero.y, radius: 20, max: Math.max(viewport.width, viewport.height) * 0.58, life: 0.85, color: '#d9ff45' });
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const d = distance(hero, enemy);
    if (d < Math.max(viewport.width, viewport.height) * 0.56) {
      enemy.stunned = 2.1;
      hitEnemy(enemy, 5 + state.upgrades.power * 2, true);
    }
  }
  for (const bolt of state.hostileBolts) bolt.dead = true;
  burstParticles(hero.x, hero.y, '#d9ff45', 44, 260);
  state.shake = 13;
  sound('burst');
  vibrate([22, 40, 35]);
  updateUI();
}

function hitEnemy(enemy, damage, burst = false) {
  if (enemy.dead) return;
  enemy.hp -= damage;
  enemy.hitFlash = 0.11;
  const angle = Math.atan2(enemy.y - state.hero.y, enemy.x - state.hero.x);
  enemy.vx += Math.cos(angle) * (burst ? 120 : 42);
  enemy.vy += Math.sin(angle) * (burst ? 120 : 42);
  burstParticles(enemy.x, enemy.y, enemy.type === 'boss' ? '#ffb33e' : '#d9ff45', burst ? 14 : 7, burst ? 150 : 90);
  state.shake = Math.max(state.shake, enemy.type === 'boss' ? 6 : 3);
  sound('hit');
  if (enemy.hp <= 0) killEnemy(enemy);
  else updateUI();
}

function killEnemy(enemy) {
  enemy.dead = true;
  state.score += enemy.score;
  state.companion = clamp(state.companion + enemy.companion, 0, state.maxCompanion);
  const pickupCount = enemy.type === 'boss' ? 10 : enemy.type === 'brute' ? 4 : 2;
  for (let i = 0; i < pickupCount; i += 1) {
    const angle = (i / pickupCount) * Math.PI * 2 + Math.random() * 0.4;
    state.pickups.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * (35 + Math.random() * 65),
      vy: Math.sin(angle) * (35 + Math.random() * 65),
      life: 8,
      age: 0,
      spin: Math.random() * Math.PI,
    });
  }
  state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 12, max: enemy.radius * 2.6, life: 0.5, color: enemy.type === 'boss' ? '#ffb33e' : '#a45add' });
  burstParticles(enemy.x, enemy.y, enemy.type === 'boss' ? '#ffb33e' : '#8e42d0', enemy.type === 'boss' ? 55 : 18, enemy.type === 'boss' ? 250 : 145);
  if (enemy.type === 'boss') state.shake = 22;
  updateUI();
}

function damageHero(amount) {
  const hero = state.hero;
  if (!hero || hero.invulnerable > 0 || state.mode !== 'playing') return;
  const shieldReduction = 1 - state.upgrades.shield * 0.14;
  hero.health = Math.max(0, hero.health - Math.round(amount * shieldReduction));
  hero.invulnerable = 0.65;
  hero.shieldPulse = 0.45;
  state.damageFlash = 0.35;
  state.shake = 12;
  burstParticles(hero.x, hero.y, '#ff4c70', 18, 185);
  sound('hurt');
  vibrate([18, 28, 25]);
  updateUI();
  if (hero.health <= 0) finishGame(false);
}

function spawnHostileBolt(enemy, angle, speed = 145) {
  state.hostileBolts.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: enemy.type === 'boss' ? 9 : 7,
    damage: enemy.damage,
    life: 4,
    dead: false,
  });
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
    if (Math.hypot(dx, dy) < 10) input.tapTarget = null;
    else {
      const length = Math.hypot(dx, dy);
      x = dx / length;
      y = dy / length;
    }
  } else if (Math.hypot(x, y) >= 0.1) {
    input.tapTarget = null;
  }

  const inputLength = Math.hypot(x, y);
  if (inputLength > 1) {
    x /= inputLength;
    y /= inputLength;
  }

  if (inputLength > 0.14 && state.tutorial === 0) {
    state.tutorial = 1;
    updateTutorialUI();
  }

  if (hero.dashTime > 0) {
    hero.dashTime -= dt;
    hero.vx = hero.dashX * hero.speed * 3.25;
    hero.vy = hero.dashY * hero.speed * 3.25;
    if (Math.random() > 0.45) burstParticles(hero.x, hero.y, '#8e42d0', 2, 35);
  } else {
    const easing = 1 - Math.exp(-dt * 11);
    hero.vx += (x * hero.speed - hero.vx) * easing;
    hero.vy += (y * hero.speed - hero.vy) * easing;
  }

  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  keepInArena(hero, 0.86);
  if (Math.abs(hero.vx) > 8) hero.facing = hero.vx >= 0 ? 1 : -1;
}

function updateEnemies(dt) {
  const hero = state.hero;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.age += dt;
    enemy.spawn = Math.min(1, enemy.spawn + dt * 2.8);
    enemy.attackCooldown -= dt;
    enemy.touchCooldown -= dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.stunned = Math.max(0, enemy.stunned - dt);
    if (enemy.spawn < 0.72 || enemy.stunned > 0) {
      enemy.vx *= Math.exp(-dt * 6);
      enemy.vy *= Math.exp(-dt * 6);
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      continue;
    }

    const dx = hero.x - enemy.x;
    const dy = hero.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    let desired = enemy.speed;

    if (enemy.behavior === 'ranged') {
      desired = d > 175 * gameScale() ? enemy.speed : d < 120 * gameScale() ? -enemy.speed * 0.65 : 0;
      if (enemy.attackCooldown <= 0 && d < 300 * gameScale()) {
        spawnHostileBolt(enemy, Math.atan2(dy, dx), 150 * gameScale());
        enemy.attackCooldown = 1.75 + Math.random() * 0.5;
        burstParticles(enemy.x, enemy.y, '#df52ff', 5, 55);
      }
    }

    if (enemy.behavior === 'boss') {
      desired = d > 155 * gameScale() ? enemy.speed : 0;
      if (enemy.attackCooldown <= 0) {
        const base = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i += 1) spawnHostileBolt(enemy, base + i * 0.24, 122 * gameScale());
        enemy.attackCooldown = 2.25;
        state.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 15, max: 82, life: 0.46, color: '#ff4c70' });
        burstParticles(enemy.x, enemy.y, '#ff4c70', 12, 110);
      }
      if (!enemy.summoned && enemy.hp < enemy.maxHp * 0.5) {
        enemy.summoned = true;
        spawnEnemy('sourling');
        spawnEnemy('moth');
        state.shake = 10;
      }
    }

    const easing = 1 - Math.exp(-dt * 3.8);
    enemy.vx += (nx * desired - enemy.vx) * easing;
    enemy.vy += (ny * desired - enemy.vy) * easing;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    keepInArena(enemy, 0.94);
    if (Math.abs(enemy.vx) > 2) enemy.facing = enemy.vx >= 0 ? 1 : -1;

    if (d < enemy.radius + 24 * gameScale() && enemy.touchCooldown <= 0) {
      damageHero(enemy.damage);
      enemy.touchCooldown = 1.05;
      enemy.vx -= nx * 125;
      enemy.vy -= ny * 125;
    }
  }
}

function updateBolts(dt) {
  for (const bolt of state.bolts) {
    bolt.life -= dt;
    const target = state.enemies.find((enemy) => enemy.id === bolt.targetId && !enemy.dead);
    if (target) {
      const desiredAngle = Math.atan2(target.y - bolt.y, target.x - bolt.x);
      const speed = Math.hypot(bolt.vx, bolt.vy);
      const currentAngle = Math.atan2(bolt.vy, bolt.vx);
      let delta = desiredAngle - currentAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const nextAngle = currentAngle + clamp(delta, -dt * 5, dt * 5);
      bolt.vx = Math.cos(nextAngle) * speed;
      bolt.vy = Math.sin(nextAngle) * speed;
    }
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (Math.random() > 0.35) state.particles.push({ x: bolt.x, y: bolt.y, vx: 0, vy: 0, size: 2.5, life: 0.22, maxLife: 0.22, color: '#d9ff45' });
    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.spawn < 0.6) continue;
      if (distance(bolt, enemy) < bolt.radius + enemy.radius * 0.76) {
        hitEnemy(enemy, bolt.damage);
        bolt.life = 0;
        break;
      }
    }
  }
  state.bolts = state.bolts.filter((bolt) => bolt.life > 0);

  for (const bolt of state.hostileBolts) {
    if (bolt.dead) continue;
    bolt.life -= dt;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (distance(bolt, state.hero) < bolt.radius + 19 * gameScale()) {
      damageHero(bolt.damage);
      bolt.dead = true;
    }
  }
  state.hostileBolts = state.hostileBolts.filter((bolt) => !bolt.dead && bolt.life > 0);
}

function updatePickups(dt) {
  for (const pickup of state.pickups) {
    pickup.age += dt;
    pickup.life -= dt;
    pickup.spin += dt * 5;
    const dx = state.hero.x - pickup.x;
    const dy = state.hero.y - pickup.y;
    const d = Math.hypot(dx, dy) || 1;
    if (pickup.age < 0.38) {
      pickup.vx *= Math.exp(-dt * 4);
      pickup.vy *= Math.exp(-dt * 4);
    } else if (d < 155 * gameScale()) {
      pickup.vx += (dx / d) * 840 * dt;
      pickup.vy += (dy / d) * 840 * dt;
    }
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    if (d < 25 * gameScale()) {
      pickup.life = 0;
      state.energy += 1;
      state.score += 2;
      burstParticles(state.hero.x, state.hero.y - 15, '#d9ff45', 4, 60);
      sound('collect');
      updateUI();
    }
  }
  state.pickups = state.pickups.filter((pickup) => pickup.life > 0);
}

function burstParticles(x, y, color, count, speed) {
  const reducedCount = prefersReducedMotion ? Math.ceil(count * 0.35) : count;
  for (let i = 0; i < reducedCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.25 + Math.random() * 0.75);
    const life = 0.28 + Math.random() * 0.48;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 1.5 + Math.random() * 4,
      life,
      maxLife: life,
      color,
    });
  }
}

function updateEffects(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.exp(-dt * 2.8);
    particle.vy *= Math.exp(-dt * 2.8);
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  for (const wave of state.shockwaves) {
    wave.life -= dt;
    wave.radius += (wave.max - wave.radius) * Math.min(1, dt * 7);
  }
  state.shockwaves = state.shockwaves.filter((wave) => wave.life > 0);
  state.shake = Math.max(0, state.shake - dt * 28);
  state.damageFlash = Math.max(0, state.damageFlash - dt);
  state.wavePulse = Math.max(0, state.wavePulse - dt);
  if (state.hero) {
    state.hero.invulnerable = Math.max(0, state.hero.invulnerable - dt);
    state.hero.shieldPulse = Math.max(0, state.hero.shieldPulse - dt);
  }
}

function updateWave(dt) {
  for (const item of state.spawnQueue) item.delay -= dt;
  const ready = state.spawnQueue.filter((item) => item.delay <= 0);
  state.spawnQueue = state.spawnQueue.filter((item) => item.delay > 0);
  for (const item of ready) spawnEnemy(item.type);

  const alive = state.enemies.some((enemy) => !enemy.dead);
  if (!alive && state.spawnQueue.length === 0) {
    state.waveClearTimer += dt;
    if (state.waveClearTimer > 1.15) {
      state.waveClearTimer = -99;
      if (state.wave >= waves.length - 1) finishGame(true);
      else showUpgrade();
    }
  }
}

function update(dt) {
  if (state.mode !== 'playing' || state.paused) return;
  state.time += dt;
  state.hero.attackCooldown = Math.max(0, state.hero.attackCooldown - dt);
  state.hero.dashCooldown = Math.max(0, state.hero.dashCooldown - dt);
  updateMovement(dt);
  updateEnemies(dt);
  updateBolts(dt);
  updatePickups(dt);
  updateEffects(dt);
  updateWave(dt);
  if (input.attackHeld) attack();
  updateCooldownUI();
}

function showUpgrade() {
  state.mode = 'upgrade';
  input.attackHeld = false;
  attackButton.classList.remove('is-held');
  upgradeScreen.hidden = false;
  sound('clear');
  vibrate([18, 34, 18]);
  updateUpgradeDots();
  announce('Wave cleared. Choose one of three powers.');
}

function chooseUpgrade(type) {
  state.upgrades[type] = Math.min(3, state.upgrades[type] + 1);
  if (type === 'power') {
    state.hero.damage += 1;
    state.hero.attackRate += 0.12;
  }
  if (type === 'speed') {
    state.hero.speed += 18;
    state.hero.dashMaxCooldown = Math.max(1.3, state.hero.dashMaxCooldown - 0.28);
  }
  if (type === 'shield') {
    state.hero.maxHealth += 22;
    state.hero.health = state.hero.maxHealth;
  }
  upgradeScreen.hidden = true;
  state.mode = 'playing';
  startWave(state.wave + 1);
  burstParticles(state.hero.x, state.hero.y, type === 'power' ? '#ffb33e' : type === 'speed' ? '#d9ff45' : '#8ee8ff', 28, 190);
  state.shockwaves.push({ x: state.hero.x, y: state.hero.y, radius: 12, max: 120, life: 0.55, color: type === 'shield' ? '#8ee8ff' : '#d9ff45' });
  tone(type === 'power' ? 260 : type === 'speed' ? 520 : 390, 0.35, 'triangle', 0.12, 780);
  updateUI();
}

function finishGame(won) {
  if (state.mode === 'ended') return;
  state.mode = 'ended';
  input.attackHeld = false;
  endScreen.hidden = false;
  endScreen.classList.toggle('is-loss', !won);
  finalScore.textContent = String(state.score + state.energy * 3);
  joystickZone.hidden = true;
  actionCluster.hidden = true;
  pauseButton.hidden = true;
  bossHealth.hidden = true;
  if (won) {
    sound('win');
    vibrate([30, 40, 30, 40, 60]);
    const best = Math.max(Number(localStorage.getItem('grape-gripe-arena-best') || 0), state.score + state.energy * 3);
    localStorage.setItem('grape-gripe-arena-best', String(best));
    announce('Arena cleared.');
  } else {
    announce('Battle ended. Try again.');
  }
}

function pauseBattle() {
  if (state.mode !== 'playing') return;
  state.paused = true;
  input.attackHeld = false;
  pauseScreen.hidden = false;
  pauseButton.setAttribute('aria-label', 'Resume battle');
  announce('Battle paused.');
}

function resumeBattle() {
  if (!state.paused) return;
  state.paused = false;
  pauseScreen.hidden = true;
  pauseButton.setAttribute('aria-label', 'Pause battle');
  lastFrame = performance.now();
  announce('Battle resumed.');
}

function updateTutorialUI() {
  tutorialFocus.hidden = state.tutorial !== 0 || state.mode !== 'playing';
  attackButton.classList.toggle('is-prompted', state.tutorial === 1 && state.mode === 'playing');
}

function updateWaveUI() {
  document.querySelectorAll('.wave-pip').forEach((pip, index) => {
    pip.classList.toggle('active', index === state.wave);
    pip.classList.toggle('complete', index < state.wave);
  });
  document.querySelectorAll('.wave-line').forEach((line, index) => {
    line.classList.toggle('complete', index < state.wave);
  });
}

function updateUpgradeDots() {
  document.querySelectorAll('.upgrade-card').forEach((card) => {
    const level = state.upgrades[card.dataset.upgrade];
    card.querySelectorAll('.level-dots i').forEach((dot, index) => dot.classList.toggle('filled', index < level));
  });
}

function updateCooldownUI() {
  if (!state.hero) return;
  const dashProgress = state.hero.dashCooldown > 0 ? state.hero.dashCooldown / state.hero.dashMaxCooldown : 0;
  dashButton.style.setProperty('--cooldown', String(1 - dashProgress));
  dashButton.disabled = state.hero.dashCooldown > 0;
  companionButton.style.setProperty('--cooldown', String(state.companion / state.maxCompanion));
  companionButton.classList.toggle('is-ready', state.companion >= state.maxCompanion);
  companionButton.disabled = state.companion < state.maxCompanion;
}

function updateUI() {
  if (!state.hero) return;
  healthFill.style.width = `${clamp(state.hero.health / state.hero.maxHealth, 0, 1) * 100}%`;
  energyCount.textContent = String(state.energy);
  updateCooldownUI();
  const boss = state.enemies.find((enemy) => enemy.type === 'boss' && !enemy.dead);
  bossHealth.hidden = !boss;
  if (boss) bossHealthFill.style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
}

function drawBackground() {
  const image = images.arena;
  ctx.fillStyle = '#080510';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  if (image) {
    const scale = Math.max(viewport.width / image.width, viewport.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (viewport.width - width) * 0.5, (viewport.height - height) * 0.5, width, height);
  }
  for (const spark of state.scenerySparks) {
    const alpha = 0.08 + (Math.sin(state.time * spark.speed + spark.phase) + 1) * 0.08;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShadow(x, y, width, alpha = 0.36) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.34);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.55);
  gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSprite(image, x, y, width, facing = 1, alpha = 1, filter = 'none', rotation = 0) {
  if (!image) return;
  const ratio = image.height / image.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(facing, 1);
  ctx.filter = filter;
  ctx.drawImage(image, -width * 0.5, -width * ratio * 0.86, width, width * ratio);
  ctx.restore();
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const pulse = 1 + Math.sin(state.time * 7 + pickup.spin) * 0.18;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(pickup.spin);
    ctx.shadowColor = '#d9ff45';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#d9ff45';
    ctx.beginPath();
    ctx.moveTo(0, -7 * pulse);
    ctx.lineTo(5 * pulse, 0);
    ctx.lineTo(0, 7 * pulse);
    ctx.lineTo(-5 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawBolts() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const bolt of state.bolts) {
    ctx.shadowColor = '#d9ff45';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#efff9b';
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const bolt of state.hostileBolts) {
    ctx.shadowColor = '#ff3b93';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff6ab3';
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const spawnScale = Math.max(0.01, 1 - (1 - enemy.spawn) ** 3);
  const bob = Math.sin(state.time * (enemy.type === 'moth' ? 5 : 2.8) + enemy.id) * (enemy.type === 'moth' ? 7 : 2.5);
  const size = enemy.size * spawnScale;
  drawShadow(enemy.x, enemy.y + 4, size * 0.7, 0.42 * spawnScale);
  let filter = enemy.hitFlash > 0
    ? 'brightness(2.4) saturate(0.3) drop-shadow(0 0 16px #d9ff45)'
    : enemy.stunned > 0
      ? 'saturate(0.55) brightness(1.25) drop-shadow(0 0 12px #d9ff45)'
      : 'drop-shadow(0 8px 8px rgba(0,0,0,.42))';
  const rotation = enemy.stunned > 0 ? Math.sin(state.time * 18 + enemy.id) * 0.05 : Math.sin(state.time * 2 + enemy.id) * 0.015;
  drawSprite(images[enemy.image], enemy.x, enemy.y + bob, size, enemy.facing, spawnScale, filter, rotation);

  if (enemy.hp < enemy.maxHp && enemy.type !== 'boss' && !enemy.dead) {
    const width = Math.max(30, size * 0.62);
    const y = enemy.y - size * 0.8;
    ctx.fillStyle = 'rgba(8,3,13,.74)';
    ctx.fillRect(enemy.x - width / 2, y, width, 5);
    ctx.fillStyle = enemy.type === 'brute' ? '#ffb33e' : '#ff4c70';
    ctx.fillRect(enemy.x - width / 2, y, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
  }
}

function drawHero() {
  const hero = state.hero;
  if (!hero) return;
  const speed = Math.hypot(hero.vx, hero.vy);
  const bob = Math.sin(state.time * (speed > 12 ? 10 : 3.2)) * (speed > 12 ? 3.2 : 1.8);
  const size = 105 * gameScale() * (hero.dashTime > 0 ? 1.08 : 1);
  drawShadow(hero.x, hero.y + 7, size * 0.72, 0.5);
  if (state.upgrades.shield > 0 || hero.shieldPulse > 0) {
    ctx.save();
    ctx.globalAlpha = 0.16 + state.upgrades.shield * 0.025 + hero.shieldPulse * 0.55;
    ctx.strokeStyle = '#8ee8ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#8ee8ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(hero.x, hero.y - size * 0.24, size * 0.49, size * 0.57, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const alpha = hero.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? 0.56 : 1;
  const filter = hero.dashTime > 0
    ? 'brightness(1.3) drop-shadow(0 0 18px #bd82ed)'
    : 'drop-shadow(0 10px 9px rgba(0,0,0,.5))';
  drawSprite(images.hero, hero.x, hero.y + bob, size, hero.facing, alpha, filter, hero.dashTime > 0 ? hero.dashX * 0.08 : 0);

  const companionAngle = state.time * 1.8;
  const cx = hero.x + Math.cos(companionAngle) * size * 0.52;
  const cy = hero.y - size * 0.62 + Math.sin(companionAngle * 1.25) * 9;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16 + state.companion * 0.08);
  glow.addColorStop(0, 'rgba(244,255,166,.95)');
  glow.addColorStop(0.34, 'rgba(185,255,63,.72)');
  glow.addColorStop(1, 'rgba(157,247,45,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 18 + state.companion * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const wave of state.shockwaves) {
    ctx.save();
    ctx.globalAlpha = clamp(wave.life * 1.8, 0, 0.8);
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = wave.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawArenaPulse() {
  if (state.wavePulse <= 0 || state.mode !== 'playing') return;
  const arena = arenaBounds();
  const progress = 1 - state.wavePulse / 1.6;
  ctx.save();
  ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.68;
  ctx.strokeStyle = state.wave === 2 ? '#ffb33e' : '#d9ff45';
  ctx.lineWidth = 5;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(arena.x, arena.y, arena.rx * (0.25 + progress * 0.72), arena.ry * (0.25 + progress * 0.72), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  const shakeX = state.shake > 0 && !prefersReducedMotion ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake > 0 && !prefersReducedMotion ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawArenaPulse();
  drawPickups();
  drawBolts();

  if (state.hero) {
    const drawables = state.enemies
      .filter((enemy) => !enemy.dead)
      .map((enemy) => ({ y: enemy.y, draw: () => drawEnemy(enemy) }));
    drawables.push({ y: state.hero.y, draw: drawHero });
    drawables.sort((a, b) => a.y - b.y);
    for (const drawable of drawables) drawable.draw();
  }
  drawParticles();
  ctx.restore();

  if (state.damageFlash > 0) {
    ctx.globalAlpha = state.damageFlash * 0.55;
    const gradient = ctx.createRadialGradient(viewport.width / 2, viewport.height / 2, viewport.width * 0.18, viewport.width / 2, viewport.height / 2, viewport.width * 0.72);
    gradient.addColorStop(0, 'rgba(255,76,112,0)');
    gradient.addColorStop(1, 'rgba(255,38,84,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.globalAlpha = 1;
  }
}

function frame(now) {
  const dt = Math.min(0.034, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (state.mode !== 'loading') {
    if (state.mode !== 'playing') updateEffects(dt);
    update(dt);
    draw();
  }
  requestAnimationFrame(frame);
}

function setJoystick(event) {
  const rect = joystickZone.getBoundingClientRect();
  const max = 44;
  const dx = event.clientX - input.joyOriginX;
  const dy = event.clientY - input.joyOriginY;
  const length = Math.hypot(dx, dy);
  const scale = length > max ? max / length : 1;
  const x = dx * scale;
  const y = dy * scale;
  input.joyX = x / max;
  input.joyY = y / max;
  joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
  const localX = input.joyOriginX - rect.left;
  const localY = input.joyOriginY - rect.top;
  joystickBase.style.left = `${clamp(localX - 63, 8, rect.width - 134)}px`;
  joystickBase.style.bottom = `${clamp(rect.height - localY - 63, 8, rect.height - 134)}px`;
}

joystickZone.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'playing' || state.paused || input.joystickId !== null) return;
  input.joystickId = event.pointerId;
  input.joyOriginX = event.clientX;
  input.joyOriginY = event.clientY;
  input.tapTarget = null;
  joystickZone.setPointerCapture(event.pointerId);
  joystickZone.classList.add('is-active');
  setJoystick(event);
  event.preventDefault();
});

joystickZone.addEventListener('pointermove', (event) => {
  if (event.pointerId !== input.joystickId) return;
  setJoystick(event);
  event.preventDefault();
});

function releaseJoystick(event) {
  if (event.pointerId !== input.joystickId) return;
  input.joystickId = null;
  input.joyX = 0;
  input.joyY = 0;
  joystickZone.classList.remove('is-active');
  joystickKnob.style.transform = '';
  joystickBase.style.left = '';
  joystickBase.style.bottom = '';
}

joystickZone.addEventListener('pointerup', releaseJoystick);
joystickZone.addEventListener('pointercancel', releaseJoystick);

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'playing' || state.paused) return;
  const rect = canvas.getBoundingClientRect();
  input.tapTarget = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  keepInArena(input.tapTarget, 0.86);
});

attackButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  attackButton.setPointerCapture(event.pointerId);
  input.attackHeld = true;
  attackButton.classList.add('is-held');
  attack();
});

function releaseAttack() {
  input.attackHeld = false;
  attackButton.classList.remove('is-held');
}

attackButton.addEventListener('pointerup', releaseAttack);
attackButton.addEventListener('pointercancel', releaseAttack);
attackButton.addEventListener('lostpointercapture', releaseAttack);
dashButton.addEventListener('click', dash);
companionButton.addEventListener('click', companionBurst);

document.querySelectorAll('.upgrade-card').forEach((button) => {
  button.addEventListener('click', () => chooseUpgrade(button.dataset.upgrade));
});

startButton.addEventListener('click', () => {
  initializeSound();
  resetGame();
});

restartButton.addEventListener('click', () => {
  initializeSound();
  resetGame();
});

pauseButton.addEventListener('click', () => {
  if (state.paused) resumeBattle();
  else pauseBattle();
});

resumeButton.addEventListener('click', resumeBattle);

soundButton.addEventListener('click', () => {
  state.sound = !state.sound;
  soundButton.setAttribute('aria-pressed', String(state.sound));
  soundButton.setAttribute('aria-label', state.sound ? 'Turn sound off' : 'Turn sound on');
  if (masterGain && audioContext) masterGain.gain.setTargetAtTime(state.sound ? 0.18 : 0, audioContext.currentTime, 0.03);
  if (state.sound) {
    initializeSound();
    tone(440, 0.12, 'sine', 0.08, 660);
  }
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)) {
    input.keys.add(key);
    event.preventDefault();
  }
  if (key === ' ' || key === 'enter') {
    if (state.mode === 'start' || state.mode === 'ended') {
      initializeSound();
      resetGame();
    } else attack();
    event.preventDefault();
  }
  if (key === 'shift') dash();
  if (key === 'e') companionBurst();
  if (key === 'escape') {
    if (state.paused) resumeBattle();
    else pauseBattle();
  }
});

window.addEventListener('keyup', (event) => input.keys.delete(event.key.toLowerCase()));
window.addEventListener('resize', resize, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing' && !state.paused) pauseBattle();
});

async function loadImages() {
  const entries = Object.entries(imagePaths);
  await Promise.all(entries.map(([key, source]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      images[key] = image;
      resolve();
    };
    image.onerror = () => reject(new Error(`Could not load ${source}`));
    image.src = source;
  })));
}

resize();
requestAnimationFrame(frame);

loadImages()
  .then(() => {
    state.mode = 'start';
    loadingScreen.classList.add('is-ready');
    startScreen.hidden = false;
    setTimeout(() => {
      loadingScreen.hidden = true;
    }, 380);
    draw();
    startButton.focus({ preventScroll: true });
    announce('Arena ready. Press the large play button.');
  })
  .catch(() => {
    state.mode = 'start';
    loadingScreen.hidden = true;
    startScreen.hidden = false;
    announce('Some arena art could not load. Reload to try again.');
  });
