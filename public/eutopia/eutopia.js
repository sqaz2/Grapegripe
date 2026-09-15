import * as THREE from 'three';
import { beats, START_BEAT_ID } from './beats.mjs';

const $ = (id) => document.getElementById(id);
const narratorEl = $('narrator');
const instructionEl = $('instruction');
const consequenceEl = $('consequence');
const titleEl = $('beat-title');
const pathEl = $('path-log');
const overlay = $('overlay');
const overlayBody = $('overlay-body');
const restartBtn = $('restart');
const continueBtn = $('continue-narrator');

const keys = new Set();
const state = {
  beatId: START_BEAT_ID,
  lineIndex: 0,
  phase: 'playing',
  defiance: 0,
  obedience: 0,
  doorCooldown: 0,
  path: [],
};

const ROOM = { width: 14, depth: 16, height: 5.2 };
const DOOR_Z = -ROOM.depth / 2 + 0.35;
const DOOR_X = 3.35;

const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x140c1c);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x140c1c, 7, 26);

const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 80);
camera.position.set(0, 1.55, ROOM.depth / 2 - 2.4);

const player = { x: 0, z: ROOM.depth / 2 - 2.8, yaw: 0, speed: 4.1, turn: 1.85 };

const ambient = new THREE.AmbientLight(0xffe4c8, 0.48);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xfff2dc, 1.05);
keyLight.position.set(5, 9, 4);
scene.add(keyLight);
const rim = new THREE.PointLight(0xb46cff, 0.7, 26);
rim.position.set(-3.2, 3.2, -1.5);
scene.add(rim);
const pool = new THREE.PointLight(0xffd27a, 0.55, 14);
pool.position.set(0, 2.4, 1.5);
scene.add(pool);

const mats = {
  floorDark: new THREE.MeshStandardMaterial({ color: 0x2a1a28, roughness: 0.82, metalness: 0.08 }),
  floorLight: new THREE.MeshStandardMaterial({ color: 0x3d2a38, roughness: 0.78, metalness: 0.1 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x3a2438, roughness: 0.88 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0x52405a, roughness: 0.92 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.4, metalness: 0.45 }),
  velvet: new THREE.MeshStandardMaterial({ color: 0x5a1e38, roughness: 0.95 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x6a3a88,
    emissive: 0x3a1858,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.55,
    roughness: 0.2,
    metalness: 0.1,
  }),
  leftDoor: new THREE.MeshStandardMaterial({ color: 0x6bbf7a, emissive: 0x163a22, emissiveIntensity: 0.5 }),
  rightDoor: new THREE.MeshStandardMaterial({ color: 0xd45c6e, emissive: 0x4a1020, emissiveIntensity: 0.55 }),
  bottle: new THREE.MeshStandardMaterial({ color: 0x1d4a38, roughness: 0.35, metalness: 0.25 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xb08958, roughness: 0.9 }),
  pamphlet: new THREE.MeshStandardMaterial({ color: 0xf2e6c8, emissive: 0x6a5830, emissiveIntensity: 0.15 }),
  must: new THREE.MeshStandardMaterial({ color: 0x6a2040, emissive: 0x3a0820, emissiveIntensity: 0.35, roughness: 0.55 }),
  neon: new THREE.MeshStandardMaterial({ color: 0xff8ab0, emissive: 0xff3366, emissiveIntensity: 0.8 }),
};

const roomRoot = new THREE.Group();
scene.add(roomRoot);
let glitchMeshes = [];

function mesh(geo, mat, x, y, z, parent = roomRoot) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function box(w, h, d, mat, x, y, z, parent) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
}

function cyl(rTop, rBot, h, mat, x, y, z, parent) {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, 12), mat, x, y, z, parent);
}

function clearRoom() {
  while (roomRoot.children.length) roomRoot.remove(roomRoot.children[0]);
}

function checkerFloor() {
  const tile = 1.4;
  for (let xi = -5; xi <= 4; xi += 1) {
    for (let zi = -5; zi <= 5; zi += 1) {
      const light = (xi + zi) % 2 === 0;
      box(tile * 0.98, 0.12, tile * 0.98, light ? mats.floorLight : mats.floorDark, xi * tile + tile / 2, 0, zi * tile, roomRoot);
    }
  }
}

function shellWalls() {
  box(ROOM.width, ROOM.height, 0.28, mats.wall, 0, ROOM.height / 2, -ROOM.depth / 2);
  box(ROOM.width, ROOM.height, 0.28, mats.wall, 0, ROOM.height / 2, ROOM.depth / 2);
  box(0.28, ROOM.height, ROOM.depth, mats.wall, -ROOM.width / 2, ROOM.height / 2, 0);
  box(0.28, ROOM.height, ROOM.depth, mats.wall, ROOM.width / 2, ROOM.height / 2, 0);
  box(ROOM.width, 0.16, ROOM.depth, mats.trim, 0, ROOM.height, 0);
  // gold baseboard
  box(ROOM.width - 0.4, 0.18, 0.12, mats.trim, 0, 0.2, -ROOM.depth / 2 + 0.2);
  box(ROOM.width - 0.4, 0.18, 0.12, mats.trim, 0, 0.2, ROOM.depth / 2 - 0.2);
}

function archedWindow(x, z, rotY = 0) {
  const g = new THREE.Group();
  box(2.2, 2.8, 0.18, mats.trim, 0, 2.1, 0, g);
  box(1.7, 2.2, 0.08, mats.glass, 0, 2.0, 0.06, g);
  box(1.7, 0.08, 0.1, mats.trim, 0, 2.0, 0.1, g);
  box(0.08, 2.2, 0.1, mats.trim, 0, 2.0, 0.1, g);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  roomRoot.add(g);
}

function bottleChandelier(x, z) {
  box(0.08, 0.9, 0.08, mats.trim, x, 4.4, z);
  for (const [dx, dz] of [[-0.35, 0], [0.35, 0], [0, -0.35], [0, 0.35], [0, 0]]) {
    cyl(0.09, 0.12, 0.55, mats.bottle, x + dx, 3.75, z + dz);
    cyl(0.07, 0.07, 0.12, mats.cork, x + dx, 4.08, z + dz);
  }
  const glow = new THREE.PointLight(0xffc878, 0.55, 8);
  glow.position.set(x, 3.6, z);
  roomRoot.add(glow);
}

function framedDoors(leftLabel = true) {
  const doorH = 2.65;
  const doorW = 1.55;
  for (const side of [-1, 1]) {
    const x = side * DOOR_X;
    box(0.22, doorH + 0.45, 0.4, mats.trim, x - doorW / 2 - 0.18, doorH / 2, DOOR_Z);
    box(0.22, doorH + 0.45, 0.4, mats.trim, x + doorW / 2 + 0.18, doorH / 2, DOOR_Z);
    box(doorW + 0.55, 0.28, 0.4, mats.trim, x, doorH + 0.2, DOOR_Z);
    const mat = side < 0 ? mats.leftDoor : mats.rightDoor;
    const door = box(doorW, doorH, 0.12, mat, x, doorH / 2, DOOR_Z + 0.05);
    door.userData.side = side < 0 ? 'left' : 'right';
    // floor path strip
    box(1.15, 0.05, 0.28, mat, x, 0.14, -1.1);
  }
}

function dressLobby() {
  for (const x of [-5.1, 5.1]) {
    cyl(0.35, 0.4, 3.4, mats.cork, x, 1.7, -2.2);
    box(0.85, 0.16, 0.85, mats.trim, x, 3.45, -2.2);
  }
  box(2.6, 0.1, 1.2, mats.velvet, 0, 0.85, 2.6);
  box(0.28, 0.55, 0.28, mats.bottle, -0.45, 1.2, 2.6);
  box(0.22, 0.7, 0.22, mats.pamphlet, 0.5, 1.28, 2.55);
  bottleChandelier(0, 0.5);
  archedWindow(-ROOM.width / 2 + 0.2, -1.5, Math.PI / 2);
  archedWindow(ROOM.width / 2 - 0.2, -1.5, -Math.PI / 2);
}

function dressAtrium() {
  for (const x of [-4.2, 0, 4.2]) box(1.1, 2.2, 0.08, mats.pamphlet, x, 2.0, -ROOM.depth / 2 + 0.4);
  box(3.2, 0.12, 1.6, mats.trim, 0, 0.9, 1.8);
  for (let i = 0; i < 5; i += 1) cyl(0.08, 0.1, 0.4, mats.bottle, -0.8 + i * 0.4, 1.2, 1.8);
  bottleChandelier(-2.5, -1);
  bottleChandelier(2.5, -1);
  // velvet rope posts
  for (const x of [-2.2, 2.2]) {
    cyl(0.08, 0.08, 1.1, mats.trim, x, 0.55, 0.2);
    box(1.8, 0.06, 0.06, mats.velvet, 0, 1.0, 0.2);
  }
}

function dressService() {
  // industrial shelves of barrels
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = -4.5 + col * 1.3;
      const z = -2 + row * 1.5;
      cyl(0.45, 0.45, 0.85, mats.cork, x, 0.55 + (col % 2) * 0.1, z);
    }
  }
  box(0.2, 2.4, 4, mats.neon, -ROOM.width / 2 + 0.25, 2.2, 0);
  pool.intensity = 0.2;
}

function dressBooth() {
  box(4.5, 1.1, 1.4, mats.velvet, 0, 0.7, 0.5);
  box(3.8, 0.05, 0.9, mats.pamphlet, 0, 1.28, 0.5);
  for (let i = 0; i < 6; i += 1) box(0.35, 0.02, 0.5, mats.pamphlet, -1.4 + i * 0.55, 1.35, 0.55);
  bottleChandelier(0, -1.5);
  archedWindow(0, -ROOM.depth / 2 + 0.25, 0);
}

function dressEmployee() {
  // vending + punch clock silhouettes
  box(1.4, 2.2, 0.7, mats.plaster, -3.5, 1.2, 1.5);
  box(1.2, 0.15, 0.15, mats.neon, -3.5, 2.0, 1.9);
  box(0.7, 0.9, 0.2, mats.trim, 3.2, 1.5, -1);
  box(0.5, 0.35, 0.08, mats.pamphlet, 3.2, 1.55, -0.85);
  for (const z of [-3, -1, 1]) cyl(0.2, 0.2, 1.6, mats.bottle, 4.5, 0.9, z);
  pool.color.set(0x88aaff);
}

function dressMaze() {
  const offsets = [-3.2, -1.1, 1.1, 3.2];
  for (const x of offsets) {
    for (const z of [-3.5, -1.2, 1.2]) {
      cyl(0.55, 0.55, 1.5, mats.cork, x + (z > 0 ? 0.2 : 0), 0.85, z);
    }
  }
  box(8, 0.08, 8, mats.must, 0, 0.08, -1);
  rim.intensity = 1.6;
}

function dressEnding(mood) {
  if (mood === 'brochure') {
    bottleChandelier(0, 0);
    box(2.2, 0.05, 1.2, mats.pamphlet, 0, 1.0, 1.5);
    for (const x of [-3, 3]) cyl(0.3, 0.35, 2.8, mats.trim, x, 1.5, -2);
  } else {
    for (let i = 0; i < 8; i += 1) {
      cyl(0.2, 0.35, 0.9 + (i % 3) * 0.2, mats.must, -3 + i * 0.85, 0.5, -1 + (i % 2));
    }
    box(10, 0.12, 10, mats.must, 0, 0.06, 0);
  }
}

function buildRoom(beat) {
  clearRoom();
  pool.intensity = 0.55;
  pool.color.set(0xffd27a);
  rim.intensity = beat.mood === 'glitch' ? 1.35 : 0.7;
  checkerFloor();
  shellWalls();
  if (beat.kind === 'beat') framedDoors();
  const dress = beat.setDressing || 'lobby';
  if (dress === 'lobby') dressLobby();
  else if (dress === 'atrium') dressAtrium();
  else if (dress === 'service') dressService();
  else if (dress === 'booth') dressBooth();
  else if (dress === 'employee') dressEmployee();
  else if (dress === 'maze') dressMaze();
  else if (dress === 'ending-brochure') dressEnding('brochure');
  else if (dress === 'ending-glitch') dressEnding('glitch');
  else dressLobby();

  glitchMeshes = [];
  roomRoot.traverse((obj) => {
    if (obj.isMesh) glitchMeshes.push(obj);
  });
}

function currentBeat() {
  return beats[state.beatId];
}

function renderPath() {
  if (!pathEl) return;
  if (!state.path.length) {
    pathEl.textContent = 'Path: —';
    return;
  }
  pathEl.textContent = `Path: ${state.path.map((p) => (p === 'obey' ? '✓' : '✗')).join(' · ')}`;
}

function showLine() {
  const beat = currentBeat();
  titleEl.textContent = beat.title;
  const line = beat.narrator[Math.min(state.lineIndex, beat.narrator.length - 1)];
  narratorEl.textContent = line;
  instructionEl.textContent =
    beat.kind === 'ending' ? 'Ending reached — restart anytime.' : beat.instruction;
  if (consequenceEl) {
    consequenceEl.textContent = beat.kind === 'ending' ? beat.epilogue : beat.consequenceHint || '';
  }
  document.body.dataset.mood = beat.mood;
  applyMood(beat.mood);
  continueBtn.hidden = state.lineIndex >= beat.narrator.length - 1 || beat.kind === 'ending';
  const left = $('door-left');
  const right = $('door-right');
  if (beat.kind === 'beat') {
    left.hidden = false;
    right.hidden = false;
    left.textContent = `◀ ${beat.doors.left.label}`;
    right.textContent = `${beat.doors.right.label} ▶`;
  } else {
    left.hidden = true;
    right.hidden = true;
  }
  renderPath();
}

function applyMood(mood) {
  if (mood === 'glitch') {
    scene.fog.color.set(0x2a0818);
    renderer.setClearColor(0x2a0818);
    ambient.color.set(0xff6688);
    ambient.intensity = 0.72;
    rim.color.set(0xff2244);
    mats.wall.color.set(0x5a1834);
    mats.plaster.color.set(0x6a2844);
  } else {
    scene.fog.color.set(0x140c1c);
    renderer.setClearColor(0x140c1c);
    ambient.color.set(0xffe4c8);
    ambient.intensity = 0.48;
    rim.color.set(0xb46cff);
    mats.wall.color.set(0x3a2438);
    mats.plaster.color.set(0x52405a);
  }
}

function enterBeat(id) {
  state.beatId = id;
  state.lineIndex = 0;
  state.doorCooldown = 0.85;
  const beat = currentBeat();
  player.x = 0;
  player.z = ROOM.depth / 2 - 2.8;
  player.yaw = 0;
  buildRoom(beat);
  showLine();
  if (beat.kind === 'ending') {
    state.phase = 'ending';
    showEnding(beat);
  } else {
    state.phase = 'playing';
    overlay.hidden = true;
  }
}

function showEnding(beat) {
  overlay.hidden = false;
  overlayBody.innerHTML = `
    <small>GRAPE.GRIPE / EUTOPIA</small>
    <h1>${beat.title}</h1>
    <p class="narrator-block">${beat.narrator.join('<br><br>')}</p>
    <p>${beat.epilogue}</p>
    <p class="stats">Obeyed ${state.obedience} · Defied ${state.defiance} · Path ${state.path.map((p) => (p === 'obey' ? '✓' : '✗')).join('')}</p>
  `;
}

function advanceNarrator() {
  const beat = currentBeat();
  if (state.lineIndex < beat.narrator.length - 1) {
    state.lineIndex += 1;
    showLine();
  }
}

function chooseDoor(side) {
  const beat = currentBeat();
  if (beat.kind !== 'beat' || state.doorCooldown > 0 || state.phase !== 'playing') return;
  const door = beat.doors[side];
  if (!door) return;
  if (door.choice === 'defy') state.defiance += 1;
  else state.obedience += 1;
  state.path.push(door.choice);
  enterBeat(door.next);
}

function restart() {
  state.obedience = 0;
  state.defiance = 0;
  state.path = [];
  overlay.hidden = true;
  enterBeat(START_BEAT_ID);
}

continueBtn.addEventListener('click', advanceNarrator);
restartBtn.addEventListener('click', restart);
$('start').addEventListener('click', () => {
  $('boot').hidden = true;
  restart();
});

const keyMap = {
  ArrowUp: 'forward',
  KeyW: 'forward',
  ArrowDown: 'back',
  KeyS: 'back',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyQ: 'turnLeft',
  KeyE: 'turnRight',
  Space: 'advance',
  Enter: 'advance',
};

addEventListener('keydown', (e) => {
  const action = keyMap[e.code];
  if (!action) return;
  e.preventDefault();
  if (action === 'advance') {
    if (!$('boot').hidden) return;
    if (state.phase === 'ending') return;
    advanceNarrator();
    return;
  }
  keys.add(action);
});
addEventListener('keyup', (e) => {
  const action = keyMap[e.code];
  if (action) keys.delete(action);
});
addEventListener('blur', () => keys.clear());

$('door-left').addEventListener('click', () => chooseDoor('left'));
$('door-right').addEventListener('click', () => chooseDoor('right'));

let dragging = false;
let lastX = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', () => {
  dragging = false;
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || state.phase !== 'playing') return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  player.yaw -= dx * 0.005;
});

const halfW = ROOM.width / 2 - 0.7;
const halfD = ROOM.depth / 2 - 0.7;

function step(dt) {
  if (state.phase !== 'playing') return;
  state.doorCooldown = Math.max(0, state.doorCooldown - dt);

  if (keys.has('turnLeft')) player.yaw += player.turn * dt;
  if (keys.has('turnRight')) player.yaw -= player.turn * dt;

  let mx = 0;
  let mz = 0;
  if (keys.has('forward')) mz -= 1;
  if (keys.has('back')) mz += 1;
  if (keys.has('left')) mx -= 1;
  if (keys.has('right')) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len;
    mz /= len;
    const cos = Math.cos(player.yaw);
    const sin = Math.sin(player.yaw);
    const dx = (mx * cos - mz * sin) * player.speed * dt;
    const dz = (mx * sin + mz * cos) * player.speed * dt;
    player.x = Math.max(-halfW, Math.min(halfW, player.x + dx));
    player.z = Math.max(-halfD, Math.min(halfD, player.z + dz));
  }

  if (player.z < DOOR_Z + 1.35) {
    if (player.x < -DOOR_X + 1.1 && player.x > -DOOR_X - 1.1) chooseDoor('left');
    else if (player.x > DOOR_X - 1.1 && player.x < DOOR_X + 1.1) chooseDoor('right');
  }

  const beat = currentBeat();
  if (beat.mood === 'glitch') {
    const t = performance.now() * 0.001;
    for (let i = 0; i < glitchMeshes.length; i += 4) {
      const m = glitchMeshes[i];
      if (!m?.rotation) continue;
      m.rotation.y = Math.sin(t * 2.6 + i) * 0.03;
    }
    rim.intensity = 1.15 + Math.sin(t * 5) * 0.45;
  }
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function render() {
  camera.position.set(player.x, 1.55, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = 0;
  renderer.render(scene, camera);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  resize();
  step(dt);
  render();
  requestAnimationFrame(frame);
}

document.body.dataset.mood = 'brochure';
narratorEl.textContent = 'The Narrator Sommelier is polishing a denser script.';
instructionEl.textContent = 'Press Start when ready.';
if (consequenceEl) consequenceEl.textContent = 'Choices rewrite the room — not just the text.';
requestAnimationFrame(frame);
