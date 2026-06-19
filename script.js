const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const lifeText = document.getElementById("life");
const restartBtn = document.getElementById("restartBtn");

let score = 0;
let life = 3;
let playerX = 147;
let playerSpeed = 7;
let gameRunning = true;

let leftPressed = false;
let rightPressed = false;

let items = [];
let itemCreateTimer = null;
let gameLoopTimer = null;

const gameWidth = 420;
const gameHeight = 560;

const playerWidth = 126;
const playerHeight = 70;
const playerBottom = 92;

const itemSize = 55;

const colors = {
  B: "#13001f",
  Y: "#ffd91f",
  L: "#fff36a",
  O: "#ffae00",
  W: "#ffffff",
  C: "#cfffff",
  A: "#9ff1ff",
  D: "#6ddcff",
  S: "#d9faff",
  G: "#72c9e8",
  T: "transparent"
};

const starMap = [
  "TTTTTBTTTTT",
  "TTTTLBLTTTT",
  "TTTTLYLTTTT",
  "TTTBLYLBTTT",
  "BBLYYYYOLBB",
  "TBBLYYYOBBT",
  "TTBLYYYOBTT",
  "TTBYOYOBTTT",
  "TBYOBOYBTTT",
  "BYOBTBOYBTT",
  "BBTTTTTBBTT"
];

/*
  구름 픽셀맵
  모든 줄이 18칸으로 동일해야 깨지지 않음
*/
const cloudMap = [
  "TTTTTTBBBBTTTTTTTT",
  "TTTTBBWWWWBBTTTTTT",
  "TTBBWWWWWWWWBBTTTT",
  "TBBWWWWWWWWWWBBTTT",
  "BBWWWWWWWWWWWWBBTT",
  "BWWWWCWWWWCWWWWBBT",
  "BBWWWAWWWWAWWWWBBT",
  "TBBDAAAAWWAAAADBBT",
  "TTBBDDAAAAAADBBTTT",
  "TTTTBBBBBBBBBBTTTT"
];

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
restartBtn.addEventListener("click", restartGame);

createPixelArt(player, cloudMap, "cloud-art");

function createPixelArt(target, map, className) {
  target.innerHTML = "";

  const art = createPixelArtElement(map, className);
  target.appendChild(art);
}

function createPixelArtElement(map, className) {
  const width = map[0].length;
  const height = map.length;

  const hasInvalidRow = map.some(row => row.length !== width);

  if (hasInvalidRow) {
    console.error("픽셀맵의 가로 칸 수가 서로 다릅니다. 모든 줄의 글자 수를 동일하게 맞춰주세요.");
  }

  const art = document.createElement("div");
  art.classList.add("pixel-art", className);

  art.style.gridTemplateColumns = `repeat(${width}, var(--pixel-size))`;
  art.style.gridTemplateRows = `repeat(${height}, var(--pixel-size))`;

  map.forEach(row => {
    row.split("").forEach(code => {
      const cell = document.createElement("div");
      cell.classList.add("pixel-cell");
      cell.style.backgroundColor = colors[code] || "transparent";
      art.appendChild(cell);
    });
  });

  return art;
}

function keyDownHandler(event) {
  if (event.key === "ArrowLeft") {
    leftPressed = true;
  }

  if (event.key === "ArrowRight") {
    rightPressed = true;
  }
}

function keyUpHandler(event) {
  if (event.key === "ArrowLeft") {
    leftPressed = false;
  }

  if (event.key === "ArrowRight") {
    rightPressed = false;
  }
}

function movePlayer() {
  if (!gameRunning) return;

  if (leftPressed) {
    playerX -= playerSpeed;
  }

  if (rightPressed) {
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

  const light = document.createElement("div");
  light.classList.add("fall-light");

  const star = createPixelArtElement(starMap, "star-art");

  item.appendChild(light);
  item.appendChild(star);

  const randomX = Math.floor(Math.random() * (gameWidth - itemSize));
  item.style.left = randomX + "px";
  item.style.top = "-20px";

  gameArea.appendChild(item);

  items.push({
    element: item,
    x: randomX,
    y: -20,
    speed: 3.6 + Math.random() * 2.2
  });
}

function gameLoop() {
  if (!gameRunning) return;

  movePlayer();

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    item.y += item.speed;
    item.element.style.top = item.y + "px";

    const playerY = gameHeight - playerBottom - playerHeight;

    const isHit =
      item.x < playerX + playerWidth &&
      item.x + itemSize > playerX &&
      item.y < playerY + playerHeight &&
      item.y + itemSize > playerY;

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
      updateLife();

      gameArea.removeChild(item.element);
      items.splice(i, 1);

      if (life <= 0) {
        endGame("패배! 목숨을 모두 잃었습니다.");
      }
    }
  }
}

function updateLife() {
  let lifeDisplay = "";

  for (let i = 0; i < life; i++) {
    lifeDisplay += "❤";
  }

  lifeText.textContent = lifeDisplay;
}

function endGame(message) {
  gameRunning = false;
  clearInterval(itemCreateTimer);
  clearInterval(gameLoopTimer);

  leftPressed = false;
  rightPressed = false;

  setTimeout(() => {
    alert(message);
    restartBtn.style.display = "inline-block";
  }, 100);
}

function restartGame() {
  score = 0;
  life = 3;
  playerX = 147;
  gameRunning = true;

  leftPressed = false;
  rightPressed = false;

  scoreText.textContent = score;
  updateLife();

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