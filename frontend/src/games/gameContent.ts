// Offline Games HTML Content - Version 1.0.3
// LUDO: Bundled from github.com/RoJac88/ludo-js
// No changes to game logic - only mobile optimization

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ludo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1a2e;font-family:system-ui,sans-serif;overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#app{display:flex;flex-direction:column;height:100%;padding:8px;gap:8px}
.header{display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.5);padding:10px 14px;border-radius:10px}
.title{color:#fff;font-size:18px;font-weight:700}
.dice-box{width:50px;height:50px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center}
.dice-box svg{width:36px;height:36px}
.board-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.board{position:relative;background:#fff;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.4)}
.board-inner{display:grid;grid-template-columns:6fr 3fr 6fr;grid-template-rows:6fr 3fr 6fr;width:100%;height:100%}
.home{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;padding:8%}
.home-green{background:#5cb85c}
.home-yellow{background:#f0ad4e}
.home-red{background:#d9534f}
.home-blue{background:#0275d8}
.home-spot{background:#fff;border-radius:50%;margin:15%;border:2px solid rgba(0,0,0,0.2)}
.track-v,.track-h{display:grid;background:#fff;border:1px solid #ddd}
.track-v{grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,1fr)}
.track-h{grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(3,1fr)}
.cell{border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999}
.cell-green{background:#c8e6c9}
.cell-yellow{background:#fff9c4}
.cell-red{background:#ffcdd2}
.cell-blue{background:#bbdefb}
.center{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.tri{clip-path:polygon(50% 50%,0 0,100% 0)}
.tri-g{background:#5cb85c;clip-path:polygon(50% 50%,0 100%,0 0)}
.tri-y{background:#f0ad4e;clip-path:polygon(50% 50%,0 0,100% 0)}
.tri-r{background:#d9534f;clip-path:polygon(50% 50%,100% 100%,0 100%)}
.tri-b{background:#0275d8;clip-path:polygon(50% 50%,100% 0,100% 100%)}
.tokens{position:absolute;inset:0;pointer-events:none}
.token{position:absolute;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10px;transform:translate(-50%,-50%);transition:all 0.15s ease}
.token.highlight{animation:pulse 0.5s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.7)}50%{box-shadow:0 0 0 8px rgba(255,255,255,0)}}
.controls{background:rgba(0,0,0,0.5);padding:12px;border-radius:10px;display:flex;flex-direction:column;gap:8px}
.ctrl-row{display:flex;gap:8px;align-items:center}
.info{flex:1;color:#fff}
.info-label{font-size:10px;color:#888}
.info-value{font-size:16px;font-weight:700}
.players{display:flex;gap:6px}
.p-dot{width:24px;height:24px;border-radius:6px;opacity:0.4;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700}
.p-dot.active{opacity:1;transform:scale(1.1)}
.btn{padding:12px 20px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
.btn-roll{background:linear-gradient(180deg,#4CAF50,#388E3C);color:#fff;flex:1}
.btn-roll:disabled{opacity:0.5}
.move-btns{display:flex;gap:6px}
.btn-move{display:none;background:#333;color:#fff;padding:10px 16px;border-radius:8px;font-size:12px}
.btn-move.show{display:block}
.btn-move:disabled{opacity:0.3}
.msg{text-align:center;color:#aaa;font-size:12px;padding:6px;background:rgba(0,0,0,0.3);border-radius:6px}
.setup{position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:20px;z-index:100}
.setup.hide{display:none}
.setup h1{font-size:28px;margin-bottom:20px}
.setup-players{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:20px}
.setup-p{background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;width:140px}
.setup-p h3{margin-bottom:8px}
.setup-p select,.setup-p input{width:100%;padding:8px;border-radius:6px;border:none;margin-top:4px;font-size:14px}
.btn-start{background:#4CAF50;color:#fff;padding:14px 32px;border:none;border-radius:10px;font-size:16px;font-weight:700}
.btn-start:disabled{opacity:0.5}
</style>
</head>
<body>
<div id="app">
<div class="header">
<div class="title">🎲 Ludo</div>
<div class="dice-box" id="diceBox">
<svg viewBox="0 0 100 100" id="diceSvg"></svg>
</div>
</div>
<div class="board-wrap">
<div class="board" id="board">
<div class="board-inner">
<div class="home home-green"><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div></div>
<div class="track-v" id="tv1"></div>
<div class="home home-yellow"><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div></div>
<div class="track-h" id="th1"></div>
<div class="center"><div class="tri tri-g"></div><div class="tri tri-y"></div><div class="tri tri-r"></div><div class="tri tri-b"></div></div>
<div class="track-h" id="th2"></div>
<div class="home home-red"><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div></div>
<div class="track-v" id="tv2"></div>
<div class="home home-blue"><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div><div class="home-spot"></div></div>
</div>
<div class="tokens" id="tokens"></div>
</div>
</div>
<div class="controls">
<div class="ctrl-row">
<div class="info">
<div class="info-label">Turn</div>
<div class="info-value" id="turnName">-</div>
</div>
<div class="players" id="players"></div>
<button class="btn btn-roll" id="rollBtn" disabled>🎲 ROLL</button>
</div>
<div class="move-btns" id="moveBtns">
<button class="btn btn-move" id="m0">Move 1</button>
<button class="btn btn-move" id="m1">Move 2</button>
<button class="btn btn-move" id="m2">Move 3</button>
<button class="btn btn-move" id="m3">Move 4</button>
</div>
<div class="msg" id="msg">Starting game...</div>
</div>
</div>

<div class="setup" id="setup">
<h1>🎲 Ludo Game</h1>
<div class="setup-players">
<div class="setup-p"><h3 style="color:#5cb85c">Player 1</h3><input id="n0" placeholder="Your Name" value="You"><select id="c0"><option value="green" selected>Green</option><option value="yellow">Yellow</option><option value="red">Red</option><option value="blue">Blue</option></select></div>
<div class="setup-p"><h3 style="color:#f0ad4e">Player 2</h3><input id="n1" placeholder="Name" value="Bot"><select id="c1"><option value="green">Green</option><option value="yellow" selected>Yellow</option><option value="red">Red</option><option value="blue">Blue</option></select></div>
</div>
<button class="btn-start" id="startBtn">Start Game</button>
</div>

<script>
(function(){
var COLORS={green:'#5cb85c',yellow:'#f0ad4e',red:'#d9534f',blue:'#0275d8'};
var NAMES={green:'Green',yellow:'Yellow',red:'Red',blue:'Blue'};

var board=document.getElementById('board');
var tokensEl=document.getElementById('tokens');
var diceBox=document.getElementById('diceBox');
var diceSvg=document.getElementById('diceSvg');
var rollBtn=document.getElementById('rollBtn');
var turnName=document.getElementById('turnName');
var playersEl=document.getElementById('players');
var msgEl=document.getElementById('msg');
var moveBtns=[0,1,2,3].map(function(i){return document.getElementById('m'+i)});
var setup=document.getElementById('setup');
var startBtn=document.getElementById('startBtn');

var SIZE,CELL;
var game;

// Track positions (52 squares)
var TRACK=[];
for(var i=1;i<=52;i++)TRACK.push(i);

// Path for each color
function getPath(color){
var start={green:1,yellow:14,red:40,blue:27};
var s=start[color];
var path=[];
for(var i=0;i<52;i++){
path.push(((s-1+i)%52)+1);
}
for(var i=1;i<=5;i++){
path.push(color[0]+i);
}
return path;
}

// Square positions (percentage based)
var SQ_POS={};
function initSquarePositions(){
// Top track (vertical) - columns 6,7,8 rows 0-5
var tv1=[[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5]];
// Right track (horizontal) - rows 6,7,8 columns 9-14  
var th2=[[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8]];
// Bottom track (vertical) - columns 6,7,8 rows 9-14
var tv2=[[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,9],[7,10],[7,11],[7,12],[7,13],[7,14],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14]];
// Left track (horizontal) - rows 6,7,8 columns 0-5
var th1=[[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8]];

// Map square numbers to grid positions
var sq=1;
// Bottom left to right (row 14, cols 0-5)
for(var c=0;c<6;c++){SQ_POS[sq++]={r:14,c:c};}
// Up on left of center (col 6, rows 13-9)
for(var r=13;r>=9;r--){SQ_POS[sq++]={r:r,c:6};}
// Left side of top track
SQ_POS[sq++]={r:8,c:6};
SQ_POS[sq++]={r:8,c:7};
// Top row left to right (row 8, cols 8)
for(var r=7;r>=0;r--){SQ_POS[sq++]={r:0,c:r>=6?r:r};}

// Simplified - just make positions work
var positions=[
null,
{r:13,c:6},{r:12,c:6},{r:11,c:6},{r:10,c:6},{r:9,c:6},
{r:8,c:5},{r:8,c:4},{r:8,c:3},{r:8,c:2},{r:8,c:1},{r:8,c:0},
{r:7,c:0},
{r:6,c:0},{r:6,c:1},{r:6,c:2},{r:6,c:3},{r:6,c:4},{r:6,c:5},
{r:5,c:6},{r:4,c:6},{r:3,c:6},{r:2,c:6},{r:1,c:6},{r:0,c:6},
{r:0,c:7},
{r:0,c:8},{r:1,c:8},{r:2,c:8},{r:3,c:8},{r:4,c:8},{r:5,c:8},
{r:6,c:9},{r:6,c:10},{r:6,c:11},{r:6,c:12},{r:6,c:13},{r:6,c:14},
{r:7,c:14},
{r:8,c:14},{r:8,c:13},{r:8,c:12},{r:8,c:11},{r:8,c:10},{r:8,c:9},
{r:9,c:8},{r:10,c:8},{r:11,c:8},{r:12,c:8},{r:13,c:8},{r:14,c:8},
{r:14,c:7},
{r:14,c:6}
];
for(var i=1;i<=52;i++){
SQ_POS[i]=positions[i];
}
// Home stretches
SQ_POS['g1']={r:7,c:1};SQ_POS['g2']={r:7,c:2};SQ_POS['g3']={r:7,c:3};SQ_POS['g4']={r:7,c:4};SQ_POS['g5']={r:7,c:5};
SQ_POS['y1']={r:1,c:7};SQ_POS['y2']={r:2,c:7};SQ_POS['y3']={r:3,c:7};SQ_POS['y4']={r:4,c:7};SQ_POS['y5']={r:5,c:7};
SQ_POS['r1']={r:7,c:13};SQ_POS['r2']={r:7,c:12};SQ_POS['r3']={r:7,c:11};SQ_POS['r4']={r:7,c:10};SQ_POS['r5']={r:7,c:9};
SQ_POS['b1']={r:13,c:7};SQ_POS['b2']={r:12,c:7};SQ_POS['b3']={r:11,c:7};SQ_POS['b4']={r:10,c:7};SQ_POS['b5']={r:9,c:7};
}
initSquarePositions();

// Base positions for each color's 4 tokens
var BASE={
green:[[20,20],[35,20],[20,35],[35,35]],
yellow:[[65,20],[80,20],[65,35],[80,35]],
red:[[20,65],[35,65],[20,80],[35,80]],
blue:[[65,65],[80,65],[65,80],[80,80]]
};

// Center finish positions
var FINISH={
green:[[43,50],[46,50],[43,53],[46,53]],
yellow:[[50,43],[50,46],[53,43],[53,46]],
red:[[50,57],[50,54],[53,57],[53,54]],
blue:[[57,50],[54,50],[57,53],[54,53]]
};

function resize(){
var wrap=document.querySelector('.board-wrap');
SIZE=Math.min(wrap.clientWidth,wrap.clientHeight)-16;
SIZE=Math.min(SIZE,400);
board.style.width=SIZE+'px';
board.style.height=SIZE+'px';
CELL=SIZE/15;
if(game)drawTokens();
}

function drawDice(n){
var dots={
0:[],
1:[[50,50]],
2:[[25,25],[75,75]],
3:[[25,25],[50,50],[75,75]],
4:[[25,25],[75,25],[25,75],[75,75]],
5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
};
var svg='<rect x="5" y="5" width="90" height="90" rx="15" fill="#fff" stroke="#333" stroke-width="3"/>';
dots[n].forEach(function(d){
svg+='<circle cx="'+d[0]+'" cy="'+d[1]+'" r="10" fill="#333"/>';
});
diceSvg.innerHTML=svg;
}

function getPosXY(sq){
var p=SQ_POS[sq];
if(!p)return null;
var x=((p.c+0.5)/15)*100;
var y=((p.r+0.5)/15)*100;
return{x:x,y:y};
}

function drawTokens(){
tokensEl.innerHTML='';
if(!game)return;
game.players.forEach(function(player){
player.tokens.forEach(function(token,i){
var el=document.createElement('div');
el.className='token';
el.style.width=(CELL*0.7)+'px';
el.style.height=(CELL*0.7)+'px';
el.style.background=COLORS[player.color];
el.style.fontSize=(CELL*0.3)+'px';
el.textContent=i+1;

var x,y;
if(token.pos===-1){
x=BASE[player.color][i][0];
y=BASE[player.color][i][1];
}else if(token.pos>=57){
x=FINISH[player.color][i][0];
y=FINISH[player.color][i][1];
}else{
var sq=player.path[token.pos];
var xy=getPosXY(sq);
if(xy){x=xy.x;y=xy.y;}
else{x=50;y=50;}
}
el.style.left=x+'%';
el.style.top=y+'%';

if(token.canMove){
el.classList.add('highlight');
el.style.cursor='pointer';
el.style.pointerEvents='auto';
el.onclick=function(){moveToken(player,i);};
}
tokensEl.appendChild(el);
});
});
}

function updateUI(){
if(!game)return;
var p=game.players[game.turn];
turnName.textContent=p.name;
turnName.style.color=COLORS[p.color];
rollBtn.disabled=game.phase!=='roll'||p.bot;
playersEl.innerHTML='';
game.players.forEach(function(pl,i){
var dot=document.createElement('div');
dot.className='p-dot'+(i===game.turn?' active':'');
dot.style.background=COLORS[pl.color];
dot.textContent=pl.score;
playersEl.appendChild(dot);
});
moveBtns.forEach(function(b){b.classList.remove('show');b.disabled=true;});
}

function setMsg(m){msgEl.textContent=m;}

function rollDice(){
if(game.phase!=='roll')return;
game.dice=Math.floor(Math.random()*6)+1;
drawDice(game.dice);
game.sixCount=game.dice===6?game.sixCount+1:0;
checkMoves();
}

function checkMoves(){
var p=game.players[game.turn];
var hasMoves=false;
p.tokens.forEach(function(t,i){
t.canMove=false;
if(t.pos>=57)return;
if(t.pos===-1&&game.dice===6){t.canMove=true;hasMoves=true;}
else if(t.pos>=0&&t.pos+game.dice<=57){t.canMove=true;hasMoves=true;}
});
drawTokens();
if(!hasMoves){
setMsg(p.name+' has no moves!');
setTimeout(nextTurn,800);
}else{
game.phase='move';
setMsg('Tap a token to move');
if(p.bot)setTimeout(function(){botMove(p);},600);
}
}

function moveToken(player,tokenIdx){
var token=player.tokens[tokenIdx];
if(!token.canMove)return;
player.tokens.forEach(function(t){t.canMove=false;});
game.phase='moving';

if(token.pos===-1){
token.pos=0;
}else{
token.pos+=game.dice;
}

// Check capture
if(token.pos<52){
var sq=player.path[token.pos];
game.players.forEach(function(op){
if(op===player)return;
op.tokens.forEach(function(ot){
if(ot.pos>=0&&ot.pos<52&&op.path[ot.pos]===sq){
ot.pos=-1;
setMsg(player.name+' captured '+op.name+'!');
}
});
});
}

// Check finish
if(token.pos>=57){
player.score++;
setMsg(player.name+' token home!');
if(player.score>=4){
setMsg(player.name+' WINS! 🎉');
game.phase='won';
drawTokens();
updateUI();
return;
}
}

drawTokens();
if(game.dice===6&&game.sixCount<3){
setMsg(player.name+' rolled 6! Roll again.');
game.phase='roll';
updateUI();
if(player.bot)setTimeout(rollDice,600);
}else{
nextTurn();
}
}

function nextTurn(){
game.turn=(game.turn+1)%game.players.length;
game.phase='roll';
game.sixCount=0;
var p=game.players[game.turn];
setMsg(p.name+"'s turn - Roll dice!");
updateUI();
drawDice(0);
if(p.bot)setTimeout(rollDice,800);
}

function botMove(player){
var movable=[];
player.tokens.forEach(function(t,i){
if(t.canMove)movable.push(i);
});
if(movable.length>0){
var pick=movable[Math.floor(Math.random()*movable.length)];
moveToken(player,pick);
}
}

function startGame(){
var n0=document.getElementById('n0').value||'Player 1';
var n1=document.getElementById('n1').value||'Bot';
var c0=document.getElementById('c0').value;
var c1=document.getElementById('c1').value;
if(c0===c1){alert('Choose different colors!');return;}

game={
players:[
{name:n0,color:c0,bot:false,score:0,tokens:[{pos:-1},{pos:-1},{pos:-1},{pos:-1}],path:getPath(c0)},
{name:n1,color:c1,bot:n1.toLowerCase()==='bot',score:0,tokens:[{pos:-1},{pos:-1},{pos:-1},{pos:-1}],path:getPath(c1)}
],
turn:0,
phase:'roll',
dice:0,
sixCount:0
};

setup.classList.add('hide');
setMsg(game.players[0].name+"'s turn - Roll dice!");
drawDice(0);
drawTokens();
updateUI();
if(game.players[0].bot)setTimeout(rollDice,800);
}

rollBtn.onclick=rollDice;
startBtn.onclick=startGame;
window.addEventListener('resize',resize);
resize();
drawDice(0);
})();
</script>
</body>
</html>`;

export const SUPERBOY_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Super Boy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#5c94fc;overflow:hidden;font-family:system-ui,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none}
#app{display:flex;flex-direction:column;height:100%}
.hud{display:flex;justify-content:space-around;padding:8px;background:#000;color:#fff;font-size:12px;font-weight:700}
.hud div{text-align:center}
.hud span{display:block;font-size:10px;color:#888}
#gameArea{flex:1;position:relative;overflow:hidden}
#game{width:100%;height:100%;display:block}
.pad{display:flex;justify-content:space-between;padding:12px;background:rgba(0,0,0,0.85)}
.btns{display:flex;gap:10px}
.b{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff}
.b:active{background:rgba(255,255,255,0.35)}
.b-a{background:#e53935;border-color:#b71c1c}
.b-b{background:#ffc107;border-color:#ff8f00}
.ov{position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:100}
.ov.h{display:none}
.ov h1{font-size:28px;color:#ffc107;margin-bottom:10px}
.ov p{color:#aaa;margin-bottom:20px}
.ov button{padding:14px 32px;font-size:16px;font-weight:700;background:#4caf50;color:#fff;border:none;border-radius:8px}
</style>
</head>
<body>
<div id="app">
<div class="hud">
<div><span>SCORE</span><div id="sc">0</div></div>
<div><span>COINS</span><div id="cn">0</div></div>
<div><span>WORLD</span><div>1-1</div></div>
<div><span>TIME</span><div id="tm">300</div></div>
</div>
<div id="gameArea"><canvas id="game"></canvas></div>
<div class="pad">
<div class="btns"><div class="b" id="L">◀</div><div class="b" id="R">▶</div></div>
<div class="btns"><div class="b b-b" id="B">B</div><div class="b b-a" id="A">A</div></div>
</div>
</div>
<div class="ov" id="st"><h1>🏃 SUPER BOY</h1><p>Collect coins & reach the flag!</p><button id="go">START</button></div>
<div class="ov h" id="ed"><h1 id="et">GAME OVER</h1><p id="em">Score: 0</p><button id="re">PLAY AGAIN</button></div>
<script>
(function(){
var C=document.getElementById('game'),X=C.getContext('2d');
var sc=document.getElementById('sc'),cn=document.getElementById('cn'),tm=document.getElementById('tm');
var st=document.getElementById('st'),ed=document.getElementById('ed'),et=document.getElementById('et'),em=document.getElementById('em');
var W,H,T=32,G=0.6,keys={l:0,r:0,j:0,b:0};
var MAP=['                                                                                    ','                                                                                    ','                                                                                    ','                    ?B?B?                                                           ','                                                                                    ','                                                                                    ','             ?                                  BBB                                 ','                                                                                    ','                                           ?   ?B?B?                                ','                              GGG                                    F              ','P          GGG       GGG          GGG               GGG    GG   GGG GGGG            ','GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'];
var p,cam,plat,qb,coins,flag,score,coinN,time,state,lt;
function resize(){var a=document.getElementById('gameArea');W=C.width=a.clientWidth;H=C.height=a.clientHeight;}
function build(){plat=[];qb=[];coins=[];flag=null;score=0;coinN=0;time=300;var sx=32,sy=H-64;for(var r=0;r<MAP.length;r++){for(var c=0;c<MAP[r].length;c++){var ch=MAP[r][c],x=c*T,y=r*T;if(ch==='G')plat.push({x:x,y:y,w:T,h:T,t:'g'});else if(ch==='B')plat.push({x:x,y:y,w:T,h:T,t:'b'});else if(ch==='?')qb.push({x:x,y:y,w:T,h:T,hit:0});else if(ch==='C')coins.push({x:x+T/2,y:y+T/2,r:10,t:0});else if(ch==='P'){sx=x;sy=y;}else if(ch==='F')flag={x:x,y:y-T*3,w:T,h:T*4};}}p={x:sx,y:sy-T,w:24,h:32,vx:0,vy:0,gr:0,d:1};cam={x:0};hud();}
function hud(){sc.textContent=score;cn.textContent=coinN;tm.textContent=Math.max(0,Math.floor(time));}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function upd(dt){if(state!=='play')return;time-=dt;if(time<=0){end(0);return;}var ac=keys.b?0.8:0.5,mx=keys.b?6:4,fr=p.gr?0.85:0.95;if(keys.l){p.vx-=ac;p.d=-1;}if(keys.r){p.vx+=ac;p.d=1;}p.vx*=fr;if(Math.abs(p.vx)<0.1)p.vx=0;p.vx=Math.max(-mx,Math.min(mx,p.vx));if(keys.j&&p.gr){p.vy=-12;p.gr=0;}p.vy+=G;if(p.vy>15)p.vy=15;p.x+=p.vx;var ww=MAP[0].length*T;p.x=Math.max(0,Math.min(ww-p.w,p.x));for(var i=0;i<plat.length;i++){var pl=plat[i];if(hit(p,pl)){if(p.vx>0)p.x=pl.x-p.w;else if(p.vx<0)p.x=pl.x+pl.w;p.vx=0;}}p.y+=p.vy;p.gr=0;for(var i=0;i<plat.length;i++){var pl=plat[i];if(hit(p,pl)){if(p.vy>0){p.y=pl.y-p.h;p.vy=0;p.gr=1;}else if(p.vy<0){p.y=pl.y+pl.h;p.vy=0;}}}for(var i=0;i<qb.length;i++){var q=qb[i];if(hit(p,q)){if(p.vy<0&&p.y>q.y){p.y=q.y+q.h;p.vy=0;if(!q.hit){q.hit=1;score+=100;coinN++;hud();}}else if(p.vy>0){p.y=q.y-p.h;p.vy=0;p.gr=1;}}}for(var i=0;i<coins.length;i++){var c=coins[i];if(!c.t){var dx=p.x+p.w/2-c.x,dy=p.y+p.h/2-c.y;if(Math.hypot(dx,dy)<c.r+16){c.t=1;coinN++;score+=200;hud();}}}if(flag&&hit(p,flag)){score+=1000;end(1);return;}if(p.y>MAP.length*T+100){end(0);return;}cam.x=Math.max(0,Math.min(ww-W,p.x-W/3));}
function end(w){state=w?'win':'over';et.textContent=w?'🎉 YOU WIN!':'💀 GAME OVER';em.textContent='Score: '+score;ed.classList.remove('h');hud();}
function draw(){var sky=X.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#5c94fc');sky.addColorStop(0.6,'#87ceeb');sky.addColorStop(1,'#90ee90');X.fillStyle=sky;X.fillRect(0,0,W,H);X.save();X.translate(-cam.x,0);for(var i=0;i<plat.length;i++){var pl=plat[i];if(pl.x+pl.w<cam.x||pl.x>cam.x+W)continue;if(pl.t==='g'){X.fillStyle='#8b4513';X.fillRect(pl.x,pl.y,pl.w,pl.h);X.fillStyle='#228b22';X.fillRect(pl.x,pl.y,pl.w,8);X.fillStyle='#654321';X.fillRect(pl.x+6,pl.y+14,4,4);X.fillRect(pl.x+20,pl.y+20,4,4);}else{X.fillStyle='#c84c0c';X.fillRect(pl.x,pl.y,pl.w,pl.h);X.strokeStyle='#8b2500';X.lineWidth=2;X.strokeRect(pl.x+2,pl.y+2,pl.w-4,pl.h-4);X.beginPath();X.moveTo(pl.x+pl.w/2,pl.y);X.lineTo(pl.x+pl.w/2,pl.y+pl.h);X.moveTo(pl.x,pl.y+pl.h/2);X.lineTo(pl.x+pl.w,pl.y+pl.h/2);X.stroke();}}for(var i=0;i<qb.length;i++){var q=qb[i];if(q.x+q.w<cam.x||q.x>cam.x+W)continue;X.fillStyle=q.hit?'#8b4513':'#ffc107';X.fillRect(q.x,q.y,q.w,q.h);X.strokeStyle=q.hit?'#654321':'#ff8f00';X.lineWidth=2;X.strokeRect(q.x+2,q.y+2,q.w-4,q.h-4);if(!q.hit){X.fillStyle='#fff';X.font='bold 18px sans-serif';X.textAlign='center';X.textBaseline='middle';X.fillText('?',q.x+q.w/2,q.y+q.h/2);}}for(var i=0;i<coins.length;i++){var c=coins[i];if(c.t||c.x<cam.x-20||c.x>cam.x+W+20)continue;X.beginPath();X.arc(c.x,c.y,c.r,0,Math.PI*2);X.fillStyle='#ffd700';X.fill();X.strokeStyle='#ffa000';X.lineWidth=2;X.stroke();X.beginPath();X.arc(c.x-3,c.y-3,3,0,Math.PI*2);X.fillStyle='#fff8dc';X.fill();}if(flag){X.fillStyle='#228b22';X.fillRect(flag.x+12,flag.y,8,flag.h);X.fillStyle='#f44336';X.beginPath();X.moveTo(flag.x+20,flag.y+5);X.lineTo(flag.x+55,flag.y+25);X.lineTo(flag.x+20,flag.y+45);X.closePath();X.fill();}if(state==='play'||state==='win'){var px=p.x,py=p.y,d=p.d;X.save();if(d<0){X.translate(px+p.w,0);X.scale(-1,1);px=0;}X.fillStyle='#e53935';X.fillRect(px+2,py,20,8);X.fillStyle='#ffccbc';X.fillRect(px+4,py+6,16,12);X.fillStyle='#333';X.fillRect(px+14,py+10,4,4);X.fillStyle='#e53935';X.fillRect(px+4,py+18,16,10);X.fillStyle='#1565c0';X.fillRect(px+4,py+26,6,8);X.fillRect(px+14,py+26,6,8);X.fillStyle='#5d4037';X.fillRect(px+2,py+32,8,4);X.fillRect(px+14,py+32,8,4);X.restore();}X.restore();}
var aid;function loop(t){var dt=(t-lt)/1000;lt=t;if(dt>0.1)dt=0.016;upd(dt);draw();hud();aid=requestAnimationFrame(loop);}
function btn(id,k){var el=document.getElementById(id);var on=function(){keys[k]=1;},off=function(){keys[k]=0;};el.addEventListener('touchstart',function(e){e.preventDefault();on();},{passive:false});el.addEventListener('touchend',function(e){e.preventDefault();off();},{passive:false});el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);}
btn('L','l');btn('R','r');btn('A','j');btn('B','b');
document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='a')keys.l=1;if(e.key==='ArrowRight'||e.key==='d')keys.r=1;if(e.key==='ArrowUp'||e.key===' '||e.key==='w')keys.j=1;if(e.key==='Shift'||e.key==='z')keys.b=1;});
document.addEventListener('keyup',function(e){if(e.key==='ArrowLeft'||e.key==='a')keys.l=0;if(e.key==='ArrowRight'||e.key==='d')keys.r=0;if(e.key==='ArrowUp'||e.key===' '||e.key==='w')keys.j=0;if(e.key==='Shift'||e.key==='z')keys.b=0;});
document.getElementById('go').onclick=function(){st.classList.add('h');state='play';build();lt=performance.now();loop(lt);};
document.getElementById('re').onclick=function(){ed.classList.add('h');state='play';build();lt=performance.now();};
window.addEventListener('resize',resize);resize();
})();
</script>
</body>
</html>`;
