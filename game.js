const SIZE = 4;
const TOTAL = SIZE * SIZE;

const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const winOverlay = document.getElementById('win-overlay');
const winStatsEl = document.getElementById('win-stats');

let tiles = [];
let emptyIndex = TOTAL - 1;
let moves = 0;
let seconds = 0;
let timerInterval = null;
let gameStarted = false;
let isAnimating = false;

function solvedState() {
  const arr = [];
  for (let i = 1; i < TOTAL; i++) arr.push(i);
  arr.push(0);
  return arr;
}

function countInversions(arr) {
  let count = 0;
  const filtered = arr.filter((n) => n !== 0);
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      if (filtered[i] > filtered[j]) count++;
    }
  }
  return count;
}

function isSolvable(arr) {
  const inversions = countInversions(arr);
  const blankRow = Math.floor(arr.indexOf(0) / SIZE);
  const blankRowFromBottom = SIZE - blankRow;
  return (inversions + blankRowFromBottom) % 2 === 1;
}

function shuffle() {
  const arr = Array.from({ length: TOTAL - 1 }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  arr.push(0);

  if (!isSolvable(arr)) {
    [arr[TOTAL - 2], arr[TOTAL - 3]] = [arr[TOTAL - 3], arr[TOTAL - 2]];
  }

  if (arraysEqual(arr, solvedState())) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }

  return arr;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function indexToRowCol(index) {
  return { row: Math.floor(index / SIZE), col: index % SIZE };
}

function canSlide(index) {
  if (index === emptyIndex) return false;
  const pc = indexToRowCol(index);
  const pe = indexToRowCol(emptyIndex);
  return pc.row === pe.row || pc.col === pe.col;
}

function getSlideStep(from, to) {
  const pf = indexToRowCol(from);
  const pt = indexToRowCol(to);
  if (pf.row === pt.row) {
    return pt.col > pf.col ? 1 : -1;
  }
  return pt.row > pf.row ? SIZE : -SIZE;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    seconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  stopTimer();
  seconds = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

function updateMovesDisplay() {
  movesEl.textContent = moves;
}

function isSolved() {
  return arraysEqual(tiles, solvedState());
}

function render() {
  boardEl.innerHTML = '';
  tiles.forEach((value, index) => {
    const tile = document.createElement('button');
    tile.className = 'tile' + (value === 0 ? ' empty' : '');
    tile.textContent = value === 0 ? '' : value;
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', value === 0 ? 'Пустая клетка' : `Плитка ${value}`);
    if (value !== 0) {
      tile.addEventListener('click', () => tryMove(index));
    }
    boardEl.appendChild(tile);
  });
}

function tryMove(index) {
  if (isAnimating || !canSlide(index)) return;

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  const step = getSlideStep(index, emptyIndex);
  for (let i = emptyIndex; i !== index; i -= step) {
    tiles[i] = tiles[i - step];
  }
  tiles[index] = 0;
  emptyIndex = index;
  moves++;
  updateMovesDisplay();
  render();

  if (isSolved()) {
    stopTimer();
    showWin();
  }
}

function showWin() {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
  winStatsEl.textContent = `Вы собрали головоломку за ${moves} ${pluralMoves(moves)} и ${timeStr}`;
  winOverlay.classList.remove('hidden');
}

function pluralMoves(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'ходов';
  if (mod10 === 1) return 'ход';
  if (mod10 >= 2 && mod10 <= 4) return 'хода';
  return 'ходов';
}

function newGame(shuffleBoard = true) {
  winOverlay.classList.add('hidden');
  moves = 0;
  gameStarted = false;
  resetTimer();
  updateMovesDisplay();
  tiles = shuffleBoard ? shuffle() : solvedState();
  emptyIndex = tiles.indexOf(0);
  render();
}

document.getElementById('new-game').addEventListener('click', () => newGame(true));
document.getElementById('shuffle').addEventListener('click', () => newGame(true));
document.getElementById('play-again').addEventListener('click', () => newGame(true));

document.addEventListener('keydown', (e) => {
  if (isAnimating) return;
  const { row, col } = indexToRowCol(emptyIndex);
  let target = -1;

  switch (e.key) {
    case 'ArrowUp':
      if (row < SIZE - 1) target = emptyIndex + SIZE;
      break;
    case 'ArrowDown':
      if (row > 0) target = emptyIndex - SIZE;
      break;
    case 'ArrowLeft':
      if (col < SIZE - 1) target = emptyIndex + 1;
      break;
    case 'ArrowRight':
      if (col > 0) target = emptyIndex - 1;
      break;
    default:
      return;
  }

  e.preventDefault();
  if (target !== -1) tryMove(target);
});

let touchStartX = 0;
let touchStartY = 0;

boardEl.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

boardEl.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const threshold = 30;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  const { row, col } = indexToRowCol(emptyIndex);
  let target = -1;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && col > 0) target = emptyIndex - 1;
    else if (dx < 0 && col < SIZE - 1) target = emptyIndex + 1;
  } else {
    if (dy > 0 && row > 0) target = emptyIndex - SIZE;
    else if (dy < 0 && row < SIZE - 1) target = emptyIndex + SIZE;
  }

  if (target !== -1) tryMove(target);
}, { passive: true });

newGame(true);
