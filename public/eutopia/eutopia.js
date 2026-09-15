import * as THREE from 'three';
import { beats, START_BEAT_ID } from './beats.mjs';

const $ = (id) => document.getElementById(id);
const narratorEl = $('narrator');
const instructionEl = $('instruction');
const titleEl = $('beat-title');
const overlay = $('overlay');
const overlayBody = $('overlay-body');
const restartBtn = $('restart');
const continueBtn = $('continue-narrator');

const keys = new Set();
const state = {
  beatId: START_BEAT_ID,
  lineIndex: 0,
  phase: 'playing', // playing | ending
  defiance: 0,
  obedience: 0,
  doorCooldown: 0,
};

const ROOM = { width: 14, depth: 16, height: 5 };
const DOOR_Z = -ROOM.depth / 2 + 0.35;
const DOOR_X = 3.2;

// --- Three.js scene ---------------------------------------------------------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x1a1020);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a1020, 8, 28);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 80);
camera.position.set(0, 1.6, ROOM.depth / 2 - 2.5);

const player = {
  x: 0,
  z: ROOM.depth / 2 - 2.8,
  yaw: 0,
  speed: 4.2,
  turn: 1.8,
};

const ambient = new THREE.AmbientLight(0xffe8d2, 0.55);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xfff0d8, 1.1);
keyLight.position.set(4, 8, 6);
scene.add(keyLight);
const rim = new THREE.PointLight(0xc45cff, 0.6, 24);
rim.position.set(-3, 3, -2);
scene.add(rim);

const mats = {
  floor: new THREE.MeshStandardMaterial({ color: 0x3a2438, roughness: 0.85, metalness: 0.05 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x4a3050, roughness: 0.9 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.45, metalness: 0.35 }),
  leftDoor: new THREE.MeshStandardMaterial({ color: 0x6bbf7a, emissive: 0x1a5a2a, emissiveIntensity: 0.45 }),
  rightDoor: new THREE.MeshStandardMaterial({ color: 0xc45c6a, emissive: 0x5a1020, emissiveIntensity: 0.55 }),
  pillar: new THREE.MeshStandardMaterial({ color: 0x6e4a3a, roughness: 0.7 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x8b5cff, emissive: 0x3a1a6a, emissiveIntensity: 0.3 }),
};

const roomRoot = new THREE.Group();
scene.add(roomRoot);

function box(w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  roomRoot.add(mesh);
  return mesh;
}

function buildLobby() {
  while (roomRoot.children.length) roomRoot.remove(roomRoot.children[0]);

  box(ROOM.width, 0.2, ROOM.depth, mats.floor, 0, 0, 0);
  box(ROOM.width, 0.15, ROOM.depth, mats.trim, 0, ROOM.height, 0); // ceiling
  // walls
  box(ROOM.width, ROOM.height, 0.25, mats.wall, 0, ROOM.height / 2, -ROOM.depth / 2);
  box(ROOM.width, ROOM.height, 0.25, mats.wall, 0, ROOM.height / 2, ROOM.depth / 2);
  box(0.25, ROOM.height, ROOM.depth, mats.wall, -ROOM.width / 2, ROOM.height / 2, 0);
  box(0.25, ROOM.height, ROOM.depth, mats.wall, ROOM.width / 2, ROOM.height / 2, 0);

  // decorative pillars / brochure props
  for (const x of [-5, 5]) {
    box(0.55, 3.2, 0.55, mats.pillar, x, 1.6, -2);
    box(0.7, 0.18, 0.7, mats.trim, x, 3.25, -2);
  }
  box(2.4, 0.08, 1.1, mats.accent, 0, 0.9, 2.5); // tasting table
  box(0.35, 0.55, 0.35, mats.trim, -0.4, 1.2, 2.5);
  box(0.28, 0.7, 0.28, mats.accent, 0.45, 1.28, 2.45);

  // doors (openings framed + colored slabs)
  const doorH = 2.6;
  const doorW = 1.5;
  for (const side of [-1, 1]) {
    const x = side * DOOR_X;
    box(0.2, doorH + 0.4, 0.35, mats.trim, x - doorW / 2 - 0.15, doorH / 2, DOOR_Z);
    box(0.2, doorH + 0.4, 0.35, mats.trim, x + doorW / 2 + 0.15, doorH / 2, DOOR_Z);
    box(doorW + 0.5, 0.25, 0.35, mats.trim, x, doorH + 0.15, DOOR_Z);
    const mat = side < 0 ? mats.leftDoor : mats.rightDoor;
    const door = box(doorW, doorH, 0.12, mat, x, doorH / 2, DOOR_Z + 0.05);
    door.userData.side = side < 0 ? 'left' : 'right';
  }

  // floor arrows / labels as thin emissive strips
  box(1.2, 0.04, 0.25, mats.leftDoor, -DOOR_X, 0.12, -1);
  box(1.2, 0.04, 0.25, mats.rightDoor, DOOR_X, 0.12, -1);
}

buildLobby();

const glitchMeshes = [];
roomRoot.traverse((obj) => {
  if (obj.isMesh) glitchMeshes.push(obj);
});

// --- Beat / narrator UI -----------------------------------------------------
function currentBeat() {
  return beats[state.beatId];
}

function showLine() {
  const beat = currentBeat();
  titleEl.textContent = beat.title;
  const line = beat.narrator[Math.min(state.lineIndex, beat.narrator.length - 1)];
  narratorEl.textContent = line;
  instructionEl.textContent =
    beat.kind === 'ending' ? 'Ending reached — restart anytime.' : beat.instruction;
  document.body.dataset.mood = beat.mood;
  applyMood(beat.mood);
  continueBtn.hidden = state.lineIndex >= beat.narrator.length - 1 || beat.kind === 'ending';
}

function applyMood(mood) {
  if (mood === 'glitch') {
    scene.fog.color.set(0x2a0818);
    renderer.setClearColor(0x2a0818);
    ambient.color.set(0xff6688);
    ambient.intensity = 0.75;
    rim.color.set(0xff2244);
    rim.intensity = 1.4;
    mats.floor.color.set(0x501028);
    mats.wall.color.set(0x6a1838);
  } else {
    scene.fog.color.set(0x1a1020);
    renderer.setClearColor(0x1a1020);
    ambient.color.set(0xffe8d2);
    ambient.intensity = 0.55;
    rim.color.set(0xc45cff);
    rim.intensity = 0.6;
    mats.floor.color.set(0x3a2438);
    mats.wall.color.set(0x4a3050);
  }
}

function enterBeat(id) {
  state.beatId = id;
  state.lineIndex = 0;
  state.doorCooldown = 0.8;
  const beat = currentBeat();
  player.x = 0;
  player.z = ROOM.depth / 2 - 2.8;
  player.yaw = 0;
  buildLobby();
  glitchMeshes.length = 0;
  roomRoot.traverse((obj) => {
    if (obj.isMesh) glitchMeshes.push(obj);
  });
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
    <p class="stats">Obeyed ${state.obedience} · Defied ${state.defiance}</p>
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
  enterBeat(door.next);
}

function restart() {
  state.obedience = 0;
  state.defiance = 0;
  overlay.hidden = true;
  enterBeat(START_BEAT_ID);
}

continueBtn.addEventListener('click', advanceNarrator);
restartBtn.addEventListener('click', restart);
$('start').addEventListener('click', () => {
  $('boot').hidden = true;
  restart();
});

// --- Input ------------------------------------------------------------------
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

// Touch / click door buttons
$('door-left').addEventListener('click', () => chooseDoor('left'));
$('door-right').addEventListener('click', () => chooseDoor('right'));

// Pointer look (optional drag)
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

// --- Simulation -------------------------------------------------------------
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

  // Door trigger volumes near back wall
  if (player.z < DOOR_Z + 1.35) {
    if (player.x < -DOOR_X + 1.1 && player.x > -DOOR_X - 1.1) chooseDoor('left');
    else if (player.x > DOOR_X - 1.1 && player.x < DOOR_X + 1.1) chooseDoor('right');
  }

  // Glitch jitter when defiance path
  const beat = currentBeat();
  if (beat.mood === 'glitch') {
    const t = performance.now() * 0.001;
    for (let i = 0; i < glitchMeshes.length; i += 3) {
      const m = glitchMeshes[i];
      if (!m || !m.position) continue;
      m.rotation.y = Math.sin(t * 3 + i) * 0.04;
      m.position.y += Math.sin(t * 8 + i) * 0.002;
    }
    rim.intensity = 1.1 + Math.sin(t * 6) * 0.5;
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
  camera.position.set(player.x, 1.6, player.z);
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

// Boot UI defaults
document.body.dataset.mood = 'brochure';
narratorEl.textContent = 'The Narrator Sommelier is polishing a script.';
instructionEl.textContent = 'Press Start when ready.';
requestAnimationFrame(frame);

// Expose a tiny harness for smoke tests in non-browser contexts is not needed;
// schema lives in beats.mjs.
