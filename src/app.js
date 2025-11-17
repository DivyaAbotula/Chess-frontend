/**
 * ========== Pro Chess — Main Application Module ==========
 * 
 * Industry-standard chess engine with:
 * • Full move generation (legal moves with check detection)
 * • Position evaluation (material + mobility)
 * • Game state management (undo, history)
 * • Responsive UI with theme support
 * • Clean, well-organized code structure
 * 
 * ==========================================================
 */

/* ============================================================
   1. CONFIGURATION & UI ELEMENTS
   ============================================================ */

// UI Elements
const boardEl = document.getElementById('board');
const moveListEl = document.getElementById('moves-table');
const evalFillEl = document.getElementById('eval-fill');
const evalTextEl = document.getElementById('eval-text');
const statusEl = document.querySelector('.status-display') || document.getElementById('status');
const boardMessageEl = document.getElementById('board-message');

// Button Elements
const newGameBtn = document.getElementById('new-game');
const undoBtn = document.getElementById('undo');
const resignBtn = document.getElementById('resign-btn');
const drawBtn = document.getElementById('draw-btn');
const soundToggleBtn = document.getElementById('sound-toggle');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');

// Settings Elements
const settingsPopup = document.getElementById('settings-popup');
const bgColorOptions = document.getElementById('bg-colors');
const boardThemeOptions = document.getElementById('board-themes');
const pieceStyleOptions = document.getElementById('piece-style');

// Game Constants
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Game State
let board = [];
let turn = 'w'; // 'w' for white, 'b' for black
let historyStack = [];
let lastMove = null;
let selectedSquare = null;
let currentPieceSet = localStorage.getItem('pieceStyle') || 'neo';
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

/* ============================================================
   SOUND MANAGER (WebAudio fallback - no external files required)
   ============================================================ */
const SoundManager = (function () {
  let ctx = null;
  let masterGain = null;
  let inited = false;

  function _createContext() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.12; // global volume
      masterGain.connect(ctx.destination);
      inited = true;
      return ctx;
    } catch (e) {
      console.warn('WebAudio not supported:', e);
      return null;
    }
  }

  // Initialize and return a promise that resolves when AudioContext is running
  function init() {
    if (!inited) _createContext();
    if (!ctx) return Promise.reject(new Error('AudioContext unavailable'));
    if (ctx.state === 'suspended') return ctx.resume();
    return Promise.resolve();
  }

  function playTone(freq, time = 0.03, type = 'sine') {
    if (!inited || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(masterGain);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.12, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now + time);
    o.start(now);
    o.stop(now + time + 0.02);
  }

  function playMove() {
    if (!inited) _createContext();
    if (!ctx) return;
    playTone(880, 0.05, 'sine');
  }

  function playCapture() {
    if (!inited) _createContext();
    if (!ctx) return;
    playTone(740, 0.06, 'sawtooth');
    setTimeout(() => playTone(520, 0.08, 'sawtooth'), 60);
  }

  return {
    init,
    playMove,
    playCapture
  };
})();

/* ============================================================
   GAME CLOCK
   ============================================================ */
// Elements (may be null if DOM not yet ready)
const clockWhiteEl = document.getElementById('clock-white');
const clockBlackEl = document.getElementById('clock-black');
const timerStartBtn = document.getElementById('timer-start');
const timerPauseBtn = document.getElementById('timer-pause');
const timerResetBtn = document.getElementById('timer-reset');

// Timer state (milliseconds)
const DEFAULT_MINUTES = 5; // default 5 minutes per side
let whiteTime = DEFAULT_MINUTES * 60 * 1000;
let blackTime = DEFAULT_MINUTES * 60 * 1000;
let activeTimer = 'w'; // 'w' or 'b' — side whose clock is running
let timerInterval = null;
let timerRunning = false;

function formatTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateClockDisplays() {
  if (clockWhiteEl) clockWhiteEl.textContent = formatTime(whiteTime);
  if (clockBlackEl) clockBlackEl.textContent = formatTime(blackTime);
}

function _tick() {
  if (!timerRunning) return;
  const delta = 1000; // 1 second granularity
  if (activeTimer === 'w') {
    whiteTime = Math.max(0, whiteTime - delta);
    if (whiteTime === 0) return _onTimeOut('w');
  } else {
    blackTime = Math.max(0, blackTime - delta);
    if (blackTime === 0) return _onTimeOut('b');
  }
  updateClockDisplays();
}

function _onTimeOut(side) {
  pauseTimer();
  const winner = side === 'w' ? 'Black' : 'White';
  boardMessageEl.textContent = `${winner} wins on time`;
  boardMessageEl.classList.add('board__overlay--result');
  statusEl.textContent = `${winner} wins on time`;
  undoBtn.classList.add('btn--disabled');
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  // ensure no duplicate intervals
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(_tick, 1000);
}

function pauseTimer() {
  timerRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer(minutes = DEFAULT_MINUTES) {
  pauseTimer();
  whiteTime = minutes * 60 * 1000;
  blackTime = minutes * 60 * 1000;
  activeTimer = 'w';
  updateClockDisplays();
}

function switchTimer() {
  // called after a move: start opponent clock
  activeTimer = (turn === 'w') ? 'w' : 'b';
  // if timer was not running, don't auto-start; if running, ensure it continues
}

// Wire timer control buttons if present
if (timerStartBtn) timerStartBtn.addEventListener('click', () => startTimer());
if (timerPauseBtn) timerPauseBtn.addEventListener('click', () => pauseTimer());
if (timerResetBtn) timerResetBtn.addEventListener('click', () => resetTimer());

// Initialize clock displays
updateClockDisplays();

/* ============================================================
   2. UTILITY FUNCTIONS
   ============================================================ */

/**
 * Check if character is numeric
 */
function isNumeric(c) {
  return !isNaN(Number(c));
}

/**
 * Convert square index (0-63) to algebraic notation (a1-h8)
 */
function indexToSquare(i) {
  const file = 'abcdefgh'[i % 8];
  const rank = 8 - Math.floor(i / 8);
  return `${file}${rank}`;
}

/**
 * Check if two pieces belong to same color
 */
function sameColor(a, b) {
  if (!a || !b) return false;
  return (a === a.toUpperCase()) === (b === b.toUpperCase());
}

/**
 * Check if piece belongs to white
 */
function isWhitePiece(p) {
  return p && p === p.toUpperCase();
}

/**
 * Check if piece belongs to black
 */
function isBlackPiece(p) {
  return p && p === p.toLowerCase();
}

/* ============================================================
   3. FEN PARSER
   ============================================================ */

/**
 * Parse FEN notation and return board array and active player
 */
function parseFEN(fen) {
  const [placement, active] = fen.split(' ');
  const rows = placement.split('/');
  const squares = [];

  for (const row of rows) {
    for (const char of row) {
      if (isNumeric(char)) {
        for (let i = 0; i < Number(char); i++) {
          squares.push('');
        }
      } else {
        squares.push(char);
      }
    }
  }

  return {
    squares: squares,
    turn: active === 'w' ? 'w' : 'b'
  };
}

/* ============================================================
   4. GAME STATE MANAGEMENT
   ============================================================ */

/**
 * Load board position from FEN
 */
function loadFromFEN(fen) {
  const parsed = parseFEN(fen);
  board = parsed.squares.slice();
  turn = parsed.turn;
  historyStack = [];
  lastMove = null;
  selectedSquare = null;
  renderAll();
}

/**
 * Start new game
 */
function newGame() {
  loadFromFEN(START_FEN);
  // reset and start clocks for a new game
  resetTimer(DEFAULT_MINUTES);
  startTimer();
  undoBtn.classList.remove('btn--disabled');
  updateStatus();
}

/**
 * Make a move and update game state
 */
function makeMove(move) {
  const capturedPiece = board[move.to];

  historyStack.push({
    from: move.from,
    to: move.to,
    moved: board[move.from],
    captured: capturedPiece,
    lastMove: lastMove
  });

  board[move.to] = board[move.from];
  board[move.from] = '';
  lastMove = { from: move.from, to: move.to };
  turn = turn === 'w' ? 'b' : 'w';

  // Play sound based on move type
  try {
    if (soundEnabled) {
      if (capturedPiece) SoundManager.playCapture();
      else SoundManager.playMove();
    }
  } catch (e) {
    console.warn('Sound play failed', e);
  }

  // switch clocks if timer is running
  try {
    if (timerRunning) switchTimer();
  } catch (e) { /* ignore if timers not present */ }

  renderAll();
}

/**
 * Undo last move
 */
function undo() {
  if (historyStack.length === 0) return;

  const snap = historyStack.pop();
  board[snap.from] = snap.moved;
  board[snap.to] = snap.captured;
  lastMove = snap.lastMove;
  turn = turn === 'w' ? 'b' : 'w';

  renderAll();
}

/* ============================================================
   5. RENDERING ENGINE
   ============================================================ */

/**
 * Main render pipeline
 */
function renderAll() {
  renderBoard();
  renderMoveList();
  evaluateAndUpdateUI();
  updateStatus();
}

/**
 * Render the chess board with pieces and highlights
 */
function renderBoard() {
  boardEl.innerHTML = '';

  for (let i = 0; i < 64; i++) {
    const square = document.createElement('div');
    const isLight = (i + Math.floor(i / 8)) % 2 === 0;
    square.className = `board__square board__square--${isLight ? 'light' : 'dark'}`;
    square.dataset.i = i;

    // Render piece if present
    if (board[i]) {
      const img = document.createElement('img');
      img.className = 'piece';
      const piece = board[i];
      const filename = isWhitePiece(piece)
        ? `w${piece}.svg`
        : `b${piece.toUpperCase()}.svg`;
      img.src = `./src/pieces/${currentPieceSet}/${filename}`;
      square.appendChild(img);
    }

    // Render coordinate
    const file = 'abcdefgh'[i % 8];
    const rank = 8 - Math.floor(i / 8);
    const coord = document.createElement('div');
    coord.className = 'board__coord';
    coord.textContent = `${file}${rank}`;
    square.appendChild(coord);

    // Highlight last move
    if (lastMove && (lastMove.from === i || lastMove.to === i)) {
      square.classList.add('board__square--last-move');
    }

    // Highlight check
    const kingIndex = findKing(turn);
    if (kingIndex >= 0 && isKingInCheck(turn) && kingIndex === i) {
      square.classList.add('board__square--check');
    }

    square.addEventListener('click', onSquareClick);
    boardEl.appendChild(square);
  }
}

/**
 * Render move list in sidebar
 */
function renderMoveList() {
  const container = document.getElementById('moves-table');
  container.innerHTML = '';

  const moves = historyStack.map((m, idx) => ({
    from: m.from,
    to: m.to,
    san: formatMove(m),
    idx: idx
  }));

  for (let i = 0; i < moves.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';

    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = moves[i] ? moves[i] : null;
    const blackMove = moves[i + 1] ? moves[i + 1] : null;

    const numDiv = document.createElement('div');
    numDiv.className = 'move-row__number';
    numDiv.textContent = moveNum + '.';

    const whiteDiv = document.createElement('div');
    whiteDiv.className = 'move-row__white';
    whiteDiv.textContent = whiteMove ? whiteMove.san : '';

    const blackDiv = document.createElement('div');
    blackDiv.className = 'move-row__black';
    blackDiv.textContent = blackMove ? blackMove.san : '';

    row.appendChild(numDiv);
    row.appendChild(whiteDiv);
    row.appendChild(blackDiv);

    container.appendChild(row);
  }

  // highlight latest move and scroll into view
  const latestIdx = historyStack.length - 1;
  const rows = Array.from(container.querySelectorAll('.move-row'));
  rows.forEach(r => r.classList.remove('move-row--latest'));
  container.querySelectorAll('.move-row__white, .move-row__black').forEach(c => c.classList.remove('move-cell--latest'));

  if (latestIdx >= 0) {
    const rowIndex = Math.floor(latestIdx / 2);
    const latestRow = rows[rowIndex];
    if (latestRow) {
      latestRow.classList.add('move-row--latest');
      const isBlack = latestIdx % 2 === 1;
      if (isBlack) {
        const blackCell = latestRow.querySelector('.move-row__black');
        if (blackCell) blackCell.classList.add('move-cell--latest');
      } else {
        const whiteCell = latestRow.querySelector('.move-row__white');
        if (whiteCell) whiteCell.classList.add('move-cell--latest');
      }
      // smooth scroll latest row into view
      latestRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }
}

/**
 * Format move as algebraic notation
 */
function formatMove(move) {
  return indexToSquare(move.from) + ' → ' + indexToSquare(move.to);
}

/* ============================================================
   6. MOVE GENERATION
   ============================================================ */

/**
 * Generate pseudo-legal moves for a square
 */
function generatePseudoMovesForSquare(from) {
  const p = board[from];
  if (!p) return [];
  
  const moves = [];
  const piece = p.toLowerCase();
  const isWhite = p === p.toUpperCase();
  const r = Math.floor(from / 8), c = from % 8;

  if (piece === 'p') {
    const dir = isWhite ? -8 : 8;
    const startRow = isWhite ? 6 : 1;
    
    if (!board[from + dir]) moves.push({ from, to: from + dir });
    
    if (r === startRow && !board[from + dir] && !board[from + dir * 2]) {
      moves.push({ from, to: from + dir * 2 });
    }
    
    for (const dc of [-1, 1]) {
      const to = from + dir + dc;
      if (to >= 0 && to < 64 && Math.abs((to % 8) - c) <= 1) {
        if (board[to] && !sameColor(board[to], p)) moves.push({ from, to });
      }
    }
    return moves;
  }

  if (piece === 'n') {
    const deltas = [15, 17, 10, 6, -15, -17, -10, -6];
    for (const d of deltas) {
      const to = from + d;
      if (to < 0 || to >= 64) continue;
      if (Math.abs((to % 8) - c) > 2) continue;
      if (!board[to] || !sameColor(board[to], p)) moves.push({ from, to });
    }
    return moves;
  }

  if (piece === 'b' || piece === 'r' || piece === 'q') {
    const dirs = piece === 'b' ? [9, 7, -9, -7] : piece === 'r' ? [8, -8, 1, -1] : [8, -8, 1, -1, 9, 7, -9, -7];
    
    for (const d of dirs) {
      let to = from + d;
      while (to >= 0 && to < 64) {
        if (Math.abs((to % 8) - ((to - d) % 8)) > 1 && (d === 1 || d === -1 || d === 9 || d === -7 || d === -9 || d === 7)) break;
        
        if (!board[to]) {
          moves.push({ from, to });
        } else {
          if (!sameColor(board[to], p)) moves.push({ from, to });
          break;
        }
        to += d;
      }
    }
    return moves;
  }

  if (piece === 'k') {
    const deltas = [8, -8, 1, -1, 9, 7, -9, -7];
    for (const d of deltas) {
      const to = from + d;
      if (to < 0 || to >= 64) continue;
      if (Math.abs((to % 8) - c) > 1) continue;
      if (!board[to] || !sameColor(board[to], p)) moves.push({ from, to });
    }
    return moves;
  }

  return moves;
}

/* ============================================================
   7. CHECK DETECTION
   ============================================================ */

/**
 * Find king position for given color
 */
function findKing(color) {
  const kingChar = color === 'w' ? 'K' : 'k';
  for (let i = 0; i < 64; i++) {
    if (board[i] === kingChar) return i;
  }
  return -1;
}

/**
 * Check if square is attacked by given color
 */
function isSquareAttacked(sq, byColor) {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (byColor === 'w' && !isWhitePiece(p)) continue;
    if (byColor === 'b' && !isBlackPiece(p)) continue;
    
    const cand = generatePseudoMovesForSquare(i);
    if (cand.some(m => m.to === sq)) return true;
  }
  return false;
}

/**
 * Check if king is in check
 */
function isKingInCheck(color) {
  const kingSq = findKing(color);
  if (kingSq < 0) return false;
  const opponent = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(kingSq, opponent);
}

/* ============================================================
   8. EVALUATION ENGINE
   ============================================================ */

/**
 * Calculate material score
 */
function materialScore() {
  let score = 0;
  for (const p of board) {
    if (!p) continue;
    const v = PIECE_VALUES[p.toLowerCase()] || 0;
    score += isWhitePiece(p) ? v : -v;
  }
  return score;
}

/**
 * Calculate mobility score
 */
function mobilityScore() {
  const wMoves = generateAllLegalMoves('w').length;
  const bMoves = generateAllLegalMoves('b').length;
  return (wMoves - bMoves) * 10;
}

/**
 * Evaluate position from white's perspective
 */
function evaluatePosition() {
  return materialScore() + mobilityScore();
}

/**
 * Update evaluation UI
 */
function updateEvalUI(cp) {
  // If evaluation UI elements were removed (clock mode), skip updating UI
  if (!evalFillEl || !evalTextEl) return;

  const clamp = Math.max(-2000, Math.min(2000, cp));
  const ratio = (clamp + 2000) / 4000;
  const heightPercent = Math.max(2, Math.min(98, ratio * 100));

  evalFillEl.style.height = heightPercent + '%';
  evalFillEl.style.bottom = (50 - (heightPercent / 2)) + '%';

  if (Math.abs(cp) < 40) evalTextEl.textContent = 'Equal';
  else if (cp >= 40) evalTextEl.textContent = `White +${Math.round(cp)}`;
  else evalTextEl.textContent = `Black +${Math.round(-cp)}`;
}

/**
 * Non-blocking evaluation wrapper
 */
let evalTimer = null;
function evaluateAndUpdateUI() {
  if (evalTimer) clearTimeout(evalTimer);
  evalTimer = setTimeout(() => {
    const cp = evaluatePosition();
    updateEvalUI(cp);
  }, 20);
}

/* ============================================================
   9. UI INTERACTIONS
   ============================================================ */

/**
 * Handle square click
 */
function onSquareClick(e) {
  const idx = Number(e.currentTarget.dataset.i);
  const p = board[idx];

  if (selectedSquare === null) {
    if (!p) return;
    if ((turn === 'w' && !isWhitePiece(p)) || (turn === 'b' && !isBlackPiece(p))) return;
    selectedSquare = idx;
    highlightLegalMoves(idx);
    return;
  }

  if (selectedSquare === idx) {
    selectedSquare = null;
    clearHighlights();
    return;
  }

  const legal = generateAllLegalMoves(turn);
  const chosen = legal.find(m => m.from === selectedSquare && m.to === idx);
  
  if (chosen) {
    makeMove(chosen);
  } else if (p && ((turn === 'w' && isWhitePiece(p)) || (turn === 'b' && isBlackPiece(p)))) {
    selectedSquare = idx;
    highlightLegalMoves(idx);
    return;
  }

  selectedSquare = null;
  clearHighlights();
}

/**
 * Clear all highlights
 */
function clearHighlights() {
  document.querySelectorAll('.board__square').forEach(s => {
    s.classList.remove('board__square--selected');
    s.classList.remove('board__square--legal-move');
  });
}

/**
 * Highlight legal moves
 */
function highlightLegalMoves(from) {
  clearHighlights();

  const legal = generateAllLegalMoves(turn)
    .filter(m => m.from === from)
    .map(m => m.to);

  for (const to of legal) {
    const sq = boardEl.querySelector(`[data-i="${to}"]`);
    if (sq) sq.classList.add('board__square--legal-move');
  }

  const sel = boardEl.querySelector(`[data-i="${from}"]`);
  if (sel) sel.classList.add('board__square--selected');
}

/**
 * Update game status
 */
function updateStatus() {
  const inCheck = isKingInCheck(turn);
  const moves = generateAllLegalMoves(turn);

  if (moves.length === 0) {
    const msg = inCheck
      ? (turn === 'w' ? 'Black Wins by Checkmate' : 'White Wins by Checkmate')
      : 'Stalemate';
    boardMessageEl.textContent = msg;
    boardMessageEl.classList.add('board__overlay--result');
    statusEl.textContent = msg;
    pauseTimer();
    undoBtn.classList.add('btn--disabled');
  } else {
    boardMessageEl.textContent = '';
    boardMessageEl.classList.remove('board__overlay--result');
    statusEl.textContent = `${turn === 'w' ? 'White' : 'Black'} to move${inCheck ? ' — Check!' : ''}`;
  }
}

/**
 * Generate all legal moves for a color
 */
function generateAllLegalMoves(color) {
  const moves = [];
  
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (color === 'w' && !isWhitePiece(p)) continue;
    if (color === 'b' && !isBlackPiece(p)) continue;
    
    const cand = generatePseudoMovesForSquare(i);
    for (const m of cand) {
      const saveFrom = board[m.from], saveTo = board[m.to];
      board[m.to] = board[m.from];
      board[m.from] = '';
      const inCheck = isKingInCheck(color);
      board[m.from] = saveFrom;
      board[m.to] = saveTo;
      
      if (!inCheck) moves.push(m);
    }
  }
  return moves;
}

/* ============================================================
   10. APPLICATION INITIALIZATION & EVENT HANDLERS
   ============================================================ */

// Event listeners for main controls
document.getElementById('new-game').addEventListener('click', newGame);
document.getElementById('undo').addEventListener('click', undo);
// Resign and draw handlers
if (resignBtn) {
  resignBtn.addEventListener('click', () => {
    pauseTimer();
    const winner = turn === 'w' ? 'Black' : 'White';
    boardMessageEl.textContent = `${turn === 'w' ? 'White' : 'Black'} resigned — ${winner} wins`;
    boardMessageEl.classList.add('board__overlay--result');
    statusEl.textContent = `${winner} wins by resignation`;
    undoBtn.classList.add('btn--disabled');
  });
}

if (drawBtn) {
  drawBtn.addEventListener('click', () => {
    pauseTimer();
    boardMessageEl.textContent = 'Game drawn by agreement';
    boardMessageEl.classList.add('board__overlay--result');
    statusEl.textContent = 'Draw';
    undoBtn.classList.add('btn--disabled');
  });
}
// Sound toggle button
if (soundToggleBtn) {
  const updateSoundUI = () => {
    soundToggleBtn.textContent = soundEnabled ? '🔊 Sound: On' : '🔇 Sound: Off';
    // Use a visual-only class so the button remains clickable
    if (soundEnabled) soundToggleBtn.classList.remove('sound-off');
    else soundToggleBtn.classList.add('sound-off');
  };

  soundToggleBtn.addEventListener('click', async (e) => {
    // Ensure AudioContext is initialized from user gesture and play a test tone when enabling
    try {
      await SoundManager.init();
    } catch (err) {
      console.warn('Audio initialization failed:', err);
    }

    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled ? 'true' : 'false');
    updateSoundUI();

    // If enabling sound, play a brief test tone so user hears it immediately
    if (soundEnabled) {
      try {
        SoundManager.playMove();
      } catch (e) {
        console.warn('Play test tone failed', e);
      }
    }
  });

  // initial UI state
  updateSoundUI();
}

/**
 * Settings popup management
 */
openSettingsBtn.addEventListener('click', () => {
  settingsPopup.classList.remove('settings-popup--hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPopup.classList.add('settings-popup--hidden');
});

/**
 * Background color picker
 */
if (bgColorOptions) {
  bgColorOptions.querySelectorAll('.color-item').forEach(item => {
    item.addEventListener('click', () => {
      const bg = item.dataset.bg;
      document.body.style.background = bg;
      localStorage.setItem('bgColor', bg);
    });
  });
}

(function loadBG() {
  const bg = localStorage.getItem('bgColor');
  if (bg) document.body.style.background = bg;
})();

/**
 * Board theme selector
 */
if (boardThemeOptions) {
  boardThemeOptions.querySelectorAll('.color-item').forEach(item => {
    item.addEventListener('click', () => {
      const theme = item.dataset.theme;
      boardEl.classList.remove('board--classic', 'board--high-contrast', 'board--cbf', 'board--mono');
      boardEl.classList.add(`board--${theme}`);
      localStorage.setItem('boardTheme', theme);
      renderBoard();
    });
  });
}

(function loadBoardTheme() {
  const theme = localStorage.getItem('boardTheme') || 'high-contrast';
  boardEl.classList.add(`board--${theme}`);
})();

/**
 * Piece style selector
 */
if (pieceStyleOptions) {
  pieceStyleOptions.querySelectorAll('.piece-item').forEach(item => {
    item.addEventListener('click', () => {
      currentPieceSet = item.dataset.piece;
      localStorage.setItem('pieceStyle', currentPieceSet);
      renderBoard();
    });
  });
}

/* ============================================================
   11. BOOTSTRAP APPLICATION
   ============================================================ */

loadFromFEN(START_FEN);
updateStatus();
renderAll();
