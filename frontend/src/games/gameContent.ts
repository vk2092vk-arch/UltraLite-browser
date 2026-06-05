// Offline Games - CANVAS BASED - Fully Responsive
// Version 1.0.3 - Complete rewrite for mobile WebView

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>Ludo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1a2e;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#app{display:flex;flex-direction:column;height:100%;width:100%}
#header{padding:8px 12px;background:rgba(0,0,0,0.5);display:flex;justify-content:space-between;align-items:center}
#header h1{color:#fff;font-size:18px;margin:0}
#diceDisplay{background:#fff;color:#333;font-size:24px;font-weight:900;width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center}
#boardContainer{flex:1;display:flex;align-items:center;justify-content:center;padding:8px;overflow:hidden}
#board{border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5)}
#controls{padding:10px 12px;background:rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px}
#turnInfo{flex:1;color:#fff}
#turnLabel{font-size:11px;color:#888}
#turnPlayer{font-size:16px;font-weight:700}
#rollBtn{background:linear-gradient(180deg,#4CAF50,#388E3C);color:#fff;border:none;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
#rollBtn:disabled{opacity:0.5}
#message{text-align:center;padding:8px;color:#aaa;font-size:12px;background:rgba(0,0,0,0.3)}
</style>
</head>
<body>
<div id="app">
<div id="header">
<h1>🎲 Ludo Classic</h1>
<div id="diceDisplay">-</div>
</div>
<div id="boardContainer">
<canvas id="board"></canvas>
</div>
<div id="controls">
<div id="turnInfo">
<div id="turnLabel">Current Turn</div>
<div id="turnPlayer">Red</div>
</div>
<button id="rollBtn">🎲 ROLL DICE</button>
</div>
<div id="message">Roll 6 to bring token out!</div>
</div>
<script>
(function(){
var canvas=document.getElementById('board');
var ctx=canvas.getContext('2d');
var rollBtn=document.getElementById('rollBtn');
var diceDisplay=document.getElementById('diceDisplay');
var turnPlayer=document.getElementById('turnPlayer');
var message=document.getElementById('message');

var SIZE,CELL;
var COLORS={0:'#E53935',1:'#43A047',2:'#FDD835',3:'#1E88E5'};
var LIGHT={0:'#FFCDD2',1:'#C8E6C9',2:'#FFF9C4',3:'#BBDEFB'};
var NAMES={0:'Red',1:'Green',2:'Yellow',3:'Blue'};

// Track positions [row, col] for 52 cells
var TRACK=[
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

// Home stretch for each player
var HOME_STRETCH={
0:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
1:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
2:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
3:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};

// Starting positions on track for each player
var START_POS={0:0,1:13,2:26,3:39};
// Entry to home stretch
var HOME_ENTRY={0:50,1:11,2:24,3:37};
// Base positions [row, col] for 4 tokens each
var BASE={
0:[[2,2],[2,4],[4,2],[4,4]],
1:[[2,10],[2,12],[4,10],[4,12]],
2:[[10,10],[10,12],[12,10],[12,12]],
3:[[10,2],[10,4],[12,2],[12,4]]
};
var SAFE_SPOTS=[0,8,13,21,26,34,39,47];

var game={
turn:0,
dice:0,
phase:'roll',
tokens:[[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1]],
winner:null
};

function resize(){
var container=document.getElementById('boardContainer');
var maxW=container.clientWidth-16;
var maxH=container.clientHeight-16;
SIZE=Math.min(maxW,maxH,400);
canvas.width=SIZE;
canvas.height=SIZE;
CELL=SIZE/15;
draw();
}

function getTokenPos(player,tokenIdx){
var pos=game.tokens[player][tokenIdx];
if(pos===-1){
var base=BASE[player][tokenIdx];
return{r:base[0],c:base[1]};
}
if(pos<52){
var idx=(START_POS[player]+pos)%52;
return{r:TRACK[idx][0],c:TRACK[idx][1]};
}
var homeIdx=pos-52;
if(homeIdx<6){
var h=HOME_STRETCH[player][homeIdx];
return{r:h[0],c:h[1]};
}
return{r:7,c:7};
}

function drawBoard(){
ctx.fillStyle='#FFFFFF';
ctx.fillRect(0,0,SIZE,SIZE);

// Draw quadrants
ctx.fillStyle=LIGHT[0];ctx.fillRect(0,0,6*CELL,6*CELL);
ctx.fillStyle=LIGHT[1];ctx.fillRect(9*CELL,0,6*CELL,6*CELL);
ctx.fillStyle=LIGHT[2];ctx.fillRect(9*CELL,9*CELL,6*CELL,6*CELL);
ctx.fillStyle=LIGHT[3];ctx.fillRect(0,9*CELL,6*CELL,6*CELL);

// Draw home bases with circles
for(var p=0;p<4;p++){
ctx.fillStyle='#FFFFFF';
var bx,by;
if(p===0){bx=0.8*CELL;by=0.8*CELL;}
else if(p===1){bx=9.2*CELL;by=0.8*CELL;}
else if(p===2){bx=9.2*CELL;by=9.2*CELL;}
else{bx=0.8*CELL;by=9.2*CELL;}
ctx.fillRect(bx,by,4.4*CELL,4.4*CELL);
ctx.strokeStyle=COLORS[p];
ctx.lineWidth=3;
ctx.strokeRect(bx,by,4.4*CELL,4.4*CELL);

// Draw 4 token spots in base
for(var t=0;t<4;t++){
var br=BASE[p][t];
var cx=(br[1]+0.5)*CELL;
var cy=(br[0]+0.5)*CELL;
ctx.beginPath();
ctx.arc(cx,cy,CELL*0.35,0,Math.PI*2);
ctx.fillStyle=LIGHT[p];
ctx.fill();
ctx.strokeStyle=COLORS[p];
ctx.lineWidth=2;
ctx.stroke();
}
}

// Draw track cells
for(var i=0;i<52;i++){
var t=TRACK[i];
var x=t[1]*CELL;
var y=t[0]*CELL;
ctx.fillStyle=SAFE_SPOTS.indexOf(i)>=0?'#E8F5E9':'#F5F5F5';
ctx.fillRect(x,y,CELL,CELL);
ctx.strokeStyle='#DDD';
ctx.lineWidth=1;
ctx.strokeRect(x,y,CELL,CELL);
if(SAFE_SPOTS.indexOf(i)>=0){
ctx.fillStyle='#4CAF50';
ctx.font=(CELL*0.4)+'px sans-serif';
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillText('★',x+CELL/2,y+CELL/2);
}
}

// Draw home stretches
for(var p=0;p<4;p++){
for(var i=0;i<6;i++){
var h=HOME_STRETCH[p][i];
var x=h[1]*CELL;
var y=h[0]*CELL;
ctx.fillStyle=LIGHT[p];
ctx.fillRect(x,y,CELL,CELL);
ctx.strokeStyle='#DDD';
ctx.lineWidth=1;
ctx.strokeRect(x,y,CELL,CELL);
}
}

// Draw center home
ctx.fillStyle='#F5F5F5';
ctx.fillRect(6*CELL,6*CELL,3*CELL,3*CELL);
// Draw triangles
var cx=7.5*CELL,cy=7.5*CELL;
var tri=[
{p:[[6,6],[7.5,7.5],[9,6]],c:COLORS[1]},
{p:[[9,6],[7.5,7.5],[9,9]],c:COLORS[2]},
{p:[[9,9],[7.5,7.5],[6,9]],c:COLORS[3]},
{p:[[6,9],[7.5,7.5],[6,6]],c:COLORS[0]}
];
for(var i=0;i<4;i++){
ctx.fillStyle=tri[i].c;
ctx.beginPath();
ctx.moveTo(tri[i].p[0][1]*CELL,tri[i].p[0][0]*CELL);
ctx.lineTo(tri[i].p[1][1]*CELL,tri[i].p[1][0]*CELL);
ctx.lineTo(tri[i].p[2][1]*CELL,tri[i].p[2][0]*CELL);
ctx.closePath();
ctx.fill();
}
}

function drawTokens(){
// Group tokens by position to handle stacking
var groups={};
for(var p=0;p<4;p++){
for(var t=0;t<4;t++){
var pos=getTokenPos(p,t);
var key=pos.r+','+pos.c;
if(!groups[key])groups[key]=[];
groups[key].push({p:p,t:t});
}
}

for(var key in groups){
var arr=groups[key];
var parts=key.split(',');
var r=parseInt(parts[0]);
var c=parseInt(parts[1]);
var cx=(c+0.5)*CELL;
var cy=(r+0.5)*CELL;

for(var i=0;i<arr.length;i++){
var off=arr.length>1?(i-(arr.length-1)/2)*(CELL*0.2):0;
var tx=cx+off;
var ty=cy+off;
var radius=CELL*0.35;
var p=arr[i].p;
var t=arr[i].t;

// Token body
ctx.beginPath();
ctx.arc(tx,ty,radius,0,Math.PI*2);
ctx.fillStyle=COLORS[p];
ctx.fill();
ctx.strokeStyle='#FFF';
ctx.lineWidth=2;
ctx.stroke();

// Token number
ctx.fillStyle='#FFF';
ctx.font='bold '+(CELL*0.28)+'px sans-serif';
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillText(t+1,tx,ty);
}
}

// Highlight movable tokens
if(game.phase==='move'){
var moves=getMovableTokens();
for(var i=0;i<moves.length;i++){
var pos=getTokenPos(game.turn,moves[i]);
var cx=(pos.c+0.5)*CELL;
var cy=(pos.r+0.5)*CELL;
ctx.beginPath();
ctx.arc(cx,cy,CELL*0.45,0,Math.PI*2);
ctx.strokeStyle='#FFF';
ctx.lineWidth=3;
ctx.setLineDash([5,5]);
ctx.stroke();
ctx.setLineDash([]);
}
}
}

function draw(){
drawBoard();
drawTokens();
updateUI();
}

function updateUI(){
turnPlayer.textContent=NAMES[game.turn];
turnPlayer.style.color=COLORS[game.turn];
rollBtn.disabled=(game.phase!=='roll'||game.winner!==null);
}

function getMovableTokens(){
var movable=[];
for(var t=0;t<4;t++){
var pos=game.tokens[game.turn][t];
if(pos===-1){
if(game.dice===6)movable.push(t);
}else if(pos+game.dice<=57){
movable.push(t);
}
}
return movable;
}

function rollDice(){
if(game.phase!=='roll')return;
game.dice=Math.floor(Math.random()*6)+1;
diceDisplay.textContent=game.dice;

var movable=getMovableTokens();
if(movable.length===0){
message.textContent=NAMES[game.turn]+' rolled '+game.dice+' - no moves!';
if(game.dice!==6){
game.turn=(game.turn+1)%4;
}
setTimeout(draw,500);
return;
}

game.phase='move';
message.textContent='Tap a highlighted token to move';
draw();
}

function moveToken(tokenIdx){
var pos=game.tokens[game.turn][tokenIdx];
var p=game.turn;

if(pos===-1){
game.tokens[p][tokenIdx]=0;
message.textContent=NAMES[p]+' token entered the track!';
}else{
game.tokens[p][tokenIdx]+=game.dice;
var newPos=game.tokens[p][tokenIdx];

if(newPos===57){
message.textContent=NAMES[p]+' token reached HOME!';
}else if(newPos<52){
// Check for capture
var absPos=(START_POS[p]+newPos)%52;
if(SAFE_SPOTS.indexOf(absPos)===-1){
for(var op=0;op<4;op++){
if(op===p)continue;
for(var ot=0;ot<4;ot++){
var opos=game.tokens[op][ot];
if(opos>=0&&opos<52){
var oabs=(START_POS[op]+opos)%52;
if(oabs===absPos){
game.tokens[op][ot]=-1;
message.textContent=NAMES[p]+' captured '+NAMES[op]+'!';
}
}
}
}
}
}
}

// Check win
var won=true;
for(var t=0;t<4;t++){
if(game.tokens[p][t]!==57)won=false;
}
if(won){
game.winner=p;
message.textContent='🎉 '+NAMES[p]+' WINS! 🎉';
draw();
return;
}

if(game.dice===6){
message.textContent+=' Roll again!';
game.phase='roll';
}else{
game.turn=(game.turn+1)%4;
game.phase='roll';
}
draw();
}

function handleClick(e){
if(game.phase!=='move')return;
var rect=canvas.getBoundingClientRect();
var scaleX=canvas.width/rect.width;
var scaleY=canvas.height/rect.height;
var mx=(e.clientX-rect.left)*scaleX;
var my=(e.clientY-rect.top)*scaleY;

var movable=getMovableTokens();
for(var i=0;i<movable.length;i++){
var t=movable[i];
var pos=getTokenPos(game.turn,t);
var cx=(pos.c+0.5)*CELL;
var cy=(pos.r+0.5)*CELL;
if(Math.hypot(mx-cx,my-cy)<CELL*0.5){
moveToken(t);
return;
}
}
}

canvas.addEventListener('click',handleClick);
canvas.addEventListener('touchend',function(e){
e.preventDefault();
var touch=e.changedTouches[0];
handleClick({clientX:touch.clientX,clientY:touch.clientY});
});

rollBtn.addEventListener('click',rollDice);
window.addEventListener('resize',resize);
resize();
})();
</script>
</body>
</html>`;

export const SUPERBOY_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>Super Boy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden;font-family:system-ui,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none}
#app{display:flex;flex-direction:column;height:100%;width:100%}
#hud{display:flex;justify-content:space-around;padding:8px;background:#000;color:#fff;font-size:12px;font-weight:700}
#hud div{text-align:center}
#hud span{display:block;color:#888;font-size:10px}
#gameArea{flex:1;position:relative;overflow:hidden}
#game{width:100%;height:100%;display:block}
#controls{display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(0,0,0,0.9)}
.btns{display:flex;gap:10px}
.btn{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff}
.btn:active{background:rgba(255,255,255,0.35)}
.btn-a{background:rgba(229,57,53,0.8);border-color:#c62828}
.btn-b{background:rgba(255,193,7,0.8);border-color:#ff8f00}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:100}
.overlay.hide{display:none}
.overlay h1{font-size:28px;color:#FFC107;margin-bottom:10px}
.overlay p{color:#aaa;margin-bottom:20px}
.overlay button{padding:14px 32px;font-size:16px;font-weight:700;background:#4CAF50;color:#fff;border:none;border-radius:8px}
</style>
</head>
<body>
<div id="app">
<div id="hud">
<div><span>SCORE</span><div id="score">0</div></div>
<div><span>COINS</span><div id="coins">0</div></div>
<div><span>WORLD</span><div>1-1</div></div>
<div><span>TIME</span><div id="time">300</div></div>
</div>
<div id="gameArea">
<canvas id="game"></canvas>
</div>
<div id="controls">
<div class="btns">
<div class="btn" id="left">◀</div>
<div class="btn" id="right">▶</div>
</div>
<div class="btns">
<div class="btn btn-b" id="run">B</div>
<div class="btn btn-a" id="jump">A</div>
</div>
</div>
</div>
<div class="overlay" id="startScreen">
<h1>🏃 SUPER BOY</h1>
<p>Collect coins & reach the flag!</p>
<button id="startBtn">START GAME</button>
</div>
<div class="overlay hide" id="endScreen">
<h1 id="endTitle">GAME OVER</h1>
<p id="endMsg">Score: 0</p>
<button id="restartBtn">PLAY AGAIN</button>
</div>
<script>
(function(){
var canvas=document.getElementById('game');
var ctx=canvas.getContext('2d');
var scoreEl=document.getElementById('score');
var coinsEl=document.getElementById('coins');
var timeEl=document.getElementById('time');
var startScreen=document.getElementById('startScreen');
var endScreen=document.getElementById('endScreen');
var endTitle=document.getElementById('endTitle');
var endMsg=document.getElementById('endMsg');

var W,H;
var TILE=32;
var GRAVITY=0.6;
var keys={left:false,right:false,jump:false,run:false};

// Level map - G=ground, B=brick, ?=question block, C=coin, P=player start, F=flag
var LEVEL=[
'                                                                                    ',
'                                                                                    ',
'                                                                                    ',
'                    ?B?B?                                                           ',
'                                                                                    ',
'                                                                                    ',
'             ?                                  BBB                                 ',
'                                                                                    ',
'                                           ?   ?B?B?                                ',
'                              GGG                                    F              ',
'P          GGG       GGG          GGG               GGG    GG   GGG GGGG            ',
'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
];

var player,camera,platforms,questionBlocks,coins,flag;
var score,coinCount,time,state,lastTime;

function resize(){
var area=document.getElementById('gameArea');
W=canvas.width=area.clientWidth;
H=canvas.height=area.clientHeight;
}

function buildLevel(){
platforms=[];
questionBlocks=[];
coins=[];
flag=null;
score=0;
coinCount=0;
time=300;

var startX=32,startY=H-64;

for(var row=0;row<LEVEL.length;row++){
for(var col=0;col<LEVEL[row].length;col++){
var ch=LEVEL[row][col];
var x=col*TILE;
var y=row*TILE;

if(ch==='G'){
platforms.push({x:x,y:y,w:TILE,h:TILE,type:'ground'});
}else if(ch==='B'){
platforms.push({x:x,y:y,w:TILE,h:TILE,type:'brick'});
}else if(ch==='?'){
questionBlocks.push({x:x,y:y,w:TILE,h:TILE,hit:false});
}else if(ch==='C'){
coins.push({x:x+TILE/2,y:y+TILE/2,r:10,taken:false});
}else if(ch==='P'){
startX=x;
startY=y;
}else if(ch==='F'){
flag={x:x,y:y-TILE*3,w:TILE,h:TILE*4};
}
}
}

player={
x:startX,
y:startY-TILE,
w:24,
h:32,
vx:0,
vy:0,
onGround:false,
dir:1,
frame:0
};

camera={x:0};
updateHUD();
}

function updateHUD(){
scoreEl.textContent=score;
coinsEl.textContent=coinCount;
timeEl.textContent=Math.max(0,Math.floor(time));
}

function collide(a,b){
return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

function update(dt){
if(state!=='play')return;

time-=dt;
if(time<=0){
endGame(false);
return;
}

// Movement
var accel=keys.run?0.8:0.5;
var maxSpeed=keys.run?6:4;
var friction=player.onGround?0.85:0.95;

if(keys.left){player.vx-=accel;player.dir=-1;}
if(keys.right){player.vx+=accel;player.dir=1;}

player.vx*=friction;
if(Math.abs(player.vx)<0.1)player.vx=0;
player.vx=Math.max(-maxSpeed,Math.min(maxSpeed,player.vx));

// Jump
if(keys.jump&&player.onGround){
player.vy=-12;
player.onGround=false;
}

// Gravity
player.vy+=GRAVITY;
if(player.vy>15)player.vy=15;

// Horizontal movement
player.x+=player.vx;
var worldW=LEVEL[0].length*TILE;
player.x=Math.max(0,Math.min(worldW-player.w,player.x));

// Horizontal collision
for(var i=0;i<platforms.length;i++){
var p=platforms[i];
if(collide(player,p)){
if(player.vx>0){
player.x=p.x-player.w;
}else if(player.vx<0){
player.x=p.x+p.w;
}
player.vx=0;
}
}

// Vertical movement
player.y+=player.vy;
player.onGround=false;

// Vertical collision with platforms
for(var i=0;i<platforms.length;i++){
var p=platforms[i];
if(collide(player,p)){
if(player.vy>0){
player.y=p.y-player.h;
player.vy=0;
player.onGround=true;
}else if(player.vy<0){
player.y=p.y+p.h;
player.vy=0;
}
}
}

// Question blocks collision
for(var i=0;i<questionBlocks.length;i++){
var q=questionBlocks[i];
if(collide(player,q)){
if(player.vy<0&&player.y>q.y){
player.y=q.y+q.h;
player.vy=0;
if(!q.hit){
q.hit=true;
score+=100;
coinCount++;
updateHUD();
}
}else if(player.vy>0){
player.y=q.y-player.h;
player.vy=0;
player.onGround=true;
}
}
}

// Coin collection
for(var i=0;i<coins.length;i++){
var c=coins[i];
if(!c.taken){
var dx=player.x+player.w/2-c.x;
var dy=player.y+player.h/2-c.y;
if(Math.hypot(dx,dy)<c.r+16){
c.taken=true;
coinCount++;
score+=200;
updateHUD();
}
}
}

// Flag (win)
if(flag&&collide(player,flag)){
score+=1000;
endGame(true);
return;
}

// Fall death
if(player.y>LEVEL.length*TILE+100){
endGame(false);
return;
}

// Camera
camera.x=Math.max(0,Math.min(worldW-W,player.x-W/3));

// Animation frame
if(Math.abs(player.vx)>0.5){
player.frame+=0.2;
}
}

function endGame(win){
state=win?'win':'over';
endTitle.textContent=win?'🎉 YOU WIN!':'💀 GAME OVER';
endMsg.textContent='Score: '+score;
endScreen.classList.remove('hide');
updateHUD();
}

function draw(){
// Sky gradient
var sky=ctx.createLinearGradient(0,0,0,H);
sky.addColorStop(0,'#5C94FC');
sky.addColorStop(0.6,'#87CEEB');
sky.addColorStop(1,'#90EE90');
ctx.fillStyle=sky;
ctx.fillRect(0,0,W,H);

ctx.save();
ctx.translate(-camera.x,0);

// Draw platforms
for(var i=0;i<platforms.length;i++){
var p=platforms[i];
if(p.x+p.w<camera.x||p.x>camera.x+W)continue;
if(p.type==='ground'){
ctx.fillStyle='#8B4513';
ctx.fillRect(p.x,p.y,p.w,p.h);
ctx.fillStyle='#228B22';
ctx.fillRect(p.x,p.y,p.w,8);
// Dirt texture
ctx.fillStyle='#654321';
ctx.fillRect(p.x+6,p.y+14,4,4);
ctx.fillRect(p.x+20,p.y+20,4,4);
}else if(p.type==='brick'){
ctx.fillStyle='#C84C0C';
ctx.fillRect(p.x,p.y,p.w,p.h);
ctx.strokeStyle='#8B2500';
ctx.lineWidth=2;
ctx.strokeRect(p.x+2,p.y+2,p.w-4,p.h-4);
ctx.beginPath();
ctx.moveTo(p.x+p.w/2,p.y);
ctx.lineTo(p.x+p.w/2,p.y+p.h);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(p.x,p.y+p.h/2);
ctx.lineTo(p.x+p.w,p.y+p.h/2);
ctx.stroke();
}
}

// Draw question blocks
for(var i=0;i<questionBlocks.length;i++){
var q=questionBlocks[i];
if(q.x+q.w<camera.x||q.x>camera.x+W)continue;
ctx.fillStyle=q.hit?'#8B4513':'#FFC107';
ctx.fillRect(q.x,q.y,q.w,q.h);
ctx.strokeStyle=q.hit?'#654321':'#FF8F00';
ctx.lineWidth=2;
ctx.strokeRect(q.x+2,q.y+2,q.w-4,q.h-4);
if(!q.hit){
ctx.fillStyle='#FFF';
ctx.font='bold 18px sans-serif';
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillText('?',q.x+q.w/2,q.y+q.h/2);
}
}

// Draw coins
for(var i=0;i<coins.length;i++){
var c=coins[i];
if(c.taken)continue;
if(c.x<camera.x-20||c.x>camera.x+W+20)continue;
ctx.beginPath();
ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
ctx.fillStyle='#FFD700';
ctx.fill();
ctx.strokeStyle='#FFA000';
ctx.lineWidth=2;
ctx.stroke();
// Shine
ctx.beginPath();
ctx.arc(c.x-3,c.y-3,3,0,Math.PI*2);
ctx.fillStyle='#FFF8DC';
ctx.fill();
}

// Draw flag
if(flag){
ctx.fillStyle='#228B22';
ctx.fillRect(flag.x+12,flag.y,8,flag.h);
ctx.fillStyle='#FF0000';
ctx.beginPath();
ctx.moveTo(flag.x+20,flag.y+5);
ctx.lineTo(flag.x+55,flag.y+25);
ctx.lineTo(flag.x+20,flag.y+45);
ctx.closePath();
ctx.fill();
}

// Draw player (Mario-style)
if(state==='play'||state==='win'){
var px=player.x;
var py=player.y;
var d=player.dir;

ctx.save();
if(d<0){
ctx.translate(px+player.w,0);
ctx.scale(-1,1);
px=0;
}

// Hat
ctx.fillStyle='#E53935';
ctx.fillRect(px+2,py,20,8);

// Face
ctx.fillStyle='#FFCCBC';
ctx.fillRect(px+4,py+6,16,12);

// Eye
ctx.fillStyle='#333';
ctx.fillRect(px+14,py+10,4,4);

// Body
ctx.fillStyle='#E53935';
ctx.fillRect(px+4,py+18,16,10);

// Legs
ctx.fillStyle='#1565C0';
ctx.fillRect(px+4,py+26,6,8);
ctx.fillRect(px+14,py+26,6,8);

// Shoes
ctx.fillStyle='#5D4037';
ctx.fillRect(px+2,py+32,8,4);
ctx.fillRect(px+14,py+32,8,4);

ctx.restore();
}

ctx.restore();
}

var animId;
function gameLoop(t){
var dt=(t-lastTime)/1000;
lastTime=t;
if(dt>0.1)dt=0.016;
update(dt);
draw();
updateHUD();
animId=requestAnimationFrame(gameLoop);
}

function setupControls(){
var buttons=[
{id:'left',key:'left'},
{id:'right',key:'right'},
{id:'jump',key:'jump'},
{id:'run',key:'run'}
];

buttons.forEach(function(b){
var el=document.getElementById(b.id);
var on=function(){keys[b.key]=true;};
var off=function(){keys[b.key]=false;};
el.addEventListener('touchstart',function(e){e.preventDefault();on();},{passive:false});
el.addEventListener('touchend',function(e){e.preventDefault();off();},{passive:false});
el.addEventListener('mousedown',on);
el.addEventListener('mouseup',off);
el.addEventListener('mouseleave',off);
});
}

document.addEventListener('keydown',function(e){
if(e.key==='ArrowLeft'||e.key==='a')keys.left=true;
if(e.key==='ArrowRight'||e.key==='d')keys.right=true;
if(e.key==='ArrowUp'||e.key===' '||e.key==='w')keys.jump=true;
if(e.key==='Shift'||e.key==='z')keys.run=true;
});

document.addEventListener('keyup',function(e){
if(e.key==='ArrowLeft'||e.key==='a')keys.left=false;
if(e.key==='ArrowRight'||e.key==='d')keys.right=false;
if(e.key==='ArrowUp'||e.key===' '||e.key==='w')keys.jump=false;
if(e.key==='Shift'||e.key==='z')keys.run=false;
});

document.getElementById('startBtn').onclick=function(){
startScreen.classList.add('hide');
state='play';
buildLevel();
lastTime=performance.now();
gameLoop(lastTime);
};

document.getElementById('restartBtn').onclick=function(){
endScreen.classList.add('hide');
state='play';
buildLevel();
lastTime=performance.now();
};

window.addEventListener('resize',resize);
setupControls();
resize();
state='start';
})();
</script>
</body>
</html>`;
