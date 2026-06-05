// Offline Games HTML Content - Version 1.0.3
// Fully working HTML5 games with visible tokens and complete game logic
// Optimized for WebView rendering in React Native

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>Ludo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e;font-family:system-ui,sans-serif;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.container{display:flex;flex-direction:column;height:100%;padding:8px}
.header{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:rgba(0,0,0,0.3);border-radius:12px;margin-bottom:8px}
.title{color:#fff;font-size:18px;font-weight:700}
.dice-display{background:#fff;color:#111;font-size:28px;font-weight:900;width:50px;height:50px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.board-area{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
canvas{background:#fff;border-radius:12px;max-width:100%;max-height:100%;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.controls{display:flex;gap:12px;padding:12px;background:rgba(0,0,0,0.3);border-radius:12px;margin-top:8px;align-items:center}
.turn-info{flex:1}
.turn-label{color:#888;font-size:11px}
.turn-name{color:#fff;font-size:16px;font-weight:700}
.players{display:flex;gap:6px}
.player-dot{width:24px;height:24px;border-radius:6px;opacity:0.4;transition:all 0.2s}
.player-dot.active{opacity:1;transform:scale(1.15);box-shadow:0 0 10px currentColor}
.roll-btn{background:linear-gradient(180deg,#4a90ff,#2563eb);color:#fff;border:none;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}
.roll-btn:active{transform:scale(0.95)}
.roll-btn:disabled{opacity:0.5}
.message{text-align:center;padding:10px;color:#aaa;font-size:13px;background:rgba(0,0,0,0.3);border-radius:10px;margin-top:8px}
</style>
</head>
<body>
<div class="container">
<div class="header">
<span class="title">🎲 Ludo Classic</span>
<div class="dice-display" id="diceBox">-</div>
</div>
<div class="board-area">
<canvas id="board"></canvas>
</div>
<div class="controls">
<div class="turn-info">
<div class="turn-label">Current Turn</div>
<div class="turn-name" id="turnName">Red</div>
</div>
<div class="players">
<div class="player-dot active" id="p0" style="background:#e74c3c;color:#e74c3c"></div>
<div class="player-dot" id="p1" style="background:#2ecc71;color:#2ecc71"></div>
<div class="player-dot" id="p2" style="background:#f1c40f;color:#f1c40f"></div>
<div class="player-dot" id="p3" style="background:#3498db;color:#3498db"></div>
</div>
<button class="roll-btn" id="rollBtn">ROLL</button>
</div>
<div class="message" id="msg">Roll a 6 to bring out a token!</div>
</div>
<script>
(function(){
const canvas=document.getElementById('board');
const ctx=canvas.getContext('2d');
const rollBtn=document.getElementById('rollBtn');
const diceBox=document.getElementById('diceBox');
const turnName=document.getElementById('turnName');
const msgEl=document.getElementById('msg');
const pDots=[0,1,2,3].map(i=>document.getElementById('p'+i));

const COLORS=['#e74c3c','#2ecc71','#f1c40f','#3498db'];
const DARKS=['#c0392b','#27ae60','#d4ac0d','#2980b9'];
const NAMES=['Red','Green','Yellow','Blue'];
const N=15;
let cell;

const TRACK=[
[6,1],[6,2],[6,3],[6,4],[6,5],
[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
[0,7],
[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
[7,14],
[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
[14,7],
[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
[7,0]
];

const HOME_PATHS=[
[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
];

const START_IDX=[0,13,26,39];
const SAFE=new Set([0,8,13,21,26,34,39,47]);

const YARDS=[
[[1.5,1.5],[4.5,1.5],[1.5,4.5],[4.5,4.5]],
[[1.5,10.5],[4.5,10.5],[1.5,13.5],[4.5,13.5]],
[[10.5,10.5],[13.5,10.5],[10.5,13.5],[13.5,13.5]],
[[10.5,1.5],[13.5,1.5],[10.5,4.5],[13.5,4.5]]
];

let game;

function resize(){
const parent=canvas.parentElement;
const size=Math.min(parent.clientWidth,parent.clientHeight);
canvas.width=size;
canvas.height=size;
cell=size/N;
draw();
}

function init(){
game={
turn:0,
dice:null,
phase:'roll',
winner:null,
tokens:Array.from({length:4},()=>[-1,-1,-1,-1])
};
setMsg('Roll a 6 to bring out a token!');
diceBox.textContent='-';
updateUI();
draw();
}

function setMsg(t){msgEl.textContent=t}

function updateUI(){
turnName.textContent=NAMES[game.turn];
turnName.style.color=COLORS[game.turn];
pDots.forEach((d,i)=>d.classList.toggle('active',i===game.turn));
rollBtn.disabled=!!game.winner||game.phase!=='roll';
}

function toXY(r,c){return{x:(c+0.5)*cell,y:(r+0.5)*cell}}

function tokenXY(p,i){
const pos=game.tokens[p][i];
if(pos===-1){
const[r,c]=YARDS[p][i];
return toXY(r,c);
}
if(pos<52){
const idx=(START_IDX[p]+pos)%52;
return toXY(TRACK[idx][0],TRACK[idx][1]);
}
const hp=pos-52;
if(hp<6){
const[r,c]=HOME_PATHS[p][hp];
return toXY(r,c);
}
return toXY(7,7);
}

function drawBoard(){
ctx.clearRect(0,0,canvas.width,canvas.height);
ctx.fillStyle='#fff';
ctx.fillRect(0,0,canvas.width,canvas.height);

ctx.fillStyle='#ffd8d3';ctx.fillRect(0,0,6*cell,6*cell);
ctx.fillStyle='#d8f7e2';ctx.fillRect(0,9*cell,6*cell,6*cell);
ctx.fillStyle='#fff2b8';ctx.fillRect(9*cell,9*cell,6*cell,6*cell);
ctx.fillStyle='#d7ebff';ctx.fillRect(9*cell,0,6*cell,6*cell);

for(let i=0;i<4;i++){
const cols=['#ffd8d3','#d8f7e2','#fff2b8','#d7ebff'];
HOME_PATHS[i].forEach(([r,c])=>{
ctx.fillStyle=cols[i];
ctx.fillRect(c*cell,r*cell,cell,cell);
});
}

TRACK.forEach(([r,c],idx)=>{
ctx.fillStyle=SAFE.has(idx)?'#c8f7c5':'#f5f5f5';
ctx.fillRect(c*cell,r*cell,cell,cell);
});

ctx.fillStyle='#e8e8e8';
ctx.fillRect(6*cell,6*cell,3*cell,3*cell);

const triangles=[
{pts:[[6,6],[7.5,7.5],[6,9]],col:'#e74c3c'},
{pts:[[6,6],[7.5,7.5],[9,6]],col:'#3498db'},
{pts:[[9,9],[7.5,7.5],[9,6]],col:'#f1c40f'},
{pts:[[9,9],[7.5,7.5],[6,9]],col:'#2ecc71'}
];
triangles.forEach(t=>{
ctx.fillStyle=t.col;
ctx.beginPath();
ctx.moveTo(t.pts[0][1]*cell,t.pts[0][0]*cell);
ctx.lineTo(t.pts[1][1]*cell,t.pts[1][0]*cell);
ctx.lineTo(t.pts[2][1]*cell,t.pts[2][0]*cell);
ctx.closePath();
ctx.fill();
});

ctx.strokeStyle='#ddd';
ctx.lineWidth=1;
for(let i=0;i<=N;i++){
ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,canvas.height);ctx.stroke();
ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(canvas.width,i*cell);ctx.stroke();
}
}

function drawTokens(){
const groups=new Map();
for(let p=0;p<4;p++){
for(let i=0;i<4;i++){
const{x,y}=tokenXY(p,i);
const key=Math.round(x)+':'+Math.round(y);
if(!groups.has(key))groups.set(key,[]);
groups.get(key).push({p,i,x,y});
}
}

groups.forEach(arr=>{
arr.forEach((t,idx)=>{
const off=arr.length>1?(idx-(arr.length-1)/2)*(cell*0.25):0;
const x=t.x+off,y=t.y+off;
const r=cell*0.38;

ctx.beginPath();
ctx.arc(x,y,r,0,Math.PI*2);
ctx.fillStyle=COLORS[t.p];
ctx.fill();
ctx.lineWidth=3;
ctx.strokeStyle='#fff';
ctx.stroke();

ctx.beginPath();
ctx.arc(x,y-r*0.1,r*0.7,0,Math.PI*2);
ctx.fillStyle=DARKS[t.p];
ctx.fill();

ctx.fillStyle='#fff';
ctx.font='bold '+(cell*0.28)+'px system-ui';
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillText(t.i+1,x,y+1);
});
});

if(game.phase==='move'){
const moves=getLegal(game.turn,game.dice);
ctx.setLineDash([5,5]);
ctx.strokeStyle='#fff';
ctx.lineWidth=3;
moves.forEach(i=>{
const{x,y}=tokenXY(game.turn,i);
ctx.beginPath();
ctx.arc(x,y,cell*0.5,0,Math.PI*2);
ctx.stroke();
});
ctx.setLineDash([]);
}
}

function draw(){
drawBoard();
drawTokens();
updateUI();
}

function getLegal(p,d){
const out=[];
game.tokens[p].forEach((pos,i)=>{
if(pos===-1){if(d===6)out.push(i);}
else if(pos+d<=57)out.push(i);
});
return out;
}

function doRoll(){
if(game.phase!=='roll'||game.winner)return;
game.dice=1+Math.floor(Math.random()*6);
diceBox.textContent=game.dice;
const moves=getLegal(game.turn,game.dice);
if(moves.length===0){
setMsg(NAMES[game.turn]+' rolled '+game.dice+' - no move. '+((game.dice===6)?'Roll again!':'Next turn.'));
if(game.dice!==6)game.turn=(game.turn+1)%4;
game.dice=null;
setTimeout(()=>{draw();},600);
return;
}
game.phase='move';
setMsg('Tap a highlighted token to move '+game.dice);
draw();
}

function doMove(i){
const p=game.turn;
let pos=game.tokens[p][i];
if(pos===-1){
game.tokens[p][i]=0;
setMsg(NAMES[p]+' token entered!');
}else{
game.tokens[p][i]+=game.dice;
pos=game.tokens[p][i];
if(pos===57){
setMsg(NAMES[p]+' token reached home!');
}else if(pos<52){
const absIdx=(START_IDX[p]+pos)%52;
if(!SAFE.has(absIdx)){
for(let op=0;op<4;op++){
if(op===p)continue;
game.tokens[op]=game.tokens[op].map(t=>{
if(t>=0&&t<52){
const oa=(START_IDX[op]+t)%52;
if(oa===absIdx){
setMsg(NAMES[p]+' captured '+NAMES[op]+'!');
return -1;
}
}
return t;
});
}
}
}
}

if(game.tokens[p].every(t=>t===57)){
game.winner=p;
game.phase='done';
setMsg(NAMES[p]+' WINS! 🏆');
draw();
return;
}

if(game.dice===6){
setMsg(NAMES[p]+' rolled 6 - roll again!');
game.phase='roll';
}else{
game.turn=(game.turn+1)%4;
game.phase='roll';
}
game.dice=null;
draw();
}

canvas.addEventListener('click',e=>{
if(game.phase!=='move')return;
const rect=canvas.getBoundingClientRect();
const sx=canvas.width/rect.width;
const cx=(e.clientX-rect.left)*sx;
const cy=(e.clientY-rect.top)*sx;

const moves=getLegal(game.turn,game.dice);
for(const i of moves){
const{x,y}=tokenXY(game.turn,i);
if(Math.hypot(cx-x,cy-y)<cell*0.5){
doMove(i);
return;
}
}
});

canvas.addEventListener('touchstart',e=>{
e.preventDefault();
const t=e.touches[0];
const rect=canvas.getBoundingClientRect();
const sx=canvas.width/rect.width;
const cx=(t.clientX-rect.left)*sx;
const cy=(t.clientY-rect.top)*sx;

if(game.phase!=='move')return;
const moves=getLegal(game.turn,game.dice);
for(const i of moves){
const{x,y}=tokenXY(game.turn,i);
if(Math.hypot(cx-x,cy-y)<cell*0.5){
doMove(i);
return;
}
}
},{passive:false});

rollBtn.addEventListener('click',doRoll);
window.addEventListener('resize',resize);
resize();
init();
})();
</script>
</body>
</html>`;

export const SUPERBOY_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>Super Boy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e;font-family:system-ui,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none}
.game-wrap{display:flex;flex-direction:column;height:100%}
.hud{display:flex;justify-content:space-between;padding:10px 16px;background:rgba(0,0,0,0.5);color:#fff;font-weight:600;font-size:14px}
#gameCanvas{flex:1;display:block;width:100%;image-rendering:pixelated}
.controls{display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(0,0,0,0.7)}
.dpad{display:flex;gap:8px}
.btn{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff}
.btn:active{background:rgba(255,255,255,0.35)}
.jump-btn{width:80px;height:80px;background:#e74c3c;border-color:#c0392b;font-size:14px;font-weight:700}
.jump-btn:active{background:#c0392b}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;z-index:100}
.overlay.hidden{display:none}
.overlay h1{font-size:32px;margin-bottom:12px}
.overlay p{font-size:16px;color:#aaa;margin-bottom:24px}
.overlay button{padding:16px 36px;font-size:16px;font-weight:700;background:#2ecc71;color:#fff;border:none;border-radius:10px}
</style>
</head>
<body>
<div class="game-wrap">
<div class="hud">
<span id="scoreEl">Score: 0</span>
<span id="coinsEl">Coins: 0</span>
</div>
<canvas id="gameCanvas"></canvas>
<div class="controls">
<div class="dpad">
<div class="btn" id="leftBtn">◀</div>
<div class="btn" id="rightBtn">▶</div>
</div>
<div class="btn jump-btn" id="jumpBtn">JUMP</div>
</div>
</div>

<div class="overlay" id="startScreen">
<h1>🏃 Super Boy</h1>
<p>Collect coins & reach the flag!</p>
<button id="startBtn">START GAME</button>
</div>

<div class="overlay hidden" id="endScreen">
<h1 id="endTitle">Game Over</h1>
<p id="endMsg">Score: 0</p>
<button id="restartBtn">PLAY AGAIN</button>
</div>

<script>
(function(){
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('scoreEl');
const coinsEl=document.getElementById('coinsEl');
const startScreen=document.getElementById('startScreen');
const endScreen=document.getElementById('endScreen');
const endTitle=document.getElementById('endTitle');
const endMsg=document.getElementById('endMsg');

const TILE=32;
const GRAVITY=2200;
let W,H;

const keys={left:false,right:false,jump:false};

const LEVEL=[
'                                                                ',
'                                                                ',
'           C       C                                            ',
'      ####     ####                                             ',
'                                                                ',
'   C                                                            ',
'  ###      C                                                    ',
'       ####    ###                                              ',
'                                     C    C                     ',
'P                       C   C   C   ###  ###       F            ',
'####  ####     ####  ####  ####  ####      ####  ####  ####     '
];

let player,camera,platforms,coins,flag,score,coinCount,state;

function resize(){
W=canvas.width=canvas.parentElement.clientWidth;
H=canvas.height=canvas.parentElement.clientHeight-92;
}

function buildLevel(){
platforms=[];
coins=[];
flag=null;
score=0;
coinCount=0;

for(let y=0;y<LEVEL.length;y++){
for(let x=0;x<LEVEL[y].length;x++){
const ch=LEVEL[y][x];
if(ch==='#'){
platforms.push({x:x*TILE,y:y*TILE,w:TILE,h:TILE});
}else if(ch==='P'){
player={
x:x*TILE,
y:(y-1)*TILE,
w:28,
h:36,
vx:0,
vy:0,
onGround:false,
dir:1
};
}else if(ch==='C'){
coins.push({x:x*TILE+TILE/2,y:y*TILE+TILE/2,r:12,taken:false});
}else if(ch==='F'){
flag={x:x*TILE,y:(y-2)*TILE,w:TILE,h:TILE*3};
}
}
}
camera={x:0,y:0};
updateHUD();
}

function updateHUD(){
scoreEl.textContent='Score: '+score;
coinsEl.textContent='Coins: '+coinCount;
}

function collide(a,b){
return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

function update(dt){
if(state!=='play')return;

const accel=player.onGround?2400:1600;
const maxSpeed=280;
const friction=player.onGround?1800:400;

if(keys.left){player.vx-=accel*dt;player.dir=-1;}
if(keys.right){player.vx+=accel*dt;player.dir=1;}
if(!keys.left&&!keys.right){
const s=Math.sign(player.vx);
const drop=friction*dt;
if(Math.abs(player.vx)<=drop)player.vx=0;
else player.vx-=s*drop;
}
player.vx=Math.max(-maxSpeed,Math.min(maxSpeed,player.vx));

if(keys.jump&&player.onGround){
player.vy=-680;
player.onGround=false;
}

player.vy+=GRAVITY*dt;
if(player.vy>900)player.vy=900;

player.x+=player.vx*dt;
const worldW=LEVEL[0].length*TILE;
player.x=Math.max(0,Math.min(worldW-player.w,player.x));

for(const p of platforms){
if(collide(player,p)){
if(player.vx>0)player.x=p.x-player.w;
else player.x=p.x+p.w;
player.vx=0;
}
}

player.y+=player.vy*dt;
player.onGround=false;
for(const p of platforms){
if(collide(player,p)){
if(player.vy>0){
player.y=p.y-player.h;
player.onGround=true;
}else{
player.y=p.y+p.h;
}
player.vy=0;
}
}

for(const c of coins){
if(!c.taken){
const dx=player.x+player.w/2-c.x;
const dy=player.y+player.h/2-c.y;
if(Math.hypot(dx,dy)<c.r+18){
c.taken=true;
coinCount++;
score+=10;
updateHUD();
}
}
}

if(flag&&collide(player,flag)){
score+=100;
state='win';
endTitle.textContent='🎉 You Win!';
endMsg.textContent='Final Score: '+score;
endScreen.classList.remove('hidden');
}

const worldH=LEVEL.length*TILE;
if(player.y>worldH+100){
state='over';
endTitle.textContent='💀 Game Over';
endMsg.textContent='Score: '+score;
endScreen.classList.remove('hidden');
}

camera.x=Math.max(0,Math.min(worldW-W,player.x-W/2+player.w/2));
camera.y=Math.max(0,Math.min(worldH-H,player.y-H/2+player.h/2));
}

function draw(){
const grad=ctx.createLinearGradient(0,0,0,H);
grad.addColorStop(0,'#87CEEB');
grad.addColorStop(0.5,'#c9e9f6');
grad.addColorStop(1,'#90EE90');
ctx.fillStyle=grad;
ctx.fillRect(0,0,W,H);

ctx.save();
ctx.translate(-camera.x,-camera.y);

for(const p of platforms){
ctx.fillStyle='#8B4513';
ctx.fillRect(p.x,p.y,p.w,p.h);
ctx.fillStyle='#228B22';
ctx.fillRect(p.x,p.y,p.w,8);
ctx.fillStyle='#654321';
ctx.fillRect(p.x+4,p.y+12,4,4);
ctx.fillRect(p.x+p.w-8,p.y+20,4,4);
}

for(const c of coins){
if(c.taken)continue;
ctx.beginPath();
ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
ctx.fillStyle='#FFD700';
ctx.fill();
ctx.strokeStyle='#DAA520';
ctx.lineWidth=3;
ctx.stroke();
ctx.fillStyle='#FFF8DC';
ctx.beginPath();
ctx.arc(c.x-3,c.y-3,4,0,Math.PI*2);
ctx.fill();
}

if(flag){
ctx.fillStyle='#8B4513';
ctx.fillRect(flag.x+14,flag.y,6,flag.h);
ctx.fillStyle='#FF4444';
ctx.beginPath();
ctx.moveTo(flag.x+20,flag.y+5);
ctx.lineTo(flag.x+50,flag.y+20);
ctx.lineTo(flag.x+20,flag.y+35);
ctx.closePath();
ctx.fill();
}

if(state==='play'||state==='win'){
const px=player.x,py=player.y;
const d=player.dir;

ctx.fillStyle='#FF6B6B';
ctx.fillRect(px+6,py+10,16,16);

ctx.fillStyle='#FFDAB9';
ctx.beginPath();
ctx.arc(px+14,py+6,10,0,Math.PI*2);
ctx.fill();

ctx.fillStyle='#FF6B6B';
ctx.fillRect(px+4,py-2,20,8);

ctx.fillStyle='#333';
ctx.beginPath();
ctx.arc(d===1?px+18:px+10,py+4,2.5,0,Math.PI*2);
ctx.fill();

ctx.fillStyle='#4169E1';
ctx.fillRect(px+7,py+26,5,10);
ctx.fillRect(px+16,py+26,5,10);

ctx.fillStyle='#333';
ctx.fillRect(px+6,py+34,7,4);
ctx.fillRect(px+15,py+34,7,4);
}

ctx.restore();
}

let lastT=0;
function loop(t){
const dt=Math.min(0.033,(t-lastT)/1000);
lastT=t;
update(dt);
draw();
requestAnimationFrame(loop);
}

function setupBtn(id,key){
const el=document.getElementById(id);
const on=()=>{keys[key]=true;};
const off=()=>{keys[key]=false;};
el.addEventListener('touchstart',e=>{e.preventDefault();on();},{passive:false});
el.addEventListener('touchend',e=>{e.preventDefault();off();},{passive:false});
el.addEventListener('mousedown',on);
el.addEventListener('mouseup',off);
el.addEventListener('mouseleave',off);
}

setupBtn('leftBtn','left');
setupBtn('rightBtn','right');
setupBtn('jumpBtn','jump');

document.addEventListener('keydown',e=>{
if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=true;
if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=true;
if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')keys.jump=true;
});
document.addEventListener('keyup',e=>{
if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=false;
if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=false;
if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')keys.jump=false;
});

document.getElementById('startBtn').onclick=()=>{
startScreen.classList.add('hidden');
state='play';
buildLevel();
};

document.getElementById('restartBtn').onclick=()=>{
endScreen.classList.add('hidden');
state='play';
buildLevel();
};

window.addEventListener('resize',resize);
resize();
state='start';
requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
