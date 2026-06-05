// Offline Games - Premium Ludo Game
// Version 1.0.3 - Ultra Ludo Champs Style

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>Ultra Ludo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(180deg,#d4a574 0%,#c49a6c 50%,#b8906a 100%);touch-action:manipulation;-webkit-user-select:none;user-select:none}
.game{display:flex;flex-direction:column;height:100%;max-width:500px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px}
.title{font-size:20px;font-weight:900;text-shadow:2px 2px 4px rgba(0,0,0,0.3)}
.title span:nth-child(1){color:#ff6b6b}
.title span:nth-child(2){color:#4ecdc4}
.title span:nth-child(3){color:#ffe66d}
.title span:nth-child(4){color:#95e1d3}
.players-top{display:flex;justify-content:space-between;padding:0 12px}
.player-info{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.3);padding:6px 10px;border-radius:10px}
.player-info.left{flex-direction:row}
.player-info.right{flex-direction:row-reverse}
.avatar{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px}
.avatar.red{background:linear-gradient(180deg,#ff6b6b,#ee5a5a)}
.avatar.green{background:linear-gradient(180deg,#51cf66,#40c057)}
.avatar.yellow{background:linear-gradient(180deg,#ffd43b,#fab005)}
.avatar.blue{background:linear-gradient(180deg,#4dabf7,#339af0)}
.pname{color:#fff;font-size:11px;font-weight:600}
.pscore{display:flex;align-items:center;gap:3px;color:#ffd43b;font-size:12px;font-weight:700}
.board-area{flex:1;display:flex;align-items:center;justify-content:center;padding:8px}
.board{position:relative;background:#f8f4e8;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3),inset 0 2px 4px rgba(255,255,255,0.5);overflow:hidden}
.board-grid{display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);width:100%;height:100%}
.cell{border:0.5px solid rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;position:relative;font-size:6px;color:rgba(0,0,0,0.2)}
.home-red{background:#ff6b6b}
.home-green{background:#51cf66}
.home-yellow{background:#ffd43b}
.home-blue{background:#4dabf7}
.path-red{background:#ffdedb}
.path-green{background:#d3f9d8}
.path-yellow{background:#fff3bf}
.path-blue{background:#d0ebff}
.safe{position:relative}
.safe::after{content:"★";position:absolute;color:#ffd43b;font-size:10px;text-shadow:0 1px 2px rgba(0,0,0,0.3)}
.center-home{grid-column:7/10;grid-row:7/10;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;background:#f8f4e8}
.tri{clip-path:polygon(50% 50%,0 0,100% 0)}
.tri-r{background:linear-gradient(180deg,#ff6b6b,#ee5a5a);clip-path:polygon(0 0,100% 0,50% 100%)}
.tri-g{background:linear-gradient(180deg,#51cf66,#40c057);clip-path:polygon(0 0,50% 100%,0 100%)}
.tri-y{background:linear-gradient(180deg,#ffd43b,#fab005);clip-path:polygon(100% 0,100% 100%,50% 100%)}
.tri-b{background:linear-gradient(180deg,#4dabf7,#339af0);clip-path:polygon(0 100%,50% 0,100% 100%)}
.base{position:absolute;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4%;padding:12%;border-radius:8px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.2)}
.base-red{top:0;left:0;width:40%;height:40%;background:#ff6b6b;border:3px solid #e03e3e}
.base-green{top:0;right:0;width:40%;height:40%;background:#51cf66;border:3px solid #2f9e44}
.base-yellow{bottom:0;right:0;width:40%;height:40%;background:#ffd43b;border:3px solid #e67700}
.base-blue{bottom:0;left:0;width:40%;height:40%;background:#4dabf7;border:3px solid #1c7ed6}
.base-inner{background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 4px rgba(0,0,0,0.2)}
.token{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;transform:translate(-50%,-50%);cursor:pointer;transition:all 0.2s;z-index:10}
.token::before{content:"";position:absolute;top:15%;left:25%;width:30%;height:25%;background:rgba(255,255,255,0.5);border-radius:50%}
.token.red{background:linear-gradient(180deg,#ff6b6b 0%,#c92a2a 100%);box-shadow:0 4px 8px rgba(0,0,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.green{background:linear-gradient(180deg,#51cf66 0%,#2f9e44 100%);box-shadow:0 4px 8px rgba(0,0,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.yellow{background:linear-gradient(180deg,#ffd43b 0%,#e67700 100%);box-shadow:0 4px 8px rgba(0,0,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.blue{background:linear-gradient(180deg,#4dabf7 0%,#1c7ed6 100%);box-shadow:0 4px 8px rgba(0,0,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.highlight{animation:glow 0.5s infinite alternate;cursor:pointer}
@keyframes glow{from{box-shadow:0 0 5px #fff,0 0 10px #fff}to{box-shadow:0 0 10px #fff,0 0 20px #fff,0 0 30px #fff}}
.tokens-layer{position:absolute;inset:0;pointer-events:none}
.tokens-layer .token{pointer-events:auto}
.players-bottom{display:flex;justify-content:space-between;padding:0 12px}
.controls{padding:10px 12px}
.dice-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px}
.dice-3d{width:60px;height:60px;background:linear-gradient(145deg,#ffffff,#e6e6e6);border-radius:12px;box-shadow:0 6px 12px rgba(0,0,0,0.3),inset 0 2px 4px rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center}
.dice-3d svg{width:50px;height:50px}
.roll-btn{flex:1;background:linear-gradient(180deg,#ffd43b,#fab005);color:#000;border:none;padding:14px 20px;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;gap:8px}
.roll-btn:disabled{opacity:0.5;cursor:not-allowed}
.roll-btn:active:not(:disabled){transform:scale(0.98)}
.turn-bar{display:flex;align-items:center;justify-content:center;gap:8px;padding:8px;background:rgba(0,0,0,0.2);border-radius:20px}
.turn-indicator{height:6px;flex:1;border-radius:3px;background:rgba(255,255,255,0.3)}
.turn-indicator.active{background:linear-gradient(90deg,#ff6b6b,#ee5a5a)}
.turn-text{color:#fff;font-size:13px;font-weight:700}
.footer{display:flex;justify-content:space-around;padding:8px 12px;background:rgba(0,0,0,0.2)}
.foot-btn{width:50px;height:50px;border-radius:12px;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;font-weight:600;cursor:pointer}
.foot-btn.menu{background:linear-gradient(180deg,#4dabf7,#339af0);color:#fff}
.foot-btn.settings{background:linear-gradient(180deg,#51cf66,#40c057);color:#fff}
.foot-btn.exit{background:linear-gradient(180deg,#ff6b6b,#ee5a5a);color:#fff}
.setup{position:fixed;inset:0;background:linear-gradient(180deg,#d4a574,#b8906a);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;z-index:100}
.setup.hide{display:none}
.setup-title{font-size:32px;font-weight:900;margin-bottom:20px;text-align:center}
.setup-title span:nth-child(1){color:#ff6b6b}
.setup-title span:nth-child(2){color:#4ecdc4}
.setup-title span:nth-child(3){color:#ffe66d}
.setup-title span:nth-child(4){color:#95e1d3}
.setup-box{background:rgba(255,255,255,0.9);padding:20px;border-radius:16px;width:100%;max-width:320px}
.setup-label{font-size:14px;font-weight:600;margin-bottom:8px;color:#333}
.setup-select{width:100%;padding:12px;border-radius:8px;border:2px solid #ddd;font-size:14px;margin-bottom:16px}
.setup-start{width:100%;padding:14px;background:linear-gradient(180deg,#51cf66,#40c057);color:#fff;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<div class="game">
<div class="header">
<div class="title"><span>U</span><span>L</span><span>T</span><span>R</span><span>A</span> LUDO</div>
</div>
<div class="players-top">
<div class="player-info left" id="p0info" style="display:none"><div class="avatar red">🎮</div><div><div class="pname" id="p0name">Red</div><div class="pscore">⭐<span id="p0score">0</span></div></div></div>
<div class="player-info right" id="p1info" style="display:none"><div class="avatar green">🎮</div><div><div class="pname" id="p1name">Green</div><div class="pscore">⭐<span id="p1score">0</span></div></div></div>
</div>
<div class="board-area">
<div class="board" id="board">
<div class="board-grid" id="grid"></div>
<div class="tokens-layer" id="tokens"></div>
</div>
</div>
<div class="players-bottom">
<div class="player-info left" id="p2info" style="display:none"><div class="avatar blue">🎮</div><div><div class="pname" id="p2name">Blue</div><div class="pscore">⭐<span id="p2score">0</span></div></div></div>
<div class="player-info right" id="p3info" style="display:none"><div class="avatar yellow">🎮</div><div><div class="pname" id="p3name">Yellow</div><div class="pscore">⭐<span id="p3score">0</span></div></div></div>
</div>
<div class="controls">
<div class="dice-row">
<div class="dice-3d" id="dice"><svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="10" fill="#fff"/><circle cx="50" cy="50" r="8" fill="#333"/></svg></div>
<button class="roll-btn" id="rollBtn" disabled>🎲 TAP TO ROLL DICE</button>
</div>
<div class="turn-bar">
<div class="turn-indicator" id="ti0"></div>
<div class="turn-indicator" id="ti1"></div>
<div class="turn-indicator" id="ti2"></div>
<div class="turn-indicator" id="ti3"></div>
<div class="turn-text" id="turnText">Starting...</div>
</div>
</div>
</div>

<div class="setup" id="setup">
<div class="setup-title"><span>U</span><span>L</span><span>T</span><span>R</span><span>A</span> LUDO</div>
<div class="setup-box">
<div class="setup-label">Number of Players</div>
<select class="setup-select" id="numPlayers">
<option value="2">2 Players</option>
<option value="4">4 Players</option>
</select>
<div class="setup-label">Your Color</div>
<select class="setup-select" id="yourColor">
<option value="red">🔴 Red</option>
<option value="green">🟢 Green</option>
<option value="yellow">🟡 Yellow</option>
<option value="blue">🔵 Blue</option>
</select>
<button class="setup-start" id="startBtn">START GAME</button>
</div>
</div>

<script>
(function(){
var COLORS=['red','green','yellow','blue'];
var COLOR_HEX={red:'#ff6b6b',green:'#51cf66',yellow:'#ffd43b',blue:'#4dabf7'};
var board=document.getElementById('board');
var grid=document.getElementById('grid');
var tokensEl=document.getElementById('tokens');
var dice=document.getElementById('dice');
var rollBtn=document.getElementById('rollBtn');
var turnText=document.getElementById('turnText');
var setup=document.getElementById('setup');
var startBtn=document.getElementById('startBtn');

var SIZE,CELL;
var game=null;

// Board cell types: 0=empty, 1=path, r/g/y/b=colored path, s=safe
var BOARD=[
['hr','hr','hr','hr','hr','hr','0','0','0','hg','hg','hg','hg','hg','hg'],
['hr','hr','hr','hr','hr','hr','0','pg','0','hg','hg','hg','hg','hg','hg'],
['hr','hr','hr','hr','hr','hr','s','pg','0','hg','hg','hg','hg','hg','hg'],
['hr','hr','hr','hr','hr','hr','0','pg','0','hg','hg','hg','hg','hg','hg'],
['hr','hr','hr','hr','hr','hr','0','pg','0','hg','hg','hg','hg','hg','hg'],
['hr','hr','hr','hr','hr','hr','0','pg','s','hg','hg','hg','hg','hg','hg'],
['0','s','0','0','0','0','c','c','c','0','0','0','0','0','0'],
['pr','pr','pr','pr','pr','pr','c','c','c','py','py','py','py','py','s'],
['0','0','0','0','0','s','c','c','c','0','0','0','0','0','0'],
['hb','hb','hb','hb','hb','hb','s','pb','0','hy','hy','hy','hy','hy','hy'],
['hb','hb','hb','hb','hb','hb','0','pb','0','hy','hy','hy','hy','hy','hy'],
['hb','hb','hb','hb','hb','hb','0','pb','0','hy','hy','hy','hy','hy','hy'],
['hb','hb','hb','hb','hb','hb','0','pb','s','hy','hy','hy','hy','hy','hy'],
['hb','hb','hb','hb','hb','hb','0','pb','0','hy','hy','hy','hy','hy','hy'],
['hb','hb','hb','hb','hb','hb','0','0','0','hy','hy','hy','hy','hy','hy']
];

// Track positions [row,col] for 52 squares
var TRACK=[
[6,1],[5,1],[4,1],[3,1],[2,1],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6],
[6,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],
[9,6],[10,6],[11,6],[12,6],[13,6],[13,7],[13,8],[13,9],[13,10],[13,11],[13,12],[13,13],[13,14],[12,14],[11,14],[10,14],[9,14],[8,14],[8,13],[8,12],[8,11],[8,10]
];

// Corrected track - 52 squares clockwise from red start
var PATH=[
[6,1],[5,1],[4,1],[3,1],[2,1],[1,1],
[0,2],[0,3],[0,4],[0,5],[0,6],
[1,6],[2,6],[3,6],[4,6],[5,6],
[6,7],[6,8],
[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
[0,9],[0,10],[0,11],[0,12],[0,13],
[1,13],[2,13],[3,13],[4,13],[5,13],
[6,14],[7,14],[8,14],
[8,13],[8,12],[8,11],[8,10],[8,9],
[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
[14,7],[14,6],
[13,6],[12,6],[11,6],[10,6],[9,6]
];

// Simplified path
var TRACK_POS=[];
// Row 6, cols 1-0
for(var c=1;c>=0;c--)TRACK_POS.push([6,c]);
// Col 0, rows 5-0
for(var r=5;r>=0;r--)TRACK_POS.push([r,0]);
// Row 0, cols 1-5
for(var c=1;c<=5;c++)TRACK_POS.push([0,c]);
// Col 6, rows 0-5
for(var r=0;r<=5;r++)TRACK_POS.push([r,6]);
// Row 6, cols 7-8
TRACK_POS.push([6,7],[6,8]);
// Col 8, rows 5-0
for(var r=5;r>=0;r--)TRACK_POS.push([r,8]);
// Row 0, cols 9-14
for(var c=9;c<=14;c++)TRACK_POS.push([0,c]);
// Col 14, rows 1-6
for(var r=1;r<=6;r++)TRACK_POS.push([r,14]);
// Row 6 col 14 already done, row 7-8
TRACK_POS.push([7,14],[8,14]);
// Col 14, rows 9-14
for(var r=9;r<=14;r++)TRACK_POS.push([r,14]);
// Row 14, cols 13-9
for(var c=13;c>=9;c--)TRACK_POS.push([14,c]);
// Col 8, rows 14-9
for(var r=14;r>=9;r--)TRACK_POS.push([r,8]);
// Row 8, cols 7-6
TRACK_POS.push([8,7],[8,6]);
// Col 6, rows 9-14
for(var r=9;r<=14;r++)TRACK_POS.push([r,6]);
// Row 14, cols 5-1
for(var c=5;c>=1;c--)TRACK_POS.push([14,c]);
// Col 0, rows 14-8
for(var r=14;r>=8;r--)TRACK_POS.push([r,0]);
// Row 8, cols 1-5
for(var c=1;c<=5;c++)TRACK_POS.push([8,c]);

// Simplified 52 position track
var TR=[];
// Start from red (row 6, going up left side)
TR.push([6,1],[6,0]);
for(var r=5;r>=0;r--)TR.push([r,0]);
TR.push([0,1],[0,2],[0,3],[0,4],[0,5]);
for(var r=0;r<=5;r++)TR.push([r,6]);
TR.push([6,7],[6,8]);
for(var r=5;r>=0;r--)TR.push([r,8]);
TR.push([0,9],[0,10],[0,11],[0,12],[0,13],[0,14]);
for(var r=1;r<=6;r++)TR.push([r,14]);
TR.push([7,14],[8,14]);
for(var r=9;r<=14;r++)TR.push([r,14]);
TR.push([14,13],[14,12],[14,11],[14,10],[14,9]);
for(var r=14;r>=9;r--)TR.push([r,8]);
TR.push([8,7],[8,6]);
for(var r=9;r<=14;r++)TR.push([r,6]);
TR.push([14,5],[14,4],[14,3],[14,2],[14,1],[14,0]);
for(var r=13;r>=8;r--)TR.push([r,0]);
TR.push([8,1],[8,2],[8,3],[8,4],[8,5]);
TR=TR.slice(0,52);

// Home paths
var HOME={
red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};

// Starting positions
var START={red:0,green:13,blue:26,yellow:39};

// Base positions (4 tokens each)
var BASE={
red:[[2,2],[2,4],[4,2],[4,4]],
green:[[2,10],[2,12],[4,10],[4,12]],
blue:[[10,2],[10,4],[12,2],[12,4]],
yellow:[[10,10],[10,12],[12,10],[12,12]]
};

// Safe positions on track
var SAFE=[0,8,13,21,26,34,39,47];

function resize(){
var area=document.querySelector('.board-area');
SIZE=Math.min(area.clientWidth,area.clientHeight)-16;
SIZE=Math.min(SIZE,380);
board.style.width=SIZE+'px';
board.style.height=SIZE+'px';
CELL=SIZE/15;
if(game)drawTokens();
}

function buildBoard(){
grid.innerHTML='';
for(var r=0;r<15;r++){
for(var c=0;c<15;c++){
var cell=document.createElement('div');
cell.className='cell';
cell.dataset.r=r;
cell.dataset.c=c;
var t=BOARD[r][c];
if(t==='hr')cell.classList.add('home-red');
else if(t==='hg')cell.classList.add('home-green');
else if(t==='hy')cell.classList.add('home-yellow');
else if(t==='hb')cell.classList.add('home-blue');
else if(t==='pr')cell.classList.add('path-red');
else if(t==='pg')cell.classList.add('path-green');
else if(t==='py')cell.classList.add('path-yellow');
else if(t==='pb')cell.classList.add('path-blue');
else if(t==='s')cell.classList.add('safe');
else if(t==='c'){
// Center
if(r===6&&c===7)cell.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(135deg,#ff6b6b 50%,transparent 50%)"></div>';
else if(r===6&&c===8)cell.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(225deg,#51cf66 50%,transparent 50%)"></div>';
else if(r===7&&c===7)cell.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(45deg,#4dabf7 50%,transparent 50%)"></div>';
else if(r===7&&c===8)cell.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(315deg,#ffd43b 50%,transparent 50%)"></div>';
else if(r===8&&c===7)cell.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(45deg,transparent 50%,#4dabf7 50%)"></div>';
else if(r===8&&c===8)cell.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(135deg,transparent 50%,#ffd43b 50%)"></div>';
}
grid.appendChild(cell);
}
}
}

function getPath(color){
var s=START[color];
var path=[];
for(var i=0;i<52;i++){
path.push((s+i)%52);
}
return path;
}

function getXY(pos,color,tokenIdx){
if(pos===-1){
var b=BASE[color][tokenIdx];
return{x:(b[1]+0.5)/15*100,y:(b[0]+0.5)/15*100};
}
if(pos>=52){
var hi=pos-52;
if(hi<6){
var h=HOME[color][hi];
return{x:(h[1]+0.5)/15*100,y:(h[0]+0.5)/15*100};
}
return{x:50,y:50};
}
var idx=getPath(color)[pos];
var t=TR[idx];
if(!t)return{x:50,y:50};
return{x:(t[1]+0.5)/15*100,y:(t[0]+0.5)/15*100};
}

function drawDice(n){
var dots={
1:[[50,50]],
2:[[30,30],[70,70]],
3:[[30,30],[50,50],[70,70]],
4:[[30,30],[70,30],[30,70],[70,70]],
5:[[30,30],[70,30],[50,50],[30,70],[70,70]],
6:[[30,25],[70,25],[30,50],[70,50],[30,75],[70,75]]
};
var svg='<rect x="5" y="5" width="90" height="90" rx="12" fill="#fff" stroke="#ddd" stroke-width="2"/>';
if(n>0&&dots[n]){
dots[n].forEach(function(d){
svg+='<circle cx="'+d[0]+'" cy="'+d[1]+'" r="9" fill="#333"/>';
});
}
dice.innerHTML='<svg viewBox="0 0 100 100">'+svg+'</svg>';
}

function drawTokens(){
tokensEl.innerHTML='';
if(!game)return;
var tsize=CELL*0.7;
game.players.forEach(function(p){
p.tokens.forEach(function(t,i){
var el=document.createElement('div');
el.className='token '+p.color;
el.style.width=tsize+'px';
el.style.height=tsize+'px';
el.style.fontSize=(tsize*0.4)+'px';
var xy=getXY(t.pos,p.color,i);
el.style.left=xy.x+'%';
el.style.top=xy.y+'%';
if(t.canMove){
el.classList.add('highlight');
el.onclick=function(){moveToken(p,i);};
}
tokensEl.appendChild(el);
});
});
}

function updateUI(){
if(!game)return;
var cp=game.players[game.turn];
turnText.textContent=cp.name+"'s Turn";
turnText.style.color=COLOR_HEX[cp.color];
document.querySelectorAll('.turn-indicator').forEach(function(ti,i){
ti.classList.remove('active');
ti.style.background='rgba(255,255,255,0.3)';
});
var ti=document.getElementById('ti'+game.turn);
if(ti){
ti.classList.add('active');
ti.style.background=COLOR_HEX[cp.color];
}
rollBtn.disabled=game.phase!=='roll'||cp.bot;
game.players.forEach(function(p,i){
var info=document.getElementById('p'+i+'info');
if(info)info.style.display='flex';
var scoreEl=document.getElementById('p'+i+'score');
if(scoreEl)scoreEl.textContent=p.score;
var nameEl=document.getElementById('p'+i+'name');
if(nameEl)nameEl.textContent=p.name;
var av=info?info.querySelector('.avatar'):null;
if(av){av.className='avatar '+p.color;}
});
}

// Sound & Vibration Functions
var audioCtx=null;
function getAudioCtx(){
if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
return audioCtx;
}
function playSound(freq,duration,type){
try{
var ctx=getAudioCtx();
var osc=ctx.createOscillator();
var gain=ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.value=freq;
osc.type=type||'sine';
gain.gain.setValueAtTime(0.3,ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+duration);
osc.start(ctx.currentTime);
osc.stop(ctx.currentTime+duration);
}catch(e){}
}
function playDiceSound(){
playSound(200,0.05,'square');
setTimeout(function(){playSound(250,0.05,'square');},50);
setTimeout(function(){playSound(300,0.05,'square');},100);
setTimeout(function(){playSound(400,0.1,'sine');},150);
}
function playMoveSound(){
playSound(600,0.08,'sine');
}
function playCaptureSound(){
playSound(150,0.15,'sawtooth');
setTimeout(function(){playSound(100,0.2,'sawtooth');},100);
}
function playWinSound(){
[0,100,200,300,400].forEach(function(d,i){
setTimeout(function(){playSound(400+i*100,0.15,'sine');},d);
});
}
function vibrate(pattern){
try{
if(navigator.vibrate)navigator.vibrate(pattern);
}catch(e){}
}

function rollDice(){
if(game.phase!=='roll')return;
playDiceSound();
game.dice=Math.floor(Math.random()*6)+1;
drawDice(game.dice);
game.sixCount=game.dice===6?game.sixCount+1:0;
checkMoves();
}

function checkMoves(){
var p=game.players[game.turn];
var hasMoves=false;
p.tokens.forEach(function(t){
t.canMove=false;
if(t.pos>=57)return;
if(t.pos===-1&&game.dice===6){t.canMove=true;hasMoves=true;}
else if(t.pos>=0&&t.pos+game.dice<=57){t.canMove=true;hasMoves=true;}
});
drawTokens();
if(!hasMoves){
setTimeout(nextTurn,600);
}else{
game.phase='move';
if(p.bot)setTimeout(function(){botMove(p);},500);
}
}

function moveToken(player,idx){
var token=player.tokens[idx];
if(!token.canMove)return;
player.tokens.forEach(function(t){t.canMove=false;});
game.phase='moving';

var oldPos=token.pos;
var steps=game.dice;
var captured=false;

if(token.pos===-1){
token.pos=0;
playMoveSound();
}else{
// Animate step by step
var currentStep=0;
function animateStep(){
if(currentStep<steps){
token.pos=oldPos+currentStep+1;
playMoveSound();
drawTokens();
currentStep++;
setTimeout(animateStep,150);
}else{
// Check capture after animation
if(token.pos>=0&&token.pos<52){
var trackIdx=getPath(player.color)[token.pos];
if(SAFE.indexOf(trackIdx)===-1){
game.players.forEach(function(op){
if(op===player)return;
op.tokens.forEach(function(ot){
if(ot.pos>=0&&ot.pos<52){
var otIdx=getPath(op.color)[ot.pos];
if(otIdx===trackIdx){
ot.pos=-1;
captured=true;
playCaptureSound();
vibrate([100,50,100,50,200]);
}
}
});
});
}
}
finishMove();
}
}
animateStep();
return;
}

// For tokens coming out of base
if(token.pos>=0&&token.pos<52){
var trackIdx=getPath(player.color)[token.pos];
if(SAFE.indexOf(trackIdx)===-1){
game.players.forEach(function(op){
if(op===player)return;
op.tokens.forEach(function(ot){
if(ot.pos>=0&&ot.pos<52){
var otIdx=getPath(op.color)[ot.pos];
if(otIdx===trackIdx){
ot.pos=-1;
captured=true;
playCaptureSound();
vibrate([100,50,100,50,200]);
}
}
});
});
}
}

finishMove();

function finishMove(){
if(token.pos>=57){
player.score++;
playWinSound();
if(player.score>=4){
game.phase='won';
turnText.textContent=player.name+' WINS! 🎉';
vibrate([200,100,200,100,400]);
drawTokens();
updateUI();
return;
}
}

drawTokens();
if(game.dice===6&&game.sixCount<3){
game.phase='roll';
updateUI();
if(player.bot)setTimeout(rollDice,500);
}else{
nextTurn();
}
}
}

function nextTurn(){
game.turn=(game.turn+1)%game.players.length;
game.phase='roll';
game.sixCount=0;
updateUI();
drawDice(0);
var p=game.players[game.turn];
if(p.bot)setTimeout(rollDice,700);
}

function botMove(player){
var movable=[];
player.tokens.forEach(function(t,i){if(t.canMove)movable.push(i);});
if(movable.length>0){
var pick=movable[Math.floor(Math.random()*movable.length)];
moveToken(player,pick);
}
}

function startGame(){
var num=parseInt(document.getElementById('numPlayers').value);
var yourColor=document.getElementById('yourColor').value;
var colors=[yourColor];
var allColors=['red','green','yellow','blue'];
allColors.forEach(function(c){if(c!==yourColor&&colors.length<num)colors.push(c);});

game={
players:colors.map(function(c,i){
return{
name:i===0?'You':'Bot '+(i),
color:c,
bot:i>0,
score:0,
tokens:[{pos:-1},{pos:-1},{pos:-1},{pos:-1}]
};
}),
turn:0,
phase:'roll',
dice:0,
sixCount:0
};

setup.classList.add('hide');
buildBoard();
drawDice(0);
drawTokens();
updateUI();
}

rollBtn.onclick=rollDice;
startBtn.onclick=startGame;
window.addEventListener('resize',resize);
resize();
buildBoard();
drawDice(1);
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
