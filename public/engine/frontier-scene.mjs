import { rangerMaps, rangerJobs, rangerWeapons, rangerExpeditions, selectionStamps } from '../content/frontier.mjs';
import { validateFrontier, acceptRangerJob, claimRangerJob, addFrontierFlag, equipRangerWeapon, buyRangerWeapon, recordFootwork, selectGrandVintage } from './frontier-state.mjs';

const point = (at) => ({ x: at[0], y: at[1] });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// One scene adapter around the existing movement, combat, animation and save engines.
export function createRangerWorld(s) {
  const { state, input, ctx, images, ui } = s;
  const terrains = new Map();
  let people = [], encounters = [], nearby = null, trial = null;
  let panelActions = [], panelReturnMode = 'playing', saveTimer = 0, toastTimer = 0;
  let tracked = null, equipmentFromShop = false;
  const progress = () => state.frontier;
  const map = () => rangerMaps[progress().mapId];
  const save = () => s.saveProgress(state.checkpoint.anchorId, state.checkpoint.chapterId);
  const knownFlag = (flag) => progress().flags.includes(flag);
  const flash = (message) => { ui.toast.textContent = message; toastTimer = 4.5; ui.toast.hidden = false; s.announce(message); };
  const action = (id, label, detail = '') => ({ id, label, detail });
  const ready = (job) => job.needs.every(knownFlag);

  function capture() {
    if (!state.inFrontier) return;
    progress().active = true;
    if (state.sideview?.rangerRoute) captureExpedition();
    else progress().position = { x: state.hero.x, y: state.hero.y };
  }

  function closePanel() {
    ui.panel.hidden = true;
    if (state.mode === 'ranger-panel') state.mode = panelReturnMode;
    s.clearInput();
    s.showGameControls(['playing', 'sideview'].includes(state.mode));
    if (state.mode === 'sideview') s.hideMapButton();
    panelActions = [];
    syncUI();
  }

  function showPanel(title, copy, actions = [], extra = '') {
    if (state.mode !== 'ranger-panel') panelReturnMode = state.mode;
    s.clearInput();
    state.mode = 'ranger-panel';
    s.showGameControls(false);
    panelActions = actions;
    ui.panelTitle.textContent = title;
    ui.panelCopy.textContent = copy;
    ui.panelContent.innerHTML = extra + actions.map((a) => `<button type="button" data-ranger-action="${esc(a.id)}"><strong>${esc(a.label)}</strong>${a.detail ? `<span>${esc(a.detail)}</span>` : ''}</button>`).join('');
    ui.panel.hidden = false;
    ui.panelClose.focus?.();
    s.announce(`${title}. ${copy}`);
    syncUI();
  }

  function enter(mapId = progress()?.mapId || 'town', at = null, { persist = true } = {}) {
    if (!rangerMaps[mapId]) return false;
    state.frontier = validateFrontier(progress());
    const p = progress();
    const oldMap = p.mapId;
    const oldPosition = { ...p.position };
    p.mapId = mapId; p.active = true; p.activeRoute = null;
    if (!p.visited.includes(mapId)) p.visited.push(mapId);
    state.inFrontier = true;
    state.mode = 'playing'; state.sideview = null; state.regionIntro = 0;
    state.enemies = []; state.bolts = []; state.hostileBolts = []; state.pickups = [];
    state.particles = []; state.shockwaves = []; state.sourSpots = []; state.spawnQueue = [];
    state.gate = null; state.secret = null; state.ultimate = null; state.bossFinale = null;
    state.carried = null; state.contextTarget = null;
    state.mission = { props: [], encounters: [] };
    trial = null; nearby = null;
    s.clearInput(); s.hideOverlays(); ui.panel.hidden = true;
    s.configureSideviewControls(false);
    const data = map();
    if (!terrains.has(mapId)) terrains.set(mapId, new s.Terrain(data, 24));
    state.terrain = terrains.get(mapId); state.terrain.setGates();
    state.world = { width: data.width, height: data.height };
    const desired = at ? point(at) : oldMap === mapId ? oldPosition : point(data.spawn);
    const spawn = state.terrain.project(desired, state.hero.footRadius) || point(data.spawn);
    Object.assign(state.hero, spawn, { vx: 0, vy: 0, dashTime: 0, attackAnim: 0, trail: [], characterId: state.memory.character.id, avatarId: state.memory.character.avatarId });
    s.applyUpgradeStats();
    state.hero.speed += p.gear.includes('courier-boots') ? 48 : 24;
    state.hero.health = state.hero.maxHealth;
    state.tutorial = 2;
    people = data.people.map((npc) => ({ ...npc, ...point(npc.at), home: point(npc.at) }));
    encounters = data.encounters.map((e) => ({ ...e, ...point(e.at), triggered: p.cleared.includes(e.id), actors: [] }));
    s.updateCamera(1); s.showGameControls(true); s.updateUI();
    ui.hud.hidden = false;
    if (persist) save();
    flash(data.name);
    if (!knownFlag('intro-seen')) talk('registrar');
    return true;
  }

  function leave() {
    capture();
    if (progress()) { progress().active = false; progress().activeRoute = null; }
    state.inFrontier = false; trial = null; nearby = null;
    ui.hud.hidden = true; ui.context.hidden = true; ui.toast.hidden = true; ui.panel.hidden = true; ui.weapon.hidden = true;
  }

  function talk(id) {
    const p = progress();
    const npc = Object.values(rangerMaps).flatMap((m) => m.people).find((person) => person.id === id);
    if (!npc) return;
    if (id === 'registrar') {
      const welcome = p.selected ? 'The Reserve List is up. That is your name. Sir Raisin has already claimed he trained you.' : 'You want to become excellent wine. Good. Earn Character, Craft and Aroma seals from the rangers, then pass the human stomper’s Footwork trial at the Harvest Fair.';
      showPanel(npc.name, welcome, [action('intro', p.selected ? 'Back to my town' : 'Put my name down', 'No one dreams of being the complimentary grape.'), action('journal', 'My selection record')]);
      return;
    }
    if (id === 'smith') {
      equipmentFromShop = true;
      const job = rangerJobs.find((j) => j.id === 'craft');
      const actions = jobActions(job);
      for (const [key, weapon] of Object.entries(rangerWeapons)) {
        if (p.gear.includes(key)) actions.push(action(`equip:${key}`, `${p.weapon === key ? '✓ ' : ''}${weapon.name}`, weapon.description));
        else if (weapon.price) actions.push(action(`buy:${key}`, `${weapon.name} · ${weapon.price} seeds`, `${weapon.description} You have ${p.seeds}.`));
      }
      showPanel(npc.name, job.quote, actions); return;
    }
    if (id === 'judge') {
      const passed = p.stamps.includes('footwork');
      showPanel(npc.name, passed ? 'Eight clean dodges. The human called your footwork “surprisingly difficult to step on.” Take your record to Madame Merlot.' : 'The human makes lovely wine. Your audition is staying graceful under enormous pressure. Leave each gold circle before the stomp. Dodge eight; three bruises ends the trial.',
        [action('trial', passed ? 'Practise footwork again' : 'Enter the Footwork trial', 'Gold = move. Pink = stomp. Your work and equipment stay safe.')]); return;
    }
    if (id === 'blender') {
      const missing = selectionStamps.filter((stamp) => !p.stamps.includes(stamp));
      showPanel(npc.name, p.selected ? 'Your blend is on the Grand Vintage list: bright character, useful hands, high notes, and a suspicious talent for dodging feet. Harvest day can wait. Enjoy your town.' : missing.length ? `A promising grape! Bring me ${missing.join(', ')}. I am choosing a vintage, not merely the loudest fruit.` : 'Character. Craft. Aroma. Footwork. You earned every seal. Shall I reserve your place in the Grand Vintage?',
        p.selected ? [action('travel:town','Celebrate in Bunchborough')] : missing.length ? [action('journal','See my selection record')] : [action('select','Join the Grand Vintage','Your ambition becomes a permanent part of your character’s story.')]); return;
    }
    if (id === 'scout') {
      const actions = [];
      if (knownFlag('canopy-crossed') && !knownFlag('parcel-delivered')) actions.push(action('deliver','Deliver Pip’s parcel','The letter finally takes the scenic root.'));
      actions.push(...jobActions(rangerJobs.find((j) => j.id === 'aroma')));
      showPanel(npc.name, 'Most grapes are picked. Rangers take the long way. Bottle Aqueduct has three aroma tags worth bringing to the selectors.', actions); return;
    }
    const job = rangerJobs.find((j) => j.giver === id);
    if (job) { showPanel(npc.name, p.completed.includes(job.id) ? completedLine(id) : job.quote, jobActions(job)); return; }
    const lines = {
      elder: 'I was selected once. Missed the wagon. Now I have concentrated character and terrible knees.',
      grower: 'Table grape. Very happy, thank you. You pursue the Grand Vintage; I am booked for a picnic.',
      rival: p.selected ? 'I always knew you had potential. I told everyone after you won.' : 'My tasting notes are already written: bold, exceptional, probably misunderstood.',
    };
    showPanel(npc.name, lines[id] || 'Good weather for a grape with plans.', []);
  }

  function completedLine(id) {
    return id === 'post' ? 'Delivered! You have earned a Character seal and courier boots. They are not express shipping, but they help.' : 'The vines are drinking again. I shall go back to being dry only in conversation.';
  }

  function equipment() {
    equipmentFromShop = false;
    const p = progress();
    showPanel('Ranger equipment', `Visit Corky in Bunchborough for new gear. ${p.gear.includes('courier-boots') ? 'Courier boots: faster travel, already equipped.' : 'Pip rewards reliable deliveries with courier boots.'}`, Object.entries(rangerWeapons).filter(([key]) => p.gear.includes(key)).map(([key,weapon]) => action(`equip:${key}`, `${p.weapon === key ? '✓ ' : ''}${weapon.name}`, weapon.description)));
  }

  function jobActions(job) {
    const p = progress();
    if (p.completed.includes(job.id)) return [action('journal','See my other work')];
    if (!p.jobs.includes(job.id)) return [action(`accept:${job.id}`, job.name, `${job.goal} Reward: ${job.reward} seeds${job.stamp ? ` + ${job.stamp} seal` : ''}.`)];
    if (ready(job)) return [action(`claim:${job.id}`, 'Finish the job', `${job.reward} seeds${job.gear ? ` + ${job.gear === 'courier-boots' ? 'courier boots' : 'Corkscatter'}` : ''}${job.stamp ? ` + ${job.stamp} seal` : ''}.`)];
    return [action(`track:${job.id}`, 'Show me the way', job.goal)];
  }

  function journal() {
    const p = progress();
    const stamps = `<div class="ranger-seals">${selectionStamps.map((id) => `<span class="${p.stamps.includes(id) ? 'earned' : ''}"><b>${p.stamps.includes(id) ? '★' : '☆'}</b>${esc(id)}</span>`).join('')}</div>`;
    const actions = rangerJobs.filter((job) => p.jobs.includes(job.id) && !p.completed.includes(job.id)).map((job) => action(`track:${job.id}`, job.name, job.goal));
    for (const data of Object.values(rangerMaps)) if (p.visited.includes(data.id)) actions.push(action(`travel:${data.id}`, `Travel to ${data.name}`, data.subtitle));
    actions.push(action('gear', `Equipment · ${p.seeds} seeds`, rangerWeapons[p.weapon].description));
    actions.push(action('patrol','Old vineyard patrol','Visit the original four-region adventure. Return to town from Pause.'));
    const maps = `<div class="ranger-atlas">${Object.values(rangerMaps).map((m) => `<figure class="${p.visited.includes(m.id) ? '' : 'unvisited'}"><img src="./assets/ranger-${m.id}.webp" alt="${esc(m.name)}"/><figcaption>${esc(m.name)}${p.visited.includes(m.id) ? '' : ' · follow the road'}</figcaption></figure>`).join('')}</div>`;
    showPanel(p.selected ? 'Selected for the Grand Vintage' : 'My Grand Vintage record', `${p.completed.length} ranger jobs completed · ${p.seeds} seeds. ${p.gear.includes('courier-boots') ? 'Courier boots equipped.' : 'Find rangers in town to take work.'}`, actions, stamps + maps);
  }

  function choose(id) {
    if (state.mode !== 'ranger-panel' || !panelActions.some((item) => item.id === id)) return false;
    const p = progress();
    const [kind, key] = id.split(':');
    if (id === 'journal') { journal(); return true; }
    if (id === 'gear') { equipment(); return true; }
    if (id === 'intro') { addFrontierFlag(p,'intro-seen'); closePanel(); save(); flash('Start with Pip and Corky. The town roads lead to new places.'); return true; }
    if (kind === 'accept') {
      acceptRangerJob(p,key); tracked = key; closePanel(); save(); flash(rangerJobs.find((j) => j.id === key).goal); return true;
    }
    if (kind === 'claim') {
      if (!claimRangerJob(p,key)) return false;
      const job = rangerJobs.find((j) => j.id === key);
      if (job.gear === 'corkscatter') p.weapon = 'corkscatter';
      if (job.gear === 'courier-boots') state.hero.speed += 24;
      closePanel(); save(); s.sound('win'); flash(`${job.name} complete${job.stamp ? ` · ${job.stamp} seal earned` : ''}.`); return true;
    }
    if (kind === 'track') { tracked = key; closePanel(); flash(rangerJobs.find((j) => j.id === key).goal); return true; }
    if (kind === 'travel') {
      if (!p.visited.includes(key)) return false;
      capture(); closePanel(); enter(key, rangerMaps[key].spawn); return true;
    }
    if (kind === 'equip' || kind === 'buy') {
      const changed = kind === 'equip' ? equipRangerWeapon(p,key) : buyRangerWeapon(p,key);
      if (!changed) { flash('You need more seeds for that equipment. Ranger work and caches pay.'); return false; }
      save(); if (equipmentFromShop) talk('smith'); else equipment(); return true;
    }
    if (id === 'deliver') { addFrontierFlag(p,'parcel-delivered'); acceptRangerJob(p,'courier'); closePanel(); save(); flash('Parcel delivered. Pip is waiting in Bunchborough with your seal and boots.'); return true; }
    if (id === 'trial') { closePanel(); startTrial(); return true; }
    if (id === 'select') {
      if (!selectGrandVintage(p)) return false;
      s.recordSelection(); save(); s.sound('win');
      showPanel('Selected for the Grand Vintage', 'You made the list. Not the fruit bowl. Not the emergency raisins. The Grand Vintage. Your town hangs your ranger colours, and Madame Merlot saves a place for your very complicated tasting notes.', [action('travel:town','Go home a selected grape','Your town, equipment and discoveries remain yours.')], '<div class="vintage-seal" aria-hidden="true">★</div>');
      return true;
    }
    if (id === 'patrol') { closePanel(); leave(); s.enterPatrol(); return true; }
    return false;
  }

  function interact() {
    if (!state.inFrontier || state.mode !== 'playing' || !nearby || trial) return false;
    const target = nearby;
    if (target.role) { talk(target.id); return true; }
    if (target.kind === 'gate') { capture(); enter(target.to, rangerMaps[target.to].spawn); return true; }
    if (target.kind === 'rest') { state.hero.health = state.hero.maxHealth; save(); flash('Refreshed. A good vintage takes care of itself.'); return true; }
    if (target.kind === 'expedition') {
      acceptRangerJob(progress(), target.route === 'canopy' ? 'courier' : 'aroma');
      capture(); progress().activeRoute = target.route; save(); s.startExpedition(target.route); syncUI(); return true;
    }
    if (target.guard && !progress().cleared.includes(target.guard)) { flash('Clear the pests around the parts first.'); return true; }
    if (target.flag && addFrontierFlag(progress(),target.flag)) {
      if (target.kind === 'cache') progress().seeds = Math.min(99999, progress().seeds + 18);
      save(); s.sound('collect'); flash(target.kind === 'cache' ? 'Ranger cache · 18 seeds' : `${target.name} · done`); return true;
    }
    return false;
  }

  function captureExpedition() {
    const side = state.sideview;
    if (!side?.rangerRoute) return;
    const old = progress().expeditions[side.rangerRoute];
    progress().expeditions[side.rangerRoute] = {
      checkpoint: side.checkpointX,
      receipts: side.receipts.filter((r) => r.collected).map((r) => r.id),
      flies: side.flies.filter((f) => f.defeated).map((f) => f.id), complete: Boolean(old?.complete),
    };
    progress().activeRoute = side.rangerRoute;
  }

  function expeditionState(id) { return progress().expeditions[id] || { checkpoint: 110, receipts: [], flies: [], complete: false }; }

  function finishExpedition() {
    const side = state.sideview;
    if (!side?.rangerRoute) return false;
    const route = rangerExpeditions[side.rangerRoute];
    captureExpedition();
    if (side.receiptCount < route.requiredTags) {
      save();
      flash(`You have ${side.receiptCount}/${route.requiredTags} aroma tags. Tags stay collected; the route will bring you back to its entrance.`);
      s.startExpedition(route.id, true); return true;
    }
    progress().expeditions[route.id].complete = true;
    addFrontierFlag(progress(), route.id === 'canopy' ? 'canopy-crossed' : 'aroma-returned');
    enter(route.destination,route.arrival);
    if (route.id === 'canopy') talk('scout');
    else flash('Aroma tags recovered. The aqueduct opened a route to the Harvest Fair. Return to Véra for your seal.');
    return true;
  }

  function startTrial() {
    if (progress().mapId !== 'fair') return false;
    s.clearInput(); state.enemies = []; state.bolts = []; state.hostileBolts = [];
    Object.assign(state.hero, { x: 1630, y: 1490, vx: 0, vy: 0, health: state.hero.maxHealth });
    trial = { phase: 'warning', timer: 1.3, x: 1630, y: 1490, radius: 112, survived: 0, hits: 0, total: 0 };
    s.updateCamera(1); flash('Footwork audition · leave the gold circle before it turns pink.'); return true;
  }

  function updateTrial(dt) {
    if (!trial) return;
    trial.timer -= dt;
    if (trial.timer > 0) return;
    if (trial.phase === 'warning') {
      const caught = distance(state.hero, trial) < trial.radius + state.hero.footRadius && state.hero.dashTime <= 0;
      if (caught) { trial.hits++; state.hero.health = Math.max(20, state.hero.health - 20); state.flash = .35; s.sound('hurt'); }
      else trial.survived++;
      trial.total++; trial.phase = 'impact'; trial.timer = .42;
      state.shake = 7; s.sound('heavy');
    } else {
      if (trial.survived >= 8) {
        const first = !progress().stamps.includes('footwork');
        recordFootwork(progress(),8); if (first) progress().seeds = Math.min(99999,progress().seeds + 40);
        trial = null; save(); s.sound('win');
        flash('Footwork seal earned. Show your four seals to Madame Merlot.'); return;
      }
      if (trial.hits >= 3 || Math.hypot(state.hero.x - 1630,state.hero.y - 1490) > 680) {
        recordFootwork(progress(),trial.survived); trial = null; save();
        flash('A bruising audition. Rosé will let you try again; your equipment and jobs are safe.'); return;
      }
      Object.assign(trial, { phase: 'warning', timer: trial.survived < 4 ? 1.2 : 1.05, x: state.hero.x, y: state.hero.y, radius: trial.survived < 4 ? 112 : 132 });
    }
  }

  function update(dt) {
    const p = progress();
    for (const npc of people) {
      const index = map().people.findIndex((n) => n.id === npc.id);
      const candidate = { x: npc.home.x + Math.sin(state.time * .3 + index) * 14, y: npc.home.y + Math.cos(state.time * .25 + index) * 8 };
      if (state.terrain.contains(candidate,18)) Object.assign(npc,candidate);
    }
    for (const encounter of encounters) {
      if (!encounter.triggered && distance(state.hero,encounter) < 265) {
        encounter.triggered = true;
        encounter.types.forEach((type,index) => {
          const start = state.terrain.project({ x: encounter.x + (index-1)*72, y: encounter.y - 55 }, 38);
          if (start && s.spawnEnemy(type,start)) { const enemy = state.enemies.at(-1); enemy.rangerEncounter = encounter.id; encounter.actors.push(enemy.id); }
        });
      }
      if (encounter.triggered && !p.cleared.includes(encounter.id) && encounter.actors.length && encounter.actors.every((id) => !state.enemies.some((enemy) => enemy.id === id && !enemy.dead))) {
        p.cleared.push(encounter.id); save(); flash('Path clear. The rangers will remember your work.');
      }
    }
    updateTrial(dt);
    saveTimer += dt;
    if (saveTimer >= 5) { saveTimer = 0; save(); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui.toast.hidden = true; }
    syncUI();
  }

  function target() {
    const p = progress();
    if (!knownFlag('intro-seen')) return { mapId:'town', at:rangerMaps.town.people[0].at, label:'Ranger Ruby · join the selection list' };
    const job = rangerJobs.find((j) => j.id === tracked && !p.completed.includes(j.id)) || rangerJobs.find((j) => p.jobs.includes(j.id) && !p.completed.includes(j.id));
    if (job) {
      if (ready(job)) { const targetMap = Object.values(rangerMaps).find((m) => m.people.some((n) => n.id === job.giver)); const npc = targetMap.people.find((n) => n.id === job.giver); return {mapId:targetMap.id,at:npc.at,label:`Return to ${npc.name}`}; }
      if (job.id === 'courier') return knownFlag('canopy-crossed') ? {mapId:'terraces',at:rangerMaps.terraces.people[0].at,label:'Deliver the parcel to Ranger Véra'} : {mapId:'terraces',at:[1740,850],label:'Canopy Post · deliver Pip’s letter'};
      if (job.id === 'craft') return {mapId:'terraces',at:rangerMaps.terraces.places.find((v)=>v.id==='sprayer').at,label:'Recover the Corkscatter parts'};
      if (job.id === 'aroma') return {mapId:'terraces',at:[1460,2100],label:'Bottle Aqueduct · find 3 aroma tags'};
      if (job.id === 'water') { const place = rangerMaps.terraces.places.find((v) => v.id === (knownFlag('water-west') ? 'water-east' : 'water-west')); return {mapId:'terraces',at:place.at,label:place.name}; }
    }
    if (p.selected) return {mapId:'town',at:p.completed.includes('water') ? rangerMaps.town.spawn : rangerMaps.town.people.find((n)=>n.id==='gardener').at,label:p.completed.includes('water') ? 'Selected! Explore your town or revisit the old vineyard patrol.' : 'Selected! Tansy still has irrigation work in Bunchborough.'};
    if (p.stamps.filter((v) => v !== 'footwork').length === 3) return {mapId:'fair',at:p.stamps.includes('footwork') ? [2540,1120] : [1500,1410],label:p.stamps.includes('footwork') ? 'Madame Merlot · claim your Grand Vintage place' : 'Harvest Fair · take the Footwork trial'};
    const nextJob = rangerJobs.find((j) => j.stamp && !p.stamps.includes(j.stamp));
    if (nextJob) {
      const nextMap = Object.values(rangerMaps).find((m)=>m.people.some((n)=>n.id===nextJob.giver));
      const npc = nextMap.people.find((n)=>n.id===nextJob.giver);
      return {mapId:nextMap.id,at:npc.at,label:`Meet ${npc.name} · earn your ${nextJob.stamp} seal`};
    }
    return {mapId:'town',at:rangerMaps.town.spawn,label:'Explore, finish ranger work, and enjoy your town'};
  }

  function syncUI() {
    const visible = state.inFrontier && ['playing','sideview'].includes(state.mode);
    ui.hud.hidden = !visible;
    ui.context.hidden = true;
    ui.weapon.hidden = !visible;
    if (!state.inFrontier) return;
    const p = progress();
    const route = state.sideview?.rangerRoute && rangerExpeditions[state.sideview.rangerRoute];
    ui.place.textContent = route ? route.name : map().name;
    ui.goal.textContent = route ? `${route.goal}${route.requiredTags ? ` ${state.sideview.receiptCount}/${route.requiredTags}` : ''}` : trial ? `FOOTWORK · ${trial.survived}/8 clean dodges · ${3-trial.hits} chances` : target().label;
    ui.record.textContent = `${p.selected ? '★ SELECTED' : `${p.stamps.length}/4 SEALS`} · ${p.seeds} SEEDS`;
    ui.weapon.textContent = `${rangerWeapons[p.weapon].icon} ${rangerWeapons[p.weapon].name}`;
    ui.weapon.hidden = !visible || Boolean(route) || Boolean(trial);
    if (!visible || route || trial) return;
    const candidates = [...people, ...map().places.filter((v) => !v.flag || !knownFlag(v.flag)).map((v) => ({...v,...point(v.at)}))];
    nearby = candidates.filter((candidate) => distance(candidate,state.hero) < (candidate.kind === 'gate' ? 150 : 130)).sort((a,b) => distance(a,state.hero)-distance(b,state.hero))[0] || null;
    if (nearby) { ui.context.hidden = false; ui.context.textContent = `${nearby.icon} ${nearby.role ? `Talk to ${nearby.name}` : nearby.name}`; }
  }

  function marker(x,y,icon,color,label) {
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle = '#180c25dd'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,-32,22,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 25px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon,0,-32);
    if (label) { ctx.font = 'bold 16px system-ui'; ctx.lineWidth = 5; ctx.strokeStyle = '#180c25'; ctx.strokeText(label,0,3); ctx.fillStyle = '#fff8dc'; ctx.fillText(label,0,3); }
    ctx.restore();
  }

  function drawFloor() {
    const data = map();
    ctx.drawImage(images[data.image],0,0,data.width,data.height);
    if (progress().selected && data.id === 'town') {
      ctx.save(); ctx.globalAlpha = .8;
      for (let i=0;i<26;i++) { const x=650+(i*137)%2100, y=650+((state.time*34+i*83)%1400); ctx.fillStyle=i%2 ? '#ffcd54' : '#d9ff45'; ctx.fillRect(x,y,5,9); }
      ctx.restore();
    }
    for (const item of data.places) {
      if (item.flag && knownFlag(item.flag)) continue;
      const at = point(item.at);
      if (Math.abs(at.x-state.camera.x) > s.getViewport().width/s.getViewport().zoom + 220 || at.y < state.camera.y-100 || at.y > state.camera.y+s.getViewport().height/s.getViewport().zoom+100) continue;
      marker(at.x,at.y,item.icon,item.kind === 'expedition' ? '#d9ff45' : '#ffcd54', distance(at,state.hero)<240 ? item.name : '');
    }
    if (trial) {
      ctx.save(); ctx.translate(trial.x,trial.y);
      ctx.fillStyle = trial.phase === 'warning' ? '#ffcd5466' : '#ff4fa399';
      ctx.strokeStyle = trial.phase === 'warning' ? '#ffcd54' : '#fff8dc'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0,0,trial.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([10,8]); ctx.beginPath(); ctx.arc(0,0,trial.radius+20,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle='#fff8dc'; ctx.font='bold 24px system-ui'; ctx.textAlign='center'; ctx.fillText(trial.phase==='warning' ? 'MOVE!' : 'STOMP!',0,7);
      ctx.restore();
    }
  }

  function drawPeople() {
    for (const npc of people) {
      if (distance(npc,state.hero)>700) continue;
      s.drawImageBottom(images.heroFront,npc.x,npc.y,96,1,1,0,`hue-rotate(${npc.hue}deg)`);
      const job = rangerJobs.find((j)=>j.giver===npc.id && !progress().completed.includes(j.id));
      marker(npc.x,npc.y-94,job ? ready(job) ? '✓' : '!' : npc.icon,job ? '#ffcd54' : '#d9ff45',distance(npc,state.hero)<240 ? npc.name : '');
    }
  }

  function drawCompass() {
    const view = s.getViewport(), data = map();
    const w=92, h=69, x=view.width-w-14, y=Math.min(170,view.height*.3);
    ctx.save(); ctx.fillStyle='#180c25dd'; ctx.fillRect(x-3,y-3,w+6,h+6);
    ctx.drawImage(images[data.image],x,y,w,h);
    ctx.fillStyle='#d9ff45'; ctx.strokeStyle='#180c25'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x+state.hero.x/data.width*w,y+state.hero.y/data.height*h,4,0,Math.PI*2); ctx.fill(); ctx.stroke();
    const goal=target();
    let at=goal.at;
    if(goal.mapId!==data.id) at=data.places.find((v)=>v.kind==='gate' && (v.to===goal.mapId || v.to==='town'))?.at;
    if(at) { ctx.fillStyle='#ffcd54'; ctx.beginPath(); ctx.arc(x+at[0]/data.width*w,y+at[1]/data.height*h,3,0,Math.PI*2); ctx.fill(); }
    if (trial) {
      // Keep the human judge visible while the camera follows our tiny grape.
      const portrait = images.fair, px = 14, py = y;
      ctx.fillStyle = '#180c25ee'; ctx.fillRect(px-3,py-3,146,90);
      ctx.drawImage(portrait,portrait.naturalWidth*.34,0,portrait.naturalWidth*.33,portrait.naturalHeight*.24,px,py,140,62);
      ctx.fillStyle = '#fff8dc'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('BERNARD · THE STOMPER',px+70,py+78);
    }
    ctx.restore();
  }

  function fireWeapon() {
    const weapon = progress().weapon;
    if (weapon === 'seedshot') return false;
    const hero = state.hero;
    const target = s.nearestEnemy(hero,weapon === 'pruningLance' ? 620 : 330);
    const angle = target ? Math.atan2(target.y-hero.y,target.x-hero.x) : Math.atan2(hero.facingY,hero.facingX);
    hero.attackCooldown = weapon === 'corkscatter' ? .55 : .72;
    hero.attackAnim = .3;
    for (const offset of weapon === 'corkscatter' ? [-.22,0,.22] : [0]) {
      const a=angle+offset, speed=weapon==='corkscatter' ? 540 : 740;
      state.bolts.push({id:s.nextId(),x:hero.x+Math.cos(a)*24,y:hero.y-20+Math.sin(a)*24,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,radius:weapon==='corkscatter'?12:8,damage:hero.damage*(weapon==='corkscatter'?1.15:2.2),life:weapon==='corkscatter'?.52:1.2,heavy:false,spin:0,targetId:null,pierce:weapon==='pruningLance'?2:0,hitIds:[]});
    }
    s.sound('heavy'); return true;
  }

  function recover() { enter('town',rangerMaps.town.places.find((p)=>p.id==='town-rest').at); flash('A ranger brought you home. Your jobs, equipment and discoveries are safe.'); }
  ui.context.addEventListener('click',interact);
  ui.weapon.addEventListener('click',equipment);
  ui.panelClose.addEventListener('click',closePanel);
  ui.panel.addEventListener('click',(event)=>{ const button=event.target?.closest?.('[data-ranger-action]'); if(button) choose(button.dataset.rangerAction); });
  return {enter,leave,update,capture,captureExpedition,expeditionState,finishExpedition,interact,talk,choose,journal,closePanel,syncUI,drawFloor,drawPeople,drawCompass,fireWeapon,recover,startTrial,getTrial:()=>trial,target,flash};
}
