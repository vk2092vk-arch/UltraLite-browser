// Game HTML content stored as strings for WebView
// This approach ensures games work offline without modifying metro.config.js

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ludo Classic</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;color:#fff}
.game-title{font-size:24px;font-weight:700;margin-bottom:10px;text-shadow:2px 2px 4px rgba(0,0,0,0.3)}
.board{width:min(90vw,340px);height:min(90vw,340px);background:#fff;border-radius:12px;display:grid;grid-template:repeat(15,1fr)/repeat(15,1fr);gap:1px;padding:4px;box-shadow:0 10px 40px rgba(0,0,0,0.4)}
.cell{border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:8px;position:relative}
.red-zone{background:#ffcdd2}.green-zone{background:#c8e6c9}.yellow-zone{background:#fff9c4}.blue-zone{background:#bbdefb}
.red-home{background:#e53935}.green-home{background:#43a047}.yellow-home{background:#fdd835}.blue-home{background:#1e88e5}
.path{background:#f5f5f5}.center{background:linear-gradient(45deg,#e53935 25%,#43a047 25%,#43a047 50%,#fdd835 50%,#fdd835 75%,#1e88e5 75%)}
.safe{background:#fff;border:2px solid #ff9800}
.token{width:80%;height:80%;border-radius:50%;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.3)}
.token:hover{transform:scale(1.1);box-shadow:0 4px 8px rgba(0,0,0,0.4)}
.token.red{background:linear-gradient(135deg,#ff5252,#d32f2f)}
.token.green{background:linear-gradient(135deg,#69f0ae,#2e7d32)}
.token.yellow{background:linear-gradient(135deg,#ffff00,#f9a825)}
.token.blue{background:linear-gradient(135deg,#448aff,#1565c0)}
.token.movable{animation:pulse 0.8s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.7)}50%{box-shadow:0 0 0 8px rgba(255,255,255,0)}}
.controls{margin-top:15px;display:flex;gap:15px;align-items:center}
.dice-btn{width:70px;height:70px;border-radius:12px;border:none;background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;font-size:28px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(255,107,53,0.4);transition:transform 0.1s}
.dice-btn:active{transform:scale(0.95)}
.dice-btn:disabled{opacity:0.5;cursor:not-allowed}
.dice-btn.rolling{animation:shake 0.3s infinite}
@keyframes shake{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
.info{background:rgba(255,255,255,0.1);padding:8px 16px;border-radius:20px;font-size:14px}
.turn-indicator{display:flex;align-items:center;gap:8px}
.turn-dot{width:16px;height:16px;border-radius:50%}
.home-tokens{position:absolute;width:100%;height:100%;display:grid;grid-template:1fr 1fr/1fr 1fr;gap:2px;padding:15%}
.msg{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);padding:20px 30px;border-radius:12px;font-size:20px;z-index:100;animation:pop 0.3s}
@keyframes pop{0%{transform:translate(-50%,-50%) scale(0)}100%{transform:translate(-50%,-50%) scale(1)}}
</style>
</head>
<body>
<div class="game-title">🎲 Ludo Classic</div>
<div class="board" id="board"></div>
<div class="controls">
<div class="info"><div class="turn-indicator"><span>Turn:</span><div class="turn-dot" id="turnDot"></div><span id="turnText">Red</span></div></div>
<button class="dice-btn" id="diceBtn" onclick="rollDice()">🎲</button>
<div class="info">Dice: <span id="diceVal">-</span></div>
</div>
<script>
const PLAYERS=['red','green','yellow','blue'];
const COLORS={red:'#e53935',green:'#43a047',yellow:'#fdd835',blue:'#1e88e5'};
const HOME_POS={red:[1,1],green:[1,9],yellow:[9,9],blue:[9,1]};
const START_POS={red:[6,1],green:[1,8],yellow:[8,13],blue:[13,6]};
const PATH_LENGTH=52;
let board=[],tokens={},currentPlayer=0,diceValue=0,canMove=false,gameOver=false;
const PATHS={red:[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
green:[[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
yellow:[[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
blue:[[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]};
function initBoard(){const b=document.getElementById('board');b.innerHTML='';board=[];
for(let r=0;r<15;r++){board[r]=[];for(let c=0;c<15;c++){const cell=document.createElement('div');cell.className='cell';cell.dataset.r=r;cell.dataset.c=c;
if((r<6&&c<6)||(r<6&&c>8)||(r>8&&c<6)||(r>8&&c>8)){if(r<6&&c<6)cell.classList.add(r<1||r>4||c<1||c>4?'red-zone':'red-home');else if(r<6&&c>8)cell.classList.add(r<1||r>4||c<10||c>13?'green-zone':'green-home');else if(r>8&&c>8)cell.classList.add(r<10||r>13||c<10||c>13?'yellow-zone':'yellow-home');else cell.classList.add(r<10||r>13||c<1||c>4?'blue-zone':'blue-home');}
else if(r===7&&c===7)cell.classList.add('center');else cell.classList.add('path');
b.appendChild(cell);board[r][c]=cell;}}}
function initTokens(){tokens={};PLAYERS.forEach((p,pi)=>{tokens[p]=[];for(let i=0;i<4;i++){tokens[p].push({pos:-1,finished:false});}});renderTokens();}
function renderTokens(){document.querySelectorAll('.token').forEach(t=>t.remove());
PLAYERS.forEach(p=>{const homeCount=tokens[p].filter(t=>t.pos===-1&&!t.finished).length;const[hr,hc]=HOME_POS[p];const homeCell=board[hr+(p==='green'||p==='yellow'?1:2)][hc+(p==='yellow'||p==='blue'?1:2)];
if(homeCount>0){const container=document.createElement('div');container.className='home-tokens';
for(let i=0;i<homeCount;i++){const tok=document.createElement('div');tok.className='token '+p;tok.onclick=function(){moveFromHome(p);};if(canMove&&p===PLAYERS[currentPlayer]&&diceValue===6)tok.classList.add('movable');container.appendChild(tok);}homeCell.appendChild(container);}
tokens[p].forEach((t,i)=>{if(t.pos>=0&&!t.finished){const path=PATHS[p];if(t.pos<path.length){const[pr,pc]=path[t.pos];const cell=board[pr][pc];const tok=document.createElement('div');tok.className='token '+p;tok.onclick=function(){moveToken(p,i);};
if(canMove&&p===PLAYERS[currentPlayer]&&canTokenMove(p,i))tok.classList.add('movable');cell.appendChild(tok);}}});});}
function canTokenMove(p,i){const t=tokens[p][i];if(t.finished||t.pos===-1)return false;const newPos=t.pos+diceValue;return newPos<=56;}
function rollDice(){if(gameOver)return;const btn=document.getElementById('diceBtn');btn.disabled=true;btn.classList.add('rolling');canMove=false;
setTimeout(function(){diceValue=Math.floor(Math.random()*6)+1;document.getElementById('diceVal').textContent=diceValue;btn.classList.remove('rolling');canMove=true;
const p=PLAYERS[currentPlayer];const hasMovable=tokens[p].some(function(t,i){return t.pos===-1&&diceValue===6||canTokenMove(p,i);});
if(!hasMovable){showMsg('No moves!');setTimeout(function(){if(diceValue!==6)nextTurn();btn.disabled=false;},1000);return;}btn.disabled=false;renderTokens();},500);}
function moveFromHome(p){if(!canMove||p!==PLAYERS[currentPlayer]||diceValue!==6)return;const t=tokens[p].find(function(t){return t.pos===-1&&!t.finished;});if(t){t.pos=0;canMove=false;checkCapture(p,0);renderTokens();setTimeout(function(){document.getElementById('diceBtn').disabled=false;},300);}}
function moveToken(p,i){if(!canMove||p!==PLAYERS[currentPlayer])return;const t=tokens[p][i];if(t.pos===-1||t.finished)return;const newPos=t.pos+diceValue;if(newPos>56)return;if(newPos===56){t.finished=true;t.pos=-1;showMsg('🏆 Token home!');if(tokens[p].every(function(t){return t.finished;})){showMsg(p.toUpperCase()+' WINS! 🎉');gameOver=true;return;}}else{t.pos=newPos;checkCapture(p,newPos);}canMove=false;renderTokens();setTimeout(function(){if(diceValue!==6)nextTurn();document.getElementById('diceBtn').disabled=false;},300);}
function checkCapture(p,pos){if(pos<=0||pos>=52)return;const path=PATHS[p];const coords=path[pos];const r=coords[0],c=coords[1];const dominated=[1,9,14,22,27,35,40,48];PLAYERS.forEach(function(op){if(op===p)return;tokens[op].forEach(function(t){if(t.pos>=0&&t.pos<52){const opath=PATHS[op];const oc=opath[t.pos];if(oc[0]===r&&oc[1]===c&&dominated.indexOf(t.pos)===-1){t.pos=-1;showMsg('💥 Captured!');}}});});}
function nextTurn(){currentPlayer=(currentPlayer+1)%4;updateTurnUI();}
function updateTurnUI(){const p=PLAYERS[currentPlayer];document.getElementById('turnDot').style.background=COLORS[p];document.getElementById('turnText').textContent=p.charAt(0).toUpperCase()+p.slice(1);}
function showMsg(m){const d=document.createElement('div');d.className='msg';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove();},1500);}
initBoard();initTokens();updateTurnUI();
</script>
</body>
</html>`;

export const SUPERBOY_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Super Boy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
body{font-family:system-ui,-apple-system,sans-serif;background:#1a1a2e;overflow:hidden;position:fixed;width:100%;height:100%}
#game{width:100%;height:100%;display:block;image-rendering:pixelated}
.ui{position:fixed;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;z-index:10;pointer-events:none}
.score,.lives{background:rgba(0,0,0,0.6);color:#fff;padding:8px 16px;border-radius:20px;font-size:16px;font-weight:700}
.controls{position:fixed;bottom:20px;left:0;right:0;display:flex;justify-content:space-between;padding:0 20px;z-index:10}
.btn-group{display:flex;gap:10px}
.ctrl-btn{width:60px;height:60px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-user-select:none;user-select:none}
.ctrl-btn:active{background:rgba(255,255,255,0.4)}
.jump-btn{width:80px;height:80px;background:rgba(255,107,53,0.8);font-size:14px;font-weight:700}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100}
.overlay h1{color:#ff6b35;font-size:32px;margin-bottom:10px}
.overlay p{color:#fff;font-size:18px;margin-bottom:20px}
.overlay button{background:linear-gradient(135deg,#ff6b35,#f7931e);border:none;color:#fff;padding:15px 40px;border-radius:30px;font-size:18px;font-weight:700;cursor:pointer}
.hidden{display:none!important}
</style>
</head>
<body>
<div class="ui"><div class="score">🪙 <span id="score">0</span></div><div class="lives">❤️ <span id="lives">3</span></div></div>
<canvas id="game"></canvas>
<div class="controls">
<div class="btn-group">
<button class="ctrl-btn" id="leftBtn">◀</button>
<button class="ctrl-btn" id="rightBtn">▶</button>
</div>
<button class="ctrl-btn jump-btn" id="jumpBtn">JUMP</button>
</div>
<div class="overlay" id="startScreen">
<h1>🦸 Super Boy</h1>
<p>Collect coins, avoid enemies!</p>
<button onclick="startGame()">▶ START</button>
</div>
<div class="overlay hidden" id="gameOver">
<h1>💀 Game Over</h1>
<p>Score: <span id="finalScore">0</span></p>
<button onclick="restartGame()">🔄 Try Again</button>
</div>
<script>
var canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
var W,H,scale,groundY;function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;scale=Math.min(W/400,H/600);groundY=H-80;}resize();window.onresize=resize;
var GRAVITY=0.6,JUMP=-14,SPEED=5;
var player,platforms,coins,enemies,score,lives,gameRunning,keys={left:false,right:false};
function init(){player={x:50,y:groundY-40,w:30,h:40,vx:0,vy:0,onGround:false,color:'#ff6b35'};platforms=[];coins=[];enemies=[];score=0;lives=3;
for(var i=0;i<10;i++){platforms.push({x:100+i*200+Math.random()*100,y:groundY-100-Math.random()*150,w:80+Math.random()*40,h:15});}
for(var i=0;i<15;i++){var p=platforms[i%platforms.length];coins.push({x:p?p.x+p.w/2:200+i*150,y:p?p.y-30:groundY-50-Math.random()*100,r:10,collected:false});}
for(var i=0;i<5;i++){enemies.push({x:300+i*400,y:groundY-30,w:30,h:30,vx:-2-Math.random()*2,color:'#e74c3c'});}
updateUI();}
function updateUI(){document.getElementById('score').textContent=score;document.getElementById('lives').textContent=lives;}
function update(){if(!gameRunning)return;
if(keys.left)player.vx=-SPEED;else if(keys.right)player.vx=SPEED;else player.vx*=0.8;
player.vy+=GRAVITY;player.x+=player.vx;player.y+=player.vy;player.onGround=false;
if(player.y+player.h>=groundY){player.y=groundY-player.h;player.vy=0;player.onGround=true;}
if(player.x<0)player.x=0;if(player.x>W*3)player.x=W*3;
platforms.forEach(function(p){if(player.vy>0&&player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>p.y&&player.y+player.h<p.y+p.h+player.vy){player.y=p.y-player.h;player.vy=0;player.onGround=true;}});
coins.forEach(function(c){if(!c.collected&&Math.hypot(player.x+player.w/2-c.x,player.y+player.h/2-c.y)<c.r+15){c.collected=true;score+=10;updateUI();}});
enemies.forEach(function(e){e.x+=e.vx;if(e.x<-50)e.x=W+500+Math.random()*500;if(player.x<e.x+e.w&&player.x+player.w>e.x&&player.y<e.y+e.h&&player.y+player.h>e.y){lives--;updateUI();player.x=50;player.y=groundY-player.h;if(lives<=0)endGame();}});}
function draw(){ctx.fillStyle='#2c3e50';ctx.fillRect(0,0,W,H);
ctx.fillStyle='#27ae60';ctx.fillRect(0,groundY,W,H-groundY);
var camX=Math.max(0,player.x-W/3);
ctx.save();ctx.translate(-camX,0);
platforms.forEach(function(p){ctx.fillStyle='#8b4513';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#228b22';ctx.fillRect(p.x,p.y-5,p.w,8);});
coins.forEach(function(c){if(!c.collected){ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fillStyle='#f1c40f';ctx.fill();ctx.strokeStyle='#f39c12';ctx.lineWidth=2;ctx.stroke();}});
enemies.forEach(function(e){ctx.fillStyle=e.color;ctx.fillRect(e.x,e.y,e.w,e.h);ctx.fillStyle='#fff';ctx.fillRect(e.x+5,e.y+8,8,8);ctx.fillRect(e.x+17,e.y+8,8,8);ctx.fillStyle='#000';ctx.fillRect(e.x+8,e.y+10,4,4);ctx.fillRect(e.x+20,e.y+10,4,4);});
ctx.fillStyle=player.color;ctx.fillRect(player.x,player.y,player.w,player.h);
ctx.fillStyle='#ffd700';ctx.fillRect(player.x+5,player.y+5,20,10);
ctx.fillStyle='#fff';ctx.fillRect(player.x+8,player.y+12,6,6);ctx.fillRect(player.x+18,player.y+12,6,6);
ctx.fillStyle='#000';ctx.fillRect(player.x+10,player.y+14,3,3);ctx.fillRect(player.x+20,player.y+14,3,3);
ctx.restore();}
function gameLoop(){update();draw();if(gameRunning)requestAnimationFrame(gameLoop);}
function jump(){if(player.onGround){player.vy=JUMP;player.onGround=false;}}
function startGame(){document.getElementById('startScreen').classList.add('hidden');gameRunning=true;init();gameLoop();}
function endGame(){gameRunning=false;document.getElementById('finalScore').textContent=score;document.getElementById('gameOver').classList.remove('hidden');}
function restartGame(){document.getElementById('gameOver').classList.add('hidden');startGame();}
document.getElementById('leftBtn').ontouchstart=function(e){e.preventDefault();keys.left=true;};document.getElementById('leftBtn').ontouchend=function(e){e.preventDefault();keys.left=false;};
document.getElementById('rightBtn').ontouchstart=function(e){e.preventDefault();keys.right=true;};document.getElementById('rightBtn').ontouchend=function(e){e.preventDefault();keys.right=false;};
document.getElementById('jumpBtn').ontouchstart=function(e){e.preventDefault();jump();};
document.getElementById('leftBtn').onmousedown=function(){keys.left=true;};document.getElementById('leftBtn').onmouseup=function(){keys.left=false;};
document.getElementById('rightBtn').onmousedown=function(){keys.right=true;};document.getElementById('rightBtn').onmouseup=function(){keys.right=false;};
document.getElementById('jumpBtn').onmousedown=function(){jump();};
document.onkeydown=function(e){if(e.key==='ArrowLeft')keys.left=true;if(e.key==='ArrowRight')keys.right=true;if(e.key===' '||e.key==='ArrowUp')jump();};
document.onkeyup=function(e){if(e.key==='ArrowLeft')keys.left=false;if(e.key==='ArrowRight')keys.right=false;};
</script>
</body>
</html>`;
