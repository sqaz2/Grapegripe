(() => {
  'use strict';

  const canvas = document.querySelector('#world');
  const ctx = canvas.getContext('2d', { alpha: true });
  const minimap = document.querySelector('#minimap');
  const mapCtx = minimap.getContext('2d');

  const ui = {
    location: document.querySelector('#location-label'),
    objective: document.querySelector('#objective-label'),
    route: document.querySelector('#route-label'),
    mapCaption: document.querySelector('#map-caption'),
    mapButton: document.querySelector('#map-button'),
    coachmark: document.querySelector('#coachmark'),
    joystickZone: document.querySelector('#joystick-zone'),
    joystickBase: document.querySelector('#joystick-base'),
    joystickKnob: document.querySelector('#joystick-knob'),
    actionButton: document.querySelector('#action-button'),
    actionLabel: document.querySelector('#action-label'),
    companionButton: document.querySelector('#companion-button'),
    companionPanel: document.querySelector('#companion-panel'),
    companionThought: document.querySelector('#companion-thought'),
    closeCompanion: document.querySelector('#close-companion'),
    backdrop: document.querySelector('#sheet-backdrop'),
    sheet: document.querySelector('#story-sheet'),
    sheetContent: document.querySelector('#sheet-content'),
    toast: document.querySelector('#toast'),
    progressBadge: document.querySelector('#progress-badge'),
    soundToggle: document.querySelector('#sound-toggle'),
  };

  const palette = {
    ink: '#120d1b',
    grape: '#853fc0',
    plum: '#4f1f69',
    violet: '#bf86ee',
    acid: '#c7ef3d',
    amber: '#ffb351',
    cream: '#fff8e9',
    danger: '#ff6b68',
    blue: '#6bd4ff',
  };

  const WORLD = { width: 2200, height: 1500 };
  const START = { x: 330, y: 940 };
  const branch = { x: 840, y: 660, radius: 50 };
  const fragments = [
    {
      id: 'seen',
      x: 1115,
      y: 455,
      radius: 42,
      color: palette.blue,
      label: 'SEEN',
      text: 'No reply arrived today.',
    },
    {
      id: 'read',
      x: 1225,
      y: 890,
      radius: 42,
      color: palette.amber,
      label: 'ASSUMED',
      text: 'Silence means they do not care.',
    },
  ];
  const fork = { x: 1670, y: 665, radius: 58 };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keys = new Set();
  const collected = new Set();
  const state = {
    phase: 'approach',
    modalOpen: false,
    companionOpen: false,
    waypoint: null,
    outcome: null,
    frame: 0,
    elapsed: 0,
    routeFlash: 0,
    movementLearned: false,
    branchAwake: false,
    healed: false,
  };

  const player = {
    x: START.x,
    y: START.y,
    vx: 0,
    vy: 0,
    facing: 0,
    radius: 22,
  };
  const companion = {
    x: START.x - 54,
    y: START.y - 36,
    vx: 0,
    vy: 0,
  };
  const camera = { x: START.x, y: START.y };
  const joystick = { active: false, pointerId: null, x: 0, y: 0, magnitude: 0 };

  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let lastTime = performance.now();
  let toastTimer = 0;
  let audio = null;

  const particles = Array.from({ length: reducedMotion ? 28 : 72 }, (_, index) => ({
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    size: 0.7 + Math.random() * 2.5,
    depth: 0.35 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2 + index,
  }));

  function readCompleted() {
    try {
      return window.localStorage.getItem('grapeGripe.playableBranch.complete') === 'true';
    } catch {
      return false;
    }
  }

  function writeCompleted() {
    try {
      window.localStorage.setItem('grapeGripe.playableBranch.complete', 'true');
    } catch {
      // Private browsing can reject storage; completing the case still works.
    }
  }

  function resize() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewWidth * dpr);
    canvas.height = Math.round(viewHeight * dpr);
    canvas.style.width = `${viewWidth}px`;
    canvas.style.height = `${viewHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function vibrate(pattern = 18) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  function showToast(message, duration = 2600) {
    window.clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      ui.toast.hidden = true;
    }, duration);
  }

  function openSheet(content, focusSelector = 'button') {
    closeCompanion();
    state.modalOpen = true;
    state.waypoint = null;
    ui.sheetContent.innerHTML = content;
    ui.backdrop.hidden = false;
    ui.sheet.hidden = false;
    window.setTimeout(() => ui.sheet.querySelector(focusSelector)?.focus(), 20);
  }

  function closeSheet() {
    state.modalOpen = false;
    ui.backdrop.hidden = true;
    ui.sheet.hidden = true;
    ui.sheetContent.innerHTML = '';
    ui.actionButton.focus({ preventScroll: true });
  }

  function openCompanion() {
    if (state.modalOpen) return;
    state.companionOpen = true;
    ui.companionPanel.hidden = false;
    ui.companionButton.setAttribute('aria-expanded', 'true');
    refreshCompanionThought();
  }

  function closeCompanion() {
    state.companionOpen = false;
    ui.companionPanel.hidden = true;
    ui.companionButton.setAttribute('aria-expanded', 'false');
  }

  function toggleCompanion() {
    if (state.companionOpen) closeCompanion();
    else openCompanion();
  }

  function refreshCompanionThought() {
    const thoughts = {
      approach: 'Something happened. Meaning grew around it. Let’s find both.',
      fragments: collected.size === 0
        ? 'This branch split into two signals. One is what happened. One is what the storyteller added.'
        : collected.size === 1
          ? 'You found one fragment. The second may change how the first one feels.'
          : 'One fragment is observable. The other is an interpretation. Neither tells us what happened on the other side.',
      fork: 'You have enough to choose a move—but not enough to claim certainty.',
      complete: 'The branch did not give you a verdict. It gave you a better choice.',
    };
    ui.companionThought.textContent = thoughts[state.phase];
  }

  function abilityMessage(ability) {
    const phaseMessages = {
      approach: {
        scan: 'SCAN — The pulsing branch is carrying two signals: an event and a conclusion.',
        reframe: 'REFRAME — Silence can mean indifference. It can also mean a life you cannot see yet.',
        ask: 'ASK — What information could make you change your conclusion?',
      },
      fragments: {
        scan: collected.size < 2
          ? 'SCAN — Follow the blue and amber signals. They do not mean the same thing.'
          : 'SCAN — The route to the fork is open.',
        reframe: 'REFRAME — “They do not care” is possible, but the story does not prove it yet.',
        ask: 'ASK — What happened on their side during the missing hours?',
      },
      fork: {
        scan: 'SCAN — Three moves are possible. Each trades speed, certainty, and connection differently.',
        reframe: 'REFRAME — The goal may not be proving what silence means. It may be deciding what you need next.',
        ask: 'ASK — Which move would still feel fair if your first interpretation is wrong?',
      },
      complete: {
        scan: 'SCAN — Known, assumed, and missing information are now separated.',
        reframe: 'REFRAME — A clearer gripe can become a question, a boundary, or something you release.',
        ask: 'ASK — What would you want another person to understand before responding?',
      },
    };
    return phaseMessages[state.phase][ability];
  }

  function currentTarget() {
    if (state.phase === 'approach') return branch;
    if (state.phase === 'fragments') {
      return fragments.find((item) => !collected.has(item.id)) || fork;
    }
    if (state.phase === 'fork') return fork;
    return null;
  }

  function nearestInteractable() {
    if (state.phase === 'complete') {
      return { type: 'result', target: player, label: 'VIEW RESULT' };
    }
    if (state.phase === 'approach' && distance(player, branch) < 105) {
      return { type: 'branch', target: branch, label: 'INSPECT' };
    }
    if (state.phase === 'fragments') {
      const nearFragment = fragments.find(
        (item) => !collected.has(item.id) && distance(player, item) < 100,
      );
      if (nearFragment) return { type: 'fragment', target: nearFragment, label: 'COLLECT' };
      if (collected.size === fragments.length && distance(player, fork) < 115) {
        return { type: 'fork', target: fork, label: 'CHOOSE' };
      }
    }
    if (state.phase === 'fork' && distance(player, fork) < 115) {
      return { type: 'fork', target: fork, label: 'CHOOSE' };
    }
    return null;
  }

  function updateHud() {
    const target = currentTarget();
    const meters = target ? Math.max(0, Math.round(distance(player, target) / 4)) : 0;
    const interaction = nearestInteractable();

    if (state.phase === 'approach') {
      ui.location.textContent = 'THE ROOTWAY';
      ui.objective.textContent = 'Reach the pulsing branch';
      ui.route.textContent = 'Follow the acid-green signal';
      ui.mapCaption.textContent = `BRANCH · ${meters}m`;
    } else if (state.phase === 'fragments') {
      ui.location.textContent = 'THE SPLIT STORY';
      if (collected.size < fragments.length) {
        ui.objective.textContent = `Find the story fragments · ${collected.size}/2`;
        ui.route.textContent = collected.size ? 'One signal remains' : 'Blue was seen. Amber was assumed.';
        ui.mapCaption.textContent = `FRAGMENT · ${meters}m`;
      } else {
        ui.objective.textContent = 'Follow the lit route to the fork';
        ui.route.textContent = 'You found what happened and what was added';
        ui.mapCaption.textContent = `FORK · ${meters}m`;
      }
    } else if (state.phase === 'fork') {
      ui.location.textContent = 'THE FORK';
      ui.objective.textContent = 'Choose what happens next';
      ui.route.textContent = 'The companion advises. You decide.';
      ui.mapCaption.textContent = `CHOICE · ${meters}m`;
    } else {
      ui.location.textContent = 'A CLEARER BRANCH';
      ui.objective.textContent = 'Case complete';
      ui.route.textContent = 'Keep exploring or replay the branch';
      ui.mapCaption.textContent = 'UNTANGLED';
    }

    if (interaction) {
      ui.actionButton.disabled = false;
      ui.actionLabel.textContent = interaction.label;
    } else {
      ui.actionButton.disabled = true;
      ui.actionLabel.textContent = state.phase === 'complete' ? 'COMPLETE' : 'MOVE CLOSER';
    }
  }

  function inspectBranch() {
    state.branchAwake = true;
    vibrate([18, 25, 30]);
    openSheet(`
      <p class="eyebrow">WILD CASE 01</p>
      <h2 id="sheet-title">The unread message</h2>
      <div class="story-quote">“They ignored my message all day, so they clearly don’t care.”</div>
      <p>The branch is carrying two different things: what happened and what the storyteller thinks it means.</p>
      <div class="sheet-actions">
        <button class="sheet-button secondary" type="button" data-action="leave">Not yet</button>
        <button class="sheet-button primary" type="button" data-action="enter">Enter branch</button>
      </div>
    `);
    ui.sheet.querySelector('[data-action="leave"]').addEventListener('click', closeSheet);
    ui.sheet.querySelector('[data-action="enter"]').addEventListener('click', () => {
      state.phase = 'fragments';
      state.routeFlash = 1;
      closeSheet();
      showToast('The story split. Find what was seen and what was assumed.');
      updateHud();
    });
  }

  function collectFragment(fragment) {
    if (collected.has(fragment.id)) return;
    collected.add(fragment.id);
    state.routeFlash = 1;
    vibrate(24);
    showToast(`${fragment.label} — ${fragment.text}`, 3000);
    if (collected.size === fragments.length) {
      window.setTimeout(() => {
        state.phase = 'fork';
        showToast('Two fragments. One happened. One was added. The route to the fork is open.', 3600);
        refreshCompanionThought();
      }, 800);
    }
    updateHud();
  }

  const outcomes = {
    context: {
      title: 'Leave room for the missing side',
      move: 'Ask what happened before deciding what the silence means.',
      note: 'Curious, not gullible.',
      color: palette.acid,
    },
    boundary: {
      title: 'Choose a clear boundary',
      move: 'Follow up once tomorrow, then decide what you need if silence continues.',
      note: 'Patient, with a spine.',
      color: palette.blue,
    },
    heat: {
      title: 'Choose speed over context',
      move: 'Send the angry paragraph now and accept that it may close the branch.',
      note: 'Hot, immediate, expensive.',
      color: palette.danger,
    },
  };

  function openFork() {
    openSheet(`
      <p class="eyebrow">THE FORK</p>
      <h2 id="sheet-title">What happens next?</h2>
      <p>You know there was no reply. You do not know why. Choose the tradeoff you actually want.</p>
      <div class="choice-list">
        <button class="choice-button" type="button" data-outcome="context">
          Ask what happened on their side
          <small>More context before a conclusion</small>
        </button>
        <button class="choice-button" type="button" data-outcome="boundary">
          Set a time to follow up
          <small>A boundary without pretending certainty</small>
        </button>
        <button class="choice-button" type="button" data-outcome="heat">
          Send the angry paragraph now
          <small>Fast relief with a real consequence</small>
        </button>
      </div>
    `);
    ui.sheet.querySelectorAll('[data-outcome]').forEach((button) => {
      button.addEventListener('click', () => completeCase(button.dataset.outcome));
    });
  }

  function completeCase(outcomeKey) {
    state.outcome = outcomes[outcomeKey];
    state.phase = 'complete';
    state.healed = outcomeKey !== 'heat';
    state.routeFlash = 1;
    writeCompleted();
    ui.progressBadge.hidden = false;
    vibrate([22, 34, 22]);
    openResultCard();
    updateHud();
  }

  function openResultCard() {
    const outcome = state.outcome || outcomes.context;
    openSheet(`
      <p class="eyebrow">CASE COMPLETE</p>
      <h2 id="sheet-title">${outcome.title}</h2>
      <p>${outcome.move}</p>
      <div class="case-grid">
        <div class="case-field"><strong>KNOWN</strong><span>No reply arrived today.</span></div>
        <div class="case-field"><strong>ASSUMED</strong><span>Silence means they do not care.</span></div>
        <div class="case-field"><strong>MISSING</strong><span>What happened on their side.</span></div>
        <div class="case-field"><strong>YOUR MOVE</strong><span>${outcome.note}</span></div>
      </div>
      <div class="sheet-actions">
        <button class="sheet-button secondary" type="button" data-action="explore">Keep exploring</button>
        <button class="sheet-button primary" type="button" data-action="restart">Replay branch</button>
      </div>
    `);
    ui.sheet.querySelector('[data-action="explore"]').addEventListener('click', closeSheet);
    ui.sheet.querySelector('[data-action="restart"]').addEventListener('click', resetCase);
  }

  function resetCase() {
    collected.clear();
    state.phase = 'approach';
    state.outcome = null;
    state.waypoint = null;
    state.branchAwake = false;
    state.healed = false;
    player.x = START.x;
    player.y = START.y;
    player.vx = 0;
    player.vy = 0;
    companion.x = START.x - 54;
    companion.y = START.y - 36;
    camera.x = START.x;
    camera.y = START.y;
    closeSheet();
    showToast('Branch reset. Follow the signal when you are ready.');
    updateHud();
  }

  function handleAction() {
    if (state.modalOpen) return;
    const interaction = nearestInteractable();
    if (!interaction) return;
    state.waypoint = null;
    if (interaction.type === 'branch') inspectBranch();
    if (interaction.type === 'fragment') collectFragment(interaction.target);
    if (interaction.type === 'fork') openFork();
    if (interaction.type === 'result') openResultCard();
  }

  function routeDetails() {
    const target = currentTarget();
    const meters = target ? Math.max(0, Math.round(distance(player, target) / 4)) : 0;
    const routeCopy = {
      approach: ['Pulsing branch', `${meters}m away`, 'Open route', 'Reach it, then use Inspect.'],
      fragments: collected.size < 2
        ? ['Story fragment', `${meters}m away`, 'Open route', 'Blue is observed. Amber is interpreted.']
        : ['The fork', `${meters}m away`, 'Open route', 'Both fragments are collected.'],
      fork: ['The fork', `${meters}m away`, 'Open route', 'Reach it to choose what happens next.'],
      complete: ['Branch untangled', 'Current location', 'No locked routes', 'You can keep exploring or replay.'],
    }[state.phase];
    openSheet(`
      <p class="eyebrow">ROUTE DETAILS</p>
      <h2 id="sheet-title">${routeCopy[0]}</h2>
      <div class="case-grid">
        <div class="case-field"><strong>DISTANCE</strong><span>${routeCopy[1]}</span></div>
        <div class="case-field"><strong>STATUS</strong><span>${routeCopy[2]}</span></div>
        <div class="case-field"><strong>WHY LOCKED?</strong><span>No locked path.</span></div>
        <div class="case-field"><strong>WHAT NEXT?</strong><span>${routeCopy[3]}</span></div>
      </div>
      <div class="sheet-actions">
        <button class="sheet-button primary" type="button" data-action="return">Return to branch</button>
      </div>
    `);
    ui.sheet.querySelector('[data-action="return"]').addEventListener('click', closeSheet);
  }

  function setupJoystick() {
    const zone = ui.joystickZone;
    const maxRadius = 45;

    function begin(event) {
      if (joystick.active || state.modalOpen) return;
      event.preventDefault();
      joystick.active = true;
      joystick.pointerId = event.pointerId;
      zone.setPointerCapture(event.pointerId);
      zone.classList.add('is-active');

      const rect = zone.getBoundingClientRect();
      const baseRadius = 59;
      const x = clamp(event.clientX - rect.left, baseRadius, rect.width - baseRadius);
      const y = clamp(event.clientY - rect.top, baseRadius, rect.height - baseRadius);
      ui.joystickBase.style.left = `${x - baseRadius}px`;
      ui.joystickBase.style.top = `${y - baseRadius}px`;
      ui.joystickBase.style.bottom = 'auto';
      joystick.originX = rect.left + x;
      joystick.originY = rect.top + y;
      move(event);
    }

    function move(event) {
      if (!joystick.active || event.pointerId !== joystick.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - joystick.originX;
      const dy = event.clientY - joystick.originY;
      const length = Math.hypot(dx, dy) || 1;
      const limited = Math.min(length, maxRadius);
      joystick.x = dx / length;
      joystick.y = dy / length;
      joystick.magnitude = limited / maxRadius;
      ui.joystickKnob.style.transform = `translate(${joystick.x * limited}px, ${joystick.y * limited}px)`;
    }

    function end(event) {
      if (!joystick.active || event.pointerId !== joystick.pointerId) return;
      joystick.active = false;
      joystick.pointerId = null;
      joystick.x = 0;
      joystick.y = 0;
      joystick.magnitude = 0;
      zone.classList.remove('is-active');
      ui.joystickKnob.style.transform = '';
      ui.joystickBase.style.left = '';
      ui.joystickBase.style.top = '';
      ui.joystickBase.style.bottom = '';
    }

    zone.addEventListener('pointerdown', begin);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  function keyboardVector() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    const length = Math.hypot(x, y);
    return length ? { x: x / length, y: y / length, magnitude: 1 } : { x: 0, y: 0, magnitude: 0 };
  }

  function movementVector() {
    const keyboard = keyboardVector();
    if (keyboard.magnitude) return keyboard;
    if (joystick.magnitude) return joystick;
    if (state.waypoint) {
      const dx = state.waypoint.x - player.x;
      const dy = state.waypoint.y - player.y;
      const length = Math.hypot(dx, dy);
      if (length < 16) {
        state.waypoint = null;
        return { x: 0, y: 0, magnitude: 0 };
      }
      return { x: dx / length, y: dy / length, magnitude: Math.min(1, length / 80) };
    }
    return { x: 0, y: 0, magnitude: 0 };
  }

  function update(dt) {
    state.elapsed += dt;
    state.routeFlash = Math.max(0, state.routeFlash - dt * 0.65);

    const input = state.modalOpen ? { x: 0, y: 0, magnitude: 0 } : movementVector();
    const speed = 285;
    const responsiveness = input.magnitude ? 6.8 : 4.1;
    const desiredVx = input.x * speed * input.magnitude;
    const desiredVy = input.y * speed * input.magnitude;
    const blend = Math.min(1, responsiveness * dt);
    player.vx += (desiredVx - player.vx) * blend;
    player.vy += (desiredVy - player.vy) * blend;

    player.x = clamp(player.x + player.vx * dt, 70, WORLD.width - 70);
    player.y = clamp(player.y + player.vy * dt, 70, WORLD.height - 70);
    if (Math.hypot(player.vx, player.vy) > 6) player.facing = Math.atan2(player.vy, player.vx);

    if (!state.movementLearned && Math.hypot(player.x - START.x, player.y - START.y) > 75) {
      state.movementLearned = true;
      ui.coachmark.classList.add('is-hidden');
      window.setTimeout(() => { ui.coachmark.hidden = true; }, 320);
      showToast('Good. The minimap always shows your next destination.');
    }

    const followAngle = player.facing + Math.PI * 0.85;
    const followTarget = {
      x: player.x + Math.cos(followAngle) * 58,
      y: player.y + Math.sin(followAngle) * 58,
    };
    companion.x += (followTarget.x - companion.x) * Math.min(1, dt * 3.2);
    companion.y += (followTarget.y - companion.y) * Math.min(1, dt * 3.2);

    const lead = reducedMotion ? 0 : 70;
    const cameraTargetX = player.x + Math.cos(player.facing) * lead;
    const cameraTargetY = player.y + Math.sin(player.facing) * lead;
    camera.x += (cameraTargetX - camera.x) * Math.min(1, dt * 4.3);
    camera.y += (cameraTargetY - camera.y) * Math.min(1, dt * 4.3);
    camera.x = clamp(camera.x, viewWidth / 2, WORLD.width - viewWidth / 2);
    camera.y = clamp(camera.y, viewHeight / 2, WORLD.height - viewHeight / 2);

    updateHud();
  }

  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gradient = ctx.createRadialGradient(
      viewWidth * 0.62,
      viewHeight * 0.3,
      20,
      viewWidth * 0.55,
      viewHeight * 0.46,
      Math.max(viewWidth, viewHeight),
    );
    gradient.addColorStop(0, state.healed ? '#1d2630' : '#23122f');
    gradient.addColorStop(0.5, '#11131f');
    gradient.addColorStop(1, '#070a10');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    for (const particle of particles) {
      const drift = reducedMotion ? 0 : Math.sin(state.elapsed * 0.35 + particle.phase) * 12;
      const sx = ((particle.x - camera.x * particle.depth * 0.25 + drift) % (viewWidth + 80)) - 40;
      const sy = ((particle.y - camera.y * particle.depth * 0.18) % (viewHeight + 80)) - 40;
      ctx.globalAlpha = 0.18 + particle.depth * 0.23;
      ctx.fillStyle = particle.depth > 0.75 ? palette.acid : palette.violet;
      ctx.beginPath();
      ctx.arc(sx, sy, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawVine(path, color = palette.plum, width = 18, glow = 0) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    ctx.beginPath();
    ctx.moveTo(path[0], path[1]);
    for (let i = 2; i < path.length; i += 6) {
      ctx.bezierCurveTo(path[i], path[i + 1], path[i + 2], path[i + 3], path[i + 4], path[i + 5]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPool(x, y, rx, ry, color) {
    const gradient = ctx.createRadialGradient(x, y, 5, x, y, rx);
    gradient.addColorStop(0, `${color}55`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${color}42`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawSignalNode(item, active, kind = 'round') {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(state.elapsed * 3 + item.x) * 0.08;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.globalAlpha = active ? 1 : 0.22;
    ctx.shadowColor = item.color || palette.acid;
    ctx.shadowBlur = active ? 30 : 4;
    ctx.fillStyle = item.color || palette.acid;
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = active ? 2.4 : 1;
    if (kind === 'diamond') {
      const size = item.radius * pulse;
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.roundRect(-size * 0.62, -size * 0.62, size * 1.24, size * 1.24, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBranch() {
    const awake = state.branchAwake || state.phase !== 'approach';
    ctx.save();
    ctx.translate(branch.x, branch.y);
    ctx.rotate(-0.24);
    ctx.strokeStyle = awake ? palette.violet : '#5a3468';
    ctx.lineWidth = 23;
    ctx.lineCap = 'round';
    ctx.shadowColor = awake ? palette.violet : palette.acid;
    ctx.shadowBlur = awake ? 18 : 28;
    ctx.beginPath();
    ctx.moveTo(-62, 52);
    ctx.bezierCurveTo(-26, 12, -42, -30, 2, -8);
    ctx.bezierCurveTo(47, 14, 18, -57, 76, -72);
    ctx.stroke();
    ctx.strokeStyle = palette.acid;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-51, 45);
    ctx.bezierCurveTo(-22, 14, -32, -18, 1, -2);
    ctx.stroke();
    ctx.restore();
  }

  function drawFork() {
    const available = state.phase === 'fork' || (state.phase === 'fragments' && collected.size === 2);
    const healedColor = state.healed ? palette.acid : state.outcome ? palette.danger : palette.violet;
    ctx.save();
    ctx.translate(fork.x, fork.y);
    ctx.strokeStyle = available || state.phase === 'complete' ? healedColor : '#3b2647';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.shadowColor = healedColor;
    ctx.shadowBlur = available || state.phase === 'complete' ? 28 : 0;
    ctx.beginPath();
    ctx.moveTo(0, 72);
    ctx.lineTo(0, -6);
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(-20, -28, -62, -52);
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(24, -34, 72, -48);
    ctx.stroke();
    ctx.fillStyle = healedColor;
    ctx.globalAlpha = state.phase === 'complete' ? 0.9 : available ? 0.7 : 0.2;
    for (const [x, y, r] of [[-69, -58, 19], [-42, -47, 16], [78, -53, 20], [48, -40, 17]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWorld() {
    ctx.save();
    ctx.translate(viewWidth / 2 - camera.x, viewHeight / 2 - camera.y);

    drawPool(470, 345, 260, 125, '#6bd4ff');
    drawPool(1425, 1100, 360, 160, '#853fc0');
    drawPool(1900, 290, 290, 120, '#c7ef3d');

    drawVine([90, 1110, 360, 970, 530, 840, 840, 660], '#4b245d', 30, 5);
    drawVine([840, 660, 1030, 520, 1340, 670, 1670, 665], state.healed ? palette.acid : '#71318d', 22, state.healed ? 18 : 7);
    drawVine([840, 660, 1010, 780, 1080, 980, 1225, 890], '#8b4b31', 13, 5);
    drawVine([840, 660, 930, 520, 1020, 480, 1115, 455], '#345d72', 13, 5);
    drawVine([1670, 665, 1870, 520, 1990, 720, 2140, 610], state.healed ? '#70942b' : '#372342', 24, state.healed ? 15 : 0);

    drawBranch();
    const branchActive = state.phase === 'approach';
    if (branchActive) {
      drawSignalNode({ ...branch, color: palette.acid, radius: 18 }, true);
    }

    for (const fragment of fragments) {
      const isCollected = collected.has(fragment.id);
      if (state.phase !== 'approach' && !isCollected) drawSignalNode(fragment, true, 'diamond');
      if (isCollected) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        drawSignalNode(fragment, false, 'diamond');
        ctx.restore();
      }
    }

    drawFork();

    if (state.waypoint) {
      const ring = reducedMotion ? 18 : 18 + Math.sin(state.elapsed * 5) * 5;
      ctx.strokeStyle = palette.violet;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(state.waypoint.x, state.waypoint.y, ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawCompanion();
    drawPlayer();
    ctx.restore();

    drawRouteArrow();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facing);
    ctx.shadowColor = palette.cream;
    ctx.shadowBlur = 22;
    const gradient = ctx.createRadialGradient(-6, -8, 2, 0, 0, 28);
    gradient.addColorStop(0, palette.cream);
    gradient.addColorStop(0.42, palette.violet);
    gradient.addColorStop(1, palette.plum);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.acid;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(11, -7);
    ctx.lineTo(11, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCompanion() {
    const bob = reducedMotion ? 0 : Math.sin(state.elapsed * 4) * 5;
    ctx.save();
    ctx.translate(companion.x, companion.y + bob);
    ctx.shadowColor = palette.violet;
    ctx.shadowBlur = 22;
    const circles = [
      [-10, -4, 12, palette.violet],
      [10, -4, 12, palette.grape],
      [0, 12, 12, palette.plum],
      [0, -18, 9, palette.acid],
    ];
    for (const [x, y, radius, color] of circles) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(-5, -5, 2, 0, Math.PI * 2);
    ctx.arc(6, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRouteArrow() {
    const target = currentTarget();
    if (!target) return;
    const screenX = target.x - camera.x + viewWidth / 2;
    const screenY = target.y - camera.y + viewHeight / 2;
    const margin = 124;
    const isOffscreen = screenX < margin || screenX > viewWidth - margin || screenY < 130 || screenY > viewHeight - margin;
    if (!isOffscreen) return;

    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    const angle = Math.atan2(screenY - centerY, screenX - centerX);
    const radiusX = Math.max(80, viewWidth / 2 - margin);
    const radiusY = Math.max(90, viewHeight / 2 - margin);
    const scale = Math.min(
      radiusX / Math.max(0.001, Math.abs(Math.cos(angle))),
      radiusY / Math.max(0.001, Math.abs(Math.sin(angle))),
    );
    const x = centerX + Math.cos(angle) * scale;
    const y = centerY + Math.sin(angle) * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.75 + state.routeFlash * 0.25;
    ctx.shadowColor = palette.acid;
    ctx.shadowBlur = 18;
    ctx.fillStyle = palette.acid;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-13, -12);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMinimap() {
    const w = minimap.width;
    const h = minimap.height;
    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = 'rgba(7, 9, 15, 0.92)';
    mapCtx.fillRect(0, 0, w, h);

    const sx = w / WORLD.width;
    const sy = h / WORLD.height;
    const point = (item) => ({ x: item.x * sx, y: item.y * sy });
    const points = [START, branch, fragments[0], fragments[1], fork];
    mapCtx.strokeStyle = state.healed ? palette.acid : '#71418e';
    mapCtx.lineWidth = 5;
    mapCtx.lineCap = 'round';
    mapCtx.beginPath();
    points.forEach((item, index) => {
      const p = point(item);
      if (index === 0) mapCtx.moveTo(p.x, p.y);
      else mapCtx.lineTo(p.x, p.y);
    });
    mapCtx.stroke();

    for (const item of fragments) {
      const p = point(item);
      mapCtx.fillStyle = collected.has(item.id) ? 'rgba(255,255,255,.22)' : item.color;
      mapCtx.fillRect(p.x - 4, p.y - 4, 8, 8);
    }

    const target = currentTarget();
    if (target) {
      const p = point(target);
      mapCtx.strokeStyle = palette.acid;
      mapCtx.lineWidth = 3;
      mapCtx.beginPath();
      mapCtx.arc(p.x, p.y, 9 + Math.sin(state.elapsed * 4) * 2, 0, Math.PI * 2);
      mapCtx.stroke();
    }

    const playerPoint = point(player);
    mapCtx.fillStyle = palette.cream;
    mapCtx.shadowColor = palette.cream;
    mapCtx.shadowBlur = 8;
    mapCtx.beginPath();
    mapCtx.arc(playerPoint.x, playerPoint.y, 6, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.shadowBlur = 0;
  }

  function draw() {
    drawBackground();
    drawWorld();
    drawMinimap();
  }

  function loop(now) {
    const dt = Math.min(0.04, (now - lastTime) / 1000 || 0);
    lastTime = now;
    state.frame += 1;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function setupSound() {
    ui.soundToggle.addEventListener('click', () => {
      if (audio) {
        audio.context.close();
        audio = null;
        ui.soundToggle.textContent = 'SOUND OFF';
        ui.soundToggle.setAttribute('aria-pressed', 'false');
        ui.soundToggle.setAttribute('aria-label', 'Turn ambient sound on');
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        showToast('Ambient sound is not available in this browser.');
        return;
      }
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.035;
      master.connect(context.destination);

      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 440;
      filter.Q.value = 0.7;
      filter.connect(master);

      const oscillators = [55, 82.4, 110].map((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.value = index === 0 ? 0.5 : 0.16;
        oscillator.connect(gain);
        gain.connect(filter);
        oscillator.start();
        return oscillator;
      });
      audio = { context, master, filter, oscillators };
      ui.soundToggle.textContent = 'SOUND ON';
      ui.soundToggle.setAttribute('aria-pressed', 'true');
      ui.soundToggle.setAttribute('aria-label', 'Turn ambient sound off');
    });
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
    if ((event.code === 'Space' || event.code === 'Enter') && !state.modalOpen) handleAction();
    if (event.code === 'KeyM' && !state.modalOpen) routeDetails();
    if (event.code === 'Escape') {
      if (state.modalOpen) closeSheet();
      else closeCompanion();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));

  canvas.addEventListener('pointerdown', (event) => {
    if (state.modalOpen || state.companionOpen) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = event.clientX - rect.left + camera.x - viewWidth / 2;
    const worldY = event.clientY - rect.top + camera.y - viewHeight / 2;
    state.waypoint = {
      x: clamp(worldX, 70, WORLD.width - 70),
      y: clamp(worldY, 70, WORLD.height - 70),
    };
  });

  ui.actionButton.addEventListener('click', handleAction);
  ui.mapButton.addEventListener('click', routeDetails);
  ui.companionButton.addEventListener('click', toggleCompanion);
  ui.closeCompanion.addEventListener('click', closeCompanion);
  ui.backdrop.addEventListener('click', closeSheet);
  document.querySelectorAll('[data-ability]').forEach((button) => {
    button.addEventListener('click', () => {
      const message = abilityMessage(button.dataset.ability);
      ui.companionThought.textContent = message;
      showToast(message, 3600);
      if (button.dataset.ability === 'scan') state.routeFlash = 1;
      vibrate(14);
    });
  });

  setupJoystick();
  setupSound();
  resize();
  ui.progressBadge.hidden = !readCompleted();
  updateHud();
  requestAnimationFrame(loop);
})();
