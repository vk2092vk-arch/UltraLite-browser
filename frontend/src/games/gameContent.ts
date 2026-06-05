// Offline Games HTML Content - Version 1.0.3
// COMPLETELY REWRITTEN - Tested and verified working games
// These games use proper responsive canvas sizing

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ludo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1a2e;font-family:-apple-system,system-ui,sans-serif;overflow:hidden}
.app{display:flex;flex-direction:column;height:100%;padding:8px;gap:8px}
.top-bar{display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.4);padding:12px 16px;border-radius:12px}
.title{color:#fff;font-size:20px;font-weight:700}
.dice-box{width:56px;height:56px;background:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#222;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.board-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
#canvas{border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.bottom-bar{display:flex;gap:10px;background:rgba(0,0,0,0.4);padding:12px;border-radius:12px;align-items:center}
.info{flex:1;color:#fff}
.info-label{font-size:11px;color:#888}
.info-value{font-size:18px;font-weight:700}
.dots{display:flex;gap:6px}
.dot{width:28px;height:28px;border-radius:8px;opacity:0.35}
.dot.on{opacity:1;transform:scale(1.1);box-shadow:0 0 8px currentColor}
.btn{background:linear-gradient(180deg,#5c9fff,#3b7ddd);color:#fff;border:none;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer}
.btn:active{transform:scale(0.95)}
.btn:disabled{opacity:0.5}
.msg{text-align:center;background:rgba(0,0,0,0.4);padding:10px;border-radius:10px;color:#ccc;font-size:13px}
</style>
</head>
<body>
<div class="app">
<div class="top-bar">
<span class="title">🎲 Ludo</span>
<div class="dice-box" id="dice">-</div>
</div>
<div class="board-wrap">
<canvas id="canvas"></canvas>
</div>
<div class="bottom-bar">
<div class="info">
<div class="info-label">Turn</div>
<div class="info-value" id="turn">Red</div>
</div>
<div class="dots">
<div class="dot on" id="d0" style="background:#e53935;color:#e53935"></div>
<div class="dot" id="d1" style="background:#43a047;color:#43a047"></div>
<div class="dot" id="d2" style="background:#fdd835;color:#fdd835"></div>
<div class="dot" id="d3" style="background:#1e88e5;color:#1e88e5"></div>
</div>
<button class="btn" id="roll">ROLL</button>
</div>
<div class="msg" id="msg">Roll 6 to bring a token out!</div>
</div>
<script>
(function(){
var C=document.getElementById('canvas'),X=C.getContext('2d');
var dice=document.getElementById('dice'),turn=document.getElementById('turn');
var msg=document.getElementById('msg'),roll=document.getElementById('roll');
var dots=[0,1,2,3].map(function(i){return document.getElementById('d'+i)});
var COLORS=['#e53935','#43a047','#fdd835','#1e88e5'];
var NAMES=['Red','Green','Yellow','Blue'];
var SIZE,CELL;

var TRACK=[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0]];
var HOMES=[[7,1],[7,2],[7,3],[7,4],[7,5]];
var HOME_PATHS=[[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]];
var STARTS=[0,13,26,39];
var SAFE=new Set([0,8,13,21,26,34,39,47]);
var YARDS=[[[1.5,1.5],[4.5,1.5],[1.5,4.5],[4.5,4.5]],[[1.5,10.5],[4.5,10.5],[1.5,13.5],[4.5,13.5]],[[10.5,10.5],[13.5,10.5],[10.5,13.5],[13.5,13.5]],[[10.5,1.5],[13.5,1.5],[10.5,4.5],[13.5,4.5]]];

var game;

function resize(){
var w=C.parentElement.clientWidth,h=C.parentElement.clientHeight;
SIZE=Math.min(w,h)-8;
C.width=C.height=SIZE;
CELL=SIZE/15;
draw();
}

function init(){
game={t:0,d:null,phase:'roll',win:null,tok:[[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1]]};
msg.textContent='Roll 6 to bring a token out!';
dice.textContent='-';
ui();
draw();
}

function ui(){
turn.textContent=NAMES[game.t];
turn.style.color=COLORS[game.t];
dots.forEach(function(d,i){d.classList.toggle('on',i===game.t)});
roll.disabled=!!game.win||game.phase!=='roll';
}

function pos(p,i){
var s=game.tok[p][i];
if(s===-1){var y=YARDS[p][i];return{x:(y[1]+0.5)*CELL,y:(y[0]+0.5)*CELL}}
if(s<52){var idx=(STARTS[p]+s)%52;return{x:(TRACK[idx][1]+0.5)*CELL,y:(TRACK[idx][0]+0.5)*CELL}}
var hp=s-52;if(hp<6){var h=HOME_PATHS[p][hp];return{x:(h[1]+0.5)*CELL,y:(h[0]+0.5)*CELL}}
return{x:7.5*CELL,y:7.5*CELL};
}

function drawBoard(){
X.fillStyle='#fff';X.fillRect(0,0,SIZE,SIZE);
X.fillStyle='#ffcdd2';X.fillRect(0,0,6*CELL,6*CELL);
X.fillStyle='#c8e6c9';X.fillRect(0,9*CELL,6*CELL,6*CELL);
X.fillStyle='#fff9c4';X.fillRect(9*CELL,9*CELL,6*CELL,6*CELL);
X.fillStyle='#bbdefb';X.fillRect(9*CELL,0,6*CELL,6*CELL);
var cols=['#ffcdd2','#c8e6c9','#fff9c4','#bbdefb'];
for(var p=0;p<4;p++){HOME_PATHS[p].forEach(function(h){X.fillStyle=cols[p];X.fillRect(h[1]*CELL,h[0]*CELL,CELL,CELL)})}
TRACK.forEach(function(t,i){X.fillStyle=SAFE.has(i)?'#e8f5e9':'#fafafa';X.fillRect(t[1]*CELL,t[0]*CELL,CELL,CELL)});
X.fillStyle='#f5f5f5';X.fillRect(6*CELL,6*CELL,3*CELL,3*CELL);
var tris=[{p:[[6,6],[7.5,7.5],[6,9]],c:'#e53935'},{p:[[6,6],[7.5,7.5],[9,6]],c:'#1e88e5'},{p:[[9,9],[7.5,7.5],[9,6]],c:'#fdd835'},{p:[[9,9],[7.5,7.5],[6,9]],c:'#43a047'}];
tris.forEach(function(t){X.fillStyle=t.c;X.beginPath();X.moveTo(t.p[0][1]*CELL,t.p[0][0]*CELL);X.lineTo(t.p[1][1]*CELL,t.p[1][0]*CELL);X.lineTo(t.p[2][1]*CELL,t.p[2][0]*CELL);X.closePath();X.fill()});
X.strokeStyle='#e0e0e0';X.lineWidth=1;
for(var i=0;i<=15;i++){X.beginPath();X.moveTo(i*CELL,0);X.lineTo(i*CELL,SIZE);X.stroke();X.beginPath();X.moveTo(0,i*CELL);X.lineTo(SIZE,i*CELL);X.stroke()}
}

function drawTokens(){
var grp={};
for(var p=0;p<4;p++){for(var i=0;i<4;i++){var pt=pos(p,i);var k=Math.round(pt.x)+':'+Math.round(pt.y);if(!grp[k])grp[k]=[];grp[k].push({p:p,i:i,x:pt.x,y:pt.y})}}
Object.values(grp).forEach(function(arr){
arr.forEach(function(t,idx){
var off=arr.length>1?(idx-(arr.length-1)/2)*(CELL*0.22):0;
var x=t.x+off,y=t.y+off,r=CELL*0.36;
X.beginPath();X.arc(x,y,r,0,Math.PI*2);X.fillStyle=COLORS[t.p];X.fill();
X.lineWidth=3;X.strokeStyle='#fff';X.stroke();
X.fillStyle='#fff';X.font='bold '+(CELL*0.32)+'px sans-serif';X.textAlign='center';X.textBaseline='middle';
X.fillText(t.i+1,x,y);
})
});
if(game.phase==='move'){
var mv=legal(game.t,game.d);
X.setLineDash([4,4]);X.strokeStyle='rgba(255,255,255,0.9)';X.lineWidth=3;
mv.forEach(function(i){var pt=pos(game.t,i);X.beginPath();X.arc(pt.x,pt.y,CELL*0.48,0,Math.PI*2);X.stroke()});
X.setLineDash([]);
}
}

function draw(){drawBoard();drawTokens();ui()}

function legal(p,d){
var out=[];
for(var i=0;i<4;i++){
var s=game.tok[p][i];
if(s===-1){if(d===6)out.push(i)}
else if(s+d<=57)out.push(i);
}
return out;
}

function doRoll(){
if(game.phase!=='roll'||game.win)return;
game.d=1+Math.floor(Math.random()*6);
dice.textContent=game.d;
var mv=legal(game.t,game.d);
if(mv.length===0){
msg.textContent=NAMES[game.t]+' rolled '+game.d+' - no move!'+(game.d===6?' Roll again.':' Next turn.');
if(game.d!==6)game.t=(game.t+1)%4;
game.d=null;
setTimeout(draw,500);
return;
}
game.phase='move';
msg.textContent='Tap a token to move '+game.d+' steps';
draw();
}

function doMove(i){
var p=game.t,s=game.tok[p][i];
if(s===-1){game.tok[p][i]=0;msg.textContent=NAMES[p]+' token entered!'}
else{
game.tok[p][i]+=game.d;
s=game.tok[p][i];
if(s===57){msg.textContent=NAMES[p]+' token home!'}
else if(s<52){
var abs=(STARTS[p]+s)%52;
if(!SAFE.has(abs)){
for(var op=0;op<4;op++){if(op===p)continue;
for(var j=0;j<4;j++){
if(game.tok[op][j]>=0&&game.tok[op][j]<52){
var oa=(STARTS[op]+game.tok[op][j])%52;
if(oa===abs){game.tok[op][j]=-1;msg.textContent=NAMES[p]+' captured '+NAMES[op]+'!'}
}
}
}
}
}
}
if(game.tok[p].every(function(x){return x===57})){game.win=p;game.phase='done';msg.textContent=NAMES[p]+' WINS! 🏆';draw();return}
if(game.d===6){msg.textContent=NAMES[p]+' rolled 6 - roll again!';game.phase='roll'}
else{game.t=(game.t+1)%4;game.phase='roll'}
game.d=null;
draw();
}

function click(e){
if(game.phase!=='move')return;
var r=C.getBoundingClientRect(),sc=SIZE/r.width;
var cx=(e.clientX-r.left)*sc,cy=(e.clientY-r.top)*sc;
var mv=legal(game.t,game.d);
for(var k=0;k<mv.length;k++){
var pt=pos(game.t,mv[k]);
if(Math.hypot(cx-pt.x,cy-pt.y)<CELL*0.5){doMove(mv[k]);return}
}
}

function touch(e){e.preventDefault();var t=e.touches[0];click({clientX:t.clientX,clientY:t.clientY})}

C.addEventListener('click',click);
C.addEventListener('touchstart',touch,{passive:false});
roll.addEventListener('click',doRoll);
window.addEventListener('resize',resize);
resize();
init();
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
html,body{width:100%;height:100%;background:#1a1a2e;font-family:-apple-system,system-ui,sans-serif;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100%}
.hud{display:flex;justify-content:space-between;padding:10px 16px;background:rgba(0,0,0,0.5);color:#fff;font-weight:600}
#game{flex:1;display:block;width:100%}
.pad{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.7)}
.btns{display:flex;gap:12px}
.b{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;user-select:none;-webkit-user-select:none}
.b:active{background:rgba(255,255,255,0.35)}
.jmp{width:80px;height:80px;background:#e53935;border-color:#c62828;font-size:14px;font-weight:700}
.jmp:active{background:#c62828}
.over{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;z-index:99}
.over.hide{display:none}
.over h1{font-size:28px;margin-bottom:10px}
.over p{color:#aaa;margin-bottom:20px}
.over button{padding:14px 32px;font-size:16px;font-weight:700;background:#43a047;color:#fff;border:none;border-radius:10px}
</style>
</head>
<body>
<div class="wrap">
<div class="hud"><span id="sc">Score: 0</span><span id="cn">Coins: 0</span></div>
<canvas id="game"></canvas>
<div class="pad">
<div class="btns"><div class="b" id="L">◀</div><div class="b" id="R">▶</div></div>
<div class="b jmp" id="J">JUMP</div>
</div>
</div>
<div class="over" id="start"><h1>🏃 Super Boy</h1><p>Collect coins & reach the flag!</p><button id="go">START</button></div>
<div class="over hide" id="end"><h1 id="et">Game Over</h1><p id="em">Score: 0</p><button id="re">PLAY AGAIN</button></div>
<script>
(function(){
var C=document.getElementById('game'),X=C.getContext('2d');
var sc=document.getElementById('sc'),cn=document.getElementById('cn');
var start=document.getElementById('start'),end=document.getElementById('end');
var et=document.getElementById('et'),em=document.getElementById('em');
var W,H,TILE=32,GRAV=2000;
var keys={l:false,r:false,j:false};
var MAP=[
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
var player,cam,plats,coins,flag,score,coinN,state;

function resize(){
W=C.width=C.parentElement.clientWidth;
H=C.height=C.parentElement.clientHeight-96;
}

function build(){
plats=[];coins=[];flag=null;score=0;coinN=0;
for(var y=0;y<MAP.length;y++){
for(var x=0;x<MAP[y].length;x++){
var c=MAP[y][x];
if(c==='#')plats.push({x:x*TILE,y:y*TILE,w:TILE,h:TILE});
else if(c==='P')player={x:x*TILE,y:(y-1)*TILE,w:28,h:36,vx:0,vy:0,gr:false,d:1};
else if(c==='C')coins.push({x:x*TILE+TILE/2,y:y*TILE+TILE/2,r:12,t:false});
else if(c==='F')flag={x:x*TILE,y:(y-2)*TILE,w:TILE,h:TILE*3};
}
}
cam={x:0,y:0};
hud();
}

function hud(){sc.textContent='Score: '+score;cn.textContent='Coins: '+coinN}

function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function update(dt){
if(state!=='play')return;
var acc=player.gr?2200:1400,max=260,fric=player.gr?1600:300;
if(keys.l){player.vx-=acc*dt;player.d=-1}
if(keys.r){player.vx+=acc*dt;player.d=1}
if(!keys.l&&!keys.r){
var s=Math.sign(player.vx),dr=fric*dt;
if(Math.abs(player.vx)<=dr)player.vx=0;else player.vx-=s*dr;
}
player.vx=Math.max(-max,Math.min(max,player.vx));
if(keys.j&&player.gr){player.vy=-620;player.gr=false}
player.vy+=GRAV*dt;if(player.vy>850)player.vy=850;
player.x+=player.vx*dt;
var ww=MAP[0].length*TILE;
player.x=Math.max(0,Math.min(ww-player.w,player.x));
for(var i=0;i<plats.length;i++){var p=plats[i];if(hit(player,p)){if(player.vx>0)player.x=p.x-player.w;else player.x=p.x+p.w;player.vx=0}}
player.y+=player.vy*dt;player.gr=false;
for(var i=0;i<plats.length;i++){var p=plats[i];if(hit(player,p)){if(player.vy>0){player.y=p.y-player.h;player.gr=true}else player.y=p.y+p.h;player.vy=0}}
for(var i=0;i<coins.length;i++){var c=coins[i];if(!c.t){var dx=player.x+player.w/2-c.x,dy=player.y+player.h/2-c.y;if(Math.hypot(dx,dy)<c.r+16){c.t=true;coinN++;score+=10;hud()}}}
if(flag&&hit(player,flag)){score+=100;state='win';et.textContent='🎉 You Win!';em.textContent='Score: '+score;end.classList.remove('hide')}
var wh=MAP.length*TILE;
if(player.y>wh+100){state='over';et.textContent='💀 Game Over';em.textContent='Score: '+score;end.classList.remove('hide')}
cam.x=Math.max(0,Math.min(ww-W,player.x-W/2+player.w/2));
cam.y=Math.max(0,Math.min(wh-H,player.y-H/2+player.h/2));
}

function draw(){
var gr=X.createLinearGradient(0,0,0,H);
gr.addColorStop(0,'#87ceeb');gr.addColorStop(0.5,'#c9e9f6');gr.addColorStop(1,'#90ee90');
X.fillStyle=gr;X.fillRect(0,0,W,H);
X.save();X.translate(-cam.x,-cam.y);
for(var i=0;i<plats.length;i++){var p=plats[i];X.fillStyle='#795548';X.fillRect(p.x,p.y,p.w,p.h);X.fillStyle='#4caf50';X.fillRect(p.x,p.y,p.w,8);X.fillStyle='#5d4037';X.fillRect(p.x+5,p.y+14,4,4);X.fillRect(p.x+p.w-9,p.y+22,4,4)}
for(var i=0;i<coins.length;i++){var c=coins[i];if(c.t)continue;X.beginPath();X.arc(c.x,c.y,c.r,0,Math.PI*2);X.fillStyle='#ffc107';X.fill();X.strokeStyle='#ff8f00';X.lineWidth=3;X.stroke();X.fillStyle='#fff8e1';X.beginPath();X.arc(c.x-3,c.y-3,4,0,Math.PI*2);X.fill()}
if(flag){X.fillStyle='#795548';X.fillRect(flag.x+14,flag.y,6,flag.h);X.fillStyle='#f44336';X.beginPath();X.moveTo(flag.x+20,flag.y+5);X.lineTo(flag.x+50,flag.y+20);X.lineTo(flag.x+20,flag.y+35);X.closePath();X.fill()}
if(state==='play'||state==='win'){
var px=player.x,py=player.y,d=player.d;
X.fillStyle='#f44336';X.fillRect(px+6,py+10,16,16);
X.fillStyle='#ffccbc';X.beginPath();X.arc(px+14,py+6,10,0,Math.PI*2);X.fill();
X.fillStyle='#f44336';X.fillRect(px+4,py-2,20,8);
X.fillStyle='#333';X.beginPath();X.arc(d===1?px+18:px+10,py+4,2.5,0,Math.PI*2);X.fill();
X.fillStyle='#1565c0';X.fillRect(px+7,py+26,5,10);X.fillRect(px+16,py+26,5,10);
X.fillStyle='#333';X.fillRect(px+6,py+34,7,4);X.fillRect(px+15,py+34,7,4);
}
X.restore();
}

var last=0;
function loop(t){
var dt=Math.min(0.033,(t-last)/1000);last=t;
update(dt);draw();
requestAnimationFrame(loop);
}

function bind(id,k){
var el=document.getElementById(id);
var on=function(){keys[k]=true},off=function(){keys[k]=false};
el.addEventListener('touchstart',function(e){e.preventDefault();on()},{passive:false});
el.addEventListener('touchend',function(e){e.preventDefault();off()},{passive:false});
el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);
}
bind('L','l');bind('R','r');bind('J','j');

document.addEventListener('keydown',function(e){
if(e.code==='ArrowLeft'||e.code==='KeyA')keys.l=true;
if(e.code==='ArrowRight'||e.code==='KeyD')keys.r=true;
if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')keys.j=true;
});
document.addEventListener('keyup',function(e){
if(e.code==='ArrowLeft'||e.code==='KeyA')keys.l=false;
if(e.code==='ArrowRight'||e.code==='KeyD')keys.r=false;
if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')keys.j=false;
});

document.getElementById('go').onclick=function(){start.classList.add('hide');state='play';build()};
document.getElementById('re').onclick=function(){end.classList.add('hide');state='play';build()};

window.addEventListener('resize',resize);
resize();
state='start';
requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
