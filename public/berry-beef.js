const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
const W=960,H=640, floor=520;
const BLAST={left:-80,right:W+80,top:-140,bottom:H+90};
const layouts=[
  [[180,405,180],[490,335,170],[730,425,150]],
  [[130,425,160],[370,340,160],[650,410,180],[480,250,140]],
  [[160,420,180],[400,320,160],[670,420,180],[280,260,120],[640,260,120]]
];
const titles=['1 / 3 · Raisin roast','2 / 3 · Must & fury','3 / 3 · Corked finale'];
const taunts=['“You’re just a raisin with ambition.”','“All that whining. Still no wine.”','“Fine. Winner keeps the fruit platter.”'];
const SAVE='grapegripe-berry-bliss-progress';
let savedRound=0;try{const n=Number(localStorage.getItem(SAVE));if(Number.isInteger(n)&&n>=0&&n<3)savedRound=n}catch{}
let soundOn=true,audio;
function tone(freq=240,duration=.1,type='sine'){if(!soundOn)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.55,audio.currentTime+duration);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function saveRound(){try{localStorage.setItem(SAVE,String(level))}catch{}}
$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)tone()};

const keys=new Set();
let hero,rival,particles=[],level=0,phase='loading',clock=0,last=0,hitThisSwing=false,cycle=0;
let joyX=0,joyY=0,joystickId=null,attackHeld=false;
const images={};
function load(name,url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[name]=im;resolve()};im.onerror=reject;im.src=url})}
function clear(){keys.clear();joyX=0;joyY=0;joystickId=null;attackHeld=false;$('attack-button')?.classList.remove('is-held');const knob=$('joystick-knob');if(knob)knob.style.transform='translate(0px,0px)'}
function stocksText(n){return '●'.repeat(Math.max(0,n))+'○'.repeat(Math.max(0,3-n))}
function syncMeters(){
  if(!hero||!rival)return;
  $('hero-stocks').textContent=stocksText(hero.stocks);
  $('rival-stocks').textContent=stocksText(rival.stocks);
  $('hero-percent').value=Math.min(200,hero.percent);
  $('rival-percent').value=Math.min(200,rival.percent);
  $('hero-pct-label').textContent=Math.floor(hero.percent)+'%';
  $('rival-pct-label').textContent=Math.floor(rival.percent)+'%';
}
function panel(title,body,label,action){clear();phase='menu';$('overlay').hidden=false;$('overlay').querySelector('article').innerHTML=`<small>GRAPE.GRIPE / BERRY BLISS</small><h1>${title}</h1><p>${body}</p><button id="next" type="button">${label}</button>`;$('next').onclick=action;$('next').focus()}
function makeFighter(x,face){return{x,y:floor,vx:0,vy:0,ground:true,face,percent:0,stocks:3,inv:0,attack:0,attackKind:'neutral',dash:0,dashCd:0,coyote:0,jumpBuf:0,jumpLatch:false,ledge:0,ledgeDir:0,ledgeLock:0,hitstun:0,di:0}}
function begin(){
  hero=makeFighter(120,1);rival=makeFighter(820,-1);
  rival.mode='patrol';rival.timer=0;rival.shotTimer=0;rival.target=820;rival.launchX=820;
  particles=[];cycle=0;clock=0;phase='play';clear();
  $('overlay').hidden=true;$('pause').textContent='Ⅱ';$('stage').textContent=titles[level];
  $('callout').textContent=taunts[level];syncMeters();saveRound();tone(330,.15);
}
function pause(){if(phase==='play'){phase='paused';clear();$('pause').textContent='▶';$('callout').textContent='Paused — tap ▶ to continue.'}else if(phase==='paused'){phase='play';$('pause').textContent='Ⅱ'}}
$('pause').onclick=pause;

function jumpHeld(){return joyY<-.45||keys.has('up')}
function moveAxis(){const k=((keys.has('right')?1:0)-(keys.has('left')?1:0));const j=Math.abs(joyX)>.2?joyX:0;const v=Math.abs(j)>Math.abs(k)?j:k;return Math.max(-1,Math.min(1,v))}
function tryJump(f){if(f.jumpBuf<=0)return;if(f.ledge>0){const dir=f.ledgeDir||f.face;f.ledge=0;f.ledgeDir=0;f.vy=-620;f.vx=dir*160;f.face=dir;f.jumpBuf=0;f.coyote=0;f.ground=false;tone(480,.08);return}if(f.ground||f.coyote>0){f.vy=-660;f.ground=false;f.jumpBuf=0;f.coyote=0;tone(440,.1)}}
function startAttack(f,isHero){if(f.attack>0||f.hitstun>0||f.ledge>0)return;const aerial=!f.ground;f.attack=aerial?.28:.3;f.attackKind=aerial?'aerial':'ground';if(isHero)hitThisSwing=false;tone(aerial?180:130,.08,'triangle')}
function startDash(f){if(f.dashCd>0||f.hitstun>0||f.ledge>0)return;const dir=moveAxis()||f.face;f.face=Math.sign(dir)||f.face;f.dash=.18;f.dashCd=.7;f.vx=f.face*620;f.vy=Math.min(f.vy,40);f.inv=Math.max(f.inv,.12);tone(145,.12);return true}
function press(k){if(phase!=='play'||!hero)return;if(k==='jump'){hero.jumpBuf=.14;tryJump(hero)}if(k==='attack'){attackHeld=true;startAttack(hero,true);$('attack-button').classList.add('is-held')}if(k==='dash'){startDash(hero);$('dash-button').disabled=true;setTimeout(()=>{if(hero&&hero.dashCd<=0)$('dash-button').disabled=false},720)}keys.add(k)}

// Touch: journey-style joystick + attack + dash
const joyZone=$('joystick-zone'),joyKnob=$('joystick-knob'),joyBase=$('joystick-base');
function setJoystick(e){const r=joyBase.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.34;const len=Math.hypot(dx,dy)||1;if(len>max){dx*=max/len;dy*=max/len}joyX=dx/max;joyY=dy/max;joyKnob.style.transform=`translate(${dx}px,${dy}px)`;if(joyX<-.35)keys.add('left');else keys.delete('left');if(joyX>.35)keys.add('right');else keys.delete('right');if(joyY<-.45){if(!hero?.jumpLatch){hero&&(hero.jumpBuf=.14)}keys.add('up')}else keys.delete('up')}
function releaseJoystick(e){if(e&&joystickId!=null&&e.pointerId!==joystickId)return;joystickId=null;joyX=0;joyY=0;joyKnob.style.transform='translate(0px,0px)';keys.delete('left');keys.delete('right');keys.delete('up')}
joyZone.addEventListener('pointerdown',e=>{e.preventDefault();joystickId=e.pointerId;joyZone.setPointerCapture(e.pointerId);setJoystick(e)});
joyZone.addEventListener('pointermove',e=>{if(e.pointerId===joystickId)setJoystick(e)});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])joyZone.addEventListener(ev,releaseJoystick);
$('attack-button').addEventListener('pointerdown',e=>{e.preventDefault();$('attack-button').setPointerCapture(e.pointerId);press('attack')});
function releaseAttack(){attackHeld=false;keys.delete('attack');$('attack-button').classList.remove('is-held')}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('attack-button').addEventListener(ev,releaseAttack);
$('dash-button').addEventListener('pointerdown',e=>{e.preventDefault();press('dash')});

// Keyboard: same map as journey.js — WASD/arrows, Space attack, Shift dash, Esc pause
addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(key))e.preventDefault();
  if(key==='escape'){pause();return}
  if(phase!=='play')return;
  if(key==='arrowleft'||key==='a')keys.add('left');
  if(key==='arrowright'||key==='d')keys.add('right');
  if(key==='arrowup'||key==='w'){keys.add('up');if(!e.repeat){hero.jumpBuf=.14;tryJump(hero)}}
  if(key===' '){if(!e.repeat)press('attack')}
  if(key==='shift'){if(!e.repeat)press('dash')}
});
addEventListener('keyup',e=>{
  const key=e.key.toLowerCase();
  if(key==='arrowleft'||key==='a')keys.delete('left');
  if(key==='arrowright'||key==='d')keys.delete('right');
  if(key==='arrowup'||key==='w')keys.delete('up');
  if(key===' ')releaseAttack();
});
addEventListener('blur',()=>{if(phase==='play')pause();clear()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='play')pause()});

function burst(x,y,color){for(let i=0;i<14;i++)particles.push({x,y,vx:(Math.random()-.5)*380,vy:-Math.random()*280,t:.45,color})}
function applyHit(attacker,defender,opts){
  if(defender.inv>0||defender.ledge>0)return false;
  const dmg=opts.damage;const kb=opts.knockback*(1+defender.percent/100);
  defender.percent=Math.min(999,defender.percent+dmg);
  defender.hitstun=opts.hitstun??(.2+defender.percent*.002);
  defender.inv=.25;defender.ledge=0;defender.ledgeDir=0;defender.ground=false;
  const dir=attacker.face||Math.sign(defender.x-attacker.x)||1;
  const angle=opts.angle??(opts.aerial?.55:.28);
  defender.vx=dir*kb*Math.cos(angle);defender.vy=-kb*Math.sin(angle)-40;
  burst(defender.x,defender.y-40,'#ff6477');tone(210,.12,'square');syncMeters();return true;
}
function stockOut(who){
  who.stocks-=1;syncMeters();tone(90,.25,'sawtooth');burst(who.x,who.y-20,'#ce9fff');
  if(who.stocks<=0){
    if(who===hero)panel('Sour grapes?','Percent climbed, stocks dropped. Rematch this platter layout.','Try this round',begin);
    else if(level<2)panel('He’s not done.',level===0?'“Lucky launch. Meet me further up the vine.”':'“One last round. Winner gets the fancy fruit platter.”','Chase him',()=>{level++;saveRound();begin()});
    else{try{localStorage.setItem('grapegripe-berry-bliss-win','1')}catch{}panel('Bliss earned.','“Grape fight,” he mutters.<br>“Berry funny,” you reply.<br><br>You split the fruit platter. Neither of you admits you’re friends.','Rematch',()=>{level=0;begin()})}
    return true;
  }
  who.x=who===hero?140:820;who.y=floor;who.vx=0;who.vy=0;who.percent=0;who.inv=1.6;who.hitstun=0;who.ground=true;who.ledge=0;who.ledgeDir=0;syncMeters();
  $('callout').textContent=who===hero?'Stock lost — watch the blast zones!':'Strawberry lost a stock!';
  return false;
}
function inBlast(f){return f.x<BLAST.left||f.x>BLAST.right||f.y<BLAST.top||f.y>BLAST.bottom}
function nearLedge(f){
  if(f.ground||f.vy<0||f.ledgeLock>0)return 0;
  const edgeL=36,edgeR=W-36;
  if(f.y>floor-30&&f.y<floor+70){
    if(f.x<edgeL+28&&f.x>edgeL-50)return 1;
    if(f.x>edgeR-28&&f.x<edgeR+50)return -1;
  }
  return 0;
}
function collidePlatforms(f,oldY){
  f.ground=false;
  for(const [x,y,w]of [[0,floor,W],...layouts[level]]){
    if(f.vy>=0&&oldY<=y&&f.y>=y&&f.x+18>x&&f.x-18<x+w){f.y=y;f.vy=0;f.ground=true;f.ledge=0}
  }
}
function fighterStep(f,dt,isHero){
  f.inv=Math.max(0,f.inv-dt);f.attack=Math.max(0,f.attack-dt);f.dash=Math.max(0,f.dash-dt);f.dashCd=Math.max(0,f.dashCd-dt);
  f.hitstun=Math.max(0,f.hitstun-dt);f.ledgeLock=Math.max(0,f.ledgeLock-dt);f.jumpBuf=Math.max(0,f.jumpBuf-dt);
  f.coyote=f.ground?0.12:Math.max(0,f.coyote-dt);
  if(isHero){
    const held=jumpHeld();if(held&&!f.jumpLatch)f.jumpBuf=.14;f.jumpLatch=held;tryJump(f);
    if(attackHeld&&f.attack<=0)startAttack(f,true);
  }
  if(f.ledge>0){f.vx=0;f.vy=0;f.x=f.ledgeDir>0?36:W-36;f.y=floor-8;f.face=f.ledgeDir||f.face;f.ledge-=dt;if(f.ledge<=0){f.ledge=0;f.ledgeDir=0;f.ledgeLock=.35;f.vy=-120}return}
  if(f.hitstun>0){/* knockback drift */}
  else if(f.dash>0){/* dash velocity kept */}
  else{
    const axis=isHero?moveAxis():f.aiAxis||0;
    const target=axis*300;
    f.vx+=(target-f.vx)*Math.min(1,dt*12);
    if(Math.abs(axis)>.2)f.face=Math.sign(axis);
  }
  const oldY=f.y;f.vy+=1650*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(!f.hitstun)collidePlatforms(f,oldY);
  else if(f.y>=floor&&f.vy>0){f.y=floor;f.vy*=-.25;f.vx*=.7;if(Math.abs(f.vy)<80){f.vy=0;f.ground=true;f.hitstun=0}}
  const ledgeSide=nearLedge(f);
  if(ledgeSide&&f.hitstun<=0){f.ledge=.9;f.ledgeDir=ledgeSide;f.face=ledgeSide;f.vx=0;f.vy=0;f.x=ledgeSide>0?36:W-36;f.y=floor-8;tone(300,.06);$('callout').textContent=isHero?'Edge grab! Jump or attack to leave the lip.':'Strawberry clung to the rim!'}
  if(inBlast(f))stockOut(f);
}

function hurt(){/* compat for older tests: treat as a light percent bump + possible stock if over blast */}
function rivalAI(dt){
  rival.timer+=dt;rival.shotTimer+=dt;
  const dx=hero.x-rival.x;rival.aiAxis=0;
  if(rival.hitstun>0||rival.ledge>0)return;
  if(rival.mode==='patrol'){
    rival.aiAxis=Math.sign(dx)||-1;
    if(Math.abs(dx)<140&&rival.ground&&rival.attack<=0){startAttack(rival,false);rival.mode='swing';rival.timer=0}
    else if(Math.abs(dx)>220&&rival.dashCd<=0&&Math.random()<.02)startDash(rival);
    else if(rival.timer>1.6){rival.mode='warn';rival.timer=0;rival.target=Math.max(70,Math.min(W-70,hero.x));$('callout').textContent='STOMP TELEGRAPH — leave the red zone!'}
    if(!rival.ground&&Math.abs(dx)<120&&rival.attack<=0)startAttack(rival,false);
    if(rival.y>floor-40&&(rival.x<80||rival.x>W-80)&&rival.jumpBuf<=0){rival.jumpBuf=.14;tryJump(rival)}
  }else if(rival.mode==='warn'){
    rival.aiAxis=0;if(rival.timer>.7){rival.mode='air';rival.timer=0;rival.vy=-720;rival.launchX=rival.x;rival.ground=false;tone(170,.2)}
  }else if(rival.mode==='air'){
    rival.x=rival.launchX+(rival.target-rival.launchX)*Math.min(1,rival.timer/.87);
    if(rival.y>=floor&&rival.vy>=0){rival.y=floor;rival.vy=0;rival.ground=true;rival.mode='recover';rival.timer=0;burst(rival.x,floor,'#ff8794');tone(65,.24,'triangle');if(Math.abs(hero.x-rival.x)<110&&hero.y>floor-70&&hero.inv<=0){applyHit(rival,hero,{damage:12,knockback:420,angle:.4})}}
  }else if(rival.mode==='recover'){
    rival.aiAxis=0;if(rival.timer>1.35-level*.08){rival.mode='patrol';rival.timer=0}
  }else if(rival.mode==='swing'){
    if(rival.attack<=0){rival.mode='patrol';rival.timer=0}
  }
}

function hitboxActive(f){return f.attack>0&&f.attack< (f.attackKind==='aerial'?.22:.24)}
function tryHits(){
  if(hitboxActive(hero)&&!hitThisSwing){
    if(Math.abs(hero.x-rival.x)<(hero.attackKind==='aerial'?120:105)&&Math.abs(hero.y-rival.y)<100&&(rival.x-hero.x)*hero.face>=-20){
      hitThisSwing=true;
      const aerial=hero.attackKind==='aerial';
      applyHit(hero,rival,{damage:aerial?10:8,knockback:aerial?380:320,angle:aerial?.72:.35,aerial,hitstun:.18+rival.percent*.0015});
      rival.x=Math.max(40,Math.min(W-40,rival.x+hero.face*28));
    }
  }
  if(hitboxActive(rival)){
    if(Math.abs(rival.x-hero.x)<105&&Math.abs(rival.y-hero.y)<100&&(hero.x-rival.x)*rival.face>=-20){
      if(hero.inv<=0)applyHit(rival,hero,{damage:rival.attackKind==='aerial'?11:9,knockback:rival.attackKind==='aerial'?400:340,angle:rival.attackKind==='aerial'?.7:.32});
    }
  }
}

function step(dt){
  if(phase!=='play'||!hero)return;
  clock+=dt;cycle+=dt;
  fighterStep(hero,dt,true);
  if(phase!=='play')return;
  rivalAI(dt);
  fighterStep(rival,dt,false);
  if(phase!=='play')return;
  tryHits();
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.t-=dt}particles=particles.filter(p=>p.t>0);
  if(hero&&hero.dashCd<=0)$('dash-button').disabled=false;
  if(clock>2.5){
    if(rival.mode==='recover')$('callout').textContent='Punish window — Space / attack while he’s catching breath!';
    else if(rival.mode==='warn')$('callout').textContent='STOMP INCOMING — leave the red landing zone!';
    else if(rival.mode==='air')$('callout').textContent='Jump or dash clear of the landing!';
    else if(hero.ledge>0)$('callout').textContent='Edge grab — ↑ jump or Space attack to leave!';
    else $('callout').textContent='Build percent, then launch him off the platter. Aerials hit harder.';
  }
  syncMeters();
}

function sprite(im,x,y,size,flip=1,bob=0){ctx.save();ctx.translate(x,y+bob);ctx.scale(flip,1);const width=size*im.width/im.height;ctx.drawImage(im,-width/2,-size,width,size);ctx.restore()}
function viewport(bw,bh){
  const top=bh<500?100:160,bottom=bh<500?110:130,available=Math.max(80,bh-top-bottom);
  const scale=Math.min(1,available/350,bw/420);
  const visible=bw/scale,camera=Math.max(0,Math.min(W-visible,(hero?.x||80)-visible*.4));
  return {scale,top,bottom,camera,visible,offset:top-(floor-available/scale)*scale};
}
function render(){
  const d=Math.min(devicePixelRatio||1,2),bw=canvas.clientWidth,bh=canvas.clientHeight;
  if(canvas.width!==Math.round(bw*d)||canvas.height!==Math.round(bh*d)){canvas.width=Math.round(bw*d);canvas.height=Math.round(bh*d)}
  ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#140f24';ctx.fillRect(0,0,bw,bh);
  const v=viewport(bw,bh);ctx.save();ctx.beginPath();ctx.rect(0,v.top,bw,bh-v.top-v.bottom+25);ctx.clip();
  ctx.translate(v.visible>W?(bw-W*v.scale)/2:-v.camera*v.scale,v.offset);ctx.scale(v.scale,v.scale);
  if(images.bg)ctx.drawImage(images.bg,0,-120,W,760);
  ctx.fillStyle='#160d2830';ctx.fillRect(0,-120,W,760);
  // soft blast-zone tint at edges
  ctx.fillStyle='#ff476918';ctx.fillRect(-80, -140, 80, H+230);ctx.fillRect(W,-140,80,H+230);
  for(const [x,y,w]of [[0,floor,W],...layouts[level]]){
    ctx.fillStyle='#2d243a';ctx.fillRect(x,y,w,24);ctx.fillStyle='#95ab60';ctx.fillRect(x,y,w,5);ctx.fillStyle='#a697b5';ctx.fillRect(x,y+6,w,2);
  }
  if(hero){
    if(rival.mode==='warn'||rival.mode==='air'){ctx.fillStyle='#ff476955';ctx.fillRect(rival.target-110,floor-8,220,8);ctx.strokeStyle='#ff9aa9';ctx.lineWidth=3;ctx.strokeRect(rival.target-110,floor-8,220,8)}
    ctx.globalAlpha=hero.inv>0&&Math.floor(clock*12)%2?.45:1;
    sprite(images.hero,hero.x,hero.y,95,-hero.face,hero.ground&&Math.abs(hero.vx)>40?Math.sin(clock*22)*3:0);ctx.globalAlpha=1;
    if(rival.mode==='recover'){ctx.strokeStyle='#daff8b';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(rival.x,rival.y-40,52,55,0,0,Math.PI*2);ctx.stroke()}
    ctx.globalAlpha=rival.inv>0&&Math.floor(clock*12)%2?.45:1;
    sprite(images.rival,rival.x,rival.y,90,-rival.face,rival.mode==='patrol'?Math.sin(clock*12)*3:0);ctx.globalAlpha=1;
    if(hero.attack>0){ctx.strokeStyle=hero.attackKind==='aerial'?'#9ad8ff':'#e0ffae';ctx.lineWidth=7;ctx.beginPath();ctx.arc(hero.x+hero.face*35,hero.y-(hero.attackKind==='aerial'?58:42),hero.attackKind==='aerial'?52:48,hero.face>0?-1.2:1.9,hero.face>0?1.2:4.4);ctx.stroke()}
    if(hero.ledge>0){ctx.strokeStyle='#ffe08a';ctx.lineWidth=3;ctx.strokeRect((hero.face>0?20:W-52),floor-28,32,20)}
  }
  for(const p of particles){ctx.fillStyle=p.color;ctx.globalAlpha=p.t*2;ctx.fillRect(p.x,p.y,5,5)}ctx.globalAlpha=1;ctx.restore();
  if(hero){const off=rival.x<v.camera+40?'← STRAWBERRY':rival.x>v.camera+v.visible-40?'STRAWBERRY →':'';$('rival-direction').textContent=off}
}
function frame(now){const dt=Math.min((now-last)/1000,.033);last=now;if(phase==='play')step(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
Promise.all([load('bg','./assets/vineway-sideview.webp'),load('hero','./assets/grape-fighter-side.webp'),load('rival','./assets/strawberry-rival.webp')]).then(()=>{
  phase='menu';$('start').disabled=false;$('start').textContent=savedRound?'Continue round '+(savedRound+1):'Start Bliss';
  $('start').onclick=()=>{level=savedRound;begin()};
  if(savedRound){const fresh=document.createElement('button');fresh.type='button';fresh.textContent='Start from round 1';fresh.onclick=()=>{level=0;begin()};$('start').after(fresh)}
  $('callout').textContent='Same stick, Space, and Shift as the journey — now with knockback.';
}).catch(()=>{$('callout').textContent='The artwork could not load. Reload to try again.';$('start').textContent='Reload';$('start').disabled=false;$('start').onclick=()=>location.reload()});
