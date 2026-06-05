// Offline Games HTML Content - Version 1.0.3
// BUNDLED FROM: github.com/sohail-js/ludo-js
// Single file version for WebView compatibility

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ludo JS</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);font-family:system-ui,-apple-system,sans-serif;overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.ludo-container{width:100%;height:100%;display:flex;flex-direction:column;padding:8px;gap:8px}
.ludo{flex:1;width:100%;max-width:100vmin;max-height:100vmin;margin:0 auto;position:relative;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.board-bg{position:absolute;inset:0;display:grid;grid-template-columns:6fr 3fr 6fr;grid-template-rows:6fr 3fr 6fr}
.quadrant{position:relative}
.q-red{background:#e53935}
.q-green{background:#43a047}
.q-yellow{background:#fdd835}
.q-blue{background:#1e88e5}
.q-white{background:#fff}
.q-center{background:#f5f5f5;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.q-center>div{clip-path:polygon(50% 50%,0 0,100% 0)}
.q-center>div:nth-child(1){background:#e53935;clip-path:polygon(50% 50%,0 100%,0 0)}
.q-center>div:nth-child(2){background:#43a047;clip-path:polygon(50% 50%,0 0,100% 0)}
.q-center>div:nth-child(3){background:#fdd835;clip-path:polygon(50% 50%,100% 100%,100% 0)}
.q-center>div:nth-child(4){background:#1e88e5;clip-path:polygon(50% 50%,0 100%,100% 100%)}
.home-box{position:absolute;width:60%;height:60%;top:20%;left:20%;background:#fff;border-radius:8px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8%;padding:8%}
.home-circle{border-radius:50%;border:3px solid}
.q-red .home-circle{border-color:#b71c1c;background:#ffcdd2}
.q-green .home-circle{border-color:#1b5e20;background:#c8e6c9}
.q-yellow .home-circle{border-color:#f9a825;background:#fff9c4}
.q-blue .home-circle{border-color:#0d47a1;background:#bbdefb}
.track{position:absolute}
.track-h{width:100%;height:100%;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(3,1fr)}
.track-v{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,1fr)}
.cell{background:#fff;border:1px solid #e0e0e0}
.cell.safe{background:#e8f5e9}
.cell.red-path{background:#ffcdd2}
.cell.green-path{background:#c8e6c9}
.cell.yellow-path{background:#fff9c4}
.cell.blue-path{background:#bbdefb}
.cell.star::after{content:"★";position:absolute;font-size:10px;color:#ff9800}
.player-pieces{position:absolute;inset:0;z-index:10}
.player-piece{position:absolute;width:5%;height:5%;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:translate(-50%,-50%);transition:all 0.2s ease;cursor:pointer;z-index:10}
.player-piece[player-id="P1"]{background:linear-gradient(180deg,#42a5f5,#1e88e5)}
.player-piece[player-id="P2"]{background:linear-gradient(180deg,#66bb6a,#43a047)}
.player-piece.highlight{animation:pulse 0.6s infinite;border:2px dashed #fff;box-shadow:0 0 12px rgba(255,255,255,0.8)}
@keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.3)}}
.player-bases{position:absolute;inset:0;z-index:1}
.player-base{position:absolute;width:40%;height:40%;border:4px solid;border-radius:8px;transition:all 0.3s}
.player-base[player-id="P1"]{bottom:0;left:0;border-color:#1565c0}
.player-base[player-id="P2"]{top:0;right:0;border-color:#2e7d32}
.player-base.highlight{animation:border-pulse 0.5s infinite}
@keyframes border-pulse{50%{border-color:rgba(255,255,255,0.9)}}
.footer{background:rgba(0,0,0,0.4);border-radius:12px;padding:12px 16px}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px}
.btn{padding:12px 24px;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.1s}
.btn:active{transform:scale(0.95)}
.btn:disabled{opacity:0.5;cursor:not-allowed}
.btn-dice{background:linear-gradient(180deg,#4caf50,#388e3c);color:#fff}
.btn-reset{background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3)}
.dice-value{font-size:36px;font-weight:900;color:#ffc107;min-width:50px;text-align:center;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.active-player{color:#fff;font-size:14px;margin-top:8px;text-align:center}
.active-player span{font-weight:700;padding:4px 12px;border-radius:16px}
.active-player span.P1{background:#1e88e5}
.active-player span.P2{background:#43a047}
</style>
</head>
<body>
<div class="ludo-container">
<div class="ludo">
<div class="board-bg">
<div class="quadrant q-red"><div class="home-box"><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div></div></div>
<div class="quadrant q-white track"><div class="track-v"><div class="cell"></div><div class="cell"></div><div class="cell safe star"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell green-path"></div><div class="cell green-path"></div><div class="cell green-path"></div><div class="cell green-path"></div><div class="cell green-path"></div><div class="cell green-path"></div><div class="cell"></div><div class="cell safe"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div></div>
<div class="quadrant q-green"><div class="home-box"><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div></div></div>
<div class="quadrant q-white track"><div class="track-h"><div class="cell"></div><div class="cell blue-path"></div><div class="cell"></div><div class="cell"></div><div class="cell safe"></div><div class="cell"></div><div class="cell"></div><div class="cell blue-path"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell safe star"></div><div class="cell blue-path"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div></div>
<div class="quadrant q-center"><div></div><div></div><div></div><div></div></div>
<div class="quadrant q-white track"><div class="track-h"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell red-path"></div><div class="cell safe star"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell red-path"></div><div class="cell"></div><div class="cell"></div><div class="cell safe"></div><div class="cell"></div><div class="cell"></div><div class="cell red-path"></div><div class="cell"></div></div></div>
<div class="quadrant q-blue"><div class="home-box"><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div></div></div>
<div class="quadrant q-white track"><div class="track-v"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell safe star"></div><div class="cell"></div><div class="cell"></div><div class="cell yellow-path"></div><div class="cell yellow-path"></div><div class="cell yellow-path"></div><div class="cell yellow-path"></div><div class="cell yellow-path"></div><div class="cell yellow-path"></div><div class="cell"></div><div class="cell"></div><div class="cell safe"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div></div>
<div class="quadrant q-yellow"><div class="home-box"><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div><div class="home-circle"></div></div></div>
</div>
<div class="player-pieces">
<div class="player-piece" player-id="P1" piece="0"></div>
<div class="player-piece" player-id="P1" piece="1"></div>
<div class="player-piece" player-id="P1" piece="2"></div>
<div class="player-piece" player-id="P1" piece="3"></div>
<div class="player-piece" player-id="P2" piece="0"></div>
<div class="player-piece" player-id="P2" piece="1"></div>
<div class="player-piece" player-id="P2" piece="2"></div>
<div class="player-piece" player-id="P2" piece="3"></div>
</div>
<div class="player-bases">
<div class="player-base" player-id="P1"></div>
<div class="player-base" player-id="P2"></div>
</div>
</div>
<div class="footer">
<div class="row">
<button id="dice-btn" class="btn btn-dice">🎲 ROLL</button>
<div class="dice-value">-</div>
<button id="reset-btn" class="btn btn-reset">↻ Reset</button>
</div>
<h2 class="active-player">Turn: <span class="P1">Player 1</span></h2>
</div>
</div>
<script>
(function(){
var STEP=6.66;
var COORDS={0:[6,13],1:[6,12],2:[6,11],3:[6,10],4:[6,9],5:[5,8],6:[4,8],7:[3,8],8:[2,8],9:[1,8],10:[0,8],11:[0,7],12:[0,6],13:[1,6],14:[2,6],15:[3,6],16:[4,6],17:[5,6],18:[6,5],19:[6,4],20:[6,3],21:[6,2],22:[6,1],23:[6,0],24:[7,0],25:[8,0],26:[8,1],27:[8,2],28:[8,3],29:[8,4],30:[8,5],31:[9,6],32:[10,6],33:[11,6],34:[12,6],35:[13,6],36:[14,6],37:[14,7],38:[14,8],39:[13,8],40:[12,8],41:[11,8],42:[10,8],43:[9,8],44:[8,9],45:[8,10],46:[8,11],47:[8,12],48:[8,13],49:[8,14],50:[7,14],51:[6,14],100:[7,13],101:[7,12],102:[7,11],103:[7,10],104:[7,9],105:[7,8],200:[7,1],201:[7,2],202:[7,3],203:[7,4],204:[7,5],205:[7,6],500:[1.5,10.58],501:[3.57,10.58],502:[1.5,12.43],503:[3.57,12.43],600:[10.5,1.58],601:[12.54,1.58],602:[10.5,3.45],603:[12.54,3.45]};
var PLAYERS=['P1','P2'];
var BASE={P1:[500,501,502,503],P2:[600,601,602,603]};
var START={P1:0,P2:26};
var HOME_ENT={P1:[100,101,102,103,104],P2:[200,201,202,203,204]};
var HOME_POS={P1:105,P2:205};
var TURN_PT={P1:50,P2:24};
var SAFE=[0,8,13,21,26,34,39,47];
var STATE={NOT_ROLLED:'NOT_ROLLED',ROLLED:'ROLLED'};

var diceBtn=document.querySelector('#dice-btn');
var resetBtn=document.querySelector('#reset-btn');
var diceVal=document.querySelector('.dice-value');
var turnSpan=document.querySelector('.active-player span');
var pieces={P1:document.querySelectorAll('[player-id="P1"].player-piece'),P2:document.querySelectorAll('[player-id="P2"].player-piece')};
var bases={P1:document.querySelector('[player-id="P1"].player-base'),P2:document.querySelector('[player-id="P2"].player-base')};

var currentPos={P1:[],P2:[]};
var dice=0,turn=0,state=STATE.NOT_ROLLED;

function setPos(p,pc,pos){
currentPos[p][pc]=pos;
var c=COORDS[pos];
if(!c)return;
pieces[p][pc].style.top=c[1]*STEP+'%';
pieces[p][pc].style.left=c[0]*STEP+'%';
}

function setTurn(idx){
turn=idx;
var p=PLAYERS[idx];
turnSpan.textContent=p==='P1'?'Player 1':'Player 2';
turnSpan.className=p;
bases.P1.classList.remove('highlight');
bases.P2.classList.remove('highlight');
bases[p].classList.add('highlight');
}

function enableDice(){diceBtn.disabled=false}
function disableDice(){diceBtn.disabled=true}

function highlight(p,pcs){
pcs.forEach(function(pc){pieces[p][pc].classList.add('highlight')});
}
function unhighlight(){
document.querySelectorAll('.player-piece.highlight').forEach(function(e){e.classList.remove('highlight')});
}

function getEligible(p){
return [0,1,2,3].filter(function(pc){
var pos=currentPos[p][pc];
if(pos===HOME_POS[p])return false;
if(BASE[p].indexOf(pos)!==-1&&dice!==6)return false;
if(HOME_ENT[p].indexOf(pos)!==-1&&dice>HOME_POS[p]-pos)return false;
return true;
});
}

function incTurn(){
turn=turn===0?1:0;
setTurn(turn);
state=STATE.NOT_ROLLED;
enableDice();
unhighlight();
}

function incPos(p,pc){
var pos=currentPos[p][pc];
if(pos===TURN_PT[p])return HOME_ENT[p][0];
if(pos===51)return 0;
return pos+1;
}

function checkKill(p,pc){
var pos=currentPos[p][pc];
var opp=p==='P1'?'P2':'P1';
var kill=false;
[0,1,2,3].forEach(function(opc){
var opos=currentPos[opp][opc];
if(pos===opos&&SAFE.indexOf(pos)===-1){
setPos(opp,opc,BASE[opp][opc]);
kill=true;
}
});
return kill;
}

function hasWon(p){
return [0,1,2,3].every(function(pc){return currentPos[p][pc]===HOME_POS[p]});
}

function move(p,pc,steps){
var interval=setInterval(function(){
setPos(p,pc,incPos(p,pc));
steps--;
if(steps===0){
clearInterval(interval);
if(hasWon(p)){
alert(p+' wins!');
resetGame();
return;
}
var kill=checkKill(p,pc);
if(kill||dice===6){
state=STATE.NOT_ROLLED;
enableDice();
unhighlight();
return;
}
incTurn();
}
},200);
}

function handlePiece(e){
var t=e.target;
if(!t.classList.contains('player-piece')||!t.classList.contains('highlight'))return;
var p=t.getAttribute('player-id');
var pc=parseInt(t.getAttribute('piece'));
var pos=currentPos[p][pc];
if(BASE[p].indexOf(pos)!==-1){
setPos(p,pc,START[p]);
state=STATE.NOT_ROLLED;
enableDice();
unhighlight();
return;
}
unhighlight();
move(p,pc,dice);
}

function onDice(){
dice=1+Math.floor(Math.random()*6);
diceVal.textContent=dice;
state=STATE.ROLLED;
disableDice();
var p=PLAYERS[turn];
var eligible=getEligible(p);
if(eligible.length){
highlight(p,eligible);
}else{
setTimeout(incTurn,800);
}
}

function resetGame(){
currentPos={P1:BASE.P1.slice(),P2:BASE.P2.slice()};
PLAYERS.forEach(function(p){
[0,1,2,3].forEach(function(pc){setPos(p,pc,currentPos[p][pc])});
});
setTurn(0);
state=STATE.NOT_ROLLED;
diceVal.textContent='-';
enableDice();
unhighlight();
}

diceBtn.addEventListener('click',onDice);
resetBtn.addEventListener('click',resetGame);
document.querySelector('.player-pieces').addEventListener('click',handlePiece);
document.querySelector('.player-pieces').addEventListener('touchend',function(e){e.preventDefault();handlePiece(e)});

resetGame();
})();
</script>
</body>
</html>`;

export const SUPERBOY_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Super Mario Style</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#5c94fc;font-family:system-ui,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none}
.game-container{display:flex;flex-direction:column;height:100%}
.hud{display:flex;justify-content:space-around;padding:8px;background:#000;color:#fff;font-size:14px;font-weight:700}
.hud-item{text-align:center}
.hud-label{font-size:10px;color:#888}
canvas{flex:1;display:block;width:100%;image-rendering:pixelated}
.controls{display:flex;justify-content:space-between;padding:16px;background:rgba(0,0,0,0.8)}
.dpad{display:flex;gap:8px}
.ctrl-btn{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.2);border:3px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff}
.ctrl-btn:active{background:rgba(255,255,255,0.4)}
.action-btns{display:flex;gap:12px}
.btn-a{background:#e53935;border-color:#c62828}
.btn-b{background:#ffc107;border-color:#ff8f00}
.btn-a:active{background:#c62828}
.btn-b:active{background:#ff8f00}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;z-index:100}
.overlay.hidden{display:none}
.overlay h1{font-size:32px;color:#ffc107;margin-bottom:8px;text-shadow:4px 4px #e53935}
.overlay p{font-size:16px;color:#ccc;margin-bottom:24px}
.overlay button{padding:16px 40px;font-size:18px;font-weight:700;background:#43a047;color:#fff;border:none;border-radius:8px;cursor:pointer}
</style>
</head>
<body>
<div class="game-container">
<div class="hud">
<div class="hud-item"><div class="hud-label">SCORE</div><div id="score">0</div></div>
<div class="hud-item"><div class="hud-label">COINS</div><div id="coins">0</div></div>
<div class="hud-item"><div class="hud-label">WORLD</div><div>1-1</div></div>
<div class="hud-item"><div class="hud-label">TIME</div><div id="time">300</div></div>
</div>
<canvas id="game"></canvas>
<div class="controls">
<div class="dpad">
<div class="ctrl-btn" id="left">◀</div>
<div class="ctrl-btn" id="right">▶</div>
</div>
<div class="action-btns">
<div class="ctrl-btn btn-b" id="run">B</div>
<div class="ctrl-btn btn-a" id="jump">A</div>
</div>
</div>
</div>
<div class="overlay" id="startScreen">
<h1>SUPER MARIO</h1>
<p>Collect coins and reach the flag!</p>
<button id="startBtn">START</button>
</div>
<div class="overlay hidden" id="endScreen">
<h1 id="endTitle">GAME OVER</h1>
<p id="endMsg">Score: 0</p>
<button id="restartBtn">TRY AGAIN</button>
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

var TILE=16;
var SCALE=2;
var W,H;
var GRAVITY=0.5;
var keys={left:false,right:false,jump:false,run:false};

var LEVEL=[
'                                                                                ',
'                                                                                ',
'                                                                                ',
'                                                                                ',
'                                                                                ',
'                                                                                ',
'                                                                                ',
'                    ?B?B?                                                       ',
'                                                                                ',
'                                                                                ',
'             ?                           BBB                                    ',
'                                                                                ',
'                                    ?   ?B?B?                                   ',
'                                                                 F              ',
'M                 GGG       GGG              GGG    GG   GGG    GGG             ',
'GGGGGGGG    GGGGGGGGGGGGGGGGGGGGG      GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
];

var player,cam,tiles,coins,enemies,flag,score,coinCount,time,state,lastTime;

function resize(){
W=canvas.width=canvas.parentElement.clientWidth;
H=canvas.height=canvas.parentElement.clientHeight-100;
}

function build(){
tiles=[];coins=[];enemies=[];flag=null;score=0;coinCount=0;time=300;
player={x:32,y:200,vx:0,vy:0,w:TILE,h:TILE*1.5,onGround:false,dir:1,frame:0};
cam={x:0};

for(var y=0;y<LEVEL.length;y++){
for(var x=0;x<LEVEL[y].length;x++){
var c=LEVEL[y][x];
var px=x*TILE*SCALE,py=y*TILE*SCALE;
if(c==='G')tiles.push({x:px,y:py,w:TILE*SCALE,h:TILE*SCALE,type:'ground'});
else if(c==='B')tiles.push({x:px,y:py,w:TILE*SCALE,h:TILE*SCALE,type:'brick'});
else if(c==='?'){tiles.push({x:px,y:py,w:TILE*SCALE,h:TILE*SCALE,type:'question',hit:false});coins.push({x:px+TILE*SCALE/2,y:py-TILE*SCALE,r:8,taken:false,fromBlock:true})}
else if(c==='C')coins.push({x:px+TILE*SCALE/2,y:py+TILE*SCALE/2,r:10,taken:false,fromBlock:false});
else if(c==='M'){player.x=px;player.y=py-TILE*SCALE}
else if(c==='E')enemies.push({x:px,y:py,vx:-1,w:TILE*SCALE,h:TILE*SCALE,alive:true});
else if(c==='F')flag={x:px,y:py-TILE*SCALE*4,w:TILE*SCALE/2,h:TILE*SCALE*5};
}
}
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
if(time<=0){endGame(false);return}

var acc=keys.run?0.8:0.5;
var maxV=keys.run?6:4;
var fric=0.85;

if(keys.left){player.vx-=acc;player.dir=-1}
if(keys.right){player.vx+=acc;player.dir=1}
player.vx*=fric;
if(Math.abs(player.vx)<0.1)player.vx=0;
player.vx=Math.max(-maxV,Math.min(maxV,player.vx));

if(keys.jump&&player.onGround){player.vy=-12;player.onGround=false}
player.vy+=GRAVITY;
if(player.vy>15)player.vy=15;

player.x+=player.vx;
var ww=LEVEL[0].length*TILE*SCALE;
player.x=Math.max(0,Math.min(ww-player.w,player.x));

for(var i=0;i<tiles.length;i++){
var t=tiles[i];
if(collide(player,t)){
if(player.vx>0)player.x=t.x-player.w;
else if(player.vx<0)player.x=t.x+t.w;
player.vx=0;
}
}

player.y+=player.vy;
player.onGround=false;

for(var i=0;i<tiles.length;i++){
var t=tiles[i];
if(collide(player,t)){
if(player.vy>0){player.y=t.y-player.h;player.onGround=true}
else if(player.vy<0){
player.y=t.y+t.h;
if(t.type==='question'&&!t.hit){t.hit=true;score+=100;updateHUD()}
if(t.type==='brick'){score+=50;updateHUD()}
}
player.vy=0;
}
}

for(var i=0;i<coins.length;i++){
var c=coins[i];
if(!c.taken){
var dx=player.x+player.w/2-c.x,dy=player.y+player.h/2-c.y;
if(Math.hypot(dx,dy)<c.r+12){
c.taken=true;coinCount++;score+=200;updateHUD();
}
}
}

for(var i=0;i<enemies.length;i++){
var e=enemies[i];
if(!e.alive)continue;
e.x+=e.vx;
if(collide(player,e)){
if(player.vy>0&&player.y+player.h<e.y+e.h/2){
e.alive=false;player.vy=-8;score+=100;updateHUD();
}else{endGame(false);return}
}
}

if(flag&&collide(player,flag)){endGame(true);return}
if(player.y>H+100){endGame(false);return}

cam.x=Math.max(0,Math.min(ww-W,player.x-W/3));
player.frame+=Math.abs(player.vx)*0.1;
}

function endGame(win){
state=win?'win':'over';
endTitle.textContent=win?'YOU WIN!':'GAME OVER';
endMsg.textContent='Score: '+score;
endScreen.classList.remove('hidden');
}

function draw(){
var sky=ctx.createLinearGradient(0,0,0,H);
sky.addColorStop(0,'#5c94fc');
sky.addColorStop(1,'#87ceeb');
ctx.fillStyle=sky;
ctx.fillRect(0,0,W,H);

ctx.save();
ctx.translate(-cam.x,0);

for(var i=0;i<tiles.length;i++){
var t=tiles[i];
if(t.type==='ground'){
ctx.fillStyle='#c84c0c';ctx.fillRect(t.x,t.y,t.w,t.h);
ctx.fillStyle='#00a800';ctx.fillRect(t.x,t.y,t.w,6);
}else if(t.type==='brick'){
ctx.fillStyle='#c84c0c';ctx.fillRect(t.x,t.y,t.w,t.h);
ctx.strokeStyle='#6b2400';ctx.lineWidth=2;
ctx.strokeRect(t.x+2,t.y+2,t.w-4,t.h-4);
ctx.beginPath();ctx.moveTo(t.x+t.w/2,t.y);ctx.lineTo(t.x+t.w/2,t.y+t.h);ctx.stroke();
ctx.beginPath();ctx.moveTo(t.x,t.y+t.h/2);ctx.lineTo(t.x+t.w,t.y+t.h/2);ctx.stroke();
}else if(t.type==='question'){
ctx.fillStyle=t.hit?'#6b2400':'#ffc107';ctx.fillRect(t.x,t.y,t.w,t.h);
if(!t.hit){ctx.fillStyle='#fff';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',t.x+t.w/2,t.y+t.h/2)}
}
}

for(var i=0;i<coins.length;i++){
var c=coins[i];
if(c.taken||c.fromBlock)continue;
ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
ctx.fillStyle='#ffc107';ctx.fill();
ctx.strokeStyle='#ff8f00';ctx.lineWidth=2;ctx.stroke();
}

for(var i=0;i<enemies.length;i++){
var e=enemies[i];
if(!e.alive)continue;
ctx.fillStyle='#6b2400';ctx.fillRect(e.x,e.y,e.w,e.h);
ctx.fillStyle='#c84c0c';ctx.beginPath();ctx.arc(e.x+e.w/2,e.y,e.w/2,Math.PI,0);ctx.fill();
ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(e.x+8,e.y+8,4,0,Math.PI*2);ctx.arc(e.x+e.w-8,e.y+8,4,0,Math.PI*2);ctx.fill();
}

if(flag){
ctx.fillStyle='#00a800';ctx.fillRect(flag.x,flag.y,8,flag.h);
ctx.fillStyle='#f44336';ctx.beginPath();ctx.moveTo(flag.x+8,flag.y);ctx.lineTo(flag.x+40,flag.y+20);ctx.lineTo(flag.x+8,flag.y+40);ctx.closePath();ctx.fill();
}

if(state==='play'||state==='win'){
var px=player.x,py=player.y,d=player.dir;
ctx.save();
if(d<0){ctx.translate(px+player.w,0);ctx.scale(-1,1);px=0}

ctx.fillStyle='#e53935';ctx.fillRect(px+4,py,player.w-8,12);
ctx.fillStyle='#ffccbc';ctx.fillRect(px+2,py+10,player.w-4,10);
ctx.fillStyle='#e53935';ctx.fillRect(px,py-4,player.w,8);
ctx.fillStyle='#333';ctx.fillRect(d>0?px+player.w-6:px+2,py+12,4,4);
ctx.fillStyle='#1565c0';ctx.fillRect(px+2,py+20,6,player.h-22);ctx.fillRect(px+player.w-8,py+20,6,player.h-22);
ctx.fillStyle='#6b2400';ctx.fillRect(px,py+player.h-4,8,4);ctx.fillRect(px+player.w-8,py+player.h-4,8,4);

ctx.restore();
}

ctx.restore();
}

var animId;
function loop(t){
var dt=(t-lastTime)/1000;
lastTime=t;
if(dt>0.1)dt=0.016;
update(dt);
draw();
updateHUD();
animId=requestAnimationFrame(loop);
}

function setupControls(){
var btns=[['left','left'],['right','right'],['jump','jump'],['run','run']];
btns.forEach(function(b){
var el=document.getElementById(b[0]);
function on(){keys[b[1]]=true}
function off(){keys[b[1]]=false}
el.addEventListener('touchstart',function(e){e.preventDefault();on()},{passive:false});
el.addEventListener('touchend',function(e){e.preventDefault();off()},{passive:false});
el.addEventListener('mousedown',on);
el.addEventListener('mouseup',off);
el.addEventListener('mouseleave',off);
});
}

document.addEventListener('keydown',function(e){
if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=true;
if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=true;
if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')keys.jump=true;
if(e.code==='ShiftLeft'||e.code==='KeyZ')keys.run=true;
});
document.addEventListener('keyup',function(e){
if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=false;
if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=false;
if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')keys.jump=false;
if(e.code==='ShiftLeft'||e.code==='KeyZ')keys.run=false;
});

document.getElementById('startBtn').onclick=function(){
startScreen.classList.add('hidden');
state='play';
build();
lastTime=performance.now();
loop(lastTime);
};

document.getElementById('restartBtn').onclick=function(){
endScreen.classList.add('hidden');
state='play';
build();
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
