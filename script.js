const ROWS = 9;
const COLUMNS = 9;
const MINE_COUNT = 10;

const boardElement = document.querySelector("#board");
const mineCountElement = document.querySelector("#mine-count");
const timerElement = document.querySelector("#timer");
const messageElement = document.querySelector("#message");
const restartButton = document.querySelector("#restart");

let cells = [];
let minePositions = new Set();
let boardGenerated = false;
let gameStarted = false;
let gameOver = false;
let elapsedSeconds = 0;
let timerId = null;

function createCells() {
  return Array.from({ length: ROWS * COLUMNS }, (_, index) => ({
    index,
    mine: false,
    adjacentMines: 0,
    revealed: false,
    flagged: false,
  }));
}

function getNeighbors(index) {
  const row = Math.floor(index / COLUMNS);
  const column = index % COLUMNS;
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;

      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;
      if (
        neighborRow >= 0 &&
        neighborRow < ROWS &&
        neighborColumn >= 0 &&
        neighborColumn < COLUMNS
      ) {
        neighbors.push(neighborRow * COLUMNS + neighborColumn);
      }
    }
  }

  return neighbors;
}

function generateBoard(firstIndex) {
  const safeZone = new Set([firstIndex, ...getNeighbors(firstIndex)]);
  const availablePositions = cells
    .map((cell) => cell.index)
    .filter((index) => !safeZone.has(index));

  for (let index = availablePositions.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [availablePositions[index], availablePositions[randomIndex]] = [
      availablePositions[randomIndex],
      availablePositions[index],
    ];
  }

  minePositions = new Set(availablePositions.slice(0, MINE_COUNT));
  cells.forEach((cell) => {
    cell.mine = minePositions.has(cell.index);
    cell.adjacentMines = getNeighbors(cell.index).filter((neighbor) =>
      minePositions.has(neighbor),
    ).length;
  });
  boardGenerated = true;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  cells.forEach((cell) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.dataset.index = cell.index;

    if (cell.revealed) {
      button.classList.add("cell--revealed");
      if (cell.mine) {
        button.classList.add("cell--mine");
        button.textContent = "✹";
        button.setAttribute("aria-label", `${cell.index + 1}번 칸, 지뢰`);
      } else if (cell.adjacentMines > 0) {
        button.classList.add(`cell--number-${cell.adjacentMines}`);
        button.textContent = cell.adjacentMines;
        button.setAttribute(
          "aria-label",
          `${cell.index + 1}번 칸, 주변 지뢰 ${cell.adjacentMines}개`,
        );
      } else {
        button.setAttribute("aria-label", `${cell.index + 1}번 칸, 빈 칸`);
      }
    } else if (cell.flagged) {
      button.classList.add("cell--flagged");
      button.textContent = "⚑";
      button.setAttribute("aria-label", `${cell.index + 1}번 칸, 깃발`);
    } else {
      button.setAttribute("aria-label", `${cell.index + 1}번 칸, 닫힘`);
    }

    if (gameOver && cell.flagged && !cell.mine) {
      button.classList.add("cell--wrong");
      button.textContent = "✕";
    }
    if (gameOver) button.disabled = true;

    fragment.append(button);
  });

  boardElement.replaceChildren(fragment);
}

function updateMineCount() {
  const flagCount = cells.filter((cell) => cell.flagged).length;
  mineCountElement.value = String(MINE_COUNT - flagCount);
  mineCountElement.textContent = String(MINE_COUNT - flagCount);
}

function startTimer() {
  if (gameStarted) return;
  gameStarted = true;
  timerId = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.value = String(elapsedSeconds).padStart(3, "0");
    timerElement.textContent = String(elapsedSeconds).padStart(3, "0");
  }, 1000);
}

function revealCell(index) {
  const cell = cells[index];
  if (cell.revealed || cell.flagged || gameOver) return;

  if (!boardGenerated) generateBoard(index);
  startTimer();
  cell.revealed = true;

  if (cell.mine) {
    finishGame(false);
    return;
  }

  if (cell.adjacentMines === 0) {
    const queue = [index];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      getNeighbors(queue[cursor]).forEach((neighborIndex) => {
        const neighbor = cells[neighborIndex];
        if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) {
          neighbor.revealed = true;
          if (neighbor.adjacentMines === 0) queue.push(neighborIndex);
        }
      });
    }
  }

  if (cells.filter((item) => !item.mine && item.revealed).length === cells.length - MINE_COUNT) {
    finishGame(true);
    return;
  }

  messageElement.textContent = "좋아요! 지뢰를 피해 계속 열어보세요.";
  renderBoard();
}

function toggleFlag(index) {
  const cell = cells[index];
  if (gameOver || cell.revealed) return;

  cell.flagged = !cell.flagged;
  updateMineCount();
  renderBoard();
}

function finishGame(won) {
  gameOver = true;
  window.clearInterval(timerId);
  timerId = null;

  if (won) {
    cells.forEach((cell) => {
      if (cell.mine) cell.flagged = true;
    });
    messageElement.textContent = "축하합니다! 모든 안전한 칸을 열었어요.";
    restartButton.textContent = "😎";
  } else {
    cells.forEach((cell) => {
      if (cell.mine) cell.revealed = true;
    });
    messageElement.textContent = "앗, 지뢰를 밟았어요. 다시 도전해보세요!";
    restartButton.textContent = "😵";
  }

  updateMineCount();
  renderBoard();
}

function startNewGame() {
  window.clearInterval(timerId);
  cells = createCells();
  minePositions = new Set();
  boardGenerated = false;
  gameStarted = false;
  gameOver = false;
  elapsedSeconds = 0;
  timerId = null;
  timerElement.value = "000";
  timerElement.textContent = "000";
  restartButton.textContent = "🙂";
  messageElement.textContent = "칸을 열어 게임을 시작하세요.";
  updateMineCount();
  renderBoard();
}

boardElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button || !boardElement.contains(button)) return;
  revealCell(Number(button.dataset.index));
});

boardElement.addEventListener("contextmenu", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button || !boardElement.contains(button)) return;
  event.preventDefault();
  toggleFlag(Number(button.dataset.index));
});

restartButton.addEventListener("click", startNewGame);

startNewGame();
