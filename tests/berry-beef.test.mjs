import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(){
  const elements=new Map();
  const make=()=>({
    focus(){}, hidden:false, disabled:false, textContent:'', value:0, style:{},
    classList:{add(){}, remove(){}, toggle(){}},
    querySelector(){return this},
    setPointerCapture(){},
    getBoundingClientRect(){return {left:0, top:0, width:126, height:126}},
    addEventListener(){},
    getContext(){return new Proxy({}, {get:()=>()=>{}})},
    onclick:null,
  });
  const document={
    getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id)},
    querySelectorAll(){return []},
    addEventListener(){},
  };
  const c=vm.createContext({
    document,
    Image:class{set src(v){queueMicrotask(()=>this.onload&&this.onload())}},
    requestAnimationFrame(){},
    addEventListener(){},
    localStorage:{getItem(){return null}, setItem(){}},
    devicePixelRatio:1,
    setTimeout,
    performance:{now:()=>0},
  });
  c.window=c;
  vm.runInContext(readFileSync(new URL('../public/berry-beef.js',import.meta.url),'utf8'),c);
  return s=>vm.runInContext(s,c);
}

test('Berry Bliss jumps with Up, lands on platforms, clears input on pause',()=>{
  const run=setup();
  run('begin(); hero.x=220; press("jump"); for(let i=0;i<55;i++)step(.016)');
  assert.equal(run('hero.y'),405);
  run('keys.add("right");pause()');
  assert.equal(run('keys.size'),0);
  assert.equal(run('phase'),'paused');
});

test('controls match journey map: Space attacks, Shift dashes, not X-jump',()=>{
  const html=readFileSync(new URL('../public/berry-beef.html',import.meta.url),'utf8');
  assert.match(html,/id="joystick-zone"/);
  assert.match(html,/id="attack-button"/);
  assert.match(html,/id="dash-button"/);
  assert.match(html,/Space attack/i);
  assert.match(html,/Shift dash/i);
  assert.doesNotMatch(html,/data-key="hit"/);
  assert.doesNotMatch(html,/X hit|X attacks/i);
  const js=readFileSync(new URL('../public/berry-beef.js',import.meta.url),'utf8');
  assert.match(js,/key==='shift'/);
  assert.match(js,/key===' '/);
  assert.match(js,/arrowup|key==='w'/);
  assert.doesNotMatch(js,/Nintendo|Smash Bros|Mario|Pikachu|Fox McCloud/i);
});

test('percent knockback builds and stocks drop on blast-zone exit',()=>{
  const run=setup();
  run('begin(); hero.x=750; rival.x=800; rival.percent=80; press("attack"); step(.05); for(let i=0;i<8;i++)step(.016)');
  assert.ok(run('rival.percent')>80);
  run('rival.x=-120; rival.y=520; step(.01)');
  assert.equal(run('rival.stocks'),2);
  assert.equal(run('rival.percent'),0);
});

test('aerial attacks use a distinct hitbox and rival stomp still telegraphs',()=>{
  const run=setup();
  run('begin(); hero.ground=false; hero.y=400; press("attack"); step(.01)');
  assert.equal(run('hero.attackKind'),'aerial');
  run('rival.timer=2.1; rival.mode="patrol"; step(.01)');
  assert.equal(run('rival.mode'),'warn');
  const target=run('rival.target');
  run('hero.x=400; rival.timer=.71; step(.01)');
  assert.equal(run('rival.mode'),'air');
  assert.equal(run('rival.target'),target);
});

test('phone portrait and landscape keep the floor above touch controls',()=>{
  const run=setup();
  for(const [w,h] of [[393,852],[852,393],[320,568],[1280,720]]){
    run(`var vp=viewport(${w},${h})`);
    const floorY=run('vp.offset+520*vp.scale');
    assert.ok(floorY<=h-run('vp.bottom')+.01);
    assert.ok(floorY>=run('vp.top')+70);
  }
});

test('winning the third round reaches a real ending after stock KO',()=>{
  const run=setup();
  run('level=2; begin(); rival.stocks=1; rival.x=-200; step(.01)');
  assert.equal(run('phase'),'menu');
  assert.equal(run('rival.stocks'),0);
});

test('edge grab latches near the lip while falling',()=>{
  const run=setup();
  run('begin(); hero.ground=false; hero.x=30; hero.y=530; hero.vy=200; hero.ledgeLock=0; step(.02)');
  assert.ok(run('hero.ledge')>0);
});
