import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './game-harness.mjs';
import { Terrain } from '../public/engine/terrain.mjs';
import { rangerMaps, rangerExpeditions } from '../public/content/frontier.mjs';
import { newSave, loadSave, SAVE_KEY, SAVE_SCHEMA_VERSION } from '../public/engine/save.mjs';
import { createFrontierState, validateFrontier, claimRangerJob, buyRangerWeapon, selectGrandVintage } from '../public/engine/frontier-state.mjs';
import { campaignChapters } from '../public/content/campaign.mjs';
import { rememberEnding } from '../public/engine/journey-memory.mjs';

const at = ([x,y]) => ({x,y});
const click = (g,id) => g.element(id).listeners.click[0]();
async function town(storage = new Map()) {
  const g = await loadGame({storage});
  click(g,'start-button');
  assert.equal(g.state.mode,'ranger-panel');
  assert.ok(g.rangerWorld.choose('intro'));
  g.state.helpEnabled = false;
  return g;
}
function walkTo(g, mapId, id) {
  assert.equal(g.state.frontier.mapId,mapId);
  const data = rangerMaps[mapId];
  const destination = [...data.people,...data.places].find((p)=>p.id===id);
  const path = g.state.terrain.findPath(g.state.hero,at(destination.at),g.state.hero.footRadius);
  assert.ok(path.length,`${mapId}/${id} has a walking route`);
  for (const p of path) g.moveActor(g.state.hero,p.x-g.state.hero.x,p.y-g.state.hero.y);
  g.rangerWorld.syncUI();
  assert.ok(g.rangerWorld.interact(),`interact with ${id}`);
}
function choose(g,id) { assert.ok(g.rangerWorld.choose(id),id); }
function collectTag(g,index) {
  const side=g.state.sideview, tag=side.receipts[index];
  Object.assign(side,{x:tag.x,y:tag.y+45,vx:0,vy:0,grapplePhase:'none',grappleIndex:null});
  g.update(1/60);
  assert.ok(tag.collected);
}
function exitRoute(g) {
  if(g.state.mode==='help') g.dismissContextHelp();
  g.state.sideview.x=g.sideviewDefinition.exitX;
  g.update(1/60);
}
function passTrial(g) {
  for(let tick=0;tick<1600 && g.rangerWorld.getTrial();tick++) {
    const trial=g.rangerWorld.getTrial();
    if(trial.phase==='warning') {
      const targetX=trial.x>=1630?1420:1840;
      g.input.joyX=Math.abs(g.state.hero.x-targetX)>8?Math.sign(targetX-g.state.hero.x):0;
    } else g.input.joyX=0;
    g.update(1/60);
  }
  g.clearInput();
  assert.equal(g.rangerWorld.getTrial(),null);
  assert.ok(g.state.frontier.stamps.includes('footwork'));
}

test('all town roads, people, work sites and expedition exits connect on safe floor',()=>{
  for(const data of Object.values(rangerMaps)) {
    const terrain=new Terrain(data,24), spawn=at(data.spawn);
    assert.ok(terrain.contains(spawn,14));
    const targets=[...data.people,...data.places,...data.encounters,...Object.values(rangerExpeditions).filter((r)=>r.destination===data.id).map((r)=>({id:r.id,at:r.arrival}))];
    for(const target of targets) {
      const p=at(target.at);
      assert.ok(terrain.contains(p,18),`${data.id}/${target.id} safe clearance`);
      const path=terrain.findPath(spawn,p,14);
      assert.ok(path.length,`${data.id}/${target.id} reachable`);
      let current=spawn;
      for(const next of path) { assert.ok(terrain.segmentClear(current,next,14)); current=next; }
    }
  }
});

test('both vine expeditions retain safe checkpoints and jumpable ground gaps',()=>{
  for(const route of Object.values(rangerExpeditions)) {
    const ground=route.platforms.filter((p)=>p.kind==='stone');
    for(const cp of route.checkpoints) assert.ok(ground.some((p)=>cp>=p.x && cp<=p.x+p.width),`${route.id}/${cp}`);
    for(let i=1;i<ground.length;i++) assert.ok(ground[i].x-(ground[i-1].x+ground[i-1].width)<=120);
    assert.ok(ground.at(-1).x+ground.at(-1).width>=route.exitX);
    assert.ok(route.receipts.length>=route.requiredTags);
  }
});

test('Town introduces the selection goal and reload preserves place and character',async()=>{
  const storage=new Map(), g=await town(storage);
  const character=g.state.memory.character.id;
  walkTo(g,'town','post'); choose(g,'accept:courier');
  walkTo(g,'town','terraces-gate');
  assert.equal(g.state.frontier.mapId,'terraces');
  g.input.joyX=-1; for(let i=0;i<40;i++)g.update(1/60); g.clearInput();
  g.pauseGame();
  const saved=loadSave(g.adapter);
  assert.equal(saved.schemaVersion,SAVE_SCHEMA_VERSION);
  const resumed=await loadGame({storage}); click(resumed,'continue-button');
  assert.equal(resumed.state.mode,'playing');
  assert.equal(resumed.state.frontier.mapId,'terraces');
  assert.equal(resumed.state.memory.character.id,character);
  assert.equal(resumed.state.hero.x,saved.frontier.position.x);
  assert.equal(resumed.state.hero.y,saved.frontier.position.y);
  assert.ok(resumed.state.frontier.jobs.includes('courier'));
  resumed.draw();
  assert.ok(resumed.drawnImages.some((i)=>i.src.endsWith('ranger-terraces.webp')));
});

test('a schema-two boss winner continues into town without losing the old ending',async()=>{
  const previous=newSave(); previous.schemaVersion=2; delete previous.frontier;
  previous.campaign.completed=campaignChapters.flatMap((c)=>c.exitRequires);
  previous.run.endingSeen=true;
  previous.memory=rememberEnding(previous.memory,previous.campaign,previous.run.id,'grapegripe:vineyard-restored');
  const storage=new Map([[SAVE_KEY,JSON.stringify(previous)]]);
  const g=await loadGame({storage}); click(g,'continue-button');
  assert.ok(g.state.inFrontier);
  assert.equal(g.state.frontier.mapId,'town');
  assert.equal(g.state.memory.character.id,previous.memory.character.id);
  assert.equal(g.state.memory.endings.length,1);
  choose(g,'intro');
  assert.equal(loadSave(g.adapter).schemaVersion,3);
});

test('vine tags and checkpoints survive reload and leaving through Pause',async()=>{
  const storage=new Map(),g=await town(storage);
  g.rangerWorld.enter('terraces');
  walkTo(g,'terraces','aqueduct-entry');
  if(g.state.mode==='help')g.dismissContextHelp();
  collectTag(g,0); collectTag(g,1);
  const score=g.state.score;
  const checkpoint=g.state.sideview.checkpointX;
  g.pauseGame();
  const resumed=await loadGame({storage}); click(resumed,'continue-button');
  if(resumed.state.mode==='help')resumed.dismissContextHelp();
  assert.equal(resumed.state.sideview.rangerRoute,'aqueduct');
  assert.equal(resumed.state.sideview.checkpointX,checkpoint);
  assert.equal(resumed.state.sideview.receiptCount,2);
  collectTag(resumed,0);
  assert.equal(resumed.state.score,score,'collected tag cannot mint another reward');
  exitRoute(resumed);
  assert.equal(resumed.state.frontier.mapId,'terraces','two tags cannot complete the aroma job');
  assert.equal(resumed.state.sideview.x,rangerExpeditions.aqueduct.spawn.x);
  assert.equal(resumed.state.sideview.receiptCount,2);
  resumed.pauseGame(); click(resumed,'pause-town-button');
  assert.equal(resumed.state.frontier.mapId,'town');
  assert.equal(resumed.state.frontier.activeRoute,null);
  assert.equal(resumed.state.frontier.expeditions.aqueduct.receipts.length,2);
});

test('the full selection chapter connects jobs, combat, vines, equipment and a permanent ending',async()=>{
  const storage=new Map(),g=await town(storage),character=g.state.memory.character.id;
  assert.equal(selectGrandVintage(g.state.frontier),false);
  walkTo(g,'town','post'); choose(g,'accept:courier');
  walkTo(g,'town','smith'); choose(g,'accept:craft');
  walkTo(g,'town','gardener'); choose(g,'accept:water');
  walkTo(g,'town','terraces-gate');
  walkTo(g,'terraces','canopy-entry');
  exitRoute(g);
  assert.equal(g.state.mode,'ranger-panel');
  choose(g,'deliver');
  walkTo(g,'terraces','scout'); choose(g,'accept:aroma');
  walkTo(g,'terraces','sprayer');
  assert.ok(!g.state.frontier.flags.includes('sprayer-found'),'parts stay guarded');
  g.rangerWorld.update(1/60);
  assert.equal(g.state.enemies.length,3);
  g.state.hero.health=10000;
  g.input.attackHeld=true;
  for(let i=0;i<2200 && g.state.enemies.length;i++) g.update(1/60);
  g.clearInput(); g.rangerWorld.update(1/60);
  assert.equal(g.state.enemies.length,0,'equipped seedshots clear the actual encounter');
  assert.ok(g.state.frontier.cleared.includes('sprayer-guard'));
  walkTo(g,'terraces','sprayer');
  walkTo(g,'terraces','water-west'); walkTo(g,'terraces','water-east');
  walkTo(g,'terraces','aqueduct-entry');
  if(g.state.mode==='help')g.dismissContextHelp();
  collectTag(g,0); collectTag(g,1); collectTag(g,2);
  exitRoute(g);
  assert.equal(g.state.frontier.mapId,'fair');
  assert.ok(g.state.frontier.visited.includes('fair'));
  walkTo(g,'fair','fair-town');
  walkTo(g,'town','post'); choose(g,'claim:courier');
  const speed=g.state.hero.speed;
  walkTo(g,'town','smith'); choose(g,'claim:craft');
  assert.equal(g.state.frontier.weapon,'corkscatter');
  assert.equal(g.state.frontier.seeds,55);
  walkTo(g,'town','smith'); choose(g,'buy:pruningLance');
  assert.equal(g.state.frontier.seeds,0);
  assert.equal(g.state.frontier.weapon,'pruningLance');
  g.rangerWorld.closePanel();
  walkTo(g,'town','gardener'); choose(g,'claim:water');
  walkTo(g,'town','terraces-gate');
  assert.equal(g.state.hero.speed,speed,'boots do not stack on map entry');
  assert.equal(g.state.enemies.length,0,'cleared paths remain clear');
  walkTo(g,'terraces','scout'); choose(g,'claim:aroma');
  g.openMap(); choose(g,'travel:fair');
  walkTo(g,'fair','blender');
  assert.equal(g.rangerWorld.choose('select'),false,'Footwork is still required');
  g.rangerWorld.closePanel();
  walkTo(g,'fair','judge'); choose(g,'trial');
  g.draw();
  assert.ok(g.drawnImages.some((i)=>i.src.endsWith('ranger-fair.webp') && i.args.length===8),'human judge art is visible during the trial');
  passTrial(g);
  walkTo(g,'fair','blender'); choose(g,'select');
  assert.ok(g.state.frontier.selected);
  assert.equal(g.state.frontier.stamps.length,4);
  assert.equal(g.state.memory.endings.filter((e)=>e.id==='grapegripe:grand-vintage').length,1);
  const seeds=g.state.frontier.seeds;
  assert.equal(claimRangerJob(g.state.frontier,'courier'),false);
  assert.equal(selectGrandVintage(g.state.frontier),false);
  assert.equal(g.state.frontier.seeds,seeds);
  choose(g,'travel:town');
  const resumed=await loadGame({storage}); click(resumed,'continue-button');
  assert.ok(resumed.state.frontier.selected);
  assert.equal(resumed.state.memory.character.id,character);
  resumed.openMap(); choose(resumed,'patrol');
  assert.equal(resumed.state.inFrontier,false);
  resumed.pauseGame(); click(resumed,'pause-town-button');
  assert.ok(resumed.state.frontier.selected);
  assert.equal(resumed.state.memory.endings.length,1);
  assert.equal(resumed.state.frontier.weapon,'pruningLance');
});

test('ranger weapons have distinct spread and a lance stops after three targets',async()=>{
  const g=await town();
  g.state.frontier.gear.push('corkscatter','pruningLance');
  g.state.frontier.weapon='corkscatter';g.attack();
  assert.equal(g.state.bolts.length,3);
  assert.equal(new Set(g.state.bolts.map((b)=>b.vx)).size,3);
  g.state.bolts=[];g.state.hero.attackCooldown=0;
  g.state.frontier.weapon='pruningLance';g.attack();
  assert.equal(g.state.bolts.length,1);
  const bolt=g.state.bolts[0];bolt.vx=bolt.vy=0;
  for(let i=0;i<4;i++) {
    g.spawnEnemy('sourling',{x:g.state.hero.x+150,y:g.state.hero.y});
    Object.assign(g.state.enemies.at(-1),{x:bolt.x,y:bolt.y,hp:100,spawn:1});
  }
  g.updateBolts(1/60);
  assert.equal(g.state.enemies.filter((e)=>e.hp<100).length,3);
  assert.equal(g.state.bolts.length,0);
});

test('failed auditions and world defeat preserve jobs and gear; rematches cannot farm seals',async()=>{
  const g=await town();
  g.state.frontier.jobs.push('courier'); g.state.frontier.gear.push('pruningLance');
  g.rangerWorld.enter('fair');
  g.rangerWorld.startTrial();
  for(let i=0;i<500 && g.rangerWorld.getTrial();i++)g.update(1/60);
  assert.equal(g.rangerWorld.getTrial(),null);
  assert.ok(!g.state.frontier.stamps.includes('footwork'));
  assert.ok(g.state.hero.health>0);
  g.rangerWorld.startTrial();passTrial(g);
  const seeds=g.state.frontier.seeds;
  g.rangerWorld.startTrial();passTrial(g);
  assert.equal(g.state.frontier.seeds,seeds);
  g.state.hero.invulnerable=0;g.damageHero(9999);
  assert.equal(g.state.frontier.mapId,'town');
  assert.equal(g.state.mode,'playing');
  assert.ok(g.state.frontier.jobs.includes('courier'));
  assert.ok(g.state.frontier.gear.includes('pruningLance'));
  assert.ok(g.state.hero.health>0);
});

test('invalid frontier saves cannot fabricate unknown equipment or selection seals',()=>{
  const p=validateFrontier({mapId:'ocean',seeds:Infinity,gear:['seedshot','admin'],weapon:'admin',selected:true,stamps:['aroma'],position:{x:NaN,y:-Infinity},expeditions:{aqueduct:{checkpoint:999999,receipts:[0,0,99],flies:[99]}}});
  assert.equal(p.mapId,'town');assert.equal(p.selected,false);assert.equal(p.weapon,'seedshot');
  assert.deepEqual(p.stamps,[]);assert.equal(p.seeds,0);
  assert.deepEqual(p.expeditions.aqueduct.receipts,[0]);
  assert.ok(p.expeditions.aqueduct.checkpoint<rangerExpeditions.aqueduct.exitX);
  assert.equal(buyRangerWeapon(createFrontierState(),'pruningLance'),false);
});
