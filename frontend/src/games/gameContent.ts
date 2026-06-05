// Ultra Ludo Champs - Exact UI Recreation
// Version 1.0.3

export const LUDO_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>Ultra Ludo Champs</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;touch-action:manipulation;-webkit-user-select:none;user-select:none}
body{background:linear-gradient(180deg,#e8d4b8 0%,#d4b896 50%,#c9a882 100%)}
.game-container{display:flex;flex-direction:column;height:100%;max-width:420px;margin:0 auto;position:relative}

/* Header */
.header{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 12px}
.title-area{text-align:center;flex:1}
.title{font-size:11px;font-weight:800;color:#4a90d9;text-shadow:1px 1px 0 #fff;letter-spacing:1px}
.title-main{font-size:26px;font-weight:900;line-height:1;margin:-2px 0}
.title-main span:nth-child(1){color:#ff6b6b;text-shadow:2px 2px 0 #c0392b}
.title-main span:nth-child(2){color:#f39c12;text-shadow:2px 2px 0 #d68910}
.title-main span:nth-child(3){color:#9b59b6;text-shadow:2px 2px 0 #7d3c98}
.title-main span:nth-child(4){color:#3498db;text-shadow:2px 2px 0 #2874a6}
.title-sub{font-size:10px;font-weight:800;color:#e74c3c;letter-spacing:2px}
.trophy{font-size:20px;position:relative;top:-5px}
.settings-btn{width:36px;height:36px;background:linear-gradient(180deg,#5dade2,#3498db);border-radius:10px;border:none;color:#fff;font-size:18px;box-shadow:0 3px 6px rgba(0,0,0,0.3)}

/* Player Info Cards */
.players-row{display:flex;justify-content:space-between;padding:0 8px;margin-bottom:6px}
.player-card{display:flex;align-items:center;gap:6px;padding:4px 8px;background:rgba(0,0,0,0.15);border-radius:10px;min-width:90px}
.player-card.right{flex-direction:row-reverse}
.player-avatar{width:40px;height:40px;border-radius:8px;border:3px solid;display:flex;align-items:center;justify-content:center;font-size:24px;background:linear-gradient(180deg,#f5f5f5,#ddd)}
.player-avatar.red{border-color:#e74c3c}
.player-avatar.green{border-color:#27ae60}
.player-avatar.blue{border-color:#3498db}
.player-avatar.yellow{border-color:#f1c40f}
.player-info{text-align:left}
.player-card.right .player-info{text-align:right}
.player-name{font-size:11px;font-weight:700;color:#2c3e50}
.player-coins{font-size:10px;color:#27ae60;font-weight:600}
.player-coins::before{content:"🪙 "}
.online-badge{font-size:8px;color:#27ae60;font-weight:600}
.turn-arrow{color:#e74c3c;font-size:14px;margin-left:4px}

/* Board Area */
.board-wrapper{flex:1;display:flex;align-items:center;justify-content:center;padding:4px 8px;position:relative}
.board{position:relative;background:#f5f0e6;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.25),inset 0 0 10px rgba(0,0,0,0.1);overflow:hidden;aspect-ratio:1}
.board-inner{display:grid;grid-template-columns:6fr 3fr 6fr;grid-template-rows:6fr 3fr 6fr;width:100%;height:100%}

/* Quadrants */
.quadrant{position:relative}
.q-red{background:#e74c3c}
.q-green{background:#27ae60}
.q-yellow{background:#f1c40f}
.q-blue{background:#3498db}

/* Home Bases */
.home-base{position:absolute;top:12%;left:12%;width:76%;height:76%;background:#fff;border-radius:6px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8%;padding:8%;border:3px solid rgba(0,0,0,0.2)}
.token-spot{border-radius:50%;display:flex;align-items:center;justify-content:center}
.q-red .token-spot{background:#ffcdd2;border:2px solid #c0392b}
.q-green .token-spot{background:#c8e6c9;border:2px solid #1e8449}
.q-yellow .token-spot{background:#fff9c4;border:2px solid #d4ac0d}
.q-blue .token-spot{background:#bbdefb;border:2px solid #2471a3}

/* Track */
.track{display:grid;background:#f5f0e6}
.track-v{grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,1fr)}
.track-h{grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(3,1fr)}
.cell{border:1px solid #d5c4a1;background:#f5f0e6;position:relative}
.cell.path-red{background:#ffcdd2}
.cell.path-green{background:#c8e6c9}
.cell.path-yellow{background:#fff9c4}
.cell.path-blue{background:#bbdefb}
.cell.safe{background:#f5f0e6}
.cell.safe::after{content:"★";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#f39c12;font-size:10px}
.cell.start-red{background:#e74c3c}
.cell.start-green{background:#27ae60}
.cell.start-yellow{background:#f1c40f}
.cell.start-blue{background:#3498db}

/* Center */
.center{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;background:#f5f0e6;position:relative}
.tri{width:100%;height:100%}
.tri-red{background:linear-gradient(135deg,#e74c3c 50%,transparent 50%)}
.tri-green{background:linear-gradient(225deg,#27ae60 50%,transparent 50%)}
.tri-yellow{background:linear-gradient(315deg,#f1c40f 50%,transparent 50%)}
.tri-blue{background:linear-gradient(45deg,#3498db 50%,transparent 50%)}
.center-timer{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}

/* Corner Numbers */
.corner-num{position:absolute;font-size:10px;font-weight:700;color:#888}
.corner-1{top:40%;left:41%}
.corner-2{top:40%;right:41%}
.corner-3{bottom:40%;left:41%}
.corner-4{bottom:40%;right:41%}

/* Tokens Layer */
.tokens-layer{position:absolute;inset:0;pointer-events:none}
.token{position:absolute;border-radius:50%;transform:translate(-50%,-50%);cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.token::before{content:"";position:absolute;top:15%;left:20%;width:40%;height:30%;background:rgba(255,255,255,0.6);border-radius:50%}
.token::after{content:"";position:absolute;bottom:10%;width:60%;height:20%;background:rgba(0,0,0,0.2);border-radius:50%}
.token.red{background:linear-gradient(180deg,#ff6b6b 0%,#c0392b 100%);box-shadow:0 3px 6px rgba(0,0,0,0.4)}
.token.green{background:linear-gradient(180deg,#58d68d 0%,#1e8449 100%);box-shadow:0 3px 6px rgba(0,0,0,0.4)}
.token.yellow{background:linear-gradient(180deg,#f7dc6f 0%,#d4ac0d 100%);box-shadow:0 3px 6px rgba(0,0,0,0.4)}
.token.blue{background:linear-gradient(180deg,#5dade2 0%,#2471a3 100%);box-shadow:0 3px 6px rgba(0,0,0,0.4)}
.token.highlight{animation:token-glow 0.5s infinite alternate}
@keyframes token-glow{from{box-shadow:0 0 5px #fff,0 0 10px #fff}to{box-shadow:0 0 15px #fff,0 0 25px #fff}}

/* Controls */
.controls{padding:8px 12px}
.dice-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px}
.dice-3d{width:60px;height:60px;background:linear-gradient(145deg,#ffffff,#e0e0e0);border-radius:12px;box-shadow:0 6px 15px rgba(0,0,0,0.3),inset 0 -3px 6px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;position:relative}
.dice-3d::before{content:"";position:absolute;top:5px;left:10%;width:80%;height:30%;background:linear-gradient(180deg,rgba(255,255,255,0.8),transparent);border-radius:8px 8px 50% 50%}
.dice-inner{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:3px;padding:12px}
.dot{width:8px;height:8px;border-radius:50%;background:#1a1a1a}
.dot.hide{visibility:hidden}
.roll-btn{background:linear-gradient(180deg,#f4d03f,#d4ac0d);color:#000;border:none;padding:12px 20px;border-radius:25px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 8px rgba(0,0,0,0.3);text-transform:uppercase;letter-spacing:1px}
.roll-btn:disabled{opacity:0.6;cursor:not-allowed}
.roll-btn:active:not(:disabled){transform:scale(0.98)}

/* Turn Bar */
.turn-bar{display:flex;align-items:center;background:#2c3e50;border-radius:20px;padding:6px 12px;margin-bottom:8px}
.turn-indicator{height:4px;width:30px;border-radius:2px;margin-right:10px}
.turn-indicator.red{background:#e74c3c}
.turn-indicator.green{background:#27ae60}
.turn-indicator.yellow{background:#f1c40f}
.turn-indicator.blue{background:#3498db}
.turn-text{color:#fff;font-size:12px;font-weight:600;flex:1;text-align:center}

/* Footer */
.footer{display:flex;justify-content:space-around;padding:8px 12px 12px;background:linear-gradient(180deg,transparent,rgba(0,0,0,0.1))}
.foot-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;border-radius:12px;border:none;font-size:9px;font-weight:700;cursor:pointer}
.foot-btn.menu{background:linear-gradient(180deg,#5dade2,#3498db);color:#fff}
.foot-btn.settings{background:linear-gradient(180deg,#58d68d,#27ae60);color:#fff}
.foot-btn.exit{background:linear-gradient(180deg,#f1948a,#e74c3c);color:#fff}
.foot-btn span{font-size:18px}

/* Settings Modal */
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal.hide{display:none}
.modal-box{background:#fff;border-radius:16px;padding:20px;width:100%;max-width:300px}
.modal-title{font-size:18px;font-weight:700;text-align:center;margin-bottom:16px}
.modal-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee}
.modal-item:last-of-type{border-bottom:none}
.toggle{width:50px;height:26px;background:#ddd;border-radius:13px;position:relative;cursor:pointer}
.toggle.on{background:#27ae60}
.toggle::after{content:"";position:absolute;top:2px;left:2px;width:22px;height:22px;background:#fff;border-radius:50%;transition:0.2s}
.toggle.on::after{left:26px}
.modal-btn{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px}
.modal-btn.exit{background:#e74c3c;color:#fff}
.modal-btn.close{background:#eee;color:#333}

/* Setup Screen */
.setup{position:fixed;inset:0;background:linear-gradient(180deg,#e8d4b8,#c9a882);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;z-index:200}
.setup.hide{display:none}
.setup-title{font-size:28px;font-weight:900;margin-bottom:20px;text-align:center}
.setup-title span:nth-child(1){color:#ff6b6b}
.setup-title span:nth-child(2){color:#f39c12}
.setup-title span:nth-child(3){color:#9b59b6}
.setup-title span:nth-child(4){color:#3498db}
.setup-box{background:#fff;padding:20px;border-radius:16px;width:100%;max-width:300px}
.setup-label{font-size:14px;font-weight:600;margin-bottom:8px}
.setup-select{width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:16px}
.setup-btn{width:100%;padding:14px;background:linear-gradient(180deg,#58d68d,#27ae60);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700}
</style>
</head>
<body>
<div class="game-container">
  <!-- Header -->
  <div class="header">
    <div style="width:36px"></div>
    <div class="title-area">
      <div class="title">ULTRA <span class="trophy">🏆</span></div>
      <div class="title-main"><span>L</span><span>U</span><span>D</span><span>O</span></div>
      <div class="title-sub">CHAMPS</div>
    </div>
    <button class="settings-btn" id="settingsBtn">⚙️</button>
  </div>

  <!-- Top Players -->
  <div class="players-row">
    <div class="player-card" id="p0card">
      <div class="player-avatar red">👨</div>
      <div class="player-info">
        <div class="player-name" id="p0name">You</div>
        <div class="player-coins" id="p0coins">0</div>
      </div>
      <span class="turn-arrow" id="p0arrow">◀</span>
    </div>
    <div class="player-card right" id="p1card">
      <div class="player-avatar green">👩</div>
      <div class="player-info">
        <div class="player-name" id="p1name">Bot 1</div>
        <div class="player-coins" id="p1coins">0</div>
      </div>
    </div>
  </div>

  <!-- Board -->
  <div class="board-wrapper">
    <div class="board" id="board">
      <div class="board-inner">
        <!-- Red Quadrant (Top-Left) -->
        <div class="quadrant q-red">
          <div class="home-base">
            <div class="token-spot" data-base="red-0"></div>
            <div class="token-spot" data-base="red-1"></div>
            <div class="token-spot" data-base="red-2"></div>
            <div class="token-spot" data-base="red-3"></div>
          </div>
        </div>
        <!-- Top Track -->
        <div class="track track-v" id="trackTop"></div>
        <!-- Green Quadrant (Top-Right) -->
        <div class="quadrant q-green">
          <div class="home-base">
            <div class="token-spot" data-base="green-0"></div>
            <div class="token-spot" data-base="green-1"></div>
            <div class="token-spot" data-base="green-2"></div>
            <div class="token-spot" data-base="green-3"></div>
          </div>
        </div>
        <!-- Left Track -->
        <div class="track track-h" id="trackLeft"></div>
        <!-- Center -->
        <div class="center">
          <div class="tri tri-red"></div>
          <div class="tri tri-green"></div>
          <div class="tri tri-blue"></div>
          <div class="tri tri-yellow"></div>
          <div class="center-timer" id="timer">0:300</div>
        </div>
        <!-- Right Track -->
        <div class="track track-h" id="trackRight"></div>
        <!-- Blue Quadrant (Bottom-Left) -->
        <div class="quadrant q-blue">
          <div class="home-base">
            <div class="token-spot" data-base="blue-0"></div>
            <div class="token-spot" data-base="blue-1"></div>
            <div class="token-spot" data-base="blue-2"></div>
            <div class="token-spot" data-base="blue-3"></div>
          </div>
        </div>
        <!-- Bottom Track -->
        <div class="track track-v" id="trackBottom"></div>
        <!-- Yellow Quadrant (Bottom-Right) -->
        <div class="quadrant q-yellow">
          <div class="home-base">
            <div class="token-spot" data-base="yellow-0"></div>
            <div class="token-spot" data-base="yellow-1"></div>
            <div class="token-spot" data-base="yellow-2"></div>
            <div class="token-spot" data-base="yellow-3"></div>
          </div>
        </div>
      </div>
      <!-- Corner Numbers -->
      <div class="corner-num corner-1">1</div>
      <div class="corner-num corner-2">2</div>
      <div class="corner-num corner-3">3</div>
      <div class="corner-num corner-4">4</div>
      <!-- Tokens Layer -->
      <div class="tokens-layer" id="tokensLayer"></div>
    </div>
  </div>

  <!-- Bottom Players -->
  <div class="players-row">
    <div class="player-card" id="p2card">
      <div class="player-avatar blue">👨</div>
      <div class="player-info">
        <div class="player-name" id="p2name">Bot 2</div>
        <div class="player-coins" id="p2coins">0</div>
      </div>
    </div>
    <div class="player-card right" id="p3card">
      <div class="player-avatar yellow">👩</div>
      <div class="player-info">
        <div class="player-name" id="p3name">Bot 3</div>
        <div class="player-coins" id="p3coins">0</div>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="dice-row">
      <div class="dice-3d" id="dice">
        <div class="dice-inner" id="diceInner"></div>
      </div>
      <button class="roll-btn" id="rollBtn">TAP TO ROLL DICE</button>
    </div>
    <div class="turn-bar">
      <div class="turn-indicator red" id="turnIndicator"></div>
      <div class="turn-text" id="turnText">Red's Turn</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <button class="foot-btn menu"><span>☰</span>MENU</button>
    <button class="foot-btn settings" id="footSettings"><span>⚙️</span>SETTINGS</button>
    <button class="foot-btn exit" id="footExit"><span>🚪</span>EXIT</button>
  </div>
</div>

<!-- Settings Modal -->
<div class="modal hide" id="settingsModal">
  <div class="modal-box">
    <div class="modal-title">⚙️ Settings</div>
    <div class="modal-item"><span>🔊 Sound</span><div class="toggle on" id="soundToggle"></div></div>
    <div class="modal-item"><span>📳 Vibration</span><div class="toggle on" id="vibToggle"></div></div>
    <button class="modal-btn exit" id="modalExit">🚪 Exit Game</button>
    <button class="modal-btn close" id="modalClose">Close</button>
  </div>
</div>

<!-- Setup Screen -->
<div class="setup" id="setupScreen">
  <div class="setup-title"><span>L</span><span>U</span><span>D</span><span>O</span> 🏆</div>
  <div class="setup-box">
    <div class="setup-label">Number of Players</div>
    <select class="setup-select" id="numPlayers">
      <option value="2">2 Players</option>
      <option value="4" selected>4 Players</option>
    </select>
    <div class="setup-label">Your Name</div>
    <input class="setup-select" id="yourName" value="You" placeholder="Enter name">
    <button class="setup-btn" id="startBtn">START GAME</button>
  </div>
</div>

<script>
(function(){
// Game Constants
var COLORS=['red','green','yellow','blue'];
var PLAYER_ORDER=[0,1,3,2]; // Red, Green, Yellow, Blue (clockwise)
var COLOR_NAMES={red:'Red',green:'Green',yellow:'Yellow',blue:'Blue'};

// Track: 52 cells, position [row%, col%] on 15x15 grid
var TRACK_POS=[];
// Build track positions (simplified for CSS grid positioning)
function buildTrackPositions(){
  // Starting from red's entry, going clockwise
  // This is complex - using percentage positions
  var pos=[];
  // Red exit and path down left side
  for(var i=0;i<6;i++)pos.push({r:6,c:i}); // row 6, cols 0-5
  for(var i=5;i>=0;i--)pos.push({r:i,c:6}); // rows 5-0, col 6
  pos.push({r:0,c:7}); // top middle
  for(var i=0;i<=5;i++)pos.push({r:i,c:8}); // rows 0-5, col 8
  for(var i=9;i<=14;i++)pos.push({r:6,c:i}); // row 6, cols 9-14
  pos.push({r:7,c:14}); // right middle
  for(var i=14;i>=9;i--)pos.push({r:8,c:i}); // row 8, cols 14-9
  for(var i=9;i<=14;i++)pos.push({r:i,c:8}); // rows 9-14, col 8
  pos.push({r:14,c:7}); // bottom middle
  for(var i=14;i>=9;i--)pos.push({r:i,c:6}); // rows 14-9, col 6
  for(var i=5;i>=0;i--)pos.push({r:8,c:i}); // row 8, cols 5-0
  pos.push({r:7,c:0}); // left middle
  return pos.slice(0,52);
}
TRACK_POS=buildTrackPositions();

// Home paths (6 cells each)
var HOME_PATHS={
  red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};

// Start positions on track
var START_POS={red:0,green:13,yellow:26,blue:39};
// Entry to home
var HOME_ENTRY={red:50,green:11,yellow:24,blue:37};
// Safe spots
var SAFE=[0,8,13,21,26,34,39,47];

// Base positions (percentage)
var BASE_POS={
  red:[[20,20],[20,33],[33,20],[33,33]],
  green:[[20,67],[20,80],[33,67],[33,80]],
  yellow:[[67,67],[67,80],[80,67],[80,80]],
  blue:[[67,20],[67,33],[80,20],[80,33]]
};

// DOM Elements
var board=document.getElementById('board');
var tokensLayer=document.getElementById('tokensLayer');
var rollBtn=document.getElementById('rollBtn');
var diceInner=document.getElementById('diceInner');
var turnText=document.getElementById('turnText');
var turnIndicator=document.getElementById('turnIndicator');
var timerEl=document.getElementById('timer');
var setupScreen=document.getElementById('setupScreen');
var settingsModal=document.getElementById('settingsModal');
var startBtn=document.getElementById('startBtn');

// Settings
var soundOn=true,vibOn=true;
document.getElementById('soundToggle').onclick=function(){soundOn=!soundOn;this.classList.toggle('on',soundOn);};
document.getElementById('vibToggle').onclick=function(){vibOn=!vibOn;this.classList.toggle('on',vibOn);};
document.getElementById('settingsBtn').onclick=function(){settingsModal.classList.remove('hide');};
document.getElementById('footSettings').onclick=function(){settingsModal.classList.remove('hide');};
document.getElementById('modalClose').onclick=function(){settingsModal.classList.add('hide');};
document.getElementById('modalExit').onclick=function(){if(confirm('Exit game?')){setupScreen.classList.remove('hide');settingsModal.classList.add('hide');game=null;}};
document.getElementById('footExit').onclick=function(){if(confirm('Exit game?')){setupScreen.classList.remove('hide');game=null;}};

// Audio
var audioCtx;
function playSound(f,d,t){
  if(!soundOn)return;
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    var o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    o.frequency.value=f;o.type=t||'sine';
    g.gain.setValueAtTime(0.2,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+d);
    o.start();o.stop(audioCtx.currentTime+d);
  }catch(e){}
}
function playDiceSound(){playSound(300,0.1);setTimeout(function(){playSound(400,0.1);},100);}
function playMoveSound(){playSound(500,0.08);}
function playCaptureSound(){playSound(200,0.2,'sawtooth');if(vibOn&&navigator.vibrate)navigator.vibrate([100,50,100]);}

// Game State
var game=null;
var gameTime=300;
var timerInterval;

// Draw dice
function drawDice(n){
  var dots=[[0,0,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[1,0,0,0,0,0,0,0,1],[1,0,0,0,1,0,0,0,1],[1,0,1,0,0,0,1,0,1],[1,0,1,0,1,0,1,0,1],[1,0,1,1,0,1,1,0,1]];
  var d=dots[n]||dots[1];
  diceInner.innerHTML='';
  for(var i=0;i<9;i++){
    var dot=document.createElement('div');
    dot.className='dot'+(d[i]?'':' hide');
    diceInner.appendChild(dot);
  }
}

// Get token position on board (percentage)
function getTokenXY(color,tokenIdx,pos){
  if(pos===-1){
    var b=BASE_POS[color][tokenIdx];
    return{x:b[1],y:b[0]};
  }
  if(pos>=52){
    var hp=pos-52;
    if(hp<6){
      var h=HOME_PATHS[color][hp];
      return{x:(h[1]+0.5)/15*100,y:(h[0]+0.5)/15*100};
    }
    return{x:50,y:50}; // Center (won)
  }
  var trackIdx=(START_POS[color]+pos)%52;
  var t=TRACK_POS[trackIdx];
  return{x:(t.c+0.5)/15*100,y:(t.r+0.5)/15*100};
}

// Draw tokens
function drawTokens(){
  tokensLayer.innerHTML='';
  if(!game)return;
  var size=board.offsetWidth*0.07;
  game.players.forEach(function(p){
    p.tokens.forEach(function(t,i){
      var el=document.createElement('div');
      el.className='token '+p.color+(t.canMove?' highlight':'');
      el.style.width=size+'px';
      el.style.height=size+'px';
      var xy=getTokenXY(p.color,i,t.pos);
      el.style.left=xy.x+'%';
      el.style.top=xy.y+'%';
      if(t.canMove){
        el.onclick=function(){moveToken(p,i);};
      }
      tokensLayer.appendChild(el);
    });
  });
}

// Update UI
function updateUI(){
  if(!game)return;
  var cp=game.players[game.turn];
  turnText.textContent=COLOR_NAMES[cp.color]+"'s Turn";
  turnIndicator.className='turn-indicator '+cp.color;
  rollBtn.disabled=game.phase!=='roll'||cp.bot;
  
  // Update player cards
  game.players.forEach(function(p,i){
    var nameEl=document.getElementById('p'+i+'name');
    var coinsEl=document.getElementById('p'+i+'coins');
    var arrow=document.getElementById('p'+i+'arrow');
    if(nameEl)nameEl.textContent=p.name;
    if(coinsEl)coinsEl.textContent=p.score;
    document.querySelectorAll('.turn-arrow').forEach(function(a){a.style.display='none';});
    var currentArrow=document.getElementById('p'+game.turn+'arrow');
    if(currentArrow)currentArrow.style.display='inline';
  });
}

// Get path for a color
function getPath(color){
  var s=START_POS[color];
  var path=[];
  for(var i=0;i<52;i++)path.push((s+i)%52);
  return path;
}

// Roll dice
function rollDice(){
  if(!game||game.phase!=='roll')return;
  playDiceSound();
  game.dice=Math.floor(Math.random()*6)+1;
  drawDice(game.dice);
  game.sixCount=game.dice===6?game.sixCount+1:0;
  
  // Check for 3 consecutive sixes
  if(game.sixCount>=3){
    turnText.textContent='3 Sixes! Turn lost';
    setTimeout(nextTurn,1000);
    return;
  }
  
  checkMoves();
}

// Check available moves
function checkMoves(){
  var p=game.players[game.turn];
  var hasMoves=false;
  p.tokens.forEach(function(t){
    t.canMove=false;
    if(t.pos>=57)return; // Already home
    if(t.pos===-1&&game.dice===6){t.canMove=true;hasMoves=true;}
    else if(t.pos>=0&&t.pos+game.dice<=57){t.canMove=true;hasMoves=true;}
  });
  drawTokens();
  if(!hasMoves){
    turnText.textContent='No moves available';
    setTimeout(function(){
      if(game.dice===6)game.phase='roll',updateUI(),game.players[game.turn].bot&&setTimeout(rollDice,500);
      else nextTurn();
    },800);
  }else{
    game.phase='move';
    if(p.bot)setTimeout(function(){botMove(p);},600);
  }
}

// Move token
function moveToken(player,idx){
  var token=player.tokens[idx];
  if(!token.canMove)return;
  player.tokens.forEach(function(t){t.canMove=false;});
  game.phase='moving';
  
  var oldPos=token.pos;
  
  if(token.pos===-1){
    token.pos=0;
    playMoveSound();
    drawTokens();
    finishMove(player,idx,false);
  }else{
    // Animate step by step
    var steps=game.dice;
    var step=0;
    function animStep(){
      if(step<steps){
        token.pos=oldPos+step+1;
        playMoveSound();
        drawTokens();
        step++;
        setTimeout(animStep,150);
      }else{
        checkCapture(player,idx);
      }
    }
    animStep();
  }
}

function checkCapture(player,idx){
  var token=player.tokens[idx];
  var captured=false;
  
  if(token.pos>=0&&token.pos<52){
    var myPath=getPath(player.color);
    var myTrackPos=myPath[token.pos];
    
    if(SAFE.indexOf(myTrackPos)===-1){
      game.players.forEach(function(op){
        if(op===player)return;
        op.tokens.forEach(function(ot){
          if(ot.pos>=0&&ot.pos<52){
            var opPath=getPath(op.color);
            var opTrackPos=opPath[ot.pos];
            if(opTrackPos===myTrackPos){
              ot.pos=-1;
              captured=true;
              playCaptureSound();
            }
          }
        });
      });
    }
  }
  
  finishMove(player,idx,captured);
}

function finishMove(player,idx,captured){
  var token=player.tokens[idx];
  
  // Check if reached home
  if(token.pos>=57){
    player.score++;
    playSound(600,0.2);
    if(player.score>=4){
      game.phase='won';
      turnText.textContent=player.name+' WINS! 🎉';
      clearInterval(timerInterval);
      drawTokens();
      updateUI();
      return;
    }
  }
  
  drawTokens();
  
  // Extra turn for 6 or capture
  if(game.dice===6||captured){
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
  drawDice(0);
  updateUI();
  if(game.players[game.turn].bot)setTimeout(rollDice,800);
}

function botMove(player){
  var movable=[];
  player.tokens.forEach(function(t,i){if(t.canMove)movable.push(i);});
  if(movable.length>0){
    // Simple AI: prefer tokens on track over base, prefer advancing
    var pick=movable[Math.floor(Math.random()*movable.length)];
    moveToken(player,pick);
  }
}

// Build track cells
function buildTrack(){
  var trackTop=document.getElementById('trackTop');
  var trackBottom=document.getElementById('trackBottom');
  var trackLeft=document.getElementById('trackLeft');
  var trackRight=document.getElementById('trackRight');
  
  // Top track (3 cols x 6 rows)
  for(var i=0;i<18;i++){
    var cell=document.createElement('div');
    cell.className='cell';
    var row=i%6,col=Math.floor(i/6);
    if(col===1)cell.classList.add('path-green');
    if(row===2&&col===0)cell.classList.add('safe');
    if(row===5&&col===2)cell.classList.add('safe');
    if(row===0&&col===1)cell.classList.add('start-green');
    trackTop.appendChild(cell);
  }
  
  // Bottom track (3 cols x 6 rows)
  for(var i=0;i<18;i++){
    var cell=document.createElement('div');
    cell.className='cell';
    var row=i%6,col=Math.floor(i/6);
    if(col===1)cell.classList.add('path-blue');
    if(row===3&&col===2)cell.classList.add('safe');
    if(row===0&&col===0)cell.classList.add('safe');
    if(row===5&&col===1)cell.classList.add('start-blue');
    trackBottom.appendChild(cell);
  }
  
  // Left track (6 cols x 3 rows)
  for(var i=0;i<18;i++){
    var cell=document.createElement('div');
    cell.className='cell';
    var row=Math.floor(i/6),col=i%6;
    if(row===1)cell.classList.add('path-red');
    if(col===1&&row===0)cell.classList.add('safe');
    if(col===4&&row===2)cell.classList.add('safe');
    if(col===0&&row===1)cell.classList.add('start-red');
    trackLeft.appendChild(cell);
  }
  
  // Right track (6 cols x 3 rows)
  for(var i=0;i<18;i++){
    var cell=document.createElement('div');
    cell.className='cell';
    var row=Math.floor(i/6),col=i%6;
    if(row===1)cell.classList.add('path-yellow');
    if(col===4&&row===0)cell.classList.add('safe');
    if(col===1&&row===2)cell.classList.add('safe');
    if(col===5&&row===1)cell.classList.add('start-yellow');
    trackRight.appendChild(cell);
  }
}

// Start game
function startGame(){
  var numP=parseInt(document.getElementById('numPlayers').value);
  var yourName=document.getElementById('yourName').value||'You';
  
  var colors=['red','green','yellow','blue'];
  var players=[];
  for(var i=0;i<numP;i++){
    players.push({
      name:i===0?yourName:'Bot '+(i),
      color:colors[i],
      bot:i>0,
      score:0,
      tokens:[{pos:-1},{pos:-1},{pos:-1},{pos:-1}]
    });
  }
  
  game={
    players:players,
    turn:0,
    phase:'roll',
    dice:0,
    sixCount:0
  };
  
  gameTime=300;
  clearInterval(timerInterval);
  timerInterval=setInterval(function(){
    if(game&&game.phase!=='won'){
      gameTime--;
      timerEl.textContent='0:'+gameTime;
      if(gameTime<=0){
        clearInterval(timerInterval);
        var winner=game.players.reduce(function(a,b){return a.score>b.score?a:b;});
        turnText.textContent=winner.name+' wins by time!';
        game.phase='won';
      }
    }
  },1000);
  
  setupScreen.classList.add('hide');
  buildTrack();
  drawDice(1);
  drawTokens();
  updateUI();
}

// Init
rollBtn.onclick=rollDice;
startBtn.onclick=startGame;
window.addEventListener('resize',function(){if(game)drawTokens();});
drawDice(1);
})();
</script>
</body>
</html>`;
