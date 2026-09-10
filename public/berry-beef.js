const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
const W=960,H=640, floor=520;
const layouts=[[[180,405,180],[490,335,170],[730,425,150]],[[130,425,160],[370,340,160],[650,410,180]],[[160,420,180],[400,320,160],[670,420,180]]];
const titles=['1 / 3 · The name-calling','2 / 3 · Seeds of doubt','3 / 3 · Jam session'];
const taunts=['“You’re just a raisin with ambition.”','“All that whining. Still no wine.”','“Fine. Let’s settle this on the platter.”'];
const SAVE='grapegripe-berry-beef-progress';
let savedRound=0;try{const n=Number(localStorage.getItem(SAVE));if(Number.isInteger(n)&&n>=0&&n<3)savedRound=n}catch{}
let soundOn=true,audio;
function tone(freq=240,duration=.1,type='sine'){if(!soundOn)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.55,audio.currentTime+duration);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function saveRound(){try{localStorage.setItem(SAVE,String(level))}catch{}}
$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)tone()};
const keys=new Set();let hero,rival,shots=[],particles=[],level=0,phase='loading',clock=0,last=0,attack=0,hitThisSwing=false,inv=0,cycle=0,viewW=960,viewH=640;
const images={};
function load(name,url){return new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>{images[name]=im;resolve()};im.onerror=reject;im.src=url})}
function clear(){keys.clear();document.querySelectorAll('.active').forEach(b=>b.classList.remove('active'))}
function panel(title,body,label,action){clear();phase='menu';$('overlay').hidden=false;$('overlay').querySelector('article').innerHTML=`<small>GRAPE.GRIPE / BERRY BEEF</small><h1>${title}</h1><p>${body}</p><button id="next">${label}</button>`;$('next').onclick=action;$('next').focus()}
function begin(){hero={x:80,y:floor,vx:0,vy:0,ground:true,hp:5,face:1};rival={x:800,y:floor,vy:0,hp:5+level,face:-1,mode:'seeds',timer:0,shotTimer:0,target:800};shots=[];particles=[];cycle=0;attack=0;inv=0;clock=0;phase='play';clear();$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('stage').textContent=titles[level];$('rival-health').max=rival.hp;$('callout').textContent=taunts[level];$('health').value=hero.hp;$('rival-health').value=rival.hp;saveRound();tone(330,.15);}
function pause(){if(phase==='play'){phase='paused';clear();$('pause').textContent='▶';$('callout').textContent='Paused — tap ▶ to continue.'}else if(phase==='paused'){phase='play';$('pause').textContent='Ⅱ';}}
$('pause').onclick=pause;
function press(k){if(phase!=='play')return;if(k==='jump'&&hero.ground){hero.vy=-660;hero.ground=false;tone(440,.1)}if(k==='hit'&&attack<=0){attack=.32;hitThisSwing=false;tone(130,.08,'triangle')}keys.add(k)}
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(b.dataset.key);b.classList.add('active')};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{keys.delete(b.dataset.key);b.classList.remove('active')})}
const map={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',' ':'jump',ArrowUp:'jump',x:'hit'};
addEventListener('keydown',e=>{if(e.key==='Escape'){pause();return}let k=map[e.key.length===1?e.key.toLowerCase():e.key];if(k){e.preventDefault();if(!e.repeat)press(k)}});addEventListener('keyup',e=>keys.delete(map[e.key.length===1?e.key.toLowerCase():e.key]));addEventListener('blur',()=>{if(phase==='play')pause();clear()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='play')pause()});
function burst(x,y,color){for(let i=0;i<16;i++)particles.push({x,y,vx:(Math.random()-.5)*350,vy:-Math.random()*260,t:.5,color})}
function hurt(){if(inv>0)return;if(phase!=='play')return;hero.hp--;inv=1.25;tone(90,.2,'sawtooth');$('health').value=hero.hp;burst(hero.x,hero.y-35,'#ce9fff');if(hero.hp<=0)panel('Sour grapes?', 'He won the round. Your rematch starts here.', 'Try this round',begin)}
function step(dt){clock+=dt;inv=Math.max(0,inv-dt);attack=Math.max(0,attack-dt);hero.vx=((keys.has('right')?1:0)-(keys.has('left')?1:0))*290;if(hero.vx)hero.face=Math.sign(hero.vx);hero.x=Math.max(32,Math.min(W-32,hero.x+hero.vx*dt));let oldY=hero.y;hero.vy+=1650*dt;hero.y+=hero.vy*dt;hero.ground=false;
for(const [x,y,w]of [[0,floor,W],...layouts[level]])if(hero.vy>=0&&oldY<=y&&hero.y>=y&&hero.x+20>x&&hero.x-20<x+w){hero.y=y;hero.vy=0;hero.ground=true}
cycle+=dt;rival.timer+=dt;rival.face=hero.x<rival.x?-1:1;
if(rival.mode==='seeds'){
  rival.x+=rival.face*(65+level*15)*dt;rival.shotTimer+=dt;
  if(rival.shotTimer>.8-level*.08){rival.shotTimer=0;shots.push({x:rival.x,y:rival.y-40,vx:rival.face*(235+level*30),vy:0,t:4});tone(600,.04)}
  if(rival.timer>2){rival.mode='warn';rival.timer=0;rival.target=Math.max(70,Math.min(W-70,hero.x));}
}else if(rival.mode==='warn'&&rival.timer>.7){rival.mode='air';rival.timer=0;rival.vy=-720;rival.launchX=rival.x;tone(170,.2)}
else if(rival.mode==='air'){rival.x=rival.launchX+(rival.target-rival.launchX)*Math.min(1,rival.timer/.87)}
else if(rival.mode==='recover'&&rival.timer>1.65-level*.1){rival.mode='seeds';rival.timer=0;rival.shotTimer=0;}
rival.vy+=1650*dt;rival.y+=rival.vy*dt;
if(rival.y>=floor){
  if(rival.mode==='air'){rival.mode='recover';rival.timer=0;burst(rival.x,floor,'#ff8794');tone(65,.24,'triangle');if(Math.abs(hero.x-rival.x)<110&&hero.y>floor-60)hurt()}
  rival.y=floor;rival.vy=0;
}
if(phase!=='play')return;
rival.x=Math.max(45,Math.min(W-45,rival.x));
const vulnerable=rival.mode==='recover';
if(keys.has('hit')&&attack<=0){attack=.32;hitThisSwing=false;}
if(attack>0&&!hitThisSwing&&Math.abs(hero.x-rival.x)<110&&Math.abs(hero.y-rival.y)<90&&(rival.x-hero.x)*hero.face>=-15){hitThisSwing=true;if(vulnerable){rival.hp--;tone(210,.12,'square');$('rival-health').value=rival.hp;rival.x=Math.max(45,Math.min(W-45,rival.x+hero.face*60));burst(rival.x,rival.y-40,'#ff6477');if(rival.hp<=0){if(level<2)panel('He’s not done.',level===0?'“Lucky punch. Meet me further up the vine.”':'“One last round. Winner gets the fancy fruit platter.”','Chase him',()=>{level++;saveRound();begin()});else{try{localStorage.setItem('grapegripe-berry-beef-win','1')}catch{}panel('Beef squashed.', '“Grape fight,” he mutters.<br>“Berry funny,” you reply.<br><br>You split the fruit platter. Neither of you admits you’re friends.', 'Rematch',()=>{level=0;begin()})}return}}else{$('callout').textContent='He’s guarding! Hit after his stomp.'}}
for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.t-=dt;if(Math.abs(s.x-hero.x)<26&&s.y>hero.y-75&&s.y<hero.y){s.t=0;hurt()}}
if(phase!=='play')return;
shots=shots.filter(s=>s.t>0&&s.x>-30&&s.x<W+30);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.t-=dt}particles=particles.filter(p=>p.t>0);
if(clock>3)$('callout').textContent=vulnerable?'HIT NOW — he’s catching his breath!':rival.mode==='warn'?'STOMP INCOMING — leave the red landing zone!':rival.mode==='air'?'JUMP! Stay clear of his landing.':'Dodge the seeds. Get close after his stomp.';
$('health').value=hero.hp;$('rival-health').value=rival.hp;
}
function sprite(im,x,y,size,flip=1,bob=0){ctx.save();ctx.translate(x,y+bob);ctx.scale(flip,1);const width=size*im.width/im.height;ctx.drawImage(im,-width/2,-size,width,size);ctx.restore()}
function viewport(bw,bh){
  const top=bh<500?100:160,bottom=bh<500?80:100,available=Math.max(80,bh-top-bottom);
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
  for(const [x,y,w]of [[0,floor,W],...layouts[level]]){
    ctx.fillStyle='#2d243a';ctx.fillRect(x,y,w,24);ctx.fillStyle='#95ab60';ctx.fillRect(x,y,w,5);ctx.fillStyle='#a697b5';ctx.fillRect(x,y+6,w,2);
  }
  if(hero){
    if(rival.mode==='warn'||rival.mode==='air'){ctx.fillStyle='#ff476955';ctx.fillRect(rival.target-110,floor-8,220,8);ctx.strokeStyle='#ff9aa9';ctx.lineWidth=3;ctx.strokeRect(rival.target-110,floor-8,220,8)}
    ctx.globalAlpha=inv>0&&Math.floor(clock*12)%2?.45:1;
    sprite(images.hero,hero.x,hero.y,95,-hero.face,hero.ground&&hero.vx?Math.sin(clock*22)*3:0);ctx.globalAlpha=1;
    if(rival.mode==='recover'){ctx.strokeStyle='#daff8b';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(rival.x,rival.y-40,52,55,0,0,Math.PI*2);ctx.stroke()}
    sprite(images.rival,rival.x,rival.y,90,-rival.face,rival.mode==='seeds'?Math.sin(clock*12)*3:0);
    if(attack>0){ctx.strokeStyle='#e0ffae';ctx.lineWidth=7;ctx.beginPath();ctx.arc(hero.x+hero.face*35,hero.y-42,48,hero.face>0?-1.2:1.9,hero.face>0?1.2:4.4);ctx.stroke()}
  }
  for(const s of shots){ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.ellipse(s.x,s.y,10,5,0,0,7);ctx.fill()}
  for(const p of particles){ctx.fillStyle=p.color;ctx.globalAlpha=p.t*2;ctx.fillRect(p.x,p.y,5,5)}ctx.globalAlpha=1;ctx.restore();
  if(hero){const off=rival.x<v.camera+40?'← STRAWBERRY':rival.x>v.camera+v.visible-40?'STRAWBERRY →':'';$('rival-direction').textContent=off;}
}
function frame(now){const dt=Math.min((now-last)/1000,.033);last=now;if(phase==='play')step(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
Promise.all([load('bg','./assets/vineway-sideview.webp'),load('hero','./assets/grape-fighter-side.webp'),load('rival','./assets/strawberry-rival.webp')]).then(()=>{phase='menu';$('start').disabled=false;$('start').textContent=savedRound?'Continue round '+(savedRound+1):'Start beef';$('start').onclick=()=>{level=savedRound;begin()};if(savedRound){const fresh=document.createElement('button');fresh.textContent='Start from round 1';fresh.onclick=()=>{level=0;begin()};$('start').after(fresh)};$('callout').textContent='A little rivalry. A lot of fruit.'}).catch(()=>{$('callout').textContent='The artwork could not load. Reload to try again.';$('start').textContent='Reload';$('start').disabled=false;$('start').onclick=()=>location.reload()});
