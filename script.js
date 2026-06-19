const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const lifeText = document.getElementById("life");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

let score = 0;
let life = 3;
let playerX = 0;
let playerSpeed = 10;
let gameRunning = false;

let leftPressed = false;
let rightPressed = false;

let items = [];
let itemCreateTimer = null;
let gameLoopTimer = null;

const playerBottom = 92;
const itemSize = 44;

function getGameWidth() {
  return gameArea.clientWidth;
}

function getGameHeight() {
  return gameArea.clientHeight;
}

function getPlayerWidth() {
  return player.offsetWidth || 108;
}

function getPlayerHeight() {
  return player.offsetHeight || 60;
}

function getCenteredPlayerX() {
  return Math.floor((getGameWidth() - getPlayerWidth()) / 2);
}

function clampPlayerPosition() {
  const maxPlayerX = getGameWidth() - getPlayerWidth();

  if (playerX < 0) {
    playerX = 0;
  }

  if (playerX > maxPlayerX) {
    playerX = maxPlayerX;
  }

  player.style.left = playerX + "px";
}

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

/* =========================
   8비트 BGM / 효과음 설정
   ========================= */

let audioContext = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let bgmTimer = null;
let bgmStep = 0;

const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const bgmMelody = [
  659.25, 783.99, 987.77, 1174.66,
  987.77, 783.99, 659.25, 523.25,
  587.33, 698.46, 880.00, 1046.50,
  880.00, 698.46, 587.33, 523.25
];

const bgmBass = [
  130.81,
  164.81,
  196.00,
  220.00
];

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
window.addEventListener("resize", resizeGameHandler);

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);

createPixelArt(player, cloudMap, "cloud-art");
resetGameState();

function initializeAudio() {
  if (audioContext || !AudioContextClass) return;

  audioContext = new AudioContextClass();

  masterGain = audioContext.createGain();
  bgmGain = audioContext.createGain();
  sfxGain = audioContext.createGain();

  masterGain.gain.value = 0.22;
  bgmGain.gain.value = 0.36;
  sfxGain.gain.value = 0.7;

  bgmGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(audioContext.destination);
}

function resumeAudio() {
  initializeAudio();

  if (!audioContext) {
    return Promise.resolve();
  }

  if (audioContext.state === "suspended") {
    return audioContext.resume();
  }

  return Promise.resolve();
}

function playTone(frequency, startTime, duration, type, volume, destinationGain) {
  if (!audioContext || !destinationGain) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(destinationGain);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playNoise(startTime, duration, volume, destinationGain) {
  if (!audioContext || !destinationGain) return;

  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const fade = 1 - i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * fade;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gainNode = audioContext.createGain();

  filter.type = "highpass";
  filter.frequency.setValueAtTime(1800, startTime);

  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.buffer = buffer;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(destinationGain);

  source.start(startTime);
  source.stop(startTime + duration);
}

function playBgmTick() {
  if (!audioContext || !bgmGain || !gameRunning) return;

  const now = audioContext.currentTime;

  const melodyFrequency = bgmMelody[bgmStep % bgmMelody.length];
  playTone(melodyFrequency, now, 0.09, "square", 0.16, bgmGain);

  if (bgmStep % 4 === 0) {
    const bassIndex = Math.floor(bgmStep / 4) % bgmBass.length;
    playTone(bgmBass[bassIndex], now, 0.16, "triangle", 0.1, bgmGain);
  }

  if (bgmStep % 2 === 0) {
    playNoise(now, 0.025, 0.025, bgmGain);
  }

  bgmStep++;
}

function startBgm() {
  if (!audioContext || !bgmGain) return;

  stopBgm();

  bgmStep = 0;
  playBgmTick();

  bgmTimer = setInterval(playBgmTick, 150);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function playCatchSound() {
  if (!audioContext || !sfxGain) return;

  const now = audioContext.currentTime;

  playTone(987.77, now, 0.055, "square", 0.32, sfxGain);
  playTone(1318.51, now + 0.045, 0.065, "square", 0.26, sfxGain);
  playTone(1760.00, now + 0.1, 0.09, "triangle", 0.2, sfxGain);
  playNoise(now, 0.045, 0.06, sfxGain);
}

/* =========================
   픽셀아트 생성
   ========================= */

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

/* =========================
   입력 처리
   ========================= */

function keyDownHandler(event) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    leftPressed = true;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    rightPressed = true;
  }
}

function keyUpHandler(event) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    leftPressed = false;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    rightPressed = false;
  }
}

/* =========================
   게임 로직
   ========================= */

function movePlayer() {
  if (!gameRunning) return;

  if (leftPressed) {
    playerX -= playerSpeed;
  }

  if (rightPressed) {
    playerX += playerSpeed;
  }

  clampPlayerPosition();
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

  const maxItemX = Math.max(0, getGameWidth() - itemSize);
  const randomX = Math.floor(Math.random() * maxItemX);
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

    const playerWidth = getPlayerWidth();
    const playerHeight = getPlayerHeight();
    const playerY = getGameHeight() - playerBottom - playerHeight;

    const isHit =
      item.x < playerX + playerWidth &&
      item.x + itemSize > playerX &&
      item.y < playerY + playerHeight &&
      item.y + itemSize > playerY;

    if (isHit) {
      score += 10;
      scoreText.textContent = score;

      playCatchSound();

      gameArea.removeChild(item.element);
      items.splice(i, 1);

      if (score >= 100) {
        endGame("승리! 별 100점을 모았습니다!");
      }
    } else if (item.y > getGameHeight()) {
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

function resizeGameHandler() {
  clampPlayerPosition();

  items.forEach(item => {
    const maxItemX = Math.max(0, getGameWidth() - itemSize);

    if (item.x > maxItemX) {
      item.x = maxItemX;
      item.element.style.left = item.x + "px";
    }
  });
}

function clearGameTimers() {
  if (itemCreateTimer) {
    clearInterval(itemCreateTimer);
    itemCreateTimer = null;
  }

  if (gameLoopTimer) {
    clearInterval(gameLoopTimer);
    gameLoopTimer = null;
  }
}

function resetGameState() {
  score = 0;
  life = 3;
  playerX = getCenteredPlayerX();

  leftPressed = false;
  rightPressed = false;

  scoreText.textContent = score;
  updateLife();

  clampPlayerPosition();

  items.forEach(item => {
    if (item.element.parentNode) {
      gameArea.removeChild(item.element);
    }
  });

  items = [];
}

function endGame(message) {
  gameRunning = false;

  clearGameTimers();
  stopBgm();

  leftPressed = false;
  rightPressed = false;

  setTimeout(() => {
    alert(message);
    restartBtn.style.display = "inline-block";
  }, 100);
}

function startGame() {
  if (gameRunning) return;

  gameRunning = true;

  startBtn.style.display = "none";
  restartBtn.style.display = "none";

  clearGameTimers();

  resumeAudio()
    .then(() => {
      startBgm();
    })
    .catch(error => {
      console.warn("오디오를 시작할 수 없습니다.", error);
    });

  createItem();

  itemCreateTimer = setInterval(createItem, 900);
  gameLoopTimer = setInterval(gameLoop, 20);
}

function restartGame() {
  gameRunning = false;

  clearGameTimers();
  stopBgm();
  resetGameState();
  startGame();
}