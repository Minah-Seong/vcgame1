const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const lifeText = document.getElementById("life");
const restartBtn = document.getElementById("restartBtn");

let score = 0;
let life = 3;
let playerX = 180;
let playerSpeed = 24;
let gameRunning = true;

let items = [];
let itemCreateTimer = null;
let gameLoopTimer = null;

const gameWidth = 420;
const gameHeight = 600;
const playerWidth = 60;
const playerHeight = 60;

document.addEventListener("keydown", movePlayer);
restartBtn.addEventListener("click", restartGame);

function movePlayer(event) {
  if (!gameRunning) return;

  if (event.key === "ArrowLeft") {
    playerX -= playerSpeed;
  }

  if (event.key === "ArrowRight") {
    playerX += playerSpeed;
  }

  if (playerX < 0) {
    playerX = 0;
  }

  if (playerX > gameWidth - playerWidth) {
    playerX = gameWidth - playerWidth;
  }

  player.style.left = playerX + "px";
}

function createItem() {
  if (!gameRunning) return;

  const item = document.createElement("div");
  item.classList.add("item");
  item.textContent = "⭐";

  const randomX = Math.floor(Math.random() * (gameWidth - 36));
  item.style.left = randomX + "px";
  item.style.top = "0px";

  gameArea.appendChild(item);

  items.push({
    element: item,
    x: randomX,
    y: 0,
    speed: 4 + Math.random() * 2
  });
}

function gameLoop() {
  if (!gameRunning) return;

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    item.y += item.speed;
    item.element.style.top = item.y + "px";

    const playerY = gameHeight - 80;

    const isHit =
      item.x < playerX + playerWidth &&
      item.x + 36 > playerX &&
      item.y < playerY + playerHeight &&
      item.y + 36 > playerY;

    if (isHit) {
      score += 10;
      scoreText.textContent = score;

      gameArea.removeChild(item.element);
      items.splice(i, 1);

      if (score >= 100) {
        endGame("승리! 별 100점을 모았습니다!");
      }
    } else if (item.y > gameHeight) {
      life--;
      lifeText.textContent = life;

      gameArea.removeChild(item.element);
      items.splice(i, 1);

      if (life <= 0) {
        endGame("패배! 목숨을 모두 잃었습니다.");
      }
    }
  }
}

function endGame(message) {
  gameRunning = false;
  clearInterval(itemCreateTimer);
  clearInterval(gameLoopTimer);

  setTimeout(() => {
    alert(message);
    restartBtn.style.display = "inline-block";
  }, 100);
}

function restartGame() {
  score = 0;
  life = 3;
  playerX = 180;
  gameRunning = true;

  scoreText.textContent = score;
  lifeText.textContent = life;
  player.style.left = playerX + "px";
  restartBtn.style.display = "none";

  items.forEach(item => {
    if (item.element.parentNode) {
      gameArea.removeChild(item.element);
    }
  });

  items = [];

  startGame();
}

function startGame() {
  itemCreateTimer = setInterval(createItem, 900);
  gameLoopTimer = setInterval(gameLoop, 20);
}

startGame();