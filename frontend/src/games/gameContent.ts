// Ultra Ludo Champs - Fixed Version
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
.game-container{display:flex;flex-direction:column;height:100%;max-width:420px;margin:0 auto}

/* Header */
.header{display:flex;justify-content:center;align-items:center;padding:6px 12px}
.title-area{text-align:center}
.title{font-size:10px;font-weight:800;color:#4a90d9;letter-spacing:1px}
.title-main{font-size:22px;font-weight:900;line-height:1}
.title-main span:nth-child(1){color:#ff6b6b}
.title-main span:nth-child(2){color:#f39c12}
.title-main span:nth-child(3){color:#9b59b6}
.title-main span:nth-child(4){color:#3498db}
.title-sub{font-size:9px;font-weight:800;color:#e74c3c;letter-spacing:2px}
.trophy{font-size:16px}

/* Player Cards */
.players-row{display:flex;justify-content:space-between;padding:4px 10px}
.player-card{display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(255,255,255,0.9);border-radius:12px;border:3px solid transparent;position:relative;min-width:120px}
.player-card.active{border-color:#f39c12;box-shadow:0 0 10px rgba(243,156,18,0.5)}
.player-card.right{flex-direction:row-reverse}
.player-avatar{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px}
.player-avatar.red{background:linear-gradient(180deg,#ff6b6b,#e74c3c)}
.player-avatar.green{background:linear-gradient(180deg,#58d68d,#27ae60)}
.player-avatar.blue{background:linear-gradient(180deg,#5dade2,#3498db)}
.player-avatar.yellow{background:linear-gradient(180deg,#f7dc6f,#f1c40f)}
.player-info{text-align:left}
.player-card.right .player-info{text-align:right}
.player-name{font-size:11px;font-weight:700;color:#2c3e50}
.player-score{font-size:10px;color:#27ae60;font-weight:600}

/* Dice Container near player */
.dice-wrapper{position:absolute;bottom:-45px;left:50%;transform:translateX(-50%);display:none;z-index:50}
.player-card.active .dice-wrapper{display:block}

/* 3D Dice */
.dice-3d{width:44px;height:44px;perspective:200px;cursor:pointer}
.dice-3d.disabled{opacity:0.5;cursor:not-allowed;pointer-events:none}
.dice-cube{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform 0.1s;background:linear-gradient(145deg,#ffffff,#e8e8e8);border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.dice-cube.rolling{animation:dice-roll 0.6s ease-out}
@keyframes dice-roll{
  0%{transform:rotateX(0) rotateY(0) rotateZ(0)}
  20%{transform:rotateX(180deg) rotateY(90deg) rotateZ(45deg)}
  40%{transform:rotateX(360deg) rotateY(180deg) rotateZ(90deg)}
  60%{transform:rotateX(540deg) rotateY(270deg) rotateZ(135deg)}
  80%{transform:rotateX(720deg) rotateY(360deg) rotateZ(180deg)}
  100%{transform:rotateX(720deg) rotateY(360deg) rotateZ(0)}
}
.dice-face{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:3px;padding:8px;background:linear-gradient(145deg,#ffffff,#f0f0f0);border-radius:10px}
.dice-dot{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 30%,#444,#111)}
.dice-dot.hide{visibility:hidden}

/* Timer Badge */
.turn-timer{position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:#e74c3c;color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;display:none;min-width:30px;text-align:center}
.player-card.active .turn-timer{display:block}

/* Board */
.board-wrapper{flex:1;display:flex;align-items:center;justify-content:center;padding:8px}
.board{position:relative;background:#f8f4ef;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.2);width:92vw;height:92vw;max-width:340px;max-height:340px}
.board-grid{display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);width:100%;height:100%}
.cell{border:0.5px solid rgba(0,0,0,0.08);position:relative}

/* Quadrant colors */
.cell.red-home{background:#e74c3c}
.cell.green-home{background:#27ae60}
.cell.yellow-home{background:#f1c40f}
.cell.blue-home{background:#3498db}
.cell.red-path{background:#ffcdd2}
.cell.green-path{background:#c8e6c9}
.cell.yellow-path{background:#fff9c4}
.cell.blue-path{background:#bbdefb}
.cell.safe::after{content:"★";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#f39c12;font-size:14px;text-shadow:0 1px 2px rgba(0,0,0,0.5),0 0 8px rgba(243,156,18,0.6);z-index:1}
.cell.white-base{background:#fff}
.cell.center{background:#f8f4ef}

/* Base circle spots - EXACT positioning */
.base-circles{position:absolute;pointer-events:none}
.base-circle{position:absolute;width:16%;height:16%;border-radius:50%;border:2px solid rgba(255,255,255,0.8);background:rgba(255,255,255,0.3);box-shadow:inset 0 2px 4px rgba(0,0,0,0.1)}

/* Tokens - positioned at EXACT center of circles */
.tokens-layer{position:absolute;inset:0;pointer-events:none}
.token{position:absolute;border-radius:50%;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,0.3);transition:left 0.15s,top 0.15s;z-index:10}
.token::before{content:"";position:absolute;top:10%;left:20%;width:35%;height:25%;background:rgba(255,255,255,0.5);border-radius:50%}
.token::after{content:"";position:absolute;bottom:10%;right:15%;width:20%;height:15%;background:rgba(0,0,0,0.1);border-radius:50%}
.token.red{background:linear-gradient(180deg,#ff6b6b 0%,#c0392b 100%);box-shadow:0 3px 6px rgba(192,57,43,0.5),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.green{background:linear-gradient(180deg,#58d68d 0%,#1e8449 100%);box-shadow:0 3px 6px rgba(30,132,73,0.5),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.yellow{background:linear-gradient(180deg,#f7dc6f 0%,#d4ac0d 100%);box-shadow:0 3px 6px rgba(212,172,13,0.5),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.blue{background:linear-gradient(180deg,#5dade2 0%,#2471a3 100%);box-shadow:0 3px 6px rgba(36,113,163,0.5),inset 0 -2px 4px rgba(0,0,0,0.2)}
.token.highlight{animation:token-pulse 0.5s infinite alternate;z-index:20}
@keyframes token-pulse{
  from{transform:translate(-50%,-50%) scale(1);box-shadow:0 0 0 0 rgba(255,215,0,0.7)}
  to{transform:translate(-50%,-50%) scale(1.2);box-shadow:0 0 15px 8px rgba(255,215,0,0.6)}
}
.token.highlight::before{background:rgba(255,255,255,0.8)}

/* Center triangles */
.center-area{position:absolute;top:40%;left:40%;width:20%;height:20%;overflow:hidden}
.center-inner{position:relative;width:100%;height:100%}
.tri{position:absolute;width:0;height:0}
.tri-red{top:50%;left:0;border-left:0 solid transparent;border-right:calc(var(--tri-size)/2) solid transparent;border-bottom:calc(var(--tri-size)/2) solid #e74c3c;transform:translateY(-50%) rotate(-90deg)}
.tri-green{top:0;left:50%;border-left:calc(var(--tri-size)/2) solid transparent;border-right:calc(var(--tri-size)/2) solid transparent;border-bottom:calc(var(--tri-size)) solid #27ae60;transform:translateX(-50%)}
.tri-blue{bottom:0;left:50%;border-left:calc(var(--tri-size)/2) solid transparent;border-right:calc(var(--tri-size)/2) solid transparent;border-top:calc(var(--tri-size)) solid #3498db;transform:translateX(-50%)}
.tri-yellow{top:50%;right:0;border-left:calc(var(--tri-size)/2) solid transparent;border-right:0 solid transparent;border-bottom:calc(var(--tri-size)/2) solid #f1c40f;transform:translateY(-50%) rotate(90deg)}

.center-box{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.center-tri{width:100%;height:100%}
.center-tri.red{background:linear-gradient(135deg,#e74c3c 50%,transparent 50%)}
.center-tri.green{background:linear-gradient(225deg,#27ae60 50%,transparent 50%)}
.center-tri.blue{background:linear-gradient(45deg,#3498db 50%,transparent 50%)}
.center-tri.yellow{background:linear-gradient(315deg,#f1c40f 50%,transparent 50%)}
.center-timer{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:700}

/* Choice Modal */
.choice-modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.choice-modal.hide{display:none}
.choice-box{background:#fff;border-radius:16px;padding:20px;width:100%;max-width:280px;text-align:center}
.choice-title{font-size:16px;font-weight:700;margin-bottom:16px;color:#2c3e50}
.choice-subtitle{font-size:12px;color:#666;margin-bottom:12px}
.choice-options{display:flex;flex-direction:column;gap:10px}
.choice-btn{padding:12px 20px;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
.choice-btn.new-token{background:linear-gradient(180deg,#58d68d,#27ae60);color:#fff}
.choice-btn.move-token{background:linear-gradient(180deg,#5dade2,#3498db);color:#fff}

/* Turn Bar */
.turn-bar{display:flex;align-items:center;background:#2c3e50;border-radius:20px;padding:8px 16px;margin:8px 12px}
.turn-indicator{height:6px;width:40px;border-radius:3px;margin-right:12px}
.turn-indicator.red{background:#e74c3c}
.turn-indicator.green{background:#27ae60}
.turn-indicator.yellow{background:#f1c40f}
.turn-indicator.blue{background:#3498db}
.turn-text{color:#fff;font-size:13px;font-weight:600;flex:1;text-align:center}

/* Footer */
.footer{display:flex;justify-content:space-around;padding:8px 12px}
.foot-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 20px;border-radius:12px;border:none;font-size:10px;font-weight:700;cursor:pointer}
.foot-btn.menu{background:linear-gradient(180deg,#5dade2,#3498db);color:#fff}
.foot-btn.settings{background:linear-gradient(180deg,#58d68d,#27ae60);color:#fff}
.foot-btn.exit{background:linear-gradient(180deg,#f1948a,#e74c3c);color:#fff}

/* Modals */
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal.hide{display:none}
.modal-box{background:#fff;border-radius:16px;padding:20px;width:100%;max-width:280px}
.modal-title{font-size:18px;font-weight:700;text-align:center;margin-bottom:16px}
.modal-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee}
.toggle{width:46px;height:24px;background:#ddd;border-radius:12px;position:relative;cursor:pointer}
.toggle.on{background:#27ae60}
.toggle::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:0.2s}
.toggle.on::after{left:24px}
.modal-btn{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
.modal-btn.exit{background:#e74c3c;color:#fff}
.modal-btn.close{background:#eee;color:#333}

/* Setup */
.setup{position:fixed;inset:0;background:linear-gradient(180deg,#e8d4b8,#c9a882);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;z-index:200}
.setup.hide{display:none}
.setup-title{font-size:26px;font-weight:900;margin-bottom:20px}
.setup-title span:nth-child(1){color:#ff6b6b}
.setup-title span:nth-child(2){color:#f39c12}
.setup-title span:nth-child(3){color:#9b59b6}
.setup-title span:nth-child(4){color:#3498db}
.setup-box{background:#fff;padding:20px;border-radius:16px;width:100%;max-width:280px}
.setup-label{font-size:13px;font-weight:600;margin-bottom:6px;color:#333}
.setup-input{width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px}
.setup-btn{width:100%;padding:14px;background:linear-gradient(180deg,#58d68d,#27ae60);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700}
</style>
</head>
<body>
<div class="game-container">
  <div class="header">
    <div class="title-area">
      <div class="title">ULTRA <span class="trophy">🏆</span></div>
      <div class="title-main"><span>L</span><span>U</span><span>D</span><span>O</span></div>
      <div class="title-sub">CHAMPS</div>
    </div>
  </div>

  <div class="players-row" id="topPlayers">
    <div class="player-card" id="p0" data-player="0">
      <div class="player-avatar red">😀</div>
      <div class="player-info"><div class="player-name">You</div><div class="player-score">🪙 0</div></div>
      <div class="dice-wrapper"><div class="dice-3d" id="dice0"><div class="dice-cube" id="cube0"><div class="dice-face" id="face0"></div></div></div></div>
      <div class="turn-timer" id="timer0">120</div>
    </div>
    <div class="player-card right" id="p1" data-player="1">
      <div class="player-avatar green">🤖</div>
      <div class="player-info"><div class="player-name">Bot 1</div><div class="player-score">🪙 0</div></div>
      <div class="dice-wrapper"><div class="dice-3d" id="dice1"><div class="dice-cube" id="cube1"><div class="dice-face" id="face1"></div></div></div></div>
      <div class="turn-timer" id="timer1">120</div>
    </div>
  </div>

  <div class="board-wrapper">
    <div class="board" id="board">
      <div class="board-grid" id="grid"></div>
      <div class="base-circles" id="baseCircles"></div>
      <div class="center-area">
        <div class="center-box">
          <div class="center-tri red"></div>
          <div class="center-tri green"></div>
          <div class="center-tri blue"></div>
          <div class="center-tri yellow"></div>
        </div>
        <div class="center-timer" id="gameTimer">0:300</div>
      </div>
      <div class="tokens-layer" id="tokensLayer"></div>
    </div>
  </div>

  <div class="players-row" id="bottomPlayers">
    <div class="player-card" id="p2" data-player="2">
      <div class="player-avatar blue">🤖</div>
      <div class="player-info"><div class="player-name">Bot 2</div><div class="player-score">🪙 0</div></div>
      <div class="dice-wrapper"><div class="dice-3d" id="dice2"><div class="dice-cube" id="cube2"><div class="dice-face" id="face2"></div></div></div></div>
      <div class="turn-timer" id="timer2">120</div>
    </div>
    <div class="player-card right" id="p3" data-player="3">
      <div class="player-avatar yellow">🤖</div>
      <div class="player-info"><div class="player-name">Bot 3</div><div class="player-score">🪙 0</div></div>
      <div class="dice-wrapper"><div class="dice-3d" id="dice3"><div class="dice-cube" id="cube3"><div class="dice-face" id="face3"></div></div></div></div>
      <div class="turn-timer" id="timer3">120</div>
    </div>
  </div>

  <div class="turn-bar">
    <div class="turn-indicator red" id="turnIndicator"></div>
    <div class="turn-text" id="turnText">Red's Turn</div>
  </div>

  <div class="footer">
    <button class="foot-btn menu" id="menuBtn">☰ MENU</button>
    <button class="foot-btn settings" id="settingsBtn">⚙️ SETTINGS</button>
    <button class="foot-btn exit" id="exitBtn">🚪 EXIT</button>
  </div>
</div>

<!-- Choice Modal for 6 -->
<div class="choice-modal hide" id="choiceModal">
  <div class="choice-box">
    <div class="choice-title">🎲 You rolled a 6!</div>
    <div class="choice-subtitle">Choose your action:</div>
    <div class="choice-options" id="choiceOptions"></div>
  </div>
</div>

<div class="modal hide" id="settingsModal">
  <div class="modal-box">
    <div class="modal-title">⚙️ Settings</div>
    <div class="modal-item"><span>🔊 Sound</span><div class="toggle on" id="soundToggle"></div></div>
    <div class="modal-item"><span>📳 Vibration</span><div class="toggle on" id="vibToggle"></div></div>
    <button class="modal-btn close" id="closeModal">Close</button>
  </div>
</div>

<div class="setup" id="setupScreen">
  <div class="setup-title"><span>L</span><span>U</span><span>D</span><span>O</span> 🏆</div>
  <div class="setup-box">
    <div class="setup-label">Players</div>
    <select class="setup-input" id="numPlayers"><option value="2">2 Players</option><option value="4" selected>4 Players</option></select>
    <div class="setup-label">Your Name</div>
    <input class="setup-input" id="playerName" value="You" maxlength="10">
    <button class="setup-btn" id="startBtn">START GAME</button>
  </div>
</div>

<script>
(function(){
'use strict';

var COLORS=['red','green','blue','yellow'];
var COLOR_NAMES={red:'Red',green:'Green',blue:'Blue',yellow:'Yellow'};

// EXACT base spot positions (percentage) - tokens will be placed at exact center
var BASE_SPOTS={
  red:[[20,20],[20,33.3],[33.3,20],[33.3,33.3]],
  green:[[20,66.7],[20,80],[33.3,66.7],[33.3,80]],
  blue:[[66.7,20],[66.7,33.3],[80,20],[80,33.3]],
  yellow:[[66.7,66.7],[66.7,80],[80,66.7],[80,80]]
};

// Track positions - exact percentage coordinates for each of 52 cells
// Each cell is 6.67% of board (100/15)
var CELL = 100/15;
var HALF = CELL/2;

// Build track positions clockwise starting from Red's entry
var TRACK_POS = [];

// Red's column going up (col 6, rows 13 to 9)
for(var r=13;r>=9;r--) TRACK_POS.push({y:(r+0.5)*CELL,x:6.5*CELL}); // 0-4
// Row 8, cols 6 to 0
for(var c=5;c>=0;c--) TRACK_POS.push({y:8.5*CELL,x:(c+0.5)*CELL}); // 5-11
// Col 0, rows 7 to 1
for(var r=7;r>=1;r--) TRACK_POS.push({y:(r+0.5)*CELL,x:0.5*CELL}); // 12-18 (safe at 13)
// Row 0, cols 0 to 5
for(var c=1;c<=5;c++) TRACK_POS.push({y:0.5*CELL,x:(c+0.5)*CELL}); // 19-23
// Col 6, rows 0 to 5
for(var r=1;r<=5;r++) TRACK_POS.push({y:(r+0.5)*CELL,x:6.5*CELL}); // 24-28 (safe at 26)
// Row 6, cols 6 to 8
TRACK_POS.push({y:6.5*CELL,x:6.5*CELL}); // 29
TRACK_POS.push({y:6.5*CELL,x:7.5*CELL}); // 30
// Col 8, rows 6 to 0
for(var r=5;r>=0;r--) TRACK_POS.push({y:(r+0.5)*CELL,x:8.5*CELL}); // 31-36
// Row 0, cols 9 to 14
for(var c=9;c<=13;c++) TRACK_POS.push({y:0.5*CELL,x:(c+0.5)*CELL}); // 37-41 (safe at 39)
// Col 14, rows 1 to 6
for(var r=1;r<=6;r++) TRACK_POS.push({y:(r+0.5)*CELL,x:14.5*CELL}); // 42-47
// Row 7 to 8, col 14
TRACK_POS.push({y:7.5*CELL,x:14.5*CELL}); // 48
TRACK_POS.push({y:8.5*CELL,x:14.5*CELL}); // 49
// Col 14, rows 9 to 13
for(var r=9;r<=13;r++) TRACK_POS.push({y:(r+0.5)*CELL,x:14.5*CELL}); // 50-54 but we need exactly 52

// Rebuild track properly - 52 cells exactly
TRACK_POS = [];
// Starting from Red entry (position 0) going counter-clockwise when viewed from above
// Red exit column (col 6, rows 13 down to 9)
for(var i=0;i<5;i++) TRACK_POS.push({y:(13-i+0.5)*CELL, x:6.5*CELL});
// Left side going up (row 8, col 5 to 0)
for(var i=0;i<6;i++) TRACK_POS.push({y:8.5*CELL, x:(5-i+0.5)*CELL});
// Corner up
TRACK_POS.push({y:7.5*CELL, x:0.5*CELL});
TRACK_POS.push({y:6.5*CELL, x:0.5*CELL});
// Top-left going up (col 0, rows 5 to 1)
for(var i=0;i<5;i++) TRACK_POS.push({y:(5-i+0.5)*CELL, x:0.5*CELL}); // safe at index 13
// Top side going right (row 0, cols 1 to 5)
for(var i=0;i<5;i++) TRACK_POS.push({y:0.5*CELL, x:(1+i+0.5)*CELL});
// Enter green side
TRACK_POS.push({y:0.5*CELL, x:6.5*CELL});
TRACK_POS.push({y:0.5*CELL, x:7.5*CELL});
TRACK_POS.push({y:0.5*CELL, x:8.5*CELL}); // safe at index 26
// Top-right going right (row 0, cols 9 to 13)
for(var i=0;i<5;i++) TRACK_POS.push({y:0.5*CELL, x:(9+i+0.5)*CELL});
// Right side going down (col 14, rows 1 to 5)
for(var i=0;i<5;i++) TRACK_POS.push({y:(1+i+0.5)*CELL, x:14.5*CELL});
// Corner right
TRACK_POS.push({y:6.5*CELL, x:14.5*CELL});
TRACK_POS.push({y:7.5*CELL, x:14.5*CELL});
TRACK_POS.push({y:8.5*CELL, x:14.5*CELL}); // safe at index 39
// Bottom-right going down (col 14, rows 9 to 13)
for(var i=0;i<5;i++) TRACK_POS.push({y:(9+i+0.5)*CELL, x:14.5*CELL});
// Bottom side going left (row 14, cols 13 to 9)
for(var i=0;i<5;i++) TRACK_POS.push({y:14.5*CELL, x:(13-i+0.5)*CELL});
// Enter yellow side
TRACK_POS.push({y:14.5*CELL, x:8.5*CELL});
TRACK_POS.push({y:14.5*CELL, x:7.5*CELL}); // safe at index 52 -> wrap to 0

// Starting positions (where token enters track) for each color
var START_POS = {red:0, green:13, blue:26, yellow:39};
// Home entry (last track position before entering home path)
var HOME_ENTRY = {red:51, green:12, blue:25, yellow:38};

// Home path positions (6 cells toward center)
var HOME_PATH = {
  red:[
    {y:13.5*CELL, x:7.5*CELL},
    {y:12.5*CELL, x:7.5*CELL},
    {y:11.5*CELL, x:7.5*CELL},
    {y:10.5*CELL, x:7.5*CELL},
    {y:9.5*CELL, x:7.5*CELL},
    {y:8.5*CELL, x:7.5*CELL}
  ],
  green:[
    {y:7.5*CELL, x:1.5*CELL},
    {y:7.5*CELL, x:2.5*CELL},
    {y:7.5*CELL, x:3.5*CELL},
    {y:7.5*CELL, x:4.5*CELL},
    {y:7.5*CELL, x:5.5*CELL},
    {y:7.5*CELL, x:6.5*CELL}
  ],
  blue:[
    {y:1.5*CELL, x:7.5*CELL},
    {y:2.5*CELL, x:7.5*CELL},
    {y:3.5*CELL, x:7.5*CELL},
    {y:4.5*CELL, x:7.5*CELL},
    {y:5.5*CELL, x:7.5*CELL},
    {y:6.5*CELL, x:7.5*CELL}
  ],
  yellow:[
    {y:7.5*CELL, x:13.5*CELL},
    {y:7.5*CELL, x:12.5*CELL},
    {y:7.5*CELL, x:11.5*CELL},
    {y:7.5*CELL, x:10.5*CELL},
    {y:7.5*CELL, x:9.5*CELL},
    {y:7.5*CELL, x:8.5*CELL}
  ]
};

// Safe positions on track (star spots)
var SAFE_SPOTS = [0,8,13,21,26,34,39,47];

// DOM elements
var board = document.getElementById('board');
var tokensLayer = document.getElementById('tokensLayer');
var grid = document.getElementById('grid');
var baseCirclesEl = document.getElementById('baseCircles');
var turnText = document.getElementById('turnText');
var turnIndicator = document.getElementById('turnIndicator');
var gameTimerEl = document.getElementById('gameTimer');
var setupScreen = document.getElementById('setupScreen');
var settingsModal = document.getElementById('settingsModal');
var choiceModal = document.getElementById('choiceModal');
var choiceOptions = document.getElementById('choiceOptions');

// Game state
var game = null;
var soundOn = true, vibOn = true;
var isProcessing = false; // Prevents multiple dice taps
var turnTimeLeft = 120;
var turnTimerInterval = null;
var gameTime = 300;
var gameTimerInterval = null;

// Audio context
var audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  }
  return audioCtx;
}

function playSound(freq, duration) {
  if (!soundOn) return;
  var ctx = getAudioContext();
  if (!ctx) return;
  try {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playDiceRollSound() {
  if (!soundOn) return;
  var ctx = getAudioContext();
  if (!ctx) return;
  try {
    for (var i = 0; i < 8; i++) {
      setTimeout(function(idx) {
        return function() {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'square';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 150 + Math.random() * 100;
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        };
      }(i), i * 70);
    }
  } catch(e) {}
}

function vibrate(pattern) {
  if (vibOn && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// Build board grid
function buildGrid() {
  grid.innerHTML = '';
  for (var r = 0; r < 15; r++) {
    for (var c = 0; c < 15; c++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      
      // Red quadrant (top-left)
      if (r < 6 && c < 6) cell.classList.add('red-home');
      // Green quadrant (top-right)
      else if (r < 6 && c > 8) cell.classList.add('green-home');
      // Blue quadrant (bottom-left)
      else if (r > 8 && c < 6) cell.classList.add('blue-home');
      // Yellow quadrant (bottom-right)
      else if (r > 8 && c > 8) cell.classList.add('yellow-home');
      // Home paths (colored lanes toward center)
      else if (c === 7 && r >= 1 && r <= 6) cell.classList.add('blue-path');
      else if (c === 7 && r >= 8 && r <= 13) cell.classList.add('red-path');
      else if (r === 7 && c >= 1 && c <= 6) cell.classList.add('green-path');
      else if (r === 7 && c >= 8 && c <= 13) cell.classList.add('yellow-path');
      // White base circles area
      else if ((r >= 1 && r <= 4 && c >= 1 && c <= 4) ||
               (r >= 1 && r <= 4 && c >= 10 && c <= 13) ||
               (r >= 10 && r <= 13 && c >= 1 && c <= 4) ||
               (r >= 10 && r <= 13 && c >= 10 && c <= 13)) {
        cell.classList.add('white-base');
      }
      // Center
      else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
        cell.classList.add('center');
      }
      
      // Mark safe spots with stars
      var cellTrackIdx = getCellTrackIndex(r, c);
      if (cellTrackIdx !== -1 && SAFE_SPOTS.indexOf(cellTrackIdx) !== -1) {
        cell.classList.add('safe');
      }
      
      grid.appendChild(cell);
    }
  }
}

// Get track index from row/col (approximate)
function getCellTrackIndex(r, c) {
  for (var i = 0; i < TRACK_POS.length; i++) {
    var pos = TRACK_POS[i];
    var pr = Math.floor(pos.y / CELL);
    var pc = Math.floor(pos.x / CELL);
    if (pr === r && pc === c) return i;
  }
  return -1;
}

// Draw base circles
function drawBaseCircles() {
  baseCirclesEl.innerHTML = '';
  Object.keys(BASE_SPOTS).forEach(function(color) {
    BASE_SPOTS[color].forEach(function(spot) {
      var circle = document.createElement('div');
      circle.className = 'base-circle';
      circle.style.top = (spot[0] - 8) + '%';
      circle.style.left = (spot[1] - 8) + '%';
      baseCirclesEl.appendChild(circle);
    });
  });
}

// Draw dice face
function drawDiceFace(playerIdx, value) {
  var patterns = {
    0: [0,0,0,0,0,0,0,0,0],
    1: [0,0,0,0,1,0,0,0,0],
    2: [1,0,0,0,0,0,0,0,1],
    3: [1,0,0,0,1,0,0,0,1],
    4: [1,0,1,0,0,0,1,0,1],
    5: [1,0,1,0,1,0,1,0,1],
    6: [1,0,1,1,0,1,1,0,1]
  };
  
  var face = document.getElementById('face' + playerIdx);
  if (!face) return;
  
  var dots = patterns[value] || patterns[0];
  face.innerHTML = '';
  for (var i = 0; i < 9; i++) {
    var dot = document.createElement('div');
    dot.className = 'dice-dot' + (dots[i] ? '' : ' hide');
    face.appendChild(dot);
  }
}

// Get token position on board
function getTokenPosition(color, tokenIdx, trackPos) {
  // In base
  if (trackPos === -1) {
    var base = BASE_SPOTS[color][tokenIdx];
    return { x: base[1], y: base[0] };
  }
  
  // Reached home (finished)
  if (trackPos >= 57) {
    return { x: 50, y: 50 };
  }
  
  // On home path
  if (trackPos >= 51) {
    var homeIdx = trackPos - 51;
    if (homeIdx < 6) {
      var hp = HOME_PATH[color][homeIdx];
      return { x: hp.x, y: hp.y };
    }
    return { x: 50, y: 50 };
  }
  
  // On main track
  var globalPos = (START_POS[color] + trackPos) % 52;
  var tp = TRACK_POS[globalPos];
  if (!tp) return { x: 50, y: 50 };
  return { x: tp.x, y: tp.y };
}

// Draw all tokens
function drawTokens() {
  tokensLayer.innerHTML = '';
  if (!game) return;
  
  var tokenSize = Math.min(board.offsetWidth, board.offsetHeight) * 0.065;
  
  game.players.forEach(function(player) {
    player.tokens.forEach(function(token, idx) {
      var el = document.createElement('div');
      el.className = 'token ' + player.color;
      if (token.canMove) el.classList.add('highlight');
      
      el.style.width = tokenSize + 'px';
      el.style.height = tokenSize + 'px';
      el.style.fontSize = (tokenSize * 0.4) + 'px';
      
      var pos = getTokenPosition(player.color, idx, token.pos);
      el.style.left = pos.x + '%';
      el.style.top = pos.y + '%';
      el.textContent = idx + 1;
      
      if (token.canMove) {
        el.onclick = function() {
          if (!isProcessing) selectToken(player, idx);
        };
      }
      
      tokensLayer.appendChild(el);
    });
  });
}

// Update UI
function updateUI() {
  if (!game) return;
  
  var currentPlayer = game.players[game.turn];
  turnText.textContent = COLOR_NAMES[currentPlayer.color] + "'s Turn";
  turnIndicator.className = 'turn-indicator ' + currentPlayer.color;
  
  // Update player cards
  document.querySelectorAll('.player-card').forEach(function(card) {
    card.classList.remove('active');
  });
  var activeCard = document.getElementById('p' + game.turn);
  if (activeCard) activeCard.classList.add('active');
  
  // Update scores and dice
  game.players.forEach(function(player, idx) {
    var card = document.getElementById('p' + idx);
    if (card) {
      card.querySelector('.player-name').textContent = player.name;
      card.querySelector('.player-score').textContent = '🪙 ' + player.score;
      var avatar = card.querySelector('.player-avatar');
      avatar.className = 'player-avatar ' + player.color;
    }
    // Only show dice value for current player
    drawDiceFace(idx, idx === game.turn ? game.dice : 0);
    
    // Disable dice for non-active players
    var diceEl = document.getElementById('dice' + idx);
    if (diceEl) {
      if (idx === game.turn && !isProcessing && game.phase === 'roll') {
        diceEl.classList.remove('disabled');
      } else {
        diceEl.classList.add('disabled');
      }
    }
  });
}

// Roll dice with 3D animation
function rollDice(playerIdx) {
  if (!game || game.phase !== 'roll' || isProcessing || game.turn !== playerIdx) return;
  if (game.players[playerIdx].bot && playerIdx !== game.turn) return;
  
  isProcessing = true;
  
  var cubeEl = document.getElementById('cube' + playerIdx);
  cubeEl.classList.add('rolling');
  playDiceRollSound();
  vibrate(50);
  
  // Animate random values during roll
  var animFrames = 8;
  var frame = 0;
  var animInterval = setInterval(function() {
    drawDiceFace(playerIdx, Math.floor(Math.random() * 6) + 1);
    frame++;
    if (frame >= animFrames) {
      clearInterval(animInterval);
    }
  }, 70);
  
  // Final result after animation
  setTimeout(function() {
    cubeEl.classList.remove('rolling');
    
    game.dice = Math.floor(Math.random() * 6) + 1;
    drawDiceFace(playerIdx, game.dice);
    playSound(500, 0.15);
    vibrate([30, 20, 30]);
    
    // Track consecutive sixes
    if (game.dice === 6) {
      game.sixCount = (game.sixCount || 0) + 1;
    } else {
      game.sixCount = 0;
    }
    
    // Three sixes rule
    if (game.sixCount >= 3) {
      turnText.textContent = '3 Sixes! Turn lost!';
      playSound(200, 0.3);
      setTimeout(function() {
        isProcessing = false;
        nextTurn();
      }, 1200);
      return;
    }
    
    processRoll();
  }, 600);
}

// Process dice roll - check available moves
function processRoll() {
  var player = game.players[game.turn];
  var tokensInBase = [];
  var tokensOnTrack = [];
  
  player.tokens.forEach(function(token, idx) {
    token.canMove = false;
    
    if (token.pos >= 57) return; // Already home
    
    if (token.pos === -1) {
      // In base - can only move out with 6
      if (game.dice === 6) {
        token.canMove = true;
        tokensInBase.push(idx);
      }
    } else {
      // On track - check if can move forward
      var newPos = token.pos + game.dice;
      if (newPos <= 57) {
        token.canMove = true;
        tokensOnTrack.push(idx);
      }
    }
  });
  
  var totalMovable = tokensInBase.length + tokensOnTrack.length;
  
  if (totalMovable === 0) {
    // No moves available
    turnText.textContent = 'No moves available!';
    playSound(300, 0.2);
    setTimeout(function() {
      isProcessing = false;
      if (game.dice === 6) {
        // Got 6 but no moves, roll again
        game.phase = 'roll';
        updateUI();
        if (player.bot) setTimeout(function() { rollDice(game.turn); }, 600);
      } else {
        nextTurn();
      }
    }, 800);
    return;
  }
  
  // For human player with 6 and multiple choices (both in base and on track)
  if (!player.bot && game.dice === 6 && tokensInBase.length > 0 && tokensOnTrack.length > 0) {
    showChoiceModal(player, tokensInBase, tokensOnTrack);
    return;
  }
  
  // Auto select for single option or bot
  game.phase = 'move';
  drawTokens();
  resetTurnTimer();
  isProcessing = false;
  
  if (player.bot) {
    setTimeout(function() { botSelectToken(player); }, 600);
  }
}

// Show choice modal when user has option to bring new token or move existing
function showChoiceModal(player, tokensInBase, tokensOnTrack) {
  choiceOptions.innerHTML = '';
  
  // Option to bring new token out
  var newBtn = document.createElement('button');
  newBtn.className = 'choice-btn new-token';
  newBtn.innerHTML = '🏠 Bring New Token Out';
  newBtn.onclick = function() {
    choiceModal.classList.add('hide');
    game.phase = 'move';
    // Only highlight base tokens
    player.tokens.forEach(function(t, i) {
      t.canMove = tokensInBase.indexOf(i) !== -1;
    });
    drawTokens();
    resetTurnTimer();
    isProcessing = false;
  };
  choiceOptions.appendChild(newBtn);
  
  // Option to move existing token
  var moveBtn = document.createElement('button');
  moveBtn.className = 'choice-btn move-token';
  moveBtn.innerHTML = '🎯 Move Existing Token';
  moveBtn.onclick = function() {
    choiceModal.classList.add('hide');
    game.phase = 'move';
    // Only highlight track tokens
    player.tokens.forEach(function(t, i) {
      t.canMove = tokensOnTrack.indexOf(i) !== -1;
    });
    drawTokens();
    resetTurnTimer();
    isProcessing = false;
  };
  choiceOptions.appendChild(moveBtn);
  
  choiceModal.classList.remove('hide');
}

// Select and move a token
function selectToken(player, tokenIdx) {
  if (!game || game.phase !== 'move' || isProcessing) return;
  
  var token = player.tokens[tokenIdx];
  if (!token.canMove) return;
  
  isProcessing = true;
  
  // Clear all highlights
  player.tokens.forEach(function(t) { t.canMove = false; });
  game.phase = 'moving';
  
  if (token.pos === -1) {
    // Coming out of base - move to start position
    token.pos = 0;
    playSound(600, 0.12);
    vibrate(40);
    drawTokens();
    setTimeout(function() { checkCapture(player, tokenIdx); }, 250);
  } else {
    // Move step by step
    animateTokenMove(player, tokenIdx, game.dice);
  }
}

// Animate token movement
function animateTokenMove(player, tokenIdx, steps) {
  var token = player.tokens[tokenIdx];
  var startPos = token.pos;
  var currentStep = 0;
  
  function moveStep() {
    if (currentStep < steps) {
      currentStep++;
      token.pos = startPos + currentStep;
      playSound(400 + currentStep * 40, 0.08);
      vibrate(20);
      drawTokens();
      setTimeout(moveStep, 140);
    } else {
      checkCapture(player, tokenIdx);
    }
  }
  moveStep();
}

// Check if token captured opponent
function checkCapture(player, tokenIdx) {
  var token = player.tokens[tokenIdx];
  var captured = false;
  
  // Only check capture if on main track (not in home path)
  if (token.pos >= 0 && token.pos < 51) {
    var myGlobalPos = (START_POS[player.color] + token.pos) % 52;
    
    // Check if this is a safe spot
    if (SAFE_SPOTS.indexOf(myGlobalPos) === -1) {
      // Check each opponent
      game.players.forEach(function(opponent) {
        if (opponent === player) return;
        
        opponent.tokens.forEach(function(oppToken) {
          if (oppToken.pos >= 0 && oppToken.pos < 51) {
            var oppGlobalPos = (START_POS[opponent.color] + oppToken.pos) % 52;
            if (oppGlobalPos === myGlobalPos) {
              // Capture! Send back to base
              oppToken.pos = -1;
              captured = true;
              playSound(200, 0.25);
              vibrate([100, 50, 150]);
              turnText.textContent = 'Captured ' + COLOR_NAMES[opponent.color] + '!';
            }
          }
        });
      });
    }
  }
  
  finishMove(player, tokenIdx, captured);
}

// Complete the move
function finishMove(player, tokenIdx, captured) {
  var token = player.tokens[tokenIdx];
  
  // Check if token reached home
  if (token.pos >= 57) {
    player.score++;
    playSound(700, 0.2);
    vibrate([50, 30, 80, 30, 100]);
    turnText.textContent = COLOR_NAMES[player.color] + ' scored!';
    
    // Check for win
    if (player.score >= 4) {
      game.phase = 'won';
      turnText.textContent = player.name + ' WINS! 🎉🏆';
      playSound(880, 0.4);
      vibrate([200, 100, 200, 100, 400]);
      clearInterval(turnTimerInterval);
      clearInterval(gameTimerInterval);
      drawTokens();
      updateUI();
      return;
    }
  }
  
  drawTokens();
  
  // Extra turn for 6 or capture
  if (game.dice === 6 || captured) {
    game.phase = 'roll';
    isProcessing = false;
    resetTurnTimer();
    updateUI();
    if (player.bot) setTimeout(function() { rollDice(game.turn); }, 700);
  } else {
    setTimeout(function() {
      isProcessing = false;
      nextTurn();
    }, 300);
  }
}

// Bot token selection
function botSelectToken(player) {
  if (isProcessing) return;
  
  var movable = [];
  player.tokens.forEach(function(token, idx) {
    if (token.canMove) movable.push({ idx: idx, pos: token.pos });
  });
  
  if (movable.length === 0) return;
  
  // Simple AI: prefer moving tokens already on track
  var onTrack = movable.filter(function(m) { return m.pos >= 0; });
  var choice;
  
  if (onTrack.length > 0) {
    // Pick the one furthest ahead
    onTrack.sort(function(a, b) { return b.pos - a.pos; });
    choice = onTrack[0].idx;
  } else {
    choice = movable[0].idx;
  }
  
  selectToken(player, choice);
}

// Next turn
function nextTurn() {
  game.turn = (game.turn + 1) % game.players.length;
  game.phase = 'roll';
  game.dice = 0;
  game.sixCount = 0;
  
  resetTurnTimer();
  updateUI();
  drawTokens();
  
  if (game.players[game.turn].bot) {
    setTimeout(function() { rollDice(game.turn); }, 800);
  }
}

// Turn timer (120 seconds)
function resetTurnTimer() {
  turnTimeLeft = 120;
  clearInterval(turnTimerInterval);
  updateTurnTimerDisplay();
  
  turnTimerInterval = setInterval(function() {
    turnTimeLeft--;
    updateTurnTimerDisplay();
    
    if (turnTimeLeft <= 0) {
      clearInterval(turnTimerInterval);
      if (game && game.phase !== 'won') {
        turnText.textContent = 'Time out! Skipping...';
        playSound(250, 0.3);
        setTimeout(function() {
          isProcessing = false;
          nextTurn();
        }, 1000);
      }
    }
  }, 1000);
}

function updateTurnTimerDisplay() {
  var timerEl = document.getElementById('timer' + game.turn);
  if (timerEl) {
    timerEl.textContent = turnTimeLeft;
    timerEl.style.background = turnTimeLeft <= 10 ? '#c0392b' : '#e74c3c';
  }
}

// Game timer
function startGameTimer() {
  gameTime = 300;
  clearInterval(gameTimerInterval);
  updateGameTimerDisplay();
  
  gameTimerInterval = setInterval(function() {
    gameTime--;
    updateGameTimerDisplay();
  }, 1000);
}

function updateGameTimerDisplay() {
  var mins = Math.floor(gameTime / 60);
  var secs = gameTime % 60;
  gameTimerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// Setup dice click handlers
function setupDiceHandlers() {
  for (var i = 0; i < 4; i++) {
    (function(idx) {
      var diceEl = document.getElementById('dice' + idx);
      if (diceEl) {
        diceEl.onclick = function(e) {
          e.stopPropagation();
          if (game && game.turn === idx && !game.players[idx].bot && game.phase === 'roll' && !isProcessing) {
            rollDice(idx);
          }
        };
      }
    })(i);
  }
}

// Start game
function startGame() {
  var numP = parseInt(document.getElementById('numPlayers').value);
  var name = document.getElementById('playerName').value || 'You';
  
  var players = [];
  for (var i = 0; i < numP; i++) {
    players.push({
      name: i === 0 ? name : 'Bot ' + i,
      color: COLORS[i],
      bot: i > 0,
      score: 0,
      tokens: [
        { pos: -1, canMove: false },
        { pos: -1, canMove: false },
        { pos: -1, canMove: false },
        { pos: -1, canMove: false }
      ]
    });
  }
  
  // Show/hide player cards based on player count
  for (var i = 0; i < 4; i++) {
    var card = document.getElementById('p' + i);
    if (card) card.style.display = i < numP ? 'flex' : 'none';
  }
  
  game = {
    players: players,
    turn: 0,
    phase: 'roll',
    dice: 0,
    sixCount: 0
  };
  
  setupScreen.classList.add('hide');
  buildGrid();
  drawBaseCircles();
  drawTokens();
  updateUI();
  resetTurnTimer();
  startGameTimer();
  setupDiceHandlers();
  
  playSound(440, 0.2);
}

// Event listeners
document.getElementById('startBtn').onclick = startGame;
document.getElementById('settingsBtn').onclick = function() {
  settingsModal.classList.remove('hide');
};
document.getElementById('closeModal').onclick = function() {
  settingsModal.classList.add('hide');
};
document.getElementById('soundToggle').onclick = function() {
  soundOn = !soundOn;
  this.classList.toggle('on', soundOn);
};
document.getElementById('vibToggle').onclick = function() {
  vibOn = !vibOn;
  this.classList.toggle('on', vibOn);
};
document.getElementById('exitBtn').onclick = function() {
  if (confirm('Exit game?')) {
    clearInterval(turnTimerInterval);
    clearInterval(gameTimerInterval);
    game = null;
    isProcessing = false;
    setupScreen.classList.remove('hide');
  }
};

// Initialize
buildGrid();
drawBaseCircles();
for (var i = 0; i < 4; i++) drawDiceFace(i, 0);

})();
</script>
</body>
</html>`;

// Super Boy game placeholder
export const SUPERBOY_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Super Boy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#87CEEB}
.coming-soon{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:system-ui;text-align:center;padding:20px}
.title{font-size:32px;font-weight:900;color:#2c3e50;margin-bottom:10px}
.subtitle{font-size:16px;color:#7f8c8d}
</style>
</head>
<body>
<div class="coming-soon">
<div class="title">🎮 Super Boy</div>
<div class="subtitle">Coming Soon!</div>
</div>
</body>
</html>`;
