const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
const W=960,H=640, floor=520;
const layouts=[[[180,405,180],[490,335,170],[730,425,150]],[[130,425,160],[370,340,160],[650,410,180]],[[160,420,180],[400,320,160],[670,420,180]]];
const titles=['1 / 3 · The name-calling','2 / 3 · Seeds of doubt','3 / 3 · Jam session'];
const taunts=['“You’re just a raisin with ambition.”','“All that whining. Still no wine.”','“Fine. Let’s settle this on the platter.”'];
const keys=new Set();let hero,rival,shots=[],particles=[],level=0,phase='loading',clock=0,last=0,attack=0,hitThisSwing=false,inv=0,cycle=0,viewW=960,viewH=640;
const images={};
function load(name,url){return new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>{images[name]=im;resolve()};im.onerror=reject;im.src=url})}
function clear(){keys.clear();document.querySelectorAll('.active').forEach(b=>b.classList.remove('active'))}
function panel(title,body,label,action){clear();phase='menu';$('overlay').hidden=false;$('overlay').querySelector('article').innerHTML=`<small>GRAPE.GRIPE / BERRY BEEF</small><h1>${title}</h1><p>${body}</p><button id="next">${label}</button>`;$('next').onclick=action}
function begin(){hero={x:80,y:floor,vx:0,vy:0,ground:true,hp:5,face:1};rival={x:800,y:floor,vy:0,hp:5+level,face:-1};shots=[];particles=[];cycle=0;attack=0;inv=0;clock=0;phase='play';clear();$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('stage').textContent=titles[level];$('rival-health').max=rival.hp;$('callout').textContent=taunts[level];}
function pause(){if(phase==='play'){phase='paused';clear();$('pause').textContent='▶';$('callout').textContent='Paused — tap ▶ to continue.'}else if(phase==='paused'){phase='play';$('pause').textContent='Ⅱ';}}
$('pause').onclick=pause;
function press(k){if(phase!=='play')return;if(k==='jump'&&hero.ground){hero.vy=-660;hero.ground=false}if(k==='hit'&&attack<=0){attack=.32;hitThisSwing=false}keys.add(k)}
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(b.dataset.key);b.classList.add('active')};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{keys.delete(b.dataset.key);b.classList.remove('active')})}
const map={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',' ':'jump',ArrowUp:'jump',x:'hit'};
addEventListener('keydown',e=>{if(e.key==='Escape'){pause();return}let k=map[e.key];if(k){e.preventDefault();if(!e.repeat)press(k)}});addEventListener('keyup',e=>keys.delete(map[e.key]));addEventListener('blur',()=>{if(phase==='play')pause();clear()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='play')pause()});
function burst(x,y,color){for(let i=0;i<16;i++)particles.push({x,y,vx:(Math.random()-.5)*350,vy:-Math.random()*260,t:.5,color})}
function hurt(){if(inv>0)return;hero.hp--;inv=1.25;burst(hero.x,hero.y-35,'#ce9fff');if(hero.hp<=0)panel('Sour grapes?', 'He won the round. Your rematch starts here.', 'Try this round',begin)}
function step(dt){clock+=dt;inv=Math.max(0,inv-dt);attack=Math.max(0,attack-dt);hero.vx=((keys.has('right')?1:0)-(keys.has('left')?1:0))*290;if(hero.vx)hero.face=Math.sign(hero.vx);hero.x=Math.max(32,Math.min(W-32,hero.x+hero.vx*dt));let oldY=hero.y;hero.vy+=1650*dt;hero.y+=hero.vy*dt;hero.ground=false;
for(const [x,y,w]of [[0,floor,W],...layouts[level]])if(hero.vy>=0&&oldY<=y&&hero.y>=y&&hero.x+20>x&&hero.x-20<x+w){hero.y=y;hero.vy=0;hero.ground=true}
cycle+=dt;const period=4.6-level*.35;let t=cycle%period;rival.face=hero.x<rival.x?-1:1;
if(t<1.9){rival.x+=Math.sign(hero.x-rival.x)*(75+level*15)*dt;if(Math.floor((cycle-dt)/.65)!==Math.floor(cycle/.65)){shots.push({x:rival.x,y:rival.y-40,vx:rival.face*(250+level*40),vy:-40,t:4})}}
else if(t<2.6){if(t-dt<1.9)rival.vy=-720;rival.x+=rival.face*190*dt}
rival.vy+=1650*dt;rival.y+=rival.vy*dt;if(rival.y>=floor){if(rival.vy>500){burst(rival.x,floor,'#ff8794');if(Math.abs(hero.x-rival.x)<125&&hero.y>floor-60)hurt()}rival.y=floor;rival.vy=0}rival.x=Math.max(45,Math.min(W-45,rival.x));
let vulnerable=t>=2.6;
if(attack>0&&!hitThisSwing&&Math.abs(hero.x-rival.x)<110&&Math.abs(hero.y-rival.y)<90&&(rival.x-hero.x)*hero.face>=-15){hitThisSwing=true;if(vulnerable){rival.hp--;rival.x=Math.max(45,Math.min(W-45,rival.x+hero.face*60));burst(rival.x,rival.y-40,'#ff6477');if(rival.hp<=0){if(level<2)panel('He’s not done.',level===0?'“Lucky punch. Meet me further up the vine.”':'“One last round. Winner gets the fancy fruit platter.”','Chase him',()=>{level++;begin()});else{try{localStorage.setItem('grapegripe-berry-beef-win','1')}catch{}panel('Beef squashed.', '“Grape fight,” he mutters.<br>“Berry funny,” you reply.<br><br>You split the fruit platter. Neither of you admits you’re friends.', 'Rematch',()=>{level=0;begin()})}return}}else{$('callout').textContent='He’s guarding! Hit after his stomp.'}}
for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.t-=dt;if(Math.abs(s.x-hero.x)<26&&s.y>hero.y-75&&s.y<hero.y){s.t=0;hurt()}}
if(phase!=='play')return;
shots=shots.filter(s=>s.t>0&&s.x>-30&&s.x<W+30);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.t-=dt}particles=particles.filter(p=>p.t>0);
if(clock>3)$('callout').textContent=vulnerable?'HIT NOW — he’s catching his breath!':t>1.9?'STOMP! Jump away from his landing.':'Dodge the seeds. Get close after his stomp.';
$('health').value=hero.hp;$('rival-health').value=rival.hp;
}
function sprite(im,x,y,size,flip=1){ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.drawImage(im,-size/2,-size,size,size);ctx.restore()}
function render(){const d=Math.min(devicePixelRatio||1,2),bw=canvas.clientWidth,bh=canvas.clientHeight;if(canvas.width!==Math.round(bw*d)||canvas.height!==Math.round(bh*d)){canvas.width=Math.round(bw*d);canvas.height=Math.round(bh*d)}ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#140f24';ctx.fillRect(0,0,bw,bh);let scale=Math.min(1,Math.max(bw/W,(bh-235)/H));viewW=W*scale;viewH=H*scale;const visible=bw/scale;const camera=Math.max(0,Math.min(W-visible,(hero?.x||80)-visible*.4));ctx.translate(viewW<bw?(bw-viewW)/2:-camera*scale,Math.max(118,(bh-viewH)/2-5));ctx.scale(scale,scale);
if(images.bg)ctx.drawImage(images.bg,0,0,W,H);ctx.fillStyle='#160d2855';ctx.fillRect(0,0,W,H);
for(const [x,y,w]of [[0,floor,W],...layouts[level]]){ctx.fillStyle='#2d243a';ctx.fillRect(x,y,w,24);ctx.fillStyle='#95ab60';ctx.fillRect(x,y,w,5);ctx.fillStyle='#a697b5';ctx.fillRect(x,y+6,w,2)}
if(hero){ctx.globalAlpha=inv>0&&Math.floor(clock*12)%2?.45:1;sprite(images.hero,hero.x,hero.y,95,-hero.face);ctx.globalAlpha=1;const t=cycle%(4.6-level*.35);if(t>=2.6){ctx.strokeStyle='#daff8b';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(rival.x,rival.y-40,52,55,0,0,Math.PI*2);ctx.stroke()}sprite(images.rival,rival.x,rival.y,90,-rival.face);if(attack>0){ctx.strokeStyle='#e0ffae';ctx.lineWidth=7;ctx.beginPath();ctx.arc(hero.x+hero.face*35,hero.y-42,48,hero.face>0?-1.2:1.9,hero.face>0?1.2:4.4);ctx.stroke()}}
for(const s of shots){ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.ellipse(s.x,s.y,10,5,0,0,7);ctx.fill()}for(const p of particles){ctx.fillStyle=p.color;ctx.globalAlpha=p.t*2;ctx.fillRect(p.x,p.y,5,5)}ctx.globalAlpha=1;
}
function frame(now){const dt=Math.min((now-last)/1000,.033);last=now;if(phase==='play')step(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
Promise.all([load('bg','./assets/vineway-sideview.webp'),load('hero','./assets/grape-fighter-side.webp'),load('rival','./assets/strawberry-rival.webp')]).then(()=>{phase='menu';$('start').disabled=false;$('start').textContent='Start beef';$('start').onclick=begin;$('callout').textContent='A little rivalry. A lot of fruit.'}).catch(()=>{$('callout').textContent='The artwork could not load. Reload to try again.';$('start').textContent='Reload';$('start').disabled=false;$('start').onclick=()=>location.reload()});
