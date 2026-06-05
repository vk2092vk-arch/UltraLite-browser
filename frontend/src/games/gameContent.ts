// Offline Games HTML Content - Version 1.0.3
// These are complete self-contained HTML5 games with no external dependencies
// Optimized for WebView rendering in React Native

export const LUDO_GAME_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Ludo Classic</title>
<style>
  :root{
    --bg:#10131a;
    --panel:#181d28;
    --line:#2a3244;
    --text:#eef2ff;
    --muted:#a9b3cc;
    --red:#e74c3c;
    --green:#2ecc71;
    --yellow:#f1c40f;
    --blue:#3498db;
    --redDark:#b9372b;
    --greenDark:#239a57;
    --yellowDark:#c7a400;
    --blueDark:#2379b7;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
    background: linear-gradient(180deg, #0c0f15, #141a24);
    color: var(--text);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }
  .app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 8px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--panel);
    border-radius: 12px;
    border: 1px solid var(--line);
  }
  .title { font-size: 18px; font-weight: 700; }
  .score { font-size: 14px; color: var(--muted); }
  .board-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
  canvas {
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    background: #fff;
  }
  .controls {
    display: flex;
    gap: 8px;
    padding: 8px;
    background: var(--panel);
    border-radius: 12px;
    border: 1px solid var(--line);
    align-items: center;
  }
  .turn-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .turn-label { font-size: 12px; color: var(--muted); }
  .turn-name { font-size: 16px; font-weight: 600; }
  .players {
    display: flex;
    gap: 6px;
  }
  .p {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    opacity: 0.4;
    transition: opacity 0.2s, transform 0.2s;
  }
  .p.active {
    opacity: 1;
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(255,255,255,0.3);
  }
  .dice-area {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dice {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: linear-gradient(180deg, #fafafa, #dfe6f4);
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 900;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  button {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
    color: white;
    background: linear-gradient(180deg, #3a76ff, #2558d6);
    padding: 12px 20px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    transition: transform 0.1s;
  }
  button:active { transform: scale(0.95); }
  button:disabled { opacity: 0.5; }
  .message {
    text-align: center;
    padding: 8px;
    font-size: 13px;
    color: var(--muted);
    background: var(--panel);
    border-radius: 8px;
    border: 1px solid var(--line);
  }
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <span class="title">Ludo Classic</span>
    <span class="score" id="scoreText">Tap token to move</span>
  </div>
  <div class="board-wrap">
    <canvas id="game"></canvas>
  </div>
  <div class="controls">
    <div class="turn-info">
      <span class="turn-label">Current Turn</span>
      <span class="turn-name" id="turnText">Red</span>
    </div>
    <div class="players">
      <div id="p0" class="p active" style="background:var(--red)"></div>
      <div id="p1" class="p" style="background:var(--green)"></div>
      <div id="p2" class="p" style="background:var(--yellow)"></div>
      <div id="p3" class="p" style="background:var(--blue)"></div>
    </div>
    <div class="dice-area">
      <button id="rollBtn">Roll</button>
      <div class="dice" id="diceVal">-</div>
    </div>
  </div>
  <div class="message" id="message">Roll a 6 to bring a token out!</div>
</div>

<script>
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const rollBtn = document.getElementById('rollBtn');
  const diceVal = document.getElementById('diceVal');
  const turnText = document.getElementById('turnText');
  const message = document.getElementById('message');
  const scoreText = document.getElementById('scoreText');
  const playerBoxes = [0,1,2,3].map(i => document.getElementById('p'+i));

  const N = 15;
  let cell;
  const colors = ['#e74c3c', '#2ecc71', '#f1c40f', '#3498db'];
  const darks = ['#b9372b', '#239a57', '#c7a400', '#2379b7'];
  const names = ['Red', 'Green', 'Yellow', 'Blue'];

  const mainPath = [
    [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
    [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
  ];

  const homePaths = [
    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
  ];

  const startIndex = [0, 13, 26, 39];
  const safeIndices = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

  const yard = [
    [[1,1],[4,1],[1,4],[4,4]],
    [[1,10],[4,10],[1,13],[4,13]],
    [[10,10],[13,10],[10,13],[13,13]],
    [[10,1],[13,1],[10,4],[13,4]]
  ];

  let game;

  function resize() {
    const parent = canvas.parentElement;
    const size = Math.min(parent.clientWidth, parent.clientHeight);
    canvas.width = size;
    canvas.height = size;
    cell = size / N;
    draw();
  }

  function resetGame() {
    game = {
      current: 0,
      dice: null,
      canMove: false,
      winner: null,
      tokens: Array.from({length:4}, (_,p) =>
        Array.from({length:4}, (_,t) => ({ pos:-1, finished:false, id:t, player:p }))
      )
    };
    setMsg('Roll a 6 to bring a token out!');
    diceVal.textContent = '-';
    turnUI();
    draw();
  }

  function setMsg(t) { message.textContent = t; }

  function turnUI() {
    turnText.textContent = names[game.current];
    turnText.style.color = colors[game.current];
    playerBoxes.forEach((b,i) => b.classList.toggle('active', i === game.current));
    rollBtn.disabled = !!game.winner;
  }

  function boardToPx(r, c) {
    return { x: (c + 0.5) * cell, y: (r + 0.5) * cell };
  }

  function tokenPos(token) {
    if (token.finished) return null;
    if (token.pos < 0) return null;
    if (token.pos < 52) {
      const [r, c] = mainPath[(startIndex[token.player] + token.pos) % 52];
      return boardToPx(r, c);
    }
    const hp = token.pos - 52;
    if (hp >= 0 && hp < 6) {
      const [r, c] = homePaths[token.player][hp];
      return boardToPx(r, c);
    }
    return null;
  }

  function legalMoves(player) {
    const d = game.dice;
    return game.tokens[player].filter(t => {
      if (t.finished) return false;
      if (t.pos === -1) return d === 6;
      const newPos = t.pos + d;
      return newPos <= 57;
    });
  }

  function advanceToken(token) {
    const p = token.player;
    const d = game.dice;

    if (token.pos === -1) {
      token.pos = 0;
      setMsg(names[p] + ' token entered the track!');
    } else {
      token.pos += d;
      if (token.pos === 57) {
        token.finished = true;
        setMsg(names[p] + ' token reached home!');
      } else if (token.pos < 52) {
        const boardIndex = (startIndex[p] + token.pos) % 52;
        if (!safeIndices.has(boardIndex)) {
          for (let op = 0; op < 4; op++) {
            if (op === p) continue;
            for (const other of game.tokens[op]) {
              if (other.finished || other.pos < 0 || other.pos >= 52) continue;
              const oi = (startIndex[op] + other.pos) % 52;
              if (oi === boardIndex) {
                other.pos = -1;
                setMsg(names[p] + ' captured ' + names[op] + "'s token!");
              }
            }
          }
        }
      }
    }

    if (game.tokens[p].every(t => t.finished)) {
      game.winner = p;
      setMsg(names[p] + ' WINS the game!');
      scoreText.textContent = names[p] + ' wins!';
    }
  }

  function nextPlayer() {
    if (game.winner) return;
    if (game.dice !== 6) game.current = (game.current + 1) % 4;
    game.dice = null;
    game.canMove = false;
    diceVal.textContent = '-';
    turnUI();
    draw();
  }

  rollBtn.onclick = () => {
    if (game.winner || game.canMove) return;
    game.dice = 1 + Math.floor(Math.random() * 6);
    diceVal.textContent = game.dice;
    const moves = legalMoves(game.current);
    game.canMove = moves.length > 0;
    if (!game.canMove) {
      setMsg('No move possible. ' + (game.dice === 6 ? 'Roll again!' : 'Next turn.'));
      setTimeout(nextPlayer, 800);
    } else {
      setMsg('Tap a highlighted token to move ' + game.dice + ' step(s).');
    }
    draw();
  };

  function handleTap(e) {
    if (!game.canMove || game.winner) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    const scale = canvas.width / rect.width;

    const player = game.current;
    const moves = legalMoves(player);
    let picked = null;

    for (const t of moves) {
      let pos = tokenPos(t);
      if (!pos) {
        const [yr, yc] = yard[t.player][t.id];
        pos = boardToPx(yr, yc);
      }
      const dx = x * scale - pos.x;
      const dy = y * scale - pos.y;
      if (Math.hypot(dx, dy) <= cell * 0.5) {
        picked = t;
        break;
      }
    }

    if (!picked) return;
    advanceToken(picked);
    draw();

    if (game.winner) {
      game.canMove = false;
      turnUI();
      return;
    }

    if (game.dice === 6) {
      setMsg('Rolled 6 - roll again!');
      game.canMove = false;
      game.dice = null;
      diceVal.textContent = '-';
      turnUI();
      draw();
    } else {
      game.canMove = false;
      setTimeout(nextPlayer, 400);
    }
  }

  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', handleTap);

  function fillCell(r, c, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yards
    ctx.fillStyle = '#ffd8d3'; ctx.fillRect(0, 0, 6*cell, 6*cell);
    ctx.fillStyle = '#d8f7e2'; ctx.fillRect(9*cell, 0, 6*cell, 6*cell);
    ctx.fillStyle = '#d7ebff'; ctx.fillRect(9*cell, 9*cell, 6*cell, 6*cell);
    ctx.fillStyle = '#fff2b8'; ctx.fillRect(0, 9*cell, 6*cell, 6*cell);

    // Home paths
    for (let i = 0; i < 4; i++) {
      const pathColors = ['#ffd8d3', '#d8f7e2', '#d7ebff', '#fff2b8'];
      for (const [r, c] of homePaths[i]) {
        fillCell(r, c, pathColors[i]);
      }
    }

    // Main track
    for (const [r, c] of mainPath) {
      const idx = mainPath.findIndex(([rr, cc]) => rr === r && cc === c);
      fillCell(r, c, safeIndices.has(idx) ? '#e8f5e9' : '#f5f5f5');
    }

    // Center
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(6*cell, 6*cell, 3*cell, 3*cell);

    // Grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(i*cell, 0);
      ctx.lineTo(i*cell, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i*cell);
      ctx.lineTo(canvas.width, i*cell);
      ctx.stroke();
    }
  }

  function drawTokens() {
    const groups = new Map();

    for (let p = 0; p < 4; p++) {
      for (const t of game.tokens[p]) {
        if (t.finished) continue;
        let pos = tokenPos(t);
        if (!pos) {
          const [yr, yc] = yard[p][t.id];
          pos = boardToPx(yr, yc);
        }
        const key = Math.round(pos.x) + ':' + Math.round(pos.y);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ t, pos });
      }
    }

    for (const arr of groups.values()) {
      arr.forEach((o, idx) => {
        const off = arr.length > 1 ? (idx - (arr.length - 1) / 2) * (cell * 0.2) : 0;
        const x = o.pos.x + off;
        const y = o.pos.y + off;

        ctx.beginPath();
        ctx.arc(x, y, cell * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = colors[o.t.player];
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = darks[o.t.player];
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + (cell * 0.3) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.t.id + 1, x, y);
      });
    }

    if (game.canMove && !game.winner) {
      const moves = legalMoves(game.current);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      for (const t of moves) {
        let pos = tokenPos(t);
        if (!pos) {
          const [yr, yc] = yard[t.player][t.id];
          pos = boardToPx(yr, yc);
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, cell * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  function draw() {
    drawBoard();
    drawTokens();
  }

  window.addEventListener('resize', resize);
  resize();
  resetGame();
})();
</script>
</body>
</html>`;

export const SUPERBOY_GAME_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Super Boy</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #1a1a2e;
    font-family: system-ui, sans-serif;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }
  .game-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .hud {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0,0,0,0.5);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
  }
  canvas {
    flex: 1;
    width: 100%;
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .touch-controls {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: rgba(0,0,0,0.7);
  }
  .dpad {
    display: grid;
    grid-template-columns: repeat(3, 56px);
    grid-template-rows: repeat(2, 56px);
    gap: 4px;
  }
  .btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 2px solid rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #fff;
    transition: background 0.1s;
  }
  .btn:active { background: rgba(255,255,255,0.35); }
  .btn-jump {
    width: 72px;
    height: 72px;
    background: #e74c3c;
    border-color: #c0392b;
    font-size: 14px;
    font-weight: bold;
  }
  .btn-jump:active { background: #c0392b; }
  .empty { visibility: hidden; }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    text-align: center;
    z-index: 10;
  }
  .overlay.hidden { display: none; }
  .overlay h1 { font-size: 32px; margin-bottom: 12px; }
  .overlay p { font-size: 18px; color: #aaa; margin-bottom: 20px; }
  .overlay button {
    padding: 14px 32px;
    font-size: 16px;
    font-weight: bold;
    background: #2ecc71;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
</style>
</head>
<body>
<div class="game-container">
  <div class="hud">
    <span id="scoreDisplay">Score: 0</span>
    <span id="coinsDisplay">Coins: 0</span>
  </div>
  <canvas id="game"></canvas>
  <div class="touch-controls">
    <div class="dpad">
      <div class="empty"></div>
      <div class="empty"></div>
      <div class="empty"></div>
      <div class="btn" id="leftBtn">◀</div>
      <div class="empty"></div>
      <div class="btn" id="rightBtn">▶</div>
    </div>
    <div class="btn btn-jump" id="jumpBtn">JUMP</div>
  </div>
</div>

<div class="overlay hidden" id="startOverlay">
  <h1>Super Boy</h1>
  <p>Collect coins and reach the flag!</p>
  <button id="startBtn">START GAME</button>
</div>

<div class="overlay hidden" id="gameOverOverlay">
  <h1 id="endTitle">Game Over</h1>
  <p id="endScore">Score: 0</p>
  <button id="restartBtn">PLAY AGAIN</button>
</div>

<script>
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const coinsDisplay = document.getElementById('coinsDisplay');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const endTitle = document.getElementById('endTitle');
  const endScore = document.getElementById('endScore');

  const TILE = 32;
  const GRAVITY = 1800;
  const keys = { left: false, right: false, jump: false };

  const levelMap = [
    '................................................................',
    '................................................................',
    '...............C.......C........................................',
    '..........####.....####.........................................',
    '................................................................',
    '.......C.........................................................',
    '....###........C................................................',
    '...........####....###..........................................',
    '................................................................',
    '..P.............................C...C........C...........F......',
    '####....####.......####....####....####....####....####....####..'
  ];

  let world, player, camera, score, coins, gameState, enemies, flag;

  function resize() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight - 76;
  }

  function buildLevel() {
    world = { tiles: [], width: levelMap[0].length * TILE, height: levelMap.length * TILE };
    enemies = [];
    coins = 0;
    score = 0;

    for (let y = 0; y < levelMap.length; y++) {
      for (let x = 0; x < levelMap[y].length; x++) {
        const ch = levelMap[y][x];
        if (ch === '#') {
          world.tiles.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE, type: 'solid' });
        } else if (ch === 'P') {
          player = {
            x: x * TILE,
            y: y * TILE - TILE,
            w: 24,
            h: 32,
            vx: 0,
            vy: 0,
            onGround: false,
            face: 1
          };
        } else if (ch === 'C') {
          world.tiles.push({ x: x * TILE + 8, y: y * TILE + 8, r: 10, type: 'coin', taken: false });
        } else if (ch === 'F') {
          flag = { x: x * TILE, y: y * TILE - TILE * 2, w: TILE, h: TILE * 3 };
        }
      }
    }

    camera = { x: 0, y: 0 };
    updateHUD();
  }

  function updateHUD() {
    scoreDisplay.textContent = 'Score: ' + score;
    coinsDisplay.textContent = 'Coins: ' + coins;
  }

  function collides(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function solidAt(x, y) {
    for (const t of world.tiles) {
      if (t.type !== 'solid') continue;
      if (x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h) return true;
    }
    return false;
  }

  function update(dt) {
    if (gameState !== 'playing') return;

    const accel = player.onGround ? 2000 : 1200;
    const maxSpeed = 220;
    const friction = player.onGround ? 1500 : 200;

    if (keys.left) {
      player.vx -= accel * dt;
      player.face = -1;
    }
    if (keys.right) {
      player.vx += accel * dt;
      player.face = 1;
    }
    if (!keys.left && !keys.right) {
      const sign = Math.sign(player.vx);
      const drop = friction * dt;
      if (Math.abs(player.vx) <= drop) player.vx = 0;
      else player.vx -= sign * drop;
    }

    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));

    if (keys.jump && player.onGround) {
      player.vy = -580;
      player.onGround = false;
    }

    player.vy += GRAVITY * dt;
    if (player.vy > 800) player.vy = 800;

    // X movement
    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(world.width - player.w, player.x));

    for (const t of world.tiles) {
      if (t.type !== 'solid') continue;
      if (collides(player, t)) {
        if (player.vx > 0) {
          player.x = t.x - player.w;
        } else {
          player.x = t.x + t.w;
        }
        player.vx = 0;
      }
    }

    // Y movement
    player.y += player.vy * dt;
    player.onGround = false;

    for (const t of world.tiles) {
      if (t.type !== 'solid') continue;
      if (collides(player, t)) {
        if (player.vy > 0) {
          player.y = t.y - player.h;
          player.onGround = true;
        } else {
          player.y = t.y + t.h;
        }
        player.vy = 0;
      }
    }

    // Coins
    for (const t of world.tiles) {
      if (t.type !== 'coin' || t.taken) continue;
      const cx = t.x, cy = t.y, r = t.r;
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      if (Math.hypot(px - cx, py - cy) < r + 15) {
        t.taken = true;
        coins++;
        score += 10;
        updateHUD();
      }
    }

    // Flag check
    if (flag && collides(player, flag)) {
      score += 100;
      gameState = 'won';
      endTitle.textContent = 'You Win!';
      endScore.textContent = 'Final Score: ' + score;
      gameOverOverlay.classList.remove('hidden');
    }

    // Fall death
    if (player.y > world.height + 100) {
      gameState = 'over';
      endTitle.textContent = 'Game Over';
      endScore.textContent = 'Score: ' + score;
      gameOverOverlay.classList.remove('hidden');
    }

    // Camera
    camera.x = Math.max(0, Math.min(world.width - canvas.width, player.x - canvas.width / 2 + player.w / 2));
    camera.y = Math.max(0, Math.min(world.height - canvas.height, player.y - canvas.height / 2 + player.h / 2));
  }

  function draw() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.6, '#E0F4FF');
    grad.addColorStop(1, '#90EE90');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Tiles
    for (const t of world.tiles) {
      if (t.type === 'solid') {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(t.x, t.y, t.w, 8);
      } else if (t.type === 'coin' && !t.taken) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Flag
    if (flag) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(flag.x + 12, flag.y, 6, flag.h);
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(flag.x + 18, flag.y, 24, 20);
    }

    // Player
    if (gameState === 'playing' || gameState === 'won') {
      const px = player.x, py = player.y;
      
      // Body
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(px + 4, py + 8, 16, 14);
      
      // Head
      ctx.fillStyle = '#FFDBAC';
      ctx.fillRect(px + 6, py, 12, 10);
      
      // Hat
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(px + 4, py - 4, 16, 6);
      
      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(player.face === 1 ? px + 14 : px + 8, py + 3, 3, 3);
      
      // Legs
      ctx.fillStyle = '#2244AA';
      ctx.fillRect(px + 5, py + 22, 6, 10);
      ctx.fillRect(px + 13, py + 22, 6, 10);
    }

    ctx.restore();
  }

  let lastTime = 0;
  function loop(time) {
    const dt = Math.min(0.033, (time - lastTime) / 1000);
    lastTime = time;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Touch controls
  function setupTouch(id, key) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
    el.addEventListener('mousedown', () => keys[key] = true);
    el.addEventListener('mouseup', () => keys[key] = false);
    el.addEventListener('mouseleave', () => keys[key] = false);
  }

  setupTouch('leftBtn', 'left');
  setupTouch('rightBtn', 'right');
  setupTouch('jumpBtn', 'jump');

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = true;
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = false;
  });

  // Buttons
  document.getElementById('startBtn').onclick = () => {
    startOverlay.classList.add('hidden');
    gameState = 'playing';
    buildLevel();
  };

  document.getElementById('restartBtn').onclick = () => {
    gameOverOverlay.classList.add('hidden');
    gameState = 'playing';
    buildLevel();
  };

  // Init
  window.addEventListener('resize', resize);
  resize();
  gameState = 'start';
  startOverlay.classList.remove('hidden');
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
